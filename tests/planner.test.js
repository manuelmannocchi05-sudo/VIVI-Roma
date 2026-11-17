/* Test automatici del pianificatore e del catalogo. Avvio: npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import {PLACES,buildItinerary,km,CENTER,WALK,timeRange,spendOf,budgetQuota} from "../js/planner.js";
import {QUIZ} from "../js/quiz-data.js";
import {sampleAnswers,expectedDays} from "./combos.js";

const FEES=["free","paid","mixed","verify"];
const CATS=["history","art","hidden","romantic","nature","food","religious","local","night","family","iconic","peaceful","lively"];

test("catalogo: id unici e campi obbligatori presenti", ()=>{
  const ids=PLACES.map(p=>p.id);
  assert.equal(new Set(ids).size,ids.length,"id duplicati nel catalogo");
  for(const p of PLACES){
    for(const k of ["id","name","area","time","cost","desc","chicca","consiglio","wiki"])
      assert.ok(typeof p[k]==="string"&&p[k].trim(),p.id+": campo '"+k+"' mancante");
    assert.ok(FEES.includes(p.fee),p.id+": fee non valida ("+p.fee+")");
    assert.ok(Array.isArray(p.cats)&&p.cats.length,p.id+": nessuna categoria");
    p.cats.forEach(c=>assert.ok(CATS.includes(c),p.id+": categoria sconosciuta '"+c+"'"));
    assert.match(p.time,/^\d+\s*[–-]\s*\d+ min$/,p.id+": formato del tempo di visita");
    if(p.booking!==undefined)assert.ok(["required","recommended","no"].includes(p.booking),p.id+": prenotazione non valida");
    if(p.slot!==undefined)assert.ok(["am","morning","late","evening"].includes(p.slot),p.id+": fascia non valida");
    if(p.source)assert.ok(/^https:\/\//.test(p.source)&&/^\d{4}-\d{2}-\d{2}$/.test(p.checked||""),p.id+": fonte senza data di verifica");
    assert.ok(p.public||p.hours||p.hoursNote,p.id+": manca l'indicazione sugli orari (o la nota 'non verificati')");
    assert.ok(typeof p.when==="string"&&p.when.trim(),p.id+": manca la fascia oraria ideale");
  }
});

test("catalogo: coordinate dentro Roma", ()=>{
  for(const p of PLACES){
    assert.ok(p.lat>41.75&&p.lat<42.0&&p.lng>12.35&&p.lng<12.65,p.id+": coordinate fuori Roma");
    assert.ok(km(CENTER,p)<15,p.id+": troppo lontano dal centro");
  }
});

test("quiz: ogni interesse e atmosfera ha luoghi nel catalogo", ()=>{
  for(const key of ["interests","mood"]){
    const q=QUIZ.find(x=>x.key===key);
    for(const [value] of q.opts)
      assert.ok(PLACES.some(p=>p.cats.includes(value)),key+" '"+value+"' non ha luoghi");
  }
});

test("itinerari: giorni corretti, nessun duplicato, nessuna giornata vuota", ()=>{
  for(const a of sampleAnswers()){
    const r=buildItinerary(a),label=JSON.stringify(a);
    assert.equal(r.days.length,expectedDays(a),"giorni errati: "+label);
    const ids=r.days.flatMap(d=>d.stops.map(s=>s.id));
    assert.equal(new Set(ids).size,ids.length,"tappa duplicata: "+label);
    assert.equal(ids.length,r.total,"totale tappe incoerente: "+label);
    r.days.forEach(d=>assert.ok(d.stops.length>=1,"giornata vuota: "+label));
    if(a.duration==="half")assert.ok(ids.length<=3,"mezza giornata con più di 3 tappe: "+label);
    r.days.forEach(d=>assert.ok(d.stops.length<=r.cfg.max+1,"giornata oltre il ritmo scelto: "+label));
  }
});

test("itinerari: stesso input, stesso risultato", ()=>{
  for(const a of sampleAnswers().slice(0,60)){
    const x=JSON.stringify(buildItinerary(a)),y=JSON.stringify(buildItinerary(structuredClone(a)));
    assert.equal(x,y,"risultato non deterministico: "+JSON.stringify(a));
  }
});

test("camminata: ogni tratta oltre il limite scelto è segnalata (mezzi pubblici), le altre no", ()=>{
  for(const a of sampleAnswers()){
    const r=buildItinerary(a),lim=(WALK[a.walking]||WALK.medium).leg;
    r.days.forEach(d=>d.stops.forEach((s,i)=>{
      if(i===0){assert.equal(s.legKm,null);assert.equal(s.transit,false);return;}
      assert.equal(s.legKm,km(d.stops[i-1],s),"distanza tratta errata");
      assert.equal(s.transit,s.legKm>lim,"avviso mezzi pubblici incoerente: "+s.id+" "+JSON.stringify(a));
    }));
  }
});

test("mezza giornata e 1 giorno: tutte le tratte entro 2,5 km in linea d'aria", ()=>{
  for(const a of sampleAnswers().filter(x=>x.duration!=="multi")){
    buildItinerary(a).days[0].stops.forEach(s=>{if(s.legKm!==null)assert.ok(s.legKm<=2.5,"tratta di "+s.legKm.toFixed(1)+" km: "+JSON.stringify(a));});
  }
});

test("interessi: poche tappe fuori tema quando il catalogo offre abbastanza luoghi pertinenti", ()=>{
  let off=0,tot=0;
  for(const a of sampleAnswers()){
    const relevant=PLACES.filter(p=>a.interests.some(i=>p.cats.includes(i))).length;
    const r=buildItinerary(a);
    if(relevant<r.cfg.days*3)continue;
    r.days.forEach(d=>d.stops.forEach(s=>{tot++;if(!s.matches.length)off++;}));
  }
  assert.ok(tot>0);
  assert.ok(off/tot<0.05,"tappe fuori tema: "+(100*off/tot).toFixed(1)+"%");
});

test("momento della giornata: le giornate con luoghi serali finiscono la sera, i luoghi del mattino stanno all'inizio", ()=>{
  const isLate=(s,a)=>s.slot==="evening"||s.slot==="late"||(a.interests.includes("night")&&s.cats.includes("night"));
  let days=0,endOk=0,morning=0,morningOk=0;
  for(const a of sampleAnswers()){
    buildItinerary(a).days.forEach(d=>{
      const n=d.stops.length;if(n<3)return;
      if(d.stops.some(s=>isLate(s,a))){days++;if(isLate(d.stops[n-1],a))endOk++;}
      d.stops.forEach((s,i)=>{if(s.slot==="morning"){morning++;if(i<n/2)morningOk++;}});
    });
  }
  assert.ok(days>0&&endOk/days>=0.9,"giornate che finiscono con un luogo serale: "+endOk+"/"+days);
  assert.ok(morning>0&&morningOk/morning>=0.8,"luoghi del mattino nella prima metà: "+morningOk+"/"+morning);
});

const midMins=p=>{const t=timeRange(p);return (t[0]+t[1])/2;};
test("tempo di visita: nessuna giornata oltre il ritmo scelto, nessuna visita impegnativa accanto a una da mezza giornata", ()=>{
  for(const a of sampleAnswers()){
    const r=buildItinerary(a);
    r.days.forEach((d,i)=>{
      const mins=d.stops.reduce((t,s)=>t+midMins(s),0);
      const alone=d.stops.length===1&&timeRange(d.stops[0])[0]<=r.cfg.budget;   /* un grande museo da solo, nella durata minima */
      assert.ok(mins<=r.cfg.budget||alone,JSON.stringify(a)+" giorno "+(i+1)+": "+mins+" min su "+r.cfg.budget);
      assert.ok(d.stops.length<=r.cfg.max,"troppe tappe per il ritmo");
      const heavy=s=>midMins(s)>=90||(s.fee==="paid"&&midMins(s)>=60);
      if(d.stops.some(s=>midMins(s)>=180))assert.ok(d.stops.filter(heavy).length===1,JSON.stringify(a)+": visite impegnative accanto a una da mezza giornata");
    });
  }
});

test("camminata: il percorso di ogni giornata resta entro i km giornalieri scelti", ()=>{
  for(const a of sampleAnswers()){
    const r=buildItinerary(a);
    r.days.forEach(d=>assert.ok(d.walkKm<=r.cfg.walk.day+1e-9,JSON.stringify(a)+": "+d.walkKm.toFixed(2)+" km su "+r.cfg.walk.day));
  }
});

test("budget: è un tetto, mai superato con budget contenuto o equilibrato; nessun obbligo di spesa", ()=>{
  const byId=Object.fromEntries(PLACES.map(p=>[p.id,p]));
  for(const a of sampleAnswers()){
    const r=buildItinerary(a),q=budgetQuota(a,r.cfg.days);
    assert.equal(q.min,0);
    const spend=spendOf(r.days.flatMap(d=>d.stops.map(s=>({p:byId[s.id]}))));
    assert.ok(spend<=q.max+1e-9,JSON.stringify(a)+": spesa "+spend+" oltre il limite "+q.max);
  }
});
