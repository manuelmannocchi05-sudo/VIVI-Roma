/* Misurazione anonima: schema degli eventi, modulo del sito, contatore su Cloudflare, script dei report. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {EVENTS,EVENT_NAMES,encodeEvent,columnOf,SCHEMA_VERSION,MAX_BODY_BYTES} from "../js/metrics-schema.js";
import {createMetrics} from "../js/metrics.js";
import {METRICS_CONFIG} from "../js/metrics-config.js";
import {QUIZ,STEPS} from "../js/quiz-data.js";
import {PLACES} from "../js/data/places.js";
import {onRequestPost,onRequest} from "../functions/api/e.js";
import {buildQueries,formatReport,parseArgs,main} from "../tools/analytics/report.mjs";

const complete={e:"quiz_complete",company:"couple",familiarity:"first",duration:"multi",days:3,
  interests:["food","art"],mood:["iconic"],pace:"balanced",walking:"medium",budget:"mid",lang:"it"};

/* ---------- schema ---------- */
test("lo schema usa esattamente i valori del quiz", ()=>{
  const Q=k=>QUIZ.find(q=>q.key===k),opts=k=>Q(k).opts.map(o=>o[0]);
  const def=EVENTS.quiz_complete.text;
  for(const k of ["company","familiarity","duration","interests","mood","pace","walking","budget"])
    assert.deepEqual(def[k][1],opts(k),k);
  assert.deepEqual(EVENTS.quiz_step.text.step[1],STEPS.map(s=>s.id));
  assert.equal(EVENTS.quiz_complete.num.days[2],Math.max(...Q("duration").followUp.opts.map(o=>Number(o[0]))));
});
test("tutti gli id dei luoghi sono accettati per ext_click", ()=>{
  for(const p of PLACES)assert.ok(encodeEvent({e:"ext_click",kind:"directions",place:p.id}),p.id);
});
test("un evento valido diventa un punto dati compatto e ordinato", ()=>{
  const pt=encodeEvent(complete);
  assert.deepEqual(pt.indexes,["quiz_complete"]);
  assert.deepEqual(pt.blobs,["quiz_complete","couple","first","multi","art+food","iconic","balanced","medium","mid","it"]);
  assert.deepEqual(pt.doubles,[SCHEMA_VERSION,3]);
  assert.ok(JSON.stringify(complete).length<MAX_BODY_BYTES/3);
  assert.equal(columnOf("quiz_complete","interests"),"blob5");
  assert.equal(columnOf("quiz_complete","days"),"double2");
  assert.equal(columnOf("ext_click","place"),"blob3");
});
test("eventi e campi fuori dallo schema vengono scartati", ()=>{
  const bad=[
    null,[],"quiz_start",{},{e:"inesistente"},{e:"__proto__"},{e:"toString"},
    {e:"quiz_start"},                                   /* campo obbligatorio mancante */
    {e:"quiz_start",lang:"fr"},                         /* valore non previsto */
    {e:"quiz_start",lang:"it",id:"abc"},                /* campo in più: un identificativo */
    {e:"quiz_start",lang:"it",ts:Date.now()},
    {e:"trip_save",email:"x@y.it"},
    {e:"quiz_step",step:"who",url:"https://x"},
    {...complete,days:8},{...complete,days:2.5},{...complete,days:"3"},
    {...complete,interests:[]},{...complete,interests:["art","art"]},{...complete,interests:"art"},
    {...complete,mood:["Roma"]},
    {e:"ext_click",kind:"directions",place:"Via Roma 1"},
    {e:"ext_click",kind:"directions",place:"a".repeat(30)},
    {e:"ext_click",kind:"directions",place:"x@y.it"},
    {e:"result_view",source:"quiz",days:0,stops:3},
    {e:"share",method:"email"}
  ];
  for(const b of bad)assert.equal(encodeEvent(b),null,JSON.stringify(b));
});
test("ogni evento dichiarato ha un esempio valido e nessun campo di testo libero", ()=>{
  for(const name of EVENT_NAMES){
    const def=EVENTS[name];
    for(const type of Object.values(def.text))assert.ok(["one","set","id"].includes(type[0]),name);
    for(const type of Object.values(def.num))assert.equal(type[0],"int",name);
  }
});

/* ---------- modulo del sito ---------- */
function fakeWin({hostname="vivi-roma.pages.dev",protocol="https:",search="",gpc=false,beacon=true}={}){
  const sent=[],head=[];
  const win={
    location:{hostname,protocol,search},
    navigator:{globalPrivacyControl:gpc,sendBeacon:beacon?(url,body)=>{sent.push({url,body});return true;}:undefined},
    fetch:(url,o)=>{sent.push({url,body:o.body,fetch:o});return Promise.resolve({});},
    document:{querySelector:()=>null,createElement:()=>{const a={};return {setAttribute:(k,v)=>{a[k]=v;},attrs:a};},head:{append:n=>head.push(n)}}
  };
  return {win,sent,head};
}
const cfg=o=>({...METRICS_CONFIG,...o});

test("configurazione predefinita: tutto spento", ()=>{
  assert.equal(METRICS_CONFIG.events,false);
  assert.equal(METRICS_CONFIG.webAnalyticsToken,"");
  const {win,sent,head}=fakeWin();
  const m=createMetrics({win});
  assert.equal(m.sending,false);
  assert.equal(m.track("quiz_start",{lang:"it"}),true);      /* valido, ma non inviato */
  assert.equal(sent.length,0);
  assert.equal(m.startWebAnalytics(),false);
  assert.equal(head.length,0);
});
test("attivo in produzione: invia solo eventi validi, con sendBeacon", async ()=>{
  const {win,sent}=fakeWin();
  const m=createMetrics({win,config:cfg({events:true})});
  assert.equal(m.sending,true);
  assert.equal(m.track("quiz_step",{step:"mood"}),true);
  assert.equal(m.track("quiz_step",{step:"mood",userId:"42"}),false);
  assert.equal(m.track("evento_finto"),false);
  assert.equal(sent.length,1);
  assert.equal(sent[0].url,"/api/e");
  assert.deepEqual(JSON.parse(await sent[0].body.text()),{e:"quiz_step",step:"mood"});
});
test("senza sendBeacon usa fetch keepalive senza credenziali", ()=>{
  const {win,sent}=fakeWin({beacon:false});
  createMetrics({win,config:cfg({events:true})}).track("print");
  assert.equal(sent.length,1);
  assert.equal(sent[0].fetch.keepalive,true);
  assert.equal(sent[0].fetch.credentials,"omit");
});
test("mai in locale, in http o con Global Privacy Control", ()=>{
  for(const opt of [{hostname:"localhost",protocol:"http:"},{hostname:"127.0.0.1"},{protocol:"http:"},{gpc:true},{hostname:"abc.vivi-roma.pages.dev"}]){
    const {win,sent}=fakeWin(opt);
    const m=createMetrics({win,config:cfg({events:true,webAnalyticsToken:"tok"})});
    m.track("print");
    assert.equal(sent.length,0,JSON.stringify(opt));
    assert.equal(m.startWebAnalytics(),false,JSON.stringify(opt));
  }
});
test("?metricstest forza l'invio in locale ma non carica Web Analytics; GPC vince comunque", ()=>{
  const a=fakeWin({hostname:"localhost",protocol:"http:",search:"?metricstest"});
  const m=createMetrics({win:a.win,config:cfg({webAnalyticsToken:"tok"})});
  m.track("print");
  assert.equal(a.sent.length,1);
  assert.equal(m.startWebAnalytics(),false);
  const b=fakeWin({hostname:"localhost",protocol:"http:",search:"?metricstest",gpc:true});
  createMetrics({win:b.win}).track("print");
  assert.equal(b.sent.length,0);
});
test("eventi una tantum e limite per pagina", ()=>{
  const {win,sent}=fakeWin();
  const m=createMetrics({win,config:cfg({events:true,maxEvents:5})});
  assert.equal(m.track("quiz_start",{lang:"it"}),true);
  assert.equal(m.track("quiz_start",{lang:"en"}),false);
  for(let i=0;i<10;i++)m.track("print");
  assert.equal(sent.length,5);
});
test("?vivitest registra gli eventi in window.__viviEvents senza inviarli", ()=>{
  const {win,sent}=fakeWin({hostname:"localhost",protocol:"http:",search:"?vivitest"});
  const m=createMetrics({win});
  m.track("lang_switch",{to:"en"});
  assert.deepEqual(win.__viviEvents,[{e:"lang_switch",to:"en"}]);
  assert.equal(sent.length,0);
});
test("Web Analytics: snippet manuale con token e spa disattivato, una sola volta", ()=>{
  const {win,head}=fakeWin();
  const m=createMetrics({win,config:cfg({webAnalyticsToken:"abc123"})});
  assert.equal(m.startWebAnalytics(),true);
  assert.equal(head.length,1);
  assert.equal(head[0].src,"https://static.cloudflareinsights.com/beacon.min.js");
  assert.equal(head[0].defer,true);
  assert.deepEqual(JSON.parse(head[0].attrs["data-cf-beacon"]),{token:"abc123",spa:false});
});
test("un errore di rete non interrompe l'app", ()=>{
  const {win}=fakeWin();
  win.navigator.sendBeacon=()=>{throw new Error("rete");};
  assert.doesNotThrow(()=>createMetrics({win,config:cfg({events:true})}).track("print"));
});

/* ---------- contatore (functions/api/e.js) ---------- */
const req=(body,{origin="https://vivi-roma.pages.dev",headers={}}={})=>new Request("https://vivi-roma.pages.dev/api/e",{
  method:"POST",body:typeof body==="string"?body:JSON.stringify(body),
  headers:{"content-type":"application/json",...(origin?{origin}:{}),"cf-connecting-ip":"203.0.113.7","user-agent":"Test/1.0",...headers}});
const dataset=()=>{const points=[];return {points,env:{VIVI_EVENTS:{writeDataPoint:p=>points.push(p)}}};};

test("contatore: evento valido → 204 e un punto dati senza IP né user agent", async ()=>{
  const d=dataset();
  const r=await onRequestPost({request:req(complete),env:d.env});
  assert.equal(r.status,204);
  assert.equal(r.headers.get("cache-control"),"no-store");
  assert.equal(d.points.length,1);
  const s=JSON.stringify(d.points[0]);
  assert.ok(!s.includes("203.0.113.7")&&!s.includes("Test/1.0"));
  assert.deepEqual(d.points[0],encodeEvent(complete));
});
test("contatore: richieste non valide rifiutate, nulla salvato", async ()=>{
  const d=dataset();
  const cases=[
    [req("non json"),400],[req({e:"quiz_start",lang:"it",ip:"1.2.3.4"}),400],[req({e:"x"}),400],
    [req({e:"print"},{origin:"https://altro-sito.example"}),403],
    [req("x".repeat(MAX_BODY_BYTES+1)),413],
    [req({e:"print"},{headers:{"content-length":"99999"}}),413]
  ];
  for(const [r,status] of cases)assert.equal((await onRequestPost({request:r,env:d.env})).status,status);
  assert.equal(d.points.length,0);
});
test("contatore: senza collegamento VIVI_EVENTS risponde 204 e non salva", async ()=>{
  assert.equal((await onRequestPost({request:req({e:"print"}),env:{}})).status,204);
  assert.equal((await onRequestPost({request:req({e:"print"},{origin:null}),env:undefined})).status,204);
});
test("contatore: errore di Analytics Engine non arriva al sito; altri metodi → 405", async ()=>{
  const env={VIVI_EVENTS:{writeDataPoint:()=>{throw new Error("quota");}}};
  assert.equal((await onRequestPost({request:req({e:"print"}),env})).status,204);
  const r=onRequest();assert.equal(r.status,405);assert.equal(r.headers.get("allow"),"POST");
});
test("contatore: il codice non legge IP, user agent, cookie o referrer", ()=>{
  const src=fs.readFileSync(new URL("../functions/api/e.js",import.meta.url),"utf8").replace(/\/\*[\s\S]*?\*\//g,"");
  for(const h of ["cf-connecting-ip","x-forwarded-for","user-agent","cookie","referer","request.cf"])assert.ok(!src.toLowerCase().includes(h),h);
});

/* ---------- report ---------- */
test("report: opzioni, query e nessun valore esterno nelle query", ()=>{
  assert.deepEqual(parseArgs([]),{days:28,dataset:"vivi_roma_events",dryRun:false});
  assert.deepEqual(parseArgs(["--giorni","7","--dry-run"]),{days:7,dataset:"vivi_roma_events",dryRun:true});
  assert.throws(()=>parseArgs(["--giorni","0"]));
  assert.throws(()=>parseArgs(["--dataset","x; DROP"]));
  assert.throws(()=>parseArgs(["--token","x"]));
  const q=buildQueries({days:7,dataset:"vivi_roma_events"});
  assert.ok(q.every(x=>x.sql.includes("INTERVAL '7' DAY")&&x.sql.includes("SUM(_sample_interval)")));
  assert.ok(q.find(x=>x.id==="passaggi").sql.includes("blob2")&&q.find(x=>x.id==="passaggi").sql.includes("index1 = 'quiz_step'"));
});
test("report: imbuto e tabelle in Markdown", ()=>{
  const md=formatReport({
    eventi:[{valore:"quiz_start",n:200},{valore:"quiz_complete",n:120},{valore:"result_view",n:150},{valore:"trip_save",n:30},{valore:"share",n:15}],
    passaggi:[{valore:"know",n:180},{valore:"mood",n:140}],
    durata:[{valore:"one",n:70},{valore:"multi",n:50}]
  },{days:28});
  assert.match(md,/\| Quiz avviati \| 200 \| 100% \|/);
  assert.match(md,/\| Arrivati a «know» \| 180 \| 90,0% \|/);
  assert.match(md,/\| Quiz completati \| 120 \| 60,0% \|/);
  assert.match(md,/\| Salvati \| 30 \| 20,0% \|/);
  assert.match(md,/## Quiz completati per durata[\s\S]*\| one \| 70 \|/);
  assert.match(md,/## Condivisioni per metodo\n\nNessun dato\./);
});
test("report: senza credenziali si ferma; con credenziali interroga solo l'API SQL", async ()=>{
  await assert.rejects(main([],{},()=>{throw new Error("nessuna rete");},()=>{}),/CF_ACCOUNT_ID/);
  const calls=[];
  const fakeFetch=async(url,o)=>{calls.push({url,o});return {ok:true,status:200,text:async()=>JSON.stringify({data:[{valore:"quiz_start",n:"3"}]})};};
  const md=await main(["--giorni","7"],{CF_ACCOUNT_ID:"acc",CF_API_TOKEN:"tok"},fakeFetch,()=>{});
  assert.ok(calls.length>=10);
  assert.ok(calls.every(c=>c.url==="https://api.cloudflare.com/client/v4/accounts/acc/analytics_engine/sql"&&c.o.headers.authorization==="Bearer tok"&&c.o.body.endsWith(" FORMAT JSON")));
  assert.match(md,/ultimi 7 giorni/);
  const out=[];await main(["--dry-run"],{},null,s=>out.push(s));
  assert.equal(out.length,buildQueries({days:28,dataset:"x"}).length);
});
