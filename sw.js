/* VIVI Roma — service worker.
   Cosa fa:
   - Salva in anticipo l'«involucro» del sito (pagine, CSS, moduli JS con impronta ?v=, font, icone, Leaflet):
     così il sito si apre anche senza rete, i viaggi salvati si riaprono e il quiz funziona.
   - Pagine: prima la rete (con un limite di attesa), altrimenti la copia salvata.
   - File con impronta: dalla copia salvata (non cambiano mai: un nuovo contenuto ha una nuova impronta).
   - Foto (img/): copia salvata subito, aggiornata in background; al massimo IMG_MAX foto.
   - Richieste ad altri siti (tasselli OpenStreetMap, link esterni): NON intercettate. La politica OSM
     vieta l'uso offline dei suoi tasselli, quindi la mappa resta solo online.
   Aggiornamenti: l'elenco qui sotto e VERSION sono scritti da `node tools/stamp.mjs`. Quando un file cambia,
   cambia VERSION: il nuovo service worker scarica la nuova versione, prende il posto del vecchio e cancella
   le copie vecchie. La pagina già aperta non viene ricaricata (un quiz in corso non si perde): la nuova
   versione si vede alla prossima apertura. */
/* precache:start */
const VERSION="49d7c810bbdd";
const PRECACHE=["./",
 "./index.html",
 "./crediti.html",
 "./manifest.webmanifest",
 "./icon.svg",
 "./css/style.css?v=aebeb26d58",
 "./js/data/photos.js?v=adbbfc5590",
 "./js/data/places-en.js?v=c6172c315d",
 "./js/data/places.js?v=afa54f0421",
 "./js/i18n.js?v=111c7df471",
 "./js/i18n/en.js?v=35e9562508",
 "./js/i18n/it.js?v=fb224e855f",
 "./js/main.js?v=8079e8c081",
 "./js/planner.js?v=6a1e73a8a9",
 "./js/pwa.js?v=7e2ca104e0",
 "./js/quiz-data.js?v=351776df14",
 "./js/trips.js?v=303cca73c9",
 "./fonts/cormorant-garamond-latin-wght-italic.woff2",
 "./fonts/cormorant-garamond-latin-wght-normal.woff2",
 "./fonts/inter-latin-wght-normal.woff2",
 "./img/icons/apple-touch-icon.png",
 "./img/icons/icon-192.png",
 "./img/icons/icon-512.png",
 "./img/icons/icon-maskable-512.png",
 "./js/vendor/leaflet/leaflet.css",
 "./js/vendor/leaflet/leaflet.js"];
/* precache:end */
const SHELL="vivi-roma-shell-"+VERSION;
const IMAGES="vivi-roma-img-v1";
const IMG_MAX=160;
const NAV_TIMEOUT=4000;

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(SHELL);
    /* file con impronta ?v=: vanno bene anche dalla cache HTTP (già scaricati con la pagina);
       gli altri vengono riconvalidati col server (risposta 304 se invariati) */
    await cache.addAll(PRECACHE.map(u=>u.includes("?v=")?u:new Request(u,{cache:"no-cache"})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith("vivi-roma-shell-")&&k!==SHELL).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

const sameOrigin=url=>url.origin===self.location.origin;
const scopePath=new URL(self.registration.scope).pathname;

async function fromShell(request,opts){
  const cache=await caches.open(SHELL);
  return cache.match(request,opts);
}

/* Pagine: rete con limite di attesa; se la rete manca o è troppo lenta, la copia salvata. */
async function navigate(event){
  const request=event.request,url=new URL(request.url);
  const page=url.pathname.endsWith("crediti.html")?"./crediti.html":"./index.html";
  const network=fetch(request).then(async res=>{
    if(res&&res.ok&&res.type==="basic"&&!res.redirected){
      const cache=await caches.open(SHELL);
      await cache.put(url.pathname===scopePath?"./":page,res.clone());
    }
    return res;
  });
  event.waitUntil(network.catch(()=>{}));
  const cached=async()=>(await fromShell(request,{ignoreSearch:true}))||(await fromShell(page))||(await fromShell("./"));
  const timeout=new Promise(resolve=>setTimeout(()=>resolve(null),NAV_TIMEOUT));
  try{
    const first=await Promise.race([network,timeout]);
    if(first)return first;
    return (await cached())||await network;
  }catch(e){
    const c=await cached();
    if(c)return c;
    throw e;
  }
}

/* Foto: copia salvata subito, aggiornamento in background; elenco limitato alle ultime IMG_MAX. */
async function image(event){
  const request=event.request;
  const cache=await caches.open(IMAGES);
  const cached=await cache.match(request);
  const update=fetch(request).then(async res=>{
    if(res&&res.ok){
      await cache.put(request,res.clone());
      const keys=await cache.keys();
      for(let i=0;i<keys.length-IMG_MAX;i++)await cache.delete(keys[i]);
    }
    return res;
  });
  if(cached){event.waitUntil(update.catch(()=>{}));return cached;}
  return update;
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(!sameOrigin(url))return;                      /* tasselli OSM e siti esterni: solo rete */
  if(request.mode==="navigate"){event.respondWith(navigate(event));return;}
  if(url.pathname.startsWith(scopePath+"img/")&&!url.pathname.startsWith(scopePath+"img/icons/")){event.respondWith(image(event));return;}
  event.respondWith((async()=>{
    const hit=await fromShell(request);
    if(hit)return hit;
    try{return await fetch(request);}
    catch(e){const loose=await fromShell(request,{ignoreSearch:true});if(loose)return loose;throw e;}
  })());
});
