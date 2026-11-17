/* Test del quiz in 5 passaggi e della corrispondenza con il motore (docs/quiz-logica.md): npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import {STEPS,QUIZ,engineAnswers,moodsOf} from "../js/quiz-data.js";
import {PLACES,buildItinerary,restoreItinerary,scorePlace} from "../js/planner.js";
import {cleanAnswers,encodeShare,decodeShare,tripFromPlan,createStore,STORE_KEY} from "../js/trips.js";

const ids=plan=>plan.days.map(d=>d.stops.map(s=>s.id));
const NEW={company:"couple",familiarity:"first",duration:"multi",days:"3",interests:["history","food","romantic"],mood:["iconic","local"],pace:"balanced",budget:"mid",walking:"medium"};

test("quiz: cinque passaggi, ogni domanda in un solo passaggio", ()=>{
  assert.equal(STEPS.length,5);
  const keys=STEPS.flatMap(s=>s.keys);
  assert.deepEqual([...keys].sort(),QUIZ.map(q=>q.key).sort());
  assert.equal(new Set(keys).size,keys.length);
  assert.deepEqual(STEPS[0].keys,["company","familiarity"],"la familiarità è nel primo passaggio");
  assert.deepEqual(STEPS[4].keys,["pace","walking","budget"]);
});

test("quiz: selezione multipla solo dove le risposte sono compatibili", ()=>{
  const multi=QUIZ.filter(q=>q.multi).map(q=>q.key);
  assert.deepEqual(multi,["interests","mood"]);
  for(const k of ["company","familiarity","duration","pace","walking","budget"])assert.ok(!QUIZ.find(q=>q.key===k).multi,k+" a scelta singola");
  /* opzioni ridotte: niente doppioni tra interessi e atmosfere */
  const ints=QUIZ.find(q=>q.key==="interests").opts.map(o=>o[0]);
  assert.equal(ints.length,8);
  assert.ok(!ints.includes("local")&&!ints.includes("family"));
});

test("quiz: corrispondenza con il motore", ()=>{
  const e=engineAnswers({...NEW,company:"family"});
  assert.deepEqual(e.interests,["history","food","romantic","local","family"]);
  assert.deepEqual(e.mood,["iconic","local"]);
  assert.deepEqual(NEW.interests,["history","food","romantic"],"le risposte originali non cambiano");
  const once=engineAnswers({...NEW,interests:["local","history"],mood:["local"]});
  assert.equal(once.interests.filter(i=>i==="local").length,1,"nessun doppione");
  assert.deepEqual(engineAnswers({...NEW,mood:"peaceful"}).mood,["peaceful"],"atmosfera singola delle versioni precedenti");
});

test("motore: un'atmosfera come testo o come elenco dà lo stesso itinerario", ()=>{
  for(const mood of ["iconic","local","peaceful","lively"])for(const duration of ["half","one","multi"]){
    const a={...NEW,duration,days:duration==="multi"?"4":null,mood};
    assert.deepEqual(ids(buildItinerary(a)),ids(buildItinerary({...a,mood:[mood]})),mood+" "+duration);
  }
});

test("motore: più atmosfere influenzano davvero le tappe", ()=>{
  const one={...NEW,mood:["iconic"]},two={...NEW,mood:["iconic","peaceful"]};
  for(const p of PLACES)assert.ok(scorePlace(p,two)>=scorePlace(p,one),"una seconda atmosfera non penalizza "+p.id);
  const gain=PLACES.filter(p=>scorePlace(p,two)>scorePlace(p,one));
  assert.ok(gain.length>0&&gain.every(p=>p.cats.includes("peaceful")),"premiati i luoghi della seconda atmosfera");
  let diff=0;
  for(const ints of [["history"],["art","food"],["nature"],["religious","night"]])
    if(JSON.stringify(ids(buildItinerary(engineAnswers({...one,interests:ints}))))!==JSON.stringify(ids(buildItinerary(engineAnswers({...two,interests:ints})))))diff++;
  assert.ok(diff>0,"almeno un itinerario cambia");
});

test("motore: con più interessi e atmosfere restano durata, ritmo e budget", ()=>{
  const all={...NEW,interests:QUIZ.find(q=>q.key==="interests").opts.map(o=>o[0]),mood:["iconic","local","peaceful","lively"]};
  for(const pace of ["slow","balanced","full"])for(const budget of ["low","mid","high"]){
    const a=engineAnswers({...all,pace,budget,days:"3"}),r=buildItinerary(a);
    assert.equal(r.days.length,3);
    assert.ok(r.days.every(d=>d.stops.length<=r.cfg.max),"tappe entro il ritmo");
    assert.ok(r.days.every(d=>d.minMins<=r.cfg.budget+1e-9),"tempo di visita entro il ritmo");
  }
});

test("compatibilità: viaggi e link delle versioni precedenti", ()=>{
  const OLD={company:"family",familiarity:"often",duration:"one",days:null,interests:["local","family","nature"],mood:"peaceful",pace:"slow",budget:"low",walking:"low"};
  const c=cleanAnswers(OLD);
  assert.ok(c,"le risposte del quiz a 7 domande restano valide");
  assert.deepEqual(c.interests,["local","family","nature"],"gli interessi non più proposti restano");
  assert.deepEqual(c.mood,["peaceful"]);
  /* link creato dalla versione precedente: atmosfera singola nello stesso formato */
  const plan=buildItinerary(OLD);
  const link=encodeShare(OLD,ids(plan));
  const d=decodeShare(link);
  assert.deepEqual(d.days,ids(plan));
  assert.deepEqual(ids(restoreItinerary(engineAnswers(d.answers),d.days)),ids(plan));
  /* archivio salvato dalla versione precedente */
  const m=new Map([[STORE_KEY,JSON.stringify({v:1,trips:[{v:1,id:"told",savedAt:"2026-11-10T10:00:00.000Z",title:"x",answers:OLD,days:ids(plan)}]})]]);
  const st=createStore({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)});
  const t=st.list().trips[0];
  assert.equal(t.id,"told");assert.deepEqual(t.answers.mood,["peaceful"]);
});

test("condivisione: più atmosfere nel link, andata e ritorno", ()=>{
  const plan=buildItinerary(engineAnswers(NEW));
  const d=decodeShare(encodeShare(NEW,ids(plan)));
  assert.deepEqual(d.answers.mood,["iconic","local"]);
  assert.deepEqual(d.answers.interests,NEW.interests);
  assert.deepEqual(ids(restoreItinerary(engineAnswers(d.answers),d.days)),ids(plan));
  const tr=tripFromPlan(NEW,plan);
  assert.deepEqual(tr.answers.mood,["iconic","local"]);
  assert.deepEqual(moodsOf(tr.answers),["iconic","local"]);
});
