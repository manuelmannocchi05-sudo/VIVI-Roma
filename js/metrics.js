/* VIVI Roma — misurazione anonima: eventi del quiz e Cloudflare Web Analytics.
   - Nessun cookie, nessun localStorage, nessun identificativo: ogni evento è un fatto isolato.
   - Solo gli eventi e i valori di js/metrics-schema.js; il contatore li ricontrolla.
   - Spento per impostazione (js/metrics-config.js), fuori dagli indirizzi di produzione
     e quando il browser segnala Global Privacy Control.
   - Un errore di rete non interrompe mai l'app: l'evento si perde in silenzio. */
import {encodeEvent} from "./metrics-schema.js";
import {METRICS_CONFIG} from "./metrics-config.js";

/* Eventi registrati al massimo una volta per pagina caricata. */
const ONCE=new Set(["quiz_start","map_view","share_open","map_offline"]);
const BEACON_SRC="https://static.cloudflareinsights.com/beacon.min.js";

export function createMetrics({config=METRICS_CONFIG,win=globalThis}={}){
  const loc=win.location||{},nav=win.navigator||{};
  const search=String(loc.search||"");
  const testHook=/[?&]vivitest\b/.test(search);       /* test automatici: eventi visibili in window.__viviEvents */
  const forceSend=/[?&]metricstest\b/.test(search);   /* prova del contatore in locale (wrangler): invio forzato */
  const gpc=nav.globalPrivacyControl===true;
  const onHost=(config.hosts||[]).includes(loc.hostname)&&loc.protocol==="https:";
  const sending=!gpc&&((config.events&&onHost)||forceSend);
  const seen=new Set();let count=0;
  if(testHook)win.__viviEvents=[];

  function send(body){
    try{
      if(typeof nav.sendBeacon==="function"&&nav.sendBeacon(config.endpoint,new Blob([body],{type:"application/json"})))return;
      if(typeof win.fetch==="function")win.fetch(config.endpoint,{method:"POST",body,headers:{"content-type":"application/json"},keepalive:true,credentials:"omit"}).catch(()=>{});
    }catch(e){/* la misurazione non deve mai rompere l'app */}
  }

  /* track("quiz_step",{step:"mood"}) → true se l'evento è valido e accettato (inviato o registrato). */
  function track(name,fields={}){
    if(ONCE.has(name)&&seen.has(name))return false;
    const ev={e:name,...fields};
    if(!encodeEvent(ev))return false;              /* fuori dallo schema: scartato prima di uscire dal browser */
    if(count>=config.maxEvents)return false;
    count++;seen.add(name);
    if(testHook)win.__viviEvents.push(ev);
    if(sending)send(JSON.stringify(ev));
    return true;
  }

  /* Cloudflare Web Analytics, snippet manuale, caricato quando la pagina è già pronta.
     "spa":false: la navigazione con # non va contata come pagine separate (le sezioni sono misurate dagli eventi). */
  function startWebAnalytics(){
    const doc=win.document;
    if(!doc||!config.webAnalyticsToken||!onHost||gpc||forceSend)return false;
    if(doc.querySelector&&doc.querySelector('script[src^="'+BEACON_SRC+'"]'))return false;
    const s=doc.createElement("script");
    s.defer=true;s.src=BEACON_SRC;
    s.setAttribute("data-cf-beacon",JSON.stringify({token:config.webAnalyticsToken,spa:false}));
    doc.head.append(s);
    return true;
  }

  return {track,startWebAnalytics,get sending(){return sending;}};
}

const metrics=createMetrics();
export const track=metrics.track;
export const startWebAnalytics=metrics.startWebAnalytics;
