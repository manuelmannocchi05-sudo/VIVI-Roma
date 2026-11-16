/* VIVI Roma — pianificatore degli itinerari.
   Puro, senza DOM: si usa nel browser e nei test (npm test).

   Come costruisce un itinerario
   1. Dà un punteggio a ogni luogo in base alle risposte (interessi, atmosfera, compagnia, budget...).
   2. Costruisce una giornata alla volta attorno a una zona: prova più luoghi di partenza ("ancore")
      e la fa crescere solo con luoghi vicini, entro il limite di camminata scelto dall'utente.
   3. Usa solo luoghi che corrispondono agli interessi; altri luoghi entrano solo per arrivare
      al minimo di 2 tappe per giornata.
   4. Ordina le tappe per il percorso più breve, con i mercati al mattino e, se richiesti,
      panorami e luoghi serali verso la fine.
   Tutte le distanze sono in linea d'aria: nessun orario, costo o tempo di percorrenza viene calcolato o mostrato. */
import {PLACES} from "./data/places.js";

const CENTER={lat:41.8986,lng:12.4769};          /* Pantheon: riferimento per i luoghi periferici */
const EXCLUSIVE=[["testaccio","mercato"],["trastevere","smtrastevere"],["campidoglio","capitolini"]];   /* stesso punto: non proporre entrambi */
const DURATIONS={half:{days:1,half:true},one:{days:1}};   /* "multi": numero di giorni scelto (da 2 a 7) in a.days */
/* Peso di spesa: 0 libero · 0,5 parzialmente a pagamento o da verificare · 1 a pagamento. Nessun prezzo viene mostrato. */
const COST_UNITS={free:0,mixed:.5,verify:.5,paid:1};
const units=p=>(COST_UNITS[p.fee]||0)*(p.cheap?0.5:1);          /* biglietto economico (meno di 10 €): pesa la metà */
/* Spesa di un luogo dato ciò che è già in programma: i luoghi con lo stesso biglietto (es. Colosseo e Foro Romano) si pagano una volta. */
const unitsWith=(p,list)=>p.ticket&&list.some(r=>r.p!==p&&r.p.ticket===p.ticket)?0:units(p);
function spendOf(list){let t=0;list.forEach((r,i)=>{t+=unitsWith(r.p,list.slice(0,i));});return t;}
const PACE={slow:{max:3,budget:240},balanced:{max:4,budget:330},full:{max:5,budget:420}};
/* Camminata, in km in linea d'aria.
   leg: tratta più lunga tra due tappe consecutive che consideriamo comoda a piedi; oltre, suggeriamo i mezzi pubblici.
   zone: distanza massima di ogni tappa dal luogo di partenza della giornata (la giornata resta in una zona).
   day: somma massima delle tratte di una giornata. */
const WALK={low:{leg:1.2,zone:1.4,day:3.0},medium:{leg:1.8,zone:2.0,day:5.0},high:{leg:2.2,zone:2.6,day:7.0}};
const MIN_STOPS=2;          /* minimo di tappe per giornata */
const ANCHORS=12;           /* luoghi di partenza provati per ogni giornata */
const REL_BONUS=6;          /* vantaggio di un luogo che corrisponde agli interessi */
const DIST_WEIGHT=3;        /* penalità per km aggiunto alla giornata */
const REPAIR_SLACK=0.5;     /* km in più ammessi per uno scambio fatto per rispettare il budget */
const COMPACT_WEIGHT=8;      /* variante più raccolta della stessa giornata */
const RELAX_WEIGHT=10;      /* penalità per km quando, per arrivare al minimo di tappe, si esce dalla zona */
const SLOT_AM=4;            /* km "virtuali" per ogni posizione dopo l'inizio, per i luoghi aperti solo al mattino */
const SLOT_MORNING=0.6;     /* km "virtuali" per ogni posizione dopo l'inizio, per i mercati */
const SLOT_LATE=1.2;        /* km "virtuali" per ogni posizione prima della fine, per sera e panorami */
const FOOD_TIPS=[
  "carbonara, cacio e pepe, amatriciana e gricia",
  "carciofi alla romana, supplì e pizza al taglio",
  "trippa alla romana, coda alla vaccinara e saltimbocca",
  "abbacchio, puntarelle e gnocchi del giovedì"
];

function km(a,b){
  const R=6371,r=Math.PI/180;
  const dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function timeRange(p){
  const m=/(\d+)\s*[–-]\s*(\d+)/.exec(p.time);
  if(m)return [Number(m[1]),Number(m[2])];
  const one=/(\d+)\s*min/.exec(p.time);
  return one?[Number(one[1]),Number(one[1])]:[45,60];
}
const midMins=p=>{const r=timeRange(p);return (r[0]+r[1])/2;};

function config(a){
  const d=a.duration==="multi"?{days:Math.max(2,Math.min(7,Math.round(Number(a.days))||2))}:(DURATIONS[a.duration]||DURATIONS.one);
  const base=PACE[a.pace]||PACE.balanced;
  let max=base.max,budget=base.budget;
  if(d.half){max=Math.min(max,a.pace==="slow"?2:3);budget=Math.round(budget*.55);}
  if(a.walking==="low"){max=Math.max(2,max-1);budget=Math.round(budget*.85);}
  const w=WALK[a.walking]||WALK.medium;
  const walk=d.half?{leg:w.leg,zone:w.zone*0.75,day:w.day*0.55}:w;   /* mezza giornata: zona più raccolta */
  return {days:d.days,max,budget,half:!!d.half,walk};
}
function matchesOf(p,a){return a.interests.filter(t=>p.cats.includes(t));}
function scorePlace(p,a){
  let s=0;
  s+=matchesOf(p,a).length*5;
  if(p.cats.includes(a.mood))s+=4;
  if(a.familiarity==="first"&&p.cats.includes("iconic"))s+=4;
  if(a.familiarity==="first"&&p.must&&(matchesOf(p,a).length||a.mood==="iconic"))s+=6;   /* grandi classici per chi viene la prima volta */
  if(a.familiarity==="often"&&p.cats.includes("hidden"))s+=3;
  if(a.company==="couple"&&p.cats.includes("romantic"))s+=2;
  if(a.company==="family"&&p.cats.includes("family"))s+=3;
  if(a.company==="friends"&&p.cats.includes("lively"))s+=2;
  if(a.company==="solo"&&(p.cats.includes("hidden")||p.cats.includes("local")))s+=1;
  if(a.budget==="low"){s-=units(p)*6;if(p.fee==="free")s+=3;}
  else if(a.budget==="mid")s+=units(p);
  else if(a.budget==="high")s+=units(p)*4;
  const far=km(CENTER,p);
  if(a.walking==="low"&&far>3.5)s-=3;
  else if(a.walking==="medium"&&far>5)s-=1;
  return s;
}
function blocked(p,chosen){
  return EXCLUSIVE.some(pair=>pair.includes(p.id)&&chosen.some(c=>pair.includes(c.p.id)&&c.p.id!==p.id));
}
/* Soglie di spesa per budget, sull'intero itinerario: contenuto = pochi luoghi a pagamento · equilibrato = mix (20–35%, ma un grande classico a pagamento è sempre possibile) · concedermi qualcosa = almeno il 40% */
function budgetQuota(a,n){
  if(a.budget==="low")return {min:0,max:Math.max(1,n*0.2)};
  if(a.budget==="mid")return {min:n*0.2,max:Math.max(1.5,n*0.35)};   /* almeno un ingresso pieno anche nelle giornate brevi */
  if(a.budget==="high")return {min:n*0.4,max:Infinity};
  return {min:0,max:Infinity};
}

function pathLength(list){let t=0;for(let i=1;i<list.length;i++)t+=km(list[i-1].p,list[i].p);return t;}

/* Momento ideale della giornata: "morning" (mercati, grandi musei da vedere presto) va all'inizio; panorami al tramonto,
   luoghi serali e, se scegli "Roma di sera", i luoghi notturni vanno verso la fine. Nessun orario viene calcolato. */
function slotOf(p,a){
  if(p.slot==="am")return "am";
  if(p.slot==="morning")return "morning";
  if(p.slot==="evening"||p.slot==="late")return "late";                 /* luoghi serali e panorami al tramonto */
  if(a.interests.includes("night")&&p.cats.includes("night"))return "late";
  return null;
}
function orderCost(list,a){
  let c=pathLength(list),lastLate=-1;
  const n=list.length;
  list.forEach((x,i)=>{
    const s=slotOf(x.p,a);
    if(s==="am")c+=i*SLOT_AM;                     /* aperto solo al mattino: in testa alla giornata */
    else if(s==="morning")c+=i*SLOT_MORNING;      /* ogni mercato il prima possibile */
    else if(s==="late")lastLate=i;
  });
  if(lastLate>=0)c+=(n-1-lastLate)*SLOT_LATE;     /* basta che la giornata finisca con un luogo serale o un panorama */
  return c;
}
/* Ordine di visita: il più corto tenendo conto del momento della giornata (esatto fino a 7 tappe, euristico oltre).
   A parità di costo, si parte dalla tappa con il punteggio più alto. */
function bestOrder(items,a){
  if(items.length<2)return items.slice();
  if(items.length>7){
    const rest=items.slice(),out=[rest.shift()];
    while(rest.length){
      const last=out[out.length-1];let bi=0,bd=Infinity;
      rest.forEach((x,i)=>{const d=km(last.p,x.p);if(d<bd){bd=d;bi=i;}});
      out.push(rest.splice(bi,1)[0]);
    }
    return out;
  }
  let best=null,bc=Infinity;
  (function perm(arr,rest){
    if(!rest.length){
      const c=orderCost(arr,a||{interests:[]});
      if(c<bc-1e-9||(Math.abs(c-bc)<=1e-9&&arr[0].score>best[0].score)){bc=c;best=arr.slice();}
      return;
    }
    for(let i=0;i<rest.length;i++)perm(arr.concat(rest[i]),rest.slice(0,i).concat(rest.slice(i+1)));
  })([],items);
  return best;
}

/* Valore di una giornata: luoghi pertinenti e ben valutati, poca strada, poche tratte da fare con i mezzi. */
function dayValue(day,a,cfg){
  if(!day.length)return -Infinity;
  const ord=bestOrder(day,a);
  let v=0,long=0;
  day.forEach(r=>{v+=r.score+(r.matches.length?REL_BONUS:0);});
  for(let i=1;i<ord.length;i++)if(km(ord[i-1].p,ord[i].p)>cfg.walk.leg)long++;
  return v-5*orderCost(ord,a)-6*long;      /* km e vincoli di orario: una giornata non deve andare avanti e indietro */
}

/* Fa crescere una giornata attorno all'ancora, aggiungendo sempre il luogo migliore tra quelli vicini. */
function growDay(anchor,pool,a,cfg,target,maxRel,ctx,distWeight){
  const W=cfg.walk,chosen=[anchor];
  let rels=anchor.matches.length?1:0;
  let mins=midMins(anchor.p),spend=ctx.spend+unitsWith(anchor.p,ctx.all),spread=0;
  const near=r=>{let d=Infinity;for(const c of chosen)d=Math.min(d,km(c.p,r.p));return d;};
  const pick=(allowOff,relax)=>{
    let bv=-Infinity,br=null,bd=0;
    for(const r of pool){
      if(chosen.includes(r)||blocked(r.p,chosen))continue;
      const rel=r.matches.length>0;
      if(!rel&&!allowOff)continue;
      if(rel&&rels>=maxRel)continue;                                 /* lascia luoghi pertinenti anche alle altre giornate */
      const d=near(r);
      if(!relax){
        if(d>W.leg||km(anchor.p,r.p)>W.zone||spread+d>W.day)continue;   /* resta nella zona e nel limite di camminata */
        if(mins+midMins(r.p)>cfg.budget)continue;                    /* rispetta il tempo di visita del ritmo scelto */
        if(spend+unitsWith(r.p,ctx.all.concat(chosen))>ctx.quota.max+1e-9)continue;   /* rispetta il budget */
      }
      let v=r.score+(rel?REL_BONUS:0)-(relax?RELAX_WEIGHT:distWeight)*d;    /* fuori zona conta soprattutto la vicinanza */
      if(relax)v-=Math.max(0,mins+midMins(r.p)-cfg.budget)/15;              /* e una tappa breve, per non riempire troppo la giornata */
      if(unitsWith(r.p,ctx.all.concat(chosen))>0&&ctx.quota.min>0&&spend<ctx.quota.min*ctx.progress)v+=a.budget==="high"?5:3;   /* budget equilibrato o alto: qualche ingresso a pagamento */
      if(v>bv){bv=v;br=r;bd=d;}
    }
    return br?{r:br,d:bd}:null;
  };
  const add=x=>{spend+=unitsWith(x.r.p,ctx.all.concat(chosen));chosen.push(x.r);mins+=midMins(x.r.p);spread+=x.d;if(x.r.matches.length)rels++;};
  let x;
  while(chosen.length<target&&(x=pick(false,false)))add(x);
  const big=cfg.half&&midMins(anchor.p)>=0.75*cfg.budget;          /* mezza giornata con un grande museo: basta quello */
  const need=big?1:Math.min(MIN_STOPS,target);
  while(chosen.length<need&&(x=pick(true,false)||pick(true,true)))add(x);
  return chosen;
}

/* Sceglie la giornata migliore provando più ancore tra i luoghi pertinenti ancora disponibili. */
function planDay(pool,a,cfg,target,maxRel,ctx){
  const relevant=pool.filter(r=>r.matches.length>0);
  const anchors=(relevant.length?relevant:pool).slice(0,ANCHORS);
  let best=null,bv=-Infinity;
  for(const anc of anchors){
    if(unitsWith(anc.p,ctx.all)>0&&ctx.spend+unitsWith(anc.p,ctx.all)>ctx.quota.max+1e-9&&anchors.some(o=>units(o.p)===0))continue;
    for(const w of [DIST_WEIGHT,COMPACT_WEIGHT]){                 /* due varianti: normale e più raccolta */
      const day=growDay(anc,pool,a,cfg,target,maxRel,ctx,w);
      const v=dayValue(day,a,cfg);
      if(v>bv){bv=v;best=day;}
    }
  }
  return best||[];
}

/* Forma di una giornata nell'ordine di visita: km totali e numero di tratte oltre il limite di camminata. */
function dayShape(day,a,cfg){
  const ord=bestOrder(day,a);let long=0;
  for(let i=1;i<ord.length;i++)if(km(ord[i-1].p,ord[i].p)>cfg.walk.leg)long++;
  return {km:pathLength(ord),cost:orderCost(ord,a),long,mins:day.reduce((t,r)=>t+midMins(r.p),0)};
}

/* Correzione del budget: se l'itinerario ha troppi o troppo pochi ingressi a pagamento rispetto al budget scelto,
   scambia una tappa con un luogo della stessa zona (entro la tratta comoda dalle altre tappe del giorno)
   e almeno altrettanto pertinente agli interessi. Geografia e pertinenza non peggiorano. */
function repairBudget(groups,pool,a,cfg){
  for(let guard=0;guard<16;guard++){
    const all=groups.flat(),n=all.length,q=budgetQuota(a,n);
    const spend=spendOf(all);
    const dir=spend<q.min-1e-9?1:spend>q.max+1e-9?-1:0;
    if(!dir)return;
    let best=null,bv=-Infinity;
    groups.forEach((g,gi)=>{const before=dayShape(g,a,cfg);g.forEach((v,vi)=>{
      const others=g.filter((_,k)=>k!==vi);
      for(const c of pool){
        const du=spendOf(all.map(x=>x===v?c:x))-spend;
        if(du*dir<=0)continue;                                        /* deve spostare la spesa nella direzione giusta */
        if(dir<0&&spend+du<q.min-1e-9)continue;
        if(dir>0&&spend+du>q.max+1e-9)continue;
        if((c.matches.length>0)<(v.matches.length>0))continue;         /* mai meno pertinente */
        if(blocked(c.p,all.filter(x=>x!==v)))continue;
        let d=0;
        if(others.length){
          d=Infinity;for(const o of others)d=Math.min(d,km(o.p,c.p));
          const mid={lat:others.reduce((t,o)=>t+o.p.lat,0)/others.length,lng:others.reduce((t,o)=>t+o.p.lng,0)/others.length};
          if(d>cfg.walk.leg||km(mid,c.p)>cfg.walk.zone)continue;          /* resta nella zona della giornata */
          if(c.score-v.score-DIST_WEIGHT*d<=bv)continue;                  /* non può battere lo scambio migliore già trovato */
          const after=dayShape(others.concat(c),a,cfg);
          if(after.long>before.long||after.km>Math.max(before.km,cfg.walk.day)+1e-9)continue;   /* nessuna nuova tratta lunga, giornata non più lunga */
          if(after.cost>before.cost+REPAIR_SLACK)continue;               /* e non meno ordinata: al massimo mezzo km in più */
          const minsAfter=others.reduce((t,o)=>t+midMins(o.p),0)+midMins(c.p);
          if(minsAfter>Math.max(before.mins,cfg.budget)+1e-9)continue;   /* né più piena di prima */
        }
        const val=c.score-v.score-DIST_WEIGHT*d;
        if(val>bv){bv=val;best={gi,vi,c};}
      }
    });});
    if(!best)return;
    const g=groups[best.gi],old=g[best.vi];
    g[best.vi]=best.c;
    pool.splice(pool.indexOf(best.c),1);pool.push(old);
  }
}

function buildItinerary(a){
  const cfg=config(a);
  let pool=PLACES.map(p=>({p,score:scorePlace(p,a),matches:matchesOf(p,a)}))
    .sort((x,y)=>y.score-x.score||x.p.id.localeCompare(y.p.id));
  const relevantTotal=pool.filter(r=>r.matches.length>0).length;
  const plannedStops=Math.min(cfg.days*cfg.max,Math.max(cfg.days*MIN_STOPS,relevantTotal));
  const ctx={spend:0,all:[],quota:budgetQuota(a,plannedStops),progress:0};
  const groups=[];
  for(let d=0;d<cfg.days;d++){
    const left=cfg.days-d;
    const relLeft=pool.filter(r=>r.matches.length>0).length;
    const target=Math.min(cfg.max,Math.max(MIN_STOPS,Math.ceil(relLeft/left)));
    const maxRel=relLeft>=left?relLeft-(left-1):1;     /* ogni giornata successiva deve poter avere almeno un luogo pertinente */
    ctx.progress=(d+1)/cfg.days;
    const day=planDay(pool,a,cfg,target,maxRel,ctx);
    if(!day.length)break;
    ctx.all=ctx.all.concat(day);ctx.spend=spendOf(ctx.all);
    pool=pool.filter(r=>!day.includes(r)&&!blocked(r.p,day));
    groups.push(day);
  }
  repairBudget(groups,pool,a,cfg);
  const chosen=groups.flat();
  const notes=[];
  if(chosen.length<cfg.days*cfg.max){
    notes.push("Il catalogo comprende "+PLACES.length+" luoghi: per questa durata e questi interessi abbiamo usato "+chosen.length+" tappe invece delle "+(cfg.days*cfg.max)+" previste dal tuo ritmo.");
  }
  const filler=chosen.filter(c=>c.matches.length===0&&!(c.p.cats.includes(a.mood)));
  if(filler.length){
    notes.push(filler.length===1?"Una tappa è inclusa come complemento geografico e non corrisponde direttamente ai tuoi interessi.":filler.length+" tappe sono incluse come complemento e non corrispondono direttamente ai tuoi interessi: servivano a completare le giornate.");
  }
  if(a.budget==="low"&&chosen.some(c=>c.p.fee!=="free")){
    notes.push("Budget contenuto: abbiamo privilegiato luoghi gratuiti. Le poche tappe con ingresso a pagamento o da verificare sono facoltative.");
  }
  if(cfg.days>=5)notes.push("Per soggiorni lunghi l'itinerario copre fino a 7 giorni e usa luoghi anche fuori dal centro. Se resti più a lungo, ripeti il quiz cambiando interessi per ottenere nuove idee.");
  const avg=g=>g.reduce((s,x)=>s+x.score,0)/g.length;
  const ordered=groups.map(g=>bestOrder(g,a)).sort((x,y)=>avg(y)-avg(x));
  let transit=0;
  const days=ordered.map((g,di)=>{
    const stops=g.map((r,i)=>{
      const legKm=i?km(g[i-1].p,r.p):null;
      const far=legKm!==null&&legKm>cfg.walk.leg;
      if(far)transit++;
      return {...r.p,score:r.score,matches:r.matches,legKm,transit:far};
    });
    let lo=0,hi=0;stops.forEach(s=>{const t=timeRange(s);lo+=t[0];hi+=t[1];});
    const areas=[];stops.forEach(s=>{if(!areas.includes(s.area))areas.push(s.area);});
    return {index:di,stops,areas,minMins:lo,maxMins:hi,walkKm:pathLength(g),foodTip:FOOD_TIPS[di%FOOD_TIPS.length]};
  });
  if(days.some(d=>d.stops.some(s=>s.closed)))notes.push("Alcune tappe hanno giorni di chiusura (indicati nelle schede): scegli il giorno della visita tenendone conto.");
  if(transit)notes.push(transit===1?"Una tratta è più lunga di quanto preferisci camminare: la trovi segnalata, lì conviene usare i mezzi pubblici.":transit+" tratte sono più lunghe di quanto preferisci camminare: le trovi segnalate, lì conviene usare i mezzi pubblici.");
  return {cfg,days,notes,total:chosen.length};
}

export {PLACES,CENTER,EXCLUSIVE,COST_UNITS,PACE,WALK,MIN_STOPS,FOOD_TIPS,km,timeRange,config,scorePlace,bestOrder,pathLength,units,spendOf,budgetQuota,buildItinerary};
