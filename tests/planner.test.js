/* Test automatici del pianificatore e del catalogo. Avvio: npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import {PLACES,buildItinerary,km,CENTER,WALK} from "../js/planner.js";
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

test("momento della giornata: luoghi serali verso la fine, mercati verso l'inizio", ()=>{
  let late=0,lateOk=0,morning=0,morningOk=0;
  for(const a of sampleAnswers()){
    buildItinerary(a).days.forEach(d=>{
      const n=d.stops.length;if(n<3)return;
      d.stops.forEach((s,i)=>{
        if(a.interests.includes("night")&&s.cats.includes("night")){late++;if(i>=n-2)lateOk++;}
        if(s.slot==="morning"){morning++;if(i<n/2)morningOk++;}
      });
    });
  }
  assert.ok(late>0&&lateOk/late>=0.9,"luoghi serali a fine giornata: "+lateOk+"/"+late);
  assert.ok(morning>0&&morningOk/morning>=0.8,"mercati nella prima metà: "+morningOk+"/"+morning);
});
