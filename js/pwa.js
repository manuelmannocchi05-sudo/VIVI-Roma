/* VIVI Roma — registrazione del service worker (sw.js): sito apribile anche senza rete e installabile.
   Solo su HTTPS o localhost. Un errore qui non deve mai bloccare il sito. */
export function registerSW(){
  try{
    if(!("serviceWorker" in navigator))return;
    if(location.protocol!=="https:"&&location.hostname!=="localhost"&&location.hostname!=="127.0.0.1")return;
    /* Controllo aggiornamenti: il browser lo fa a ogni apertura; un'app installata può però restare aperta
       in secondo piano per giorni, quindi si ricontrolla quando torna in primo piano (al massimo una volta l'ora). */
    let last=Date.now();
    const go=()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).then(reg=>{
      document.addEventListener("visibilitychange",()=>{
        if(document.visibilityState!=="visible"||!navigator.onLine||Date.now()-last<3600e3)return;
        last=Date.now();reg.update().catch(()=>{});
      });
    }).catch(()=>{});
    if(document.readyState==="complete")go();else window.addEventListener("load",go,{once:true});
  }catch(e){}
}
