/* VIVI Roma — pianificatore degli itinerari.
   Puro, senza DOM: si usa nel browser e nei test (npm test). */
import {PLACES} from "./data/places.js";

const CENTER={lat:41.8986,lng:12.4769};          /* Pantheon: riferimento per i luoghi periferici */
const EXCLUSIVE=[["testaccio","mercato"]];       /* stesso quartiere: non proporre entrambi */
const DURATIONS={half:{days:1,half:true},one:{days:1}};   /* "multi": numero di giorni scelto (da 2 a 7) in a.days */
/* Peso di spesa: 0 libero · 0,5 parzialmente a pagamento o da verificare · 1 a pagamento. Nessun prezzo viene mostrato. */
const COST_UNITS={free:0,mixed:.5,verify:.5,paid:1};
const units=p=>COST_UNITS[p.fee]||0;
const PACE={slow:{max:3,budget:240},balanced:{max:4,budget:330},full:{max:5,budget:420}};
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
  return m?[Number(m[1]),Number(m[2])]:[45,60];
}
const midMins=p=>{const r=timeRange(p);return (r[0]+r[1])/2;};

function config(a){
  const d=a.duration==="multi"?{days:Math.max(2,Math.min(7,Math.round(Number(a.days))||2))}:(DURATIONS[a.duration]||DURATIONS.one);
  const base=PACE[a.pace]||PACE.balanced;
  let max=base.max,budget=base.budget;
  if(d.half){max=Math.min(max,a.pace==="slow"?2:3);budget=Math.round(budget*.55);}
  if(a.walking==="low"){max=Math.max(2,max-1);budget=Math.round(budget*.85);}
  return {days:d.days,max,budget,half:!!d.half};
}
function matchesOf(p,a){return a.interests.filter(t=>p.cats.includes(t));}
function scorePlace(p,a){
  let s=0;
  s+=matchesOf(p,a).length*5;
  if(p.cats.includes(a.mood))s+=4;
  if(a.familiarity==="first"&&p.cats.includes("iconic"))s+=4;
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
/* Soglie di spesa per budget: contenuto = pochi luoghi a pagamento · equilibrato = mix (20–35%) · concedermi qualcosa = almeno il 40%, nessun tetto */
function budgetQuota(a,n){
  if(a.budget==="low")return {min:0,max:Math.max(1,n*0.2)};
  if(a.budget==="mid")return {min:n*0.2,max:n*0.35};
  if(a.budget==="high")return {min:n*0.4,max:Infinity};
  return {min:0,max:Infinity};
}
function pickPlaces(a,cfg){
  const target=cfg.days*cfg.max,budgetTotal=cfg.days*cfg.budget;
  const ranked=PLACES.map(p=>({p,score:scorePlace(p,a),matches:matchesOf(p,a)}))
    .sort((x,y)=>y.score-x.score||x.p.id.localeCompare(y.p.id));
  const farLimit=Math.max(1,cfg.days);   /* al massimo un luogo periferico per giornata */
  const isFar=p=>km(CENTER,p)>4;
  const quota=budgetQuota(a,target);
  const chosen=[];let mins=0,farCount=0,spend=0;
  const add=(r,m)=>{chosen.push(r);mins+=m;spend+=units(r.p);if(isFar(r.p))farCount++;};
  /* 1° passaggio: rispetta il tetto di spesa del budget scelto */
  for(const r of ranked){
    if(chosen.length>=target)break;
    if(blocked(r.p,chosen))continue;
    if(isFar(r.p)&&farCount>=farLimit)continue;
    if(spend+units(r.p)>quota.max+1e-9)continue;
    const m=midMins(r.p);
    if(mins+m>budgetTotal&&chosen.length>=cfg.days*2)continue;
    add(r,m);
  }
  /* 2° passaggio: se mancano tappe per avere almeno 2 per giornata, allenta il tetto */
  for(const r of ranked){
    if(chosen.length>=cfg.days*2)break;
    if(chosen.includes(r)||blocked(r.p,chosen))continue;
    if(isFar(r.p)&&farCount>=farLimit)continue;
    add(r,midMins(r.p));
  }
  /* Budget equilibrato / concedermi qualcosa: garantisce una quota minima di tappe a pagamento, scelte tra le più adatte agli interessi */
  if(a.budget==="mid"||a.budget==="high"){
    let guard=0;
    while(spend<quota.min-1e-9&&guard++<8){
      const cand=ranked.find(r=>units(r.p)>0&&!chosen.includes(r)&&!blocked(r.p,chosen)&&!(isFar(r.p)&&farCount>=farLimit));
      const victim=chosen.filter(c=>units(c.p)===0).sort((x,y)=>x.score-y.score)[0];
      if(!cand||!victim)break;
      chosen.splice(chosen.indexOf(victim),1,cand);
      spend+=units(cand.p);
      if(isFar(cand.p))farCount++;
      if(isFar(victim.p))farCount--;
    }
  }
  return chosen;
}
/* Raggruppa le tappe in giornate geograficamente compatte e di dimensione equilibrata. */
function clusterDays(items,k){
  if(k<=1||items.length<=1)return [items.slice()];
  k=Math.min(k,items.length);
  const cap=Math.ceil(items.length/k);
  const seeds=[items[0]];
  while(seeds.length<k){
    let best=null,bd=-1;
    items.forEach(it=>{
      if(seeds.includes(it))return;
      const d=Math.min(...seeds.map(s=>km(s.p,it.p)));
      if(d>bd){bd=d;best=it;}
    });
    seeds.push(best);
  }
  let centers=seeds.map(s=>({lat:s.p.lat,lng:s.p.lng}));
  let groups=[];
  for(let iter=0;iter<8;iter++){
    groups=centers.map(()=>[]);
    const pairs=[];
    items.forEach((it,i)=>centers.forEach((c,j)=>pairs.push({i,j,d:km(c,it.p)})));
    pairs.sort((x,y)=>x.d-y.d||x.i-y.i||x.j-y.j);
    const used=new Set();
    const isFar=it=>km(CENTER,it.p)>4;
    const separateFar=items.filter(isFar).length<=k;   /* un solo luogo periferico per giornata, se possibile */
    pairs.forEach(({i,j})=>{
      if(used.has(i)||groups[j].length>=cap)return;
      if(separateFar&&isFar(items[i])&&groups[j].some(isFar))return;
      used.add(i);groups[j].push(items[i]);
    });
    items.forEach((it,i)=>{                                   /* eventuali tappe rimaste: gruppo più vicino con spazio */
      if(used.has(i))return;
      let bj=-1,bd=Infinity;
      centers.forEach((c,j)=>{if(groups[j].length<cap){const d=km(c,it.p);if(d<bd){bd=d;bj=j;}}});
      if(bj<0){centers.forEach((c,j)=>{const d=km(c,it.p);if(d<bd){bd=d;bj=j;}});}
      groups[bj].push(it);used.add(i);
    });
    centers=groups.map((g,j)=>g.length?{lat:g.reduce((s,x)=>s+x.p.lat,0)/g.length,lng:g.reduce((s,x)=>s+x.p.lng,0)/g.length}:centers[j]);
  }
  return groups.filter(g=>g.length);
}
function pathLength(list){let t=0;for(let i=1;i<list.length;i++)t+=km(list[i-1].p,list[i].p);return t;}
/* Ordine di visita più corto (esatto fino a 7 tappe, euristico oltre). */
function bestOrder(items){
  if(items.length<3)return items.slice();
  if(items.length>7){
    const rest=items.slice(),out=[rest.shift()];
    while(rest.length){
      const last=out[out.length-1];let bi=0,bd=Infinity;
      rest.forEach((x,i)=>{const d=km(last.p,x.p);if(d<bd){bd=d;bi=i;}});
      out.push(rest.splice(bi,1)[0]);
    }
    return out;
  }
  let best=null,bl=Infinity;
  (function perm(arr,rest){
    if(!rest.length){const l=pathLength(arr);if(l<bl-1e-9){bl=l;best=arr.slice();}return;}
    for(let i=0;i<rest.length;i++){perm(arr.concat(rest[i]),rest.slice(0,i).concat(rest.slice(i+1)));}
  })([],items);
  const rev=best.slice().reverse();
  return rev[0].score>best[0].score?rev:best;
}
/* Affina i gruppi scambiando tappe tra giornate finché la somma dei percorsi (in linea d'aria) diminuisce. */
function refineGroups(groups,budget){
  const cost=g=>{
    const spend=g.reduce((t,x)=>t+units(x.p),0);
    const pen=budget==="mid"?4*Math.max(0,spend-Math.ceil(g.length*0.6)):0;   /* budget equilibrato: alterna gratuito e a pagamento nello stesso giorno */
    return (g.length<2?0:Math.pow(pathLength(bestOrder(g)),1.5))+pen;
  };
  let costs=groups.map(cost),improved=true,pass=0;
  while(improved&&pass++<6){
    improved=false;
    for(let x=0;x<groups.length;x++)for(let y=x+1;y<groups.length;y++){
      for(let i=0;i<groups[x].length;i++)for(let j=0;j<groups[y].length;j++){
        const gx=groups[x].slice(),gy=groups[y].slice();
        const t=gx[i];gx[i]=gy[j];gy[j]=t;
        const cx=cost(gx),cy=cost(gy);
        if(cx+cy<costs[x]+costs[y]-1e-6){groups[x]=gx;groups[y]=gy;costs[x]=cx;costs[y]=cy;improved=true;}
      }
    }
  }
  return groups;
}
function buildItinerary(a){
  const cfg=config(a);
  const chosen=pickPlaces(a,cfg);
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
  let groups=refineGroups(clusterDays(chosen,cfg.days),a.budget).map(g=>bestOrder(g));
  const avg=g=>g.reduce((s,x)=>s+x.score,0)/g.length;
  groups.sort((x,y)=>avg(y)-avg(x));
  const days=groups.map((g,di)=>{
    const stops=g.map((r,i)=>({...r.p,score:r.score,matches:r.matches,legKm:i?km(g[i-1].p,r.p):null}));
    let lo=0,hi=0;stops.forEach(s=>{const t=timeRange(s);lo+=t[0];hi+=t[1];});
    const areas=[];stops.forEach(s=>{if(!areas.includes(s.area))areas.push(s.area);});
    return {index:di,stops,areas,minMins:lo,maxMins:hi,walkKm:pathLength(g),foodTip:FOOD_TIPS[di%FOOD_TIPS.length]};
  });
  return {cfg,days,notes,total:chosen.length};
}

export {PLACES,CENTER,EXCLUSIVE,COST_UNITS,PACE,FOOD_TIPS,km,timeRange,config,scorePlace,pickPlaces,clusterDays,bestOrder,pathLength,refineGroups,buildItinerary};
