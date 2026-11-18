/* VIVI Roma — lingue (italiano, inglese).
   - t(chiave, parametri): testo dell'interfaccia nella lingua attiva (js/i18n/it.js, js/i18n/en.js).
   - quiz: in italiano i testi sono in js/quiz-data.js; in inglese nelle chiavi "q.*" e "walk.*" di en.js.
   - luoghi: il catalogo è in italiano (js/data/places.js); in inglese i testi passano da js/data/places-en.js.
   - lingua iniziale: scelta salvata, altrimenti preferenze del dispositivo, altrimenti italiano.
   La lingua cambia solo i testi: motore, tappe, budget, distanze, salvataggi e link restano identici. */
import IT from "./i18n/it.js";
import {QUIZ,moodsOf} from "./quiz-data.js";
/* L'inglese (interfaccia e luoghi, ~85 KB) si scarica solo quando serve: loadLang("en") prima di setLang("en").
   Finché non è arrivato, i testi restano in italiano: nessuna chiave vuota. */
let EN={},PLACE_TEXT={},GLOSS={},AREA={},FOOD_EN=[];
let enP=null;
export function loadLang(l){
  if(l!=="en")return Promise.resolve(true);
  if(!enP)enP=Promise.all([import("./i18n/en.js"),import("./data/places-en.js")]).then(([d,p])=>{
    EN=d.default;PLACE_TEXT=p.TEXT;GLOSS=p.GLOSS;AREA=p.AREA;FOOD_EN=p.FOOD_TIPS;return true;
  }).catch(()=>{enP=null;return false;});
  return enP;
}
export const langReady=l=>l!=="en"||FOOD_EN.length>0;

export const LANGS=["it","en"];
export const LANG_KEY="vivi-roma:lingua";
let lang="it";
const listeners=[];

/* Lingua salvata → preferenze del dispositivo (prima lingua supportata) → italiano. */
export function detectLang(storage,languages){
  try{const saved=storage&&storage.getItem(LANG_KEY);if(LANGS.includes(saved))return saved;}catch(e){}
  for(const l of languages||[]){const c=String(l).toLowerCase().slice(0,2);if(LANGS.includes(c))return c;}
  return "it";
}
export function getLang(){return lang;}
export function setLang(l,storage){
  if(!LANGS.includes(l))return false;
  lang=l;
  try{storage&&storage.setItem(LANG_KEY,l);}catch(e){}   /* senza memoria la lingua vale solo per questa visita */
  listeners.forEach(f=>f(l));
  return true;
}
export function onLangChange(f){listeners.push(f);}
export function locale(){return lang==="en"?"en-GB":"it-IT";}

export function t(key,params){
  let v=(lang==="en"?EN:IT)[key];
  if(v===undefined)v=IT[key];
  if(v===undefined)return key;
  return typeof v==="function"?v(params||{}):v;
}
/* numero con una cifra decimale: 1,5 in italiano, 1.5 in inglese */
export function num1(x){const s=(Math.round(x*10)/10).toFixed(1);return lang==="en"?s:s.replace(".",",");}
export function numHalf(m){const h=Math.round(m/30)/2;return lang==="en"?String(h):String(h).replace(".",",");}

/* ---------- quiz ---------- */
export function qText(q,field){return lang==="en"&&EN["q."+q.key+"."+field]!==undefined?EN["q."+q.key+"."+field]:q[field];}
export function optText(q,o){
  const en=lang==="en"?EN["q."+q.key+"."+o[0]]:null;
  return en?{title:en[0],desc:en[1],short:en[2]||en[0]}:{title:o[2],desc:o[3],short:o[4]||o[2]};
}
/* testi di un passaggio del quiz (titolo, sottotitolo, nome breve) */
export function stepText(s,field){return lang==="en"&&EN["q.step."+s.id+"."+field]!==undefined?EN["q.step."+s.id+"."+field]:s[field];}
export function walkText(w){return lang==="en"&&EN["walk."+w[0]]?EN["walk."+w[0]]:w[1];}
const OPTS={};QUIZ.forEach(q=>{OPTS[q.key]=q;if(q.followUp)OPTS[q.followUp.key]=q.followUp;});
/* etichetta breve di una risposta (es. "In coppia" / "As a couple"), anche per le opzioni delle versioni precedenti */
export function answerLabel(key,value){
  const q=OPTS[key];const o=q&&q.opts.concat(q.legacy||[]).find(x=>x[0]===value);
  return o?optText(q,o).short:String(value);
}
export function moodLabels(a){return moodsOf(a).map(m=>answerLabel("mood",m));}
export function durationLabel(a){
  return a.duration==="half"?t("label.duration.half"):a.duration==="one"?t("label.duration.one"):t("label.duration.days",{n:a.days});
}
export function paceLabel(p){return t("label.pace."+p);}

/* ---------- luoghi ---------- */
export function placeText(s){return lang==="en"&&s&&PLACE_TEXT[s]?PLACE_TEXT[s]:s;}
export function placeGloss(p){return lang==="en"&&GLOSS[p.id]?GLOSS[p.id]:"";}
export function areaText(a){return lang==="en"&&AREA[a]?AREA[a]:a;}
export function foodTip(day,itTip){return lang==="en"&&FOOD_EN.length?FOOD_EN[day.index%FOOD_EN.length]:itTip;}

/* ---------- testi statici della pagina: data-i18n="chiave", data-i18n-attr="attributo:chiave;…" ---------- */
export function applyStatic(root){
  root.querySelectorAll("[data-i18n]").forEach(n=>{n.textContent=t(n.dataset.i18n);});
  root.querySelectorAll("[data-i18n-attr]").forEach(n=>{
    n.dataset.i18nAttr.split(";").forEach(pair=>{const [attr,key]=pair.split(":");if(attr&&key)n.setAttribute(attr.trim(),t(key.trim()));});
  });
}
export {IT,EN};
