/* Test del quiz in 5 passaggi e della corrispondenza con il motore (docs/quiz-logica.md): npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import {STEPS,QUIZ,engineAnswers,moodsOf} from "../js/quiz-data.js";
import {PLACES,buildItinerary,restoreItinerary,scorePlace} from "../js/planner.js";
import {cleanAnswers,encodeShare,decodeShare,tripFromPlan,createStore,STORE_KEY} from "../js/trips.js";

const ids=plan=>plan.days.map(d=>d.stops.map(s=>s.id));
const NEW={company:"couple",familiarity:"first",duration:"multi",days:"3",interests:["history","food","romantic"],mood:["iconic","local"],pace:"balanced",budget:"mid",walking:"medium"};

test("quiz: sei passaggi, ogni domanda in un solo passaggio", ()=>{
  assert.equal(STEPS.length,6);
  const keys=STEPS.flatMap(s=>s.keys);
  assert.deepEqual([...keys].sort(),QUIZ.map(q=>q.key).sort());
  assert.equal(new Set(keys).size,keys.length);
  assert.deepEqual(STEPS.map(s=>s.keys),[["company"],["familiarity"],["duration"],["interests"],["mood"],["pace","walking","budget"]],"una domanda principale per schermata: compagnia e familiarità separate");
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
  const e=engineAnswers({...NEW,company:"family",kids:"yes"});
  assert.deepEqual(e.interests,["history","food","romantic","local","family"]);
  assert.deepEqual(engineAnswers({...NEW,company:"family",kids:"no"}).interests,["history","food","romantic","local"],"«In famiglia» non presuppone bambini piccoli");
  assert.ok(!engineAnswers({...NEW,company:"family",kids:null}).interests.includes("family"),"viaggi precedenti senza risposta: nessuna ipotesi");
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

/* ---------- Blocco B: personalizzazione con selezioni multiple ---------- */
const covered=(r,list)=>list.filter(t=>r.days.some(d=>d.stops.some(s=>s.cats.includes(t))));
const BASE={company:"couple",familiarity:"first",duration:"multi",days:"3",pace:"balanced",walking:"medium",budget:"mid"};

test("motore: più interessi bilanciati (ognuno trova spazio quando il tempo lo consente)", ()=>{
  const ints=QUIZ.find(q=>q.key==="interests").opts.map(o=>o[0]);
  let pairs=0,both=0;
  for(let i=0;i<ints.length;i++)for(let j=i+1;j<ints.length;j++){
    const a=engineAnswers({...BASE,interests:[ints[i],ints[j]],mood:["iconic"]});
    pairs++;if(covered(buildItinerary(a),[ints[i],ints[j]]).length===2)both++;
  }
  assert.equal(both,pairs,"3 giorni con due interessi: entrambi presenti in "+both+" casi su "+pairs);
  const all=buildItinerary(engineAnswers({...BASE,days:"7",interests:ints,mood:["iconic","local","peaceful","lively"],pace:"full",walking:"high",budget:"high"}));
  assert.deepEqual(covered(all,ints),ints,"tutte le opzioni, 7 giorni: tutti gli interessi presenti");
});

test("motore: più atmosfere rappresentate", ()=>{
  const moods=["iconic","local","peaceful","lively"];
  let n=0,ok=0;
  for(let i=0;i<moods.length;i++)for(let j=i+1;j<moods.length;j++)for(const ints of [["history"],["art","food"],["nature","romantic"]]){
    const r=buildItinerary(engineAnswers({...BASE,interests:ints,mood:[moods[i],moods[j]]}));
    n++;if(covered(r,[moods[i],moods[j]]).length===2)ok++;
  }
  assert.ok(ok>=n-2,"due atmosfere entrambe presenti in "+ok+" itinerari su "+n);   /* oggi 16 su 18: calma + energia a volte non trovano spazio insieme */
});

test("motore: «In famiglia» non presuppone bambini piccoli", ()=>{
  const explora=PLACES.find(p=>p.id==="explora");
  for(const ints of [["history"],["nature","art"],["history","art","religious","hidden","romantic","nature","food","night"]])
    for(const days of ["2","5","7"]){
      const r=buildItinerary(engineAnswers({...BASE,company:"family",kids:"no",days,interests:ints,mood:["peaceful"]}));
      assert.ok(!r.days.some(d=>d.stops.some(s=>s.id==="explora")),"Explora (fino a 11 anni) senza bambini: "+ints+" "+days);
    }
  const withKids=engineAnswers({...BASE,company:"family",kids:"yes",interests:["nature"],mood:["peaceful"]});
  const noKids=engineAnswers({...BASE,company:"family",kids:"no",interests:["nature"],mood:["peaceful"]});
  assert.ok(scorePlace(explora,withKids)>scorePlace(explora,noKids)+10,"con bambini piccoli i luoghi per loro tornano in gioco");
});

test("motore: vincoli rispettati con selezioni multiple", ()=>{
  const ints=QUIZ.find(q=>q.key==="interests").opts.map(o=>o[0]);
  for(const pace of ["slow","balanced","full"])for(const walking of ["low","medium","high"])for(const budget of ["low","mid","high"])for(const duration of ["half","one","multi"]){
    const a=engineAnswers({...BASE,duration,days:duration==="multi"?"4":null,pace,walking,budget,interests:ints.slice(0,5),mood:["iconic","lively"]});
    const r=buildItinerary(a);
    for(const d of r.days){
      assert.ok(d.stops.length<=r.cfg.max,"tappe entro il ritmo");
      assert.ok(d.minMins<=r.cfg.budget+1e-9,"tempo di visita entro il ritmo");
      assert.ok(d.walkKm<=r.cfg.walk.day+1e-6,"km del giorno entro la camminata scelta");
    }
  }
});
