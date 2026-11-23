/* VIVI Roma — contatore anonimo degli eventi (Cloudflare Pages Functions → Workers Analytics Engine).
   POST /api/e con un evento JSON descritto in js/metrics-schema.js → 204.
   Non legge né salva indirizzo IP, user agent, URL di provenienza o cookie: scrive solo i valori dello schema.
   Senza il collegamento VIVI_EVENTS (non ancora configurato) controlla l'evento e non salva nulla. */
import {encodeEvent,MAX_BODY_BYTES} from "../../js/metrics-schema.js";

const HEADERS={"cache-control":"no-store","x-content-type-options":"nosniff"};
const reply=(status)=>new Response(null,{status,headers:HEADERS});

export async function onRequestPost({request,env}){
  /* Solo dal sito stesso: un Origin diverso dall'host richiesto viene rifiutato. */
  const origin=request.headers.get("origin");
  if(origin){
    let same=false;
    try{same=new URL(origin).host===new URL(request.url).host;}catch(e){}
    if(!same)return reply(403);
  }
  const declared=Number(request.headers.get("content-length")||0);
  if(declared>MAX_BODY_BYTES)return reply(413);
  let text;
  try{text=await request.text();}catch(e){return reply(400);}
  if(new TextEncoder().encode(text).length>MAX_BODY_BYTES)return reply(413);
  let ev;
  try{ev=JSON.parse(text);}catch(e){return reply(400);}
  const point=encodeEvent(ev);
  if(!point)return reply(400);
  const dataset=env&&env.VIVI_EVENTS;
  if(dataset&&typeof dataset.writeDataPoint==="function"){
    try{dataset.writeDataPoint(point);}catch(e){/* il contatore non deve mai rispondere con errori al sito */}
  }
  return reply(204);
}

export function onRequest(){
  return new Response(null,{status:405,headers:{...HEADERS,allow:"POST"}});
}
