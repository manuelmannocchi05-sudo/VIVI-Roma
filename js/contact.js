/* VIVI Roma — contatto e «Segnala un errore» via email, senza moduli né servizi esterni.

   Protezione antispam (limiti in docs/contatti.md): l'indirizzo non compare mai nell'HTML statico
   e nel codice è diviso in parti, così i raccoglitori di indirizzi che leggono le pagine con
   un'espressione regolare non lo trovano. Il link mailto: viene composto solo quando serve:
   al passaggio del mouse, al focus da tastiera, al tocco o al clic. Chi esegue JavaScript
   (o legge questo file) può comunque ricostruirlo: è una protezione leggera, non una garanzia. */

const PARTS=["viviroma.contact","gmail","com"];

export function contactAddress(){ return PARTS[0]+"@"+PARTS[1]+"."+PARTS[2]; }

/* RFC 6068: righe separate da CRLF, testo codificato con percent-encoding. */
const enc=s=>encodeURIComponent(String(s).replace(/\r?\n/g,"\r\n"));

export function mailtoUrl({subject="",body=""}={}){
  const q=[];
  if(subject)q.push("subject="+enc(subject));
  if(body)q.push("body="+enc(body));
  return "mailto:"+contactAddress()+(q.length?"?"+q.join("&"):"");
}

/* Prepara un link: l'href resta quello di riserva finché l'utente non si avvicina al link,
   poi diventa il mailto: costruito in quel momento (oggetto e testo nella lingua attiva).
   Sul clic l'href viene aggiornato prima dell'azione predefinita, quindi il primo clic funziona. */
export function armMailLink(a,build,onUse){
  const arm=()=>{ a.href=mailtoUrl(build()); };
  for(const ev of ["pointerenter","focus"])a.addEventListener(ev,arm);
  a.addEventListener("touchstart",arm,{passive:true});
  a.addEventListener("click",()=>{ arm(); if(onUse)onUse(); });
  return a;
}
