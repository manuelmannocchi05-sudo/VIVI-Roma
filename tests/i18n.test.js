/* Test della versione italiana e inglese: npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import {STEPS,QUIZ,WALK_OPTS} from "../js/quiz-data.js";
import {PLACES,buildItinerary,restoreItinerary} from "../js/planner.js";
import {TEXT,GLOSS,AREA,FOOD_TIPS} from "../js/data/places-en.js";
import {IT,EN,t,setLang,getLang,detectLang,LANG_KEY,qText,optText,durationLabel} from "../js/i18n.js";
import {shareText,shareUrl,decodeShare,tripTitle} from "../js/trips.js";

const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};
const FIELDS=["desc","chicca","consiglio","cost","hours","hoursNote","closed","bookingNote","when"];

test("lingua: stesse chiavi e stessi tipi in italiano e in inglese", ()=>{
  const it=Object.keys(IT),en=Object.keys(EN).filter(k=>!/^(q|walk)\./.test(k));
  assert.deepEqual(it.filter(k=>!(k in EN)),[],"chiavi senza inglese");
  assert.deepEqual(en.filter(k=>!(k in IT)),[],"chiavi solo inglesi");
  for(const k of it)assert.equal(typeof IT[k],typeof EN[k],"tipo diverso per "+k);
});

test("lingua: quiz completo in inglese", ()=>{
  setLang("en");
  for(const q of QUIZ){
    for(const f of ["name","title","sub","err"])if(q[f])assert.ok(EN["q."+q.key+"."+f],"manca q."+q.key+"."+f);
    for(const o of q.opts){const x=optText(q,o);assert.ok(x.title&&x.title!==o[2],"opzione "+q.key+"."+o[0]);if(o[3])assert.ok(x.desc,"descrizione "+q.key+"."+o[0]);}
    if(q.followUp){for(const f of ["title","err"])assert.ok(qText(q.followUp,f)!==q.followUp[f]);q.followUp.opts.forEach(o=>assert.ok(EN["q."+q.followUp.key+"."+o[0]],"manca q."+q.followUp.key+"."+o[0]));}
  }
  for(const q of QUIZ)for(const o of q.legacy||[])assert.ok(EN["q."+q.key+"."+o[0]],"opzione precedente senza inglese "+q.key+"."+o[0]);
  for(const s of STEPS)for(const f of ["name","title","sub"])assert.ok(EN["q.step."+s.id+"."+f]&&EN["q.step."+s.id+"."+f]!==s[f],"manca q.step."+s.id+"."+f);
  WALK_OPTS.forEach(w=>assert.ok(EN["walk."+w[0]]));
  setLang("it");
});

test("lingua: tutti i testi dei 77 luoghi tradotti, senza prezzi o anni inventati", ()=>{
  const nums=(s,re)=>[...s.matchAll(re)].map(m=>m[1].replace(",",".")).sort();
  let n=0;
  for(const p of PLACES){
    for(const f of FIELDS){
      if(!p[f])continue;
      const en=TEXT[p[f]];n++;
      assert.ok(en,p.id+"."+f+" senza traduzione: "+p[f]);
      assert.notEqual(en,p[f],p.id+"."+f+" identico all'italiano");
      assert.deepEqual(nums(en,/€\s?(\d+(?:[.,]\d+)?)/g),nums(p[f],/(\d+(?:[.,]\d+)?)\s?€/g),p.id+"."+f+": prezzi diversi");
      assert.deepEqual(nums(en,/\b((?:19|20)\d\d)\b/g),nums(p[f],/\b((?:19|20)\d\d)\b/g),p.id+"."+f+": anni diversi");
    }
  }
  assert.equal(n,483,"testi controllati: "+n);
  for(const k of Object.keys(GLOSS))assert.ok(PLACES.some(p=>p.id===k),"spiegazione per un luogo inesistente: "+k);
  for(const k of Object.keys(AREA))assert.ok(PLACES.some(p=>p.area===k),"zona inesistente: "+k);
  assert.equal(FOOD_TIPS.length,4);
});

test("lingua: note del motore e messaggi con parametri", ()=>{
  for(const l of ["it","en"]){
    setLang(l);
    for(const k of ["catalog","filler","lowBudget","long","closed","transit"]){
      const s=t("note."+k,{total:77,used:9,planned:12,n:2});
      assert.ok(s&&!s.startsWith("note.")&&!/undefined|NaN/.test(s),l+" note."+k);
    }
    for(const k of Object.keys(IT)){
      const v=t(k,{n:2,total:7,title:"X",label:"X",name:"X",area:"X",time:"X",km:"1",min:"1",max:"2",days:2,stops:3,date:"1",dist:"X",food:"X",url:"X",author:"X",license:"X",ints:["A","B"],list:"A · B",first:"X",last:"Y",areas:"Z",dur:"X",themes:"X",span:"X",who:"X",moods:"X",stops:3,used:1,planned:2,max:30});
      assert.ok(typeof v==="string"&&!/undefined|NaN|\[object/.test(v),l+" "+k+": "+v);
    }
  }
  setLang("it");
});

test("lingua: scelta iniziale e memoria della scelta", ()=>{
  assert.equal(detectLang(memory(),["en-US","it"]),"en");
  assert.equal(detectLang(memory(),["it-IT","en"]),"it");
  assert.equal(detectLang(memory(),["fr-FR","de"]),"it","lingua non supportata: italiano");
  assert.equal(detectLang(memory(),["fr-FR","en-GB"]),"en");
  assert.equal(detectLang(null,[]),"it");
  const mem=memory();setLang("en",mem);
  assert.equal(mem.getItem(LANG_KEY),"en");
  assert.equal(detectLang(mem,["it-IT"]),"en","la scelta salvata vince sul dispositivo");
  const broken={getItem(){throw new Error("x");},setItem(){throw new Error("x");}};
  assert.equal(setLang("it",broken),true,"senza memoria la lingua cambia lo stesso");
  assert.equal(getLang(),"it");
});

test("lingua: il motore, le tappe e i link non dipendono dalla lingua", ()=>{
  const a={company:"couple",familiarity:"first",duration:"multi",days:"3",interests:["history","food","romantic"],mood:"iconic",pace:"balanced",budget:"low",walking:"low"};
  setLang("it");const pit=buildItinerary(a),urlIt=shareUrl("https://x.org/",a,pit),txtIt=shareText(a,pit,urlIt),titIt=tripTitle(a);
  setLang("en");const pen=buildItinerary(a),urlEn=shareUrl("https://x.org/",a,pen),txtEn=shareText(a,pen,urlEn),titEn=tripTitle(a);
  assert.deepEqual(JSON.stringify(pen),JSON.stringify(pit),"stesso itinerario in entrambe le lingue");
  assert.equal(urlEn,urlIt,"stesso link");
  const back=decodeShare(urlEn.split("#itinerario=")[1]);
  assert.deepEqual(restoreItinerary(back.answers,back.days).days.map(d=>d.stops.map(s=>s.id)),pit.days.map(d=>d.stops.map(s=>s.id)));
  assert.match(txtIt,/^VIVI Roma · Roma in coppia · 3 giorni/);assert.match(txtEn,/^VIVI Roma · Rome as a couple · 3 days/);
  assert.match(txtEn,/Day 1/);assert.match(txtEn,/Open the itinerary: https:\/\/x\.org\//);
  assert.notEqual(titIt,titEn);
  assert.equal(durationLabel({duration:"half"}),"Half a day");
  setLang("it");
});
