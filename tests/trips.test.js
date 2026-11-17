/* Test di "I miei viaggi" e della condivisione: npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import {buildItinerary,restoreItinerary,PLACES} from "../js/planner.js";
import {createStore,tripFromPlan,encodeShare,decodeShare,shareText,shareUrl,cleanAnswers,STORE_KEY,MAX_TRIPS} from "../js/trips.js";

const A={company:"couple",familiarity:"first",duration:"multi",days:"3",interests:["history","art","romantic"],mood:"iconic",pace:"balanced",budget:"mid",walking:"medium"};
const B={...A,company:"family",duration:"one",days:null,interests:["nature","family"],pace:"slow",walking:"low",budget:"low"};
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),m};};
const ids=plan=>plan.days.map(d=>d.stops.map(s=>s.id));

test("viaggi: salva, ritrova dopo la «riapertura», più viaggi, nessun doppione", ()=>{
  const mem=memory();
  const pa=buildItinerary(A),pb=buildItinerary(B);
  assert.ok(createStore(mem).save(tripFromPlan(A,pa,new Date("2026-11-17T09:00:00Z"))).ok);
  assert.ok(createStore(mem).save(tripFromPlan(B,pb,new Date("2026-11-17T10:00:00Z"))).ok);
  const again=createStore(mem).save(tripFromPlan(A,pa));
  assert.ok(again.ok&&again.existing,"lo stesso itinerario non va salvato due volte");
  const list=createStore(mem).list();          /* nuovo archivio sullo stesso storage = app riaperta */
  assert.equal(list.trips.length,2);
  assert.equal(list.trips[0].answers.company,"family","il più recente per primo");
  const t=list.trips.find(x=>x.answers.company==="couple");
  assert.deepEqual(t.days,ids(pa));
  assert.deepEqual(ids(restoreItinerary(t.answers,t.days)),ids(pa),"riaperto senza quiz: stesse tappe nello stesso ordine");
});

test("viaggi: eliminazione", ()=>{
  const mem=memory(),st=createStore(mem);
  const t=st.save(tripFromPlan(A,buildItinerary(A))).trip;
  st.save(tripFromPlan(B,buildItinerary(B)));
  assert.deepEqual(st.remove(t.id),{ok:true,removed:true});
  assert.equal(st.list().trips.length,1);
  assert.equal(st.get(t.id),null);
  assert.deepEqual(st.remove("inesistente"),{ok:true,removed:false});
});

test("viaggi: errori di salvataggio gestiti senza perdere dati", ()=>{
  const broken={getItem(){throw new Error("SecurityError");},setItem(){throw new Error("SecurityError");}};
  assert.deepEqual(createStore(broken).save(tripFromPlan(A,buildItinerary(A))),{ok:false,error:"unavailable"});
  assert.equal(createStore(broken).list().trips.length,0);
  const full=memory();full.setItem=(k,v)=>{const e=new Error("pieno");e.name="QuotaExceededError";throw e;};
  assert.equal(createStore(full).save(tripFromPlan(A,buildItinerary(A))).error,"quota");
  const bad=memory();bad.setItem(STORE_KEY,"{non json");
  const r=createStore(bad).list();
  assert.equal(r.ok,false);assert.equal(r.error,"corrupt");
  assert.equal(bad.m.get(STORE_KEY+":illeggibile"),"{non json","l'archivio illeggibile viene conservato");
  const mem=memory(),st=createStore(mem);
  for(let i=0;i<MAX_TRIPS;i++){const t=tripFromPlan(A,buildItinerary(A));t.days=[[PLACES[i].id]];assert.ok(st.save(t).ok);}
  assert.equal(st.save(tripFromPlan(B,buildItinerary(B))).error,"full");
  mem.setItem(STORE_KEY,JSON.stringify({v:1,trips:[{id:"x",answers:{company:"hacker"},days:[["colosseo"]]},{id:"y",answers:A,days:[["colosseo","<script>"]]}]}));
  const ok=createStore(mem).list().trips;
  assert.equal(ok.length,1,"voci non valide scartate");assert.deepEqual(ok[0].days,[["colosseo"]]);
});

test("condivisione: il link riapre lo stesso itinerario; dati estranei rifiutati", ()=>{
  for(const a of [A,B]){
    const plan=buildItinerary(a);
    const url=shareUrl("https://example.org/vivi/#crea",a,plan);
    assert.match(url,/^https:\/\/example\.org\/vivi\/#itinerario=1\./);
    const back=decodeShare(url.split("#itinerario=")[1]);
    assert.deepEqual(back.answers,cleanAnswers(a));
    assert.deepEqual(ids(restoreItinerary(back.answers,back.days)),ids(plan));
    const text=shareText(a,plan,url);
    plan.days.flatMap(d=>d.stops).forEach(s=>assert.ok(text.includes(s.name)));
    assert.ok(!/\bkm\b|minut|\bore\b/.test(text),"il riepilogo non inventa distanze o tempi");
  }
  assert.equal(decodeShare("1.!!!"),null);
  assert.equal(decodeShare("2.abc"),null);
  assert.equal(decodeShare(encodeShare({...A,pace:"turbo"},[["colosseo"]])),null);
  const r=restoreItinerary(A,[["colosseo","luogo-sparito","colosseo"]]);
  assert.deepEqual(ids(r),[["colosseo"]]);assert.deepEqual(r.missing,["luogo-sparito"]);
});
