/* VIVI Roma — "I miei viaggi" (salvataggio locale) e condivisione.
   Niente account e niente server: gli itinerari restano nel browser di questo dispositivo (localStorage).
   Si salvano le risposte del quiz e l'elenco delle tappe per giornata; schede, prezzi e orari
   vengono ricostruiti dal catalogo attuale quando l'itinerario viene riaperto. */
import {QUIZ,WALK_OPTS} from "./quiz-data.js";
import {t,durationLabel} from "./i18n.js";

export const STORE_KEY="vivi-roma:viaggi:v1";
export const MAX_TRIPS=30;
const SCHEMA=1;

/* ---------- Validazione delle risposte (dati salvati o ricevuti da un link: mai fidarsi) ---------- */
const OPTS={};QUIZ.forEach(q=>{OPTS[q.key]=q.opts.concat(q.legacy||[]).map(o=>o[0]);if(q.followUp)OPTS[q.followUp.key]=q.followUp.opts.map(o=>o[0]);});
OPTS.walking=WALK_OPTS.map(w=>w[0]);
/* Elenco di valori validi, senza doppioni. Le atmosfere seguono l'ordine del quiz (così lo stesso viaggio ha sempre la stessa firma). */
const list=(v,key)=>[...new Set((Array.isArray(v)?v:v?[v]:[]).map(String))].filter(x=>OPTS[key].includes(x));
export function cleanAnswers(x){
  if(!x||typeof x!=="object")return null;
  const one=k=>OPTS[k].includes(String(x[k]))?String(x[k]):null;
  const moods=list(x.mood,"mood");
  const a={company:one("company"),familiarity:one("familiarity"),duration:one("duration"),days:null,
    interests:list(x.interests,"interests"),
    mood:OPTS.mood.filter(m=>moods.includes(m)),pace:one("pace"),budget:one("budget"),walking:one("walking")||"medium"};
  if(a.duration==="multi")a.days=one("days");
  if(!a.company||!a.familiarity||!a.duration||(a.duration==="multi"&&!a.days)||!a.interests.length||!a.mood.length||!a.pace||!a.budget)return null;
  return a;
}
const ID=/^[a-z0-9-]{1,40}$/;
function cleanDays(d){
  if(!Array.isArray(d)||!d.length||d.length>7)return null;
  const days=d.map(g=>Array.isArray(g)?g.map(String).filter(id=>ID.test(id)).slice(0,8):[]).filter(g=>g.length);
  return days.length?days:null;
}

/* ---------- Titolo e riepilogo ---------- */
/* Titolo nella lingua attiva, ricavato dalle risposte (così cambia lingua insieme all'interfaccia). */
export function tripTitle(a){
  return t("trips.who."+a.company)+" · "+durationLabel(a);
}
export function tripFromPlan(a,plan,now=new Date()){
  return {v:SCHEMA,id:"t"+now.getTime().toString(36)+Math.random().toString(36).slice(2,6),savedAt:now.toISOString(),
    title:tripTitle(a),answers:cleanAnswers(a)||{...a,interests:[...a.interests],mood:[].concat(a.mood||[])},days:plan.days.map(d=>d.stops.map(s=>s.id))};
}
/* Stessa combinazione di risposte e tappe = stesso viaggio (per non salvarlo due volte). */
export function tripSignature(t){return JSON.stringify([t.answers,t.days]);}

/* ---------- Archivio locale ---------- */
/* storage: localStorage o un oggetto compatibile (getItem/setItem). Ogni operazione restituisce {ok,error}. */
export function createStore(storage){
  const read=()=>{
    let raw;
    try{raw=storage.getItem(STORE_KEY);}catch(e){return {ok:false,error:"unavailable",trips:[]};}
    if(!raw)return {ok:true,trips:[]};
    try{
      const data=JSON.parse(raw);
      const trips=(Array.isArray(data.trips)?data.trips:[]).map(t=>{
        const answers=cleanAnswers(t&&t.answers),days=cleanDays(t&&t.days);
        if(!answers||!days||typeof t.id!=="string")return null;
        return {v:SCHEMA,id:t.id.slice(0,40),savedAt:String(t.savedAt||""),title:String(t.title||tripTitle(answers)).slice(0,80),answers,days};
      }).filter(Boolean);
      return {ok:true,trips};
    }catch(e){
      /* archivio illeggibile: lo conserviamo a parte invece di cancellarlo */
      try{storage.setItem(STORE_KEY+":illeggibile",raw);}catch(_){}
      return {ok:false,error:"corrupt",trips:[]};
    }
  };
  const write=trips=>{
    try{storage.setItem(STORE_KEY,JSON.stringify({v:SCHEMA,trips}));return {ok:true};}
    catch(e){
      const quota=e&&(e.name==="QuotaExceededError"||e.code===22||e.code===1014);
      return {ok:false,error:quota?"quota":"unavailable"};
    }
  };
  return {
    list(){const r=read();r.trips.sort((x,y)=>y.savedAt.localeCompare(x.savedAt));return r;},
    get(id){return read().trips.find(t=>t.id===id)||null;},
    find(trip){const s=tripSignature(trip);return read().trips.find(t=>tripSignature(t)===s)||null;},
    save(trip){
      const r=read();
      if(!r.ok&&r.error==="unavailable")return {ok:false,error:"unavailable"};
      const same=r.trips.find(t=>tripSignature(t)===tripSignature(trip));
      if(same)return {ok:true,trip:same,existing:true};
      if(r.trips.length>=MAX_TRIPS)return {ok:false,error:"full"};
      const w=write(r.trips.concat(trip));
      return w.ok?{ok:true,trip}:w;
    },
    remove(id){
      const r=read();
      if(!r.ok)return {ok:false,error:r.error};
      const left=r.trips.filter(t=>t.id!==id);
      if(left.length===r.trips.length)return {ok:true,removed:false};
      const w=write(left);
      return w.ok?{ok:true,removed:true}:w;
    }
  };
}
/* Codici d'errore: il messaggio è nelle chiavi "err.*" dell'interfaccia. */
export const STORE_ERROR_CODES=["unavailable","quota","full","corrupt"];

/* ---------- Condivisione: link con l'itinerario nell'indirizzo (dopo #), nessun server ---------- */
const b64=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
const SHORT=["company","familiarity","duration","days","interests","mood","pace","budget","walking"];
export function encodeShare(a,days){
  return "1."+b64(JSON.stringify([SHORT.map(k=>k==="interests"||k==="mood"?[].concat(a[k]||[]).join(","):a[k]||""),days.map(d=>d.join(","))]));
}
export function decodeShare(str){
  try{
    const m=/^1\.([A-Za-z0-9_-]{4,4000})$/.exec(str||"");
    if(!m)return null;
    const [vals,days]=JSON.parse(unb64(m[1]));
    const raw={};SHORT.forEach((k,i)=>{raw[k]=k==="interests"||k==="mood"?String(vals[i]||"").split(",").filter(Boolean):vals[i];});
    const answers=cleanAnswers(raw);
    const d=cleanDays((days||[]).map(x=>String(x).split(",").filter(Boolean)));
    return answers&&d?{answers,days:d}:null;
  }catch(e){return null;}
}
export function shareUrl(base,a,plan){
  return base.split("#")[0]+"#itinerario="+encodeShare(a,plan.days.map(d=>d.stops.map(s=>s.id)));
}
/* Riepilogo in testo semplice: nomi delle tappe per giornata, nessuna distanza o durata inventata. */
/* Riepilogo in testo semplice nella lingua attiva. I nomi dei luoghi restano in italiano. */
export function shareText(a,plan,url){
  const lines=[t("share.title",{title:tripTitle(a)})];
  plan.days.forEach((d,i)=>{
    lines.push("");
    lines.push(plan.days.length===1?t("share.single"):t("res.day",{n:i+1}));
    d.stops.forEach((s,k)=>lines.push((k+1)+". "+s.name));
  });
  lines.push("",t("share.check"));
  if(url)lines.push(t("share.open",{url}));
  return lines.join("\n");
}
