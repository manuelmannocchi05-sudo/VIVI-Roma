/* VIVI Roma — elenco chiuso degli eventi anonimi di misurazione.
   Lo stesso file è usato dal sito (js/metrics.js) e dal contatore su Cloudflare (functions/api/e.js):
   ciò che non è descritto qui viene scartato da entrambi.

   Regole di minimizzazione:
   - nessun identificativo (né utente, né sessione, né dispositivo), nessun orario dal browser;
   - nessun testo libero: solo valori presi da elenchi fissi, numeri piccoli o id dei luoghi del catalogo;
   - nessun URL, referrer, user agent o indirizzo IP (il contatore non li legge).

   Formato in Workers Analytics Engine (un punto dati per evento):
   index1 = nome evento; blob1 = nome evento; blob2… = campi testuali nell'ordine di `text`;
   double1 = versione dello schema; double2… = campi numerici nell'ordine di `num`. */

export const SCHEMA_VERSION=1;
export const MAX_BODY_BYTES=1024;          /* un evento valido pesa meno di 300 byte */

const LANG=["it","en"];
const STEP=["who","kids","know","time","interests","mood","practical"];
const COMPANY=["solo","couple","friends","family"];
const FAMILIARITY=["first","often"];
const DURATION=["half","one","multi"];
const INTERESTS=["history","art","religious","hidden","romantic","nature","food","night"];
const MOOD=["iconic","local","peaceful","lively"];
const PACE=["slow","balanced","full"];
const WALKING=["low","medium","high"];
const BUDGET=["low","mid","high"];
const PLACE_ID=/^[a-z0-9]{2,24}$/;

/* Tipi di campo:
   ["one", elenco]   un valore dell'elenco
   ["set", elenco]   più valori dell'elenco, salvati ordinati e uniti da "+" (es. "art+food")
   ["id"]            id di un luogo del catalogo (solo lettere minuscole e cifre)
   ["int", min, max] numero intero nell'intervallo */
export const EVENTS={
  quiz_start:   {text:{lang:["one",LANG]},num:{}},
  quiz_step:    {text:{step:["one",STEP]},num:{}},
  quiz_complete:{text:{company:["one",COMPANY],familiarity:["one",FAMILIARITY],duration:["one",DURATION],
                       interests:["set",INTERESTS],mood:["set",MOOD],pace:["one",PACE],walking:["one",WALKING],
                       budget:["one",BUDGET],lang:["one",LANG]},
                 num:{days:["int",0,7]}},
  result_view:  {text:{source:["one",["quiz","saved","link"]]},num:{days:["int",1,7],stops:["int",0,60]}},
  trip_save:    {text:{},num:{}},
  print:        {text:{},num:{}},
  share:        {text:{method:["one",["native","copy","manual"]]},num:{}},
  share_open:   {text:{},num:{}},
  ext_click:    {text:{kind:["one",["directions","osm","wiki"]],place:["id"]},num:{}},
  map_view:     {text:{kind:["one",["vector","raster"]]},num:{}},
  map_offline:  {text:{},num:{}},
  lang_switch:  {text:{to:["one",LANG]},num:{}}
};
export const EVENT_NAMES=Object.keys(EVENTS);

function textValue(type,v){
  const [kind,list]=type;
  if(kind==="one")return typeof v==="string"&&list.includes(v)?v:null;
  if(kind==="set"){
    if(!Array.isArray(v)||!v.length||v.length>list.length)return null;
    if(!v.every(x=>typeof x==="string"&&list.includes(x))||new Set(v).size!==v.length)return null;
    return list.filter(x=>v.includes(x)).join("+");
  }
  if(kind==="id")return typeof v==="string"&&PLACE_ID.test(v)?v:null;
  return null;
}
function numValue(type,v){
  const [,min,max]=type;
  return Number.isInteger(v)&&v>=min&&v<=max?v:null;
}

/* Controlla un evento {e, ...campi}. Restituisce il punto dati per Analytics Engine, oppure null.
   Ogni campo dichiarato è obbligatorio; un campo in più rende l'evento non valido. */
export function encodeEvent(ev){
  if(!ev||typeof ev!=="object"||Array.isArray(ev))return null;
  const def=Object.prototype.hasOwnProperty.call(EVENTS,ev.e)?EVENTS[ev.e]:null;
  if(!def)return null;
  const allowed=["e",...Object.keys(def.text),...Object.keys(def.num)];
  if(Object.keys(ev).some(k=>!allowed.includes(k)))return null;
  const blobs=[ev.e],doubles=[SCHEMA_VERSION];
  for(const [k,type] of Object.entries(def.text)){const v=textValue(type,ev[k]);if(v===null)return null;blobs.push(v);}
  for(const [k,type] of Object.entries(def.num)){const v=numValue(type,ev[k]);if(v===null)return null;doubles.push(v);}
  return {indexes:[ev.e],blobs,doubles};
}

/* Nome della colonna di Analytics Engine per un campo di un evento (usato dallo script dei report). */
export function columnOf(name,field){
  const def=EVENTS[name];if(!def)return null;
  const ti=Object.keys(def.text).indexOf(field);if(ti>=0)return "blob"+(ti+2);
  const ni=Object.keys(def.num).indexOf(field);if(ni>=0)return "double"+(ni+2);
  return null;
}
