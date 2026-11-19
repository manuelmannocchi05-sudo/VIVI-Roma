/* VIVI Roma — registrazione del service worker (sw.js): sito apribile anche senza rete e installabile.
   Solo su HTTPS o localhost. Un errore qui non deve mai bloccare il sito. */
export function registerSW(){
  try{
    if(!("serviceWorker" in navigator))return;
    if(location.protocol!=="https:"&&location.hostname!=="localhost"&&location.hostname!=="127.0.0.1")return;
    const go=()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});
    if(document.readyState==="complete")go();else window.addEventListener("load",go,{once:true});
  }catch(e){}
}
