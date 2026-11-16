/* VIVI Roma — interfaccia: quiz, risultati, foto, mappa, navigazione. */
import {PLACES,buildItinerary} from "./planner.js";
import {QUIZ,WALK_OPTS,LABELS,durationLabel,PACE_LABEL} from "./quiz-data.js";

/* ==========================================================================
   UTILITÀ
   ========================================================================== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const reduceMotion=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function el(tag,props,...kids){
  const e=document.createElement(tag);
  if(props)for(const[k,v]of Object.entries(props)){
    if(v===null||v===undefined||v===false)continue;
    if(k==="class")e.className=v;
    else if(k==="text")e.textContent=v;
    else if(k.slice(0,2)==="on")e.addEventListener(k.slice(2),v);
    else e.setAttribute(k,v===true?"":v);
  }
  kids.flat().forEach(c=>{if(c===null||c===undefined||c===false)return;e.append(c.nodeType?c:document.createTextNode(c));});
  return e;
}
const ICON_PATHS={
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  heart:'<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c3 0 5 2.2 5 5"/>',
  home:'<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-6h6v6"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.5-4M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4M20 19v-4h-4"/>',
  column:'<path d="M4 21h16M5 10h14M6 10v8m4-8v8m4-8v8m4-8v8M3 10l9-6 9 6"/>',
  frame:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 16l5-5 4 4 3-3 6 6"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  leaf:'<path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z"/><path d="M5 19l8-8"/>',
  utensils:'<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.5 1.5-4 4.5-4 8h4"/>',
  dome:'<path d="M12 2v5M9.5 4.5h5"/><path d="M5 21v-5a7 7 0 0 1 14 0v5z"/>',
  pin:'<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.4 2 4 2s3-.5 4-2M9 10h.01M15 10h.01"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  coffee:'<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  coin:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>'
};
function icon(name){
  const s=el("span",{class:"ico","aria-hidden":"true"});
  s.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+(ICON_PATHS[name]||ICON_PATHS.star)+'</svg>';
  return s;
}
let toastTimer=null;
function toast(msg){
  const t=$("#toast");t.textContent=msg;t.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3200);
}
function scrollToEl(node,block){node.scrollIntoView({behavior:reduceMotion()?"auto":"smooth",block:block||"start"});}

/* ==========================================================================
   STATO DEL QUIZ
   ========================================================================== */
const state={step:0,answers:{company:null,familiarity:null,duration:null,days:null,interests:[],mood:null,pace:null,budget:null,walking:"medium"},plan:null,active:0,map:null,mapLayers:[],tileOk:false,tileWarned:false};
const stepEls=[];

function optionButton(q,o){
  const isText=o[1].charAt(0)==="#";
  const ic=el("span",{class:"opt-icon","aria-hidden":"true"});
  if(isText)ic.textContent=o[1].slice(1);else ic.append(icon(o[1]));
  const btn=el("button",{type:"button",class:"option","aria-pressed":"false","data-key":q.key,"data-value":o[0]},
    ic,el("span",{class:"opt-copy"},el("strong",{text:o[2]}),o[3]?el("small",{text:o[3]}):null),el("span",{class:"opt-check","aria-hidden":"true"}));
  btn.addEventListener("click",()=>onOption(q,o[0]));
  return btn;
}
function buildQuiz(){
  const host=$("#quizSteps"),bar=$("#stepsBar");
  QUIZ.forEach((q,qi)=>{
    const legend=el("legend",{text:q.title,tabindex:"-1"});
    const group=el("div",{class:"options"+(q.multi?" multi":""),role:"group","aria-label":q.title});
    q.opts.forEach(o=>group.append(optionButton(q,o)));
    const fs=el("fieldset",{class:"step",hidden:qi!==0,"data-step":qi},legend,el("p",{class:"sub",text:q.sub}),group);
    if(q.followUp){
      /* Domanda aggiuntiva: visibile solo quando è selezionata l'opzione "when" */
      const f=q.followUp;
      const fg=el("div",{class:"options",role:"group","aria-labelledby":"daysLabel"});
      f.opts.forEach(o=>fg.append(optionButton(f,o)));
      fs.append(el("div",{class:"walk",id:"daysQ",hidden:true},el("p",{class:"days-label",id:"daysLabel",text:f.title}),fg));
    }
    if(q.multi)fs.append(el("p",{class:"sel-count",id:"selCount","aria-live":"polite"}));
    if(q.walking){
      const sel=el("select",{id:"walking"},WALK_OPTS.map(w=>el("option",{value:w[0],text:w[1],selected:w[0]==="medium"})));
      sel.addEventListener("change",e=>{state.answers.walking=e.target.value;});
      fs.append(el("div",{class:"walk"},el("label",{for:"walking",text:"Quanto ti va di camminare?"}),sel));
    }
    host.append(fs);stepEls.push(fs);
    bar.append(el("span"));
  });
}
function onOption(q,value){
  if(q.multi){
    const list=state.answers[q.key];
    state.answers[q.key]=list.includes(value)?list.filter(v=>v!==value):list.concat(value);
  }else{
    state.answers[q.key]=value;
    if(q.key==="duration"&&value!=="multi")state.answers.days=null;
  }
  syncOptions();$("#quizError").textContent="";
}
function syncOptions(){
  $$(".option[data-key]").forEach(b=>{
    const v=state.answers[b.dataset.key];
    const on=Array.isArray(v)?v.includes(b.dataset.value):v===b.dataset.value;
    b.setAttribute("aria-pressed",String(on));
  });
  const dq=$("#daysQ");if(dq)dq.hidden=state.answers.duration!=="multi";
  const n=state.answers.interests.length,c=$("#selCount");
  if(c)c.textContent=n?(n===1?"1 interesse selezionato":n+" interessi selezionati"):"Nessun interesse selezionato";
}
function stepError(i){
  const q=QUIZ[i],v=state.answers[q.key];
  if(!(q.multi?v.length>0:!!v))return q.err;
  if(q.followUp&&v===q.followUp.when&&!state.answers[q.followUp.key])return q.followUp.err;
  return "";
}
function setStep(n,focus){
  state.step=Math.max(0,Math.min(QUIZ.length-1,n));
  stepEls.forEach((s,i)=>{
    const on=i===state.step;
    if(on&&s.hidden){s.hidden=false;s.classList.remove("enter");void s.offsetWidth;if(!reduceMotion())s.classList.add("enter");}
    else if(!on)s.hidden=true;
  });
  const last=state.step===QUIZ.length-1;
  $("#prevBtn").disabled=state.step===0;
  $("#nextBtn").hidden=last;$("#createBtn").hidden=!last;
  $("#qCounter").textContent="Domanda "+(state.step+1)+" di "+QUIZ.length;
  $("#qName").textContent=QUIZ[state.step].name;
  $$("#stepsBar span").forEach((s,i)=>{s.className=i<state.step?"done":i===state.step?"now":"";});
  $("#stepsBar").setAttribute("aria-valuenow",String(state.step+1));
  $("#quizError").textContent="";
  if(focus){const lg=$("legend",stepEls[state.step]);if(lg)lg.focus({preventScroll:true});}
}
function goNext(){
  const err=stepError(state.step);
  if(err){$("#quizError").textContent=err;return;}
  setStep(state.step+1,true);
}
function submitQuiz(){
  for(let i=0;i<QUIZ.length;i++){
    const err=stepError(i);
    if(err){setStep(i,true);$("#quizError").textContent=err;return;}
  }
  state.answers.walking=$("#walking").value;
  createItinerary();
}

/* ==========================================================================
   IMMAGINI: file locale (se presente) → fotografia Wikipedia/Commons → segnaposto
   ========================================================================== */
const wikiCache=new Map();
function wikiInfo(title){
  if(wikiCache.has(title))return wikiCache.get(title);
  const p=fetch("https://it.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title),{headers:{Accept:"application/json"}})
    .then(r=>r.ok?r.json():null)
    .then(j=>{
      if(!j||j.type==="disambiguation")return null;
      const o=j.originalimage&&j.originalimage.source?{src:j.originalimage.source,w:j.originalimage.width,h:j.originalimage.height}:null;
      return {thumb:j.thumbnail&&j.thumbnail.source||null,orig:o,page:j.content_urls&&j.content_urls.desktop&&j.content_urls.desktop.page||null};
    }).catch(()=>null);
  wikiCache.set(title,p);return p;
}
function resizeThumb(url,w){return url.replace(/\/\d+px-/,"/"+w+"px-");}
function canLoad(url){
  return new Promise(res=>{
    const im=new Image();let done=false;
    const end=ok=>{if(!done){done=true;res(ok);}};
    im.onload=()=>end(true);im.onerror=()=>end(false);
    setTimeout(()=>end(false),9000);
    im.src=url;
  });
}
/* Foto delle tappe: la miniatura "summary" di Wikipedia è larga ~320 px e va ingrandita 2–3 volte nell'area foto.
   Qui si sceglie invece la larghezza in base all'area reale (× densità schermo, max 2), senza mai superare l'originale.
   Si scartano disegni/mappe (SVG) e immagini troppo piccole per restare nitide: meglio il segnaposto che una foto sfocata. */
const THUMB_STEPS=[500,960,1280,1920];   /* larghezze standard generate da Wikimedia */
const stepFor=need=>THUMB_STEPS.find(st=>st>=need)||THUMB_STEPS[THUMB_STEPS.length-1];
const dprCap=()=>Math.min(window.devicePixelRatio||1,2);
function sharpCandidates(info,fit){
  const o=info.orig;
  if(!o||!o.w||!o.h||/\.svg(\.png)?$/i.test(info.thumb)||o.w<800||o.h<500)return [];
  const need=Math.max(fit.w,fit.h*(o.w/o.h))*dprCap();   /* larghezza necessaria con object-fit:cover */
  const width=stepFor(need);
  if(o.w<=width)return [o.src];                          /* l'originale è già al massimo: nessun ingrandimento */
  const list=[resizeThumb(info.thumb,width)];
  const lower=THUMB_STEPS.filter(st=>st<width&&st>=960).pop();
  if(lower)list.push(resizeThumb(info.thumb,lower));
  if(o.w<=3000)list.push(o.src);
  return list;
}
/* Seconda scelta: la foto principale della voce anche se piccola (mai disegni/mappe SVG): meglio una foto un po' meno nitida del segnaposto. */
function softCandidates(info){
  if(!info||!info.thumb||/\.svg(\.png)?$/i.test(info.thumb))return [];
  const o=info.orig,list=[];
  if(o&&o.w>=960)list.push(resizeThumb(info.thumb,960));
  else if(o&&o.src)list.push(o.src);
  list.push(info.thumb);
  return list;
}
/* Ordine di ricerca: file locale → foto curate su Commons → voci Wikipedia (titolo principale e alternative). */
async function resolvePhoto({local,wiki,commons,width,fit}){
  if(local&&await canLoad(local))return local;
  for(const f of commons||[]){
    const base="https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(f)+"?width=";
    const widths=[width].concat([960,500].filter(w=>w<width));   /* mai l'originale completo: può pesare decine di MB */
    for(const w of widths)if(await canLoad(base+w))return base+w;
  }
  const titles=wiki||[];
  if(fit){
    const infos=[];
    for(const t of titles){const i=await wikiInfo(t);if(i&&i.thumb)infos.push(i);}
    for(const i of infos)for(const url of sharpCandidates(i,fit))if(await canLoad(url))return url;
    for(const i of infos)for(const url of softCandidates(i))if(await canLoad(url))return url;
    return null;
  }
  for(const t of titles){
    const info=await wikiInfo(t);
    if(!info||!info.thumb)continue;
    const big=resizeThumb(info.thumb,width);
    if(await canLoad(big))return big;
    if(big!==info.thumb&&await canLoad(info.thumb))return info.thumb;
  }
  return null;
}
function placePhoto(container,url,alt){
  const img=el("img",{src:url,alt:alt||"",decoding:"async",loading:"lazy"});
  container.append(img);
  requestAnimationFrame(()=>img.classList.add("in"));
  container.classList.add("has-photo");
}
function lazyLoad(node,fn){
  if(!("IntersectionObserver"in window)){fn();return;}
  const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();fn();}},{rootMargin:"300px"});
  io.observe(node);
}

/* ==========================================================================
   RISULTATI
   ========================================================================== */
const FEE_LABEL={free:"Accesso libero",paid:"A pagamento",mixed:"Libero + parti a pagamento",verify:"Costo da verificare"};
const CAT_ICON={history:"column",art:"frame",hidden:"compass",romantic:"heart",nature:"leaf",food:"utensils",religious:"dome",local:"pin",night:"moon",family:"smile",iconic:"star",peaceful:"leaf",lively:"sun"};
const INTEREST_LABEL=LABELS.interests;
const dirUrl=p=>"https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lng;
const osmUrl=p=>"https://www.openstreetmap.org/?mlat="+p.lat+"&mlon="+p.lng+"#map=17/"+p.lat+"/"+p.lng;
const wikiSearchUrl=p=>"https://it.wikipedia.org/w/index.php?search="+encodeURIComponent(p.wiki.replace(/_/g," "));
const fmtKm=k=>k<0.1?"meno di 100 m":"circa "+k.toFixed(1).replace(".",",")+" km";
const fmtH=m=>{const h=Math.round(m/30)/2;return String(h).replace(".",",");};

function createItinerary(){
  state.plan=buildItinerary(state.answers);
  state.active=0;
  renderResults();
  const r=$("#results");r.classList.add("visible");
  initMap();buildMapLayers();showDay(0);
  scrollToEl(r);
  setTimeout(()=>{$("#resultTitle").focus({preventScroll:true});if(state.map)state.map.invalidateSize();},reduceMotion()?0:600);
}
function renderResults(){
  const a=state.answers,plan=state.plan;
  $("#resultTitle").textContent=a.company==="couple"?"La vostra Roma":a.company==="family"?"Roma da vivere insieme":a.company==="friends"?"Roma in compagnia":"La tua Roma";
  const ints=a.interests.map(i=>INTEREST_LABEL[i]);
  $("#resultSubtitle").textContent="Un itinerario di "+plan.days.length+(plan.days.length===1?" giornata":" giornate")+" costruito su "+ints.slice(0,3).join(", ").toLowerCase()+(ints.length>3?" e altre passioni":"")+".";
  const pills=$("#pills");pills.replaceChildren();
  [LABELS.company[a.company],durationLabel(a),PACE_LABEL[a.pace],LABELS.familiarity[a.familiarity],LABELS.mood[a.mood],LABELS.budget[a.budget]].concat(ints)
    .forEach(t=>pills.append(el("span",{class:"pill",text:t})));
  const all=plan.days.flatMap(d=>d.stops);
  const free=all.filter(s=>s.fee==="free").length;
  const toCheck=all.length-free;
  const walk=plan.days.reduce((s,d)=>s+d.walkKm,0);
  const stat=(b,t)=>el("div",null,el("b",{text:b}),el("span",{text:t}));
  const stats=$("#tripStats");stats.replaceChildren(
    stat(String(plan.days.length),plan.days.length===1?"giornata":"giornate"),
    stat(String(all.length),"tappe, senza duplicati"),
    stat(String(free),"ad accesso libero (verifica sempre le regole)"),
    stat(String(toCheck),"con costi o condizioni da verificare")
  );
  const notes=$("#notes");notes.replaceChildren();
  const list=plan.notes.concat([
    "Prezzi e orari indicati con fonte sono stati verificati in una data precisa e possono cambiare; gli altri non sono verificati: controlla sempre i siti ufficiali. Le distanze tra le tappe sono in linea d'aria (in totale circa "+walk.toFixed(1).replace(".",",")+" km) e i tempi di visita sono indicativi."
  ]);
  list.forEach(t=>notes.append(el("li",{text:t})));

  const tabs=$("#dayTabs");tabs.replaceChildren();
  tabs.hidden=plan.days.length<2;
  plan.days.forEach((d,i)=>{
    tabs.append(el("button",{type:"button",class:"day-tab",role:"tab",id:"tab-"+i,"aria-controls":"day-"+i,"aria-selected":"false",tabindex:"-1",text:"Giorno "+(i+1),
      onclick:()=>showDay(i),
      onkeydown:e=>{
        const n=plan.days.length;let t=null;
        if(e.key==="ArrowRight")t=(i+1)%n;else if(e.key==="ArrowLeft")t=(i-1+n)%n;else if(e.key==="Home")t=0;else if(e.key==="End")t=n-1;
        if(t!==null){e.preventDefault();showDay(t);$("#tab-"+t).focus();}
      }}));
  });
  const host=$("#days");host.replaceChildren();
  plan.days.forEach((d,i)=>host.append(renderDay(d,i,plan.days.length)));
}
function renderDay(day,di,total){
  const head=el("div",{class:"day-head"},
    el("h3",{text:total===1?"Il tuo itinerario":"Giorno "+(di+1)}),
    el("p",{class:"areas",text:day.areas.slice(0,4).join(", ")+(day.areas.length>4?" e dintorni":"")}),
    el("ul",{class:"day-facts"},
      el("li",{text:day.stops.length+(day.stops.length===1?" tappa":" tappe")}),
      el("li",{text:"Visite: circa "+fmtH(day.minMins)+"–"+fmtH(day.maxMins)+" ore, esclusi spostamenti e pause"}),
      el("li",{text:"Distanze in linea d'aria: circa "+day.walkKm.toFixed(1).replace(".",",")+" km"})));
  const list=el("div",{class:"stops"});
  const breakAfter=day.stops.length>=3?Math.floor(day.stops.length/2):-1;
  const bt=state.answers.budget==="low"?" Per spendere poco: mercati, forni e pizza al taglio sono soste ottime.":state.answers.budget==="high"?" Per concederti qualcosa: una sosta seduta con piatti della tradizione.":"";
  day.stops.forEach((p,i)=>{
    if(i>0)list.append(el("div",{class:"leg"+(p.transit?" leg-transit":"")},
      el("span",null,fmtKm(p.legKm)+" dalla tappa precedente, in linea d'aria",
        p.transit?el("strong",{text:" · Tratta lunga: conviene usare i mezzi pubblici."}):null)));
    list.append(renderStop(p,di,i));
    if(i+1===breakAfter&&i<day.stops.length-1){
      list.append(el("div",{class:"leg"},el("span",{text:""})));
      list.append(el("div",{class:"break"},icon("coffee"),el("div",null,
        el("strong",{text:"Pausa consigliata. "}),
        "Nei dintorni di "+p.name+" cerca una trattoria o un bar. Tra i piatti romani da riconoscere sul menu: "+day.foodTip+"."+bt+" Non abbiamo verificato locali, orari o prezzi.")));
    }
  });
  return el("section",{class:"day",id:"day-"+di,role:"tabpanel","aria-labelledby":total>1?"tab-"+di:null,"aria-label":total===1?"Itinerario":null,hidden:di!==0},head,list);
}
function budgetBox(p){
  const b=state.answers.budget;
  if(p.fee==="free")return null;
  if(b==="high")return el("div",{class:"box"},el("b",{text:"Per concederti qualcosa"}),"Se vuoi un'esperienza più ricca, valuta una visita guidata o un ingresso con prenotazione: verifica offerte, orari e prezzi sui siti ufficiali.");
  if(b==="low")return el("div",{class:"box"},el("b",{text:"Con budget contenuto"}),"L'ingresso è facoltativo: valuta se vale la spesa per te e verifica prezzi o riduzioni sui siti ufficiali.");
  return null;
}
/* Informazioni pratiche: costo, orari, giorni di chiusura, momento ideale, prenotazione e fonte della verifica.
   I dati non verificati sono dichiarati come tali: niente prezzi o orari inventati. */
const BOOKING_LABEL={required:"Prenotazione obbligatoria",recommended:"Prenotazione consigliata"};
const fmtDate=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||"");return m?m[3]+"/"+m[2]+"/"+m[1]:"";};
function practicalInfo(p){
  const box=el("div",{class:"practical"});
  const line=(label,text)=>{if(text)box.append(el("p",{class:"cost-note"},el("strong",{text:label+": "}),text));};
  line("Costo",p.cost);
  const hours=p.hours||p.hoursNote;
  line("Orari",hours?hours+(p.closed?" Chiuso: "+p.closed+".":""):(p.closed?"Chiuso: "+p.closed+".":""));
  line("Momento ideale",p.when);
  line("Prenotazione",p.bookingNote);
  if(p.source&&p.checked){
    box.append(el("p",{class:"cost-note verify-note"},"Informazioni verificate il "+fmtDate(p.checked)+" · ",
      el("a",{href:p.source,target:"_blank",rel:"noopener noreferrer",text:"fonte (esterno)"}),
      ". Possono cambiare: ricontrolla prima di andare."));
  }else if(!p.public){
    box.append(el("p",{class:"cost-note verify-note",text:"Prezzi e orari non verificati da VIVI Roma: controlla le fonti ufficiali prima di andare."}));
  }
  return box;
}
function renderStop(p,di,i){
  const n=i+1;
  const main=p.cats.find(c=>CAT_ICON[c])||"star";
  const photo=el("div",{class:"photo","aria-hidden":"false"},icon(CAT_ICON[main]));
  const why=p.matches.map(m=>INTEREST_LABEL[m]);
  if(state.answers.familiarity==="first"&&p.cats.includes("iconic"))why.push("Classico da non perdere");
  if(state.answers.budget==="low"&&p.fee==="free")why.push("In linea con il tuo budget");
  if(state.answers.familiarity==="often"&&p.cats.includes("hidden"))why.push("Fuori dai percorsi più battuti");
  const wikiLink=el("a",{href:wikiSearchUrl(p),target:"_blank",rel:"noopener noreferrer",text:"Approfondisci su Wikipedia (esterno)"});
  const card=el("article",{class:"stop",id:"stop-"+di+"-"+n,tabindex:"-1","aria-label":"Tappa "+n+": "+p.name},
    photo,
    el("div",{class:"stop-body"},
      el("div",{class:"stop-top"},el("span",{class:"badge-n","aria-hidden":"true",text:String(n)}),el("span",{text:"Tappa "+n+" · "+p.area})),
      el("h4",{text:p.name}),
      el("p",{text:p.desc}),
      el("div",{class:"chips"},
        el("span",{class:"chip",text:"Visita: circa "+p.time}),
        el("span",{class:"chip fee-"+p.fee,text:FEE_LABEL[p.fee]}),
        BOOKING_LABEL[p.booking]?el("span",{class:"chip fee-paid",text:BOOKING_LABEL[p.booking]}):null,
        why.map(w=>el("span",{class:"chip",text:w}))),
      practicalInfo(p),
      el("div",{class:"box"},el("b",{text:"La chicca"}),p.chicca),
      el("div",{class:"box"},el("b",{text:"Il consiglio di VIVI"}),p.consiglio),
      budgetBox(p),
      el("div",{class:"links"},
        el("a",{href:dirUrl(p),target:"_blank",rel:"noopener noreferrer",text:"Indicazioni su Google Maps (esterno)"}),
        el("a",{href:osmUrl(p),target:"_blank",rel:"noopener noreferrer",text:"Apri su OpenStreetMap (esterno)"}),
        wikiLink,
        el("button",{type:"button",text:"Vedi sulla mappa",onclick:()=>focusMarker(di,i)}))));
  lazyLoad(card,()=>{
    const box=photo.getBoundingClientRect(),bw=box.width||190,bh=box.height||400;
    const titles=[p.wiki].concat(p.alt||[]);
    resolvePhoto({wiki:titles,commons:p.commons||[],width:stepFor(Math.max(bw,bh*1.5)*dprCap()),fit:{w:bw,h:bh}}).then(url=>{if(url)placePhoto(photo,url,p.name+", Roma");});
    (async()=>{for(const t of titles){const info=await wikiInfo(t);if(info&&info.page){wikiLink.href=info.page;break;}}})();
  });
  return card;
}
function showDay(i){
  state.active=i;
  $$(".day").forEach((d,k)=>{d.hidden=k!==i;});
  $$(".day-tab").forEach((t,k)=>{
    const on=k===i;
    t.setAttribute("aria-selected",String(on));t.tabIndex=on?0:-1;t.classList.toggle("active",on);
  });
  updateMap();
}

/* ==========================================================================
   MAPPA (Leaflet + OpenStreetMap)
   ========================================================================== */
function initMap(){
  const mapEl=$("#map");
  if(state.map||mapEl.dataset.failed)return;
  if(!window.L){
    mapEl.dataset.failed="1";
    mapEl.replaceChildren(el("div",{class:"map-fallback",text:"La mappa non si è caricata (servizio esterno non raggiungibile). Puoi comunque aprire le indicazioni da ogni scheda."}));
    mapEl.style.height="auto";mapEl.style.minHeight="0";
    return;
  }
  state.map=L.map(mapEl,{scrollWheelZoom:false,dragging:!L.Browser.mobile,tap:false,zoomControl:true}).setView([41.9028,12.4964],12);
  const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(state.map);
  tiles.on("tileload",()=>{state.tileOk=true;});
  tiles.on("tileerror",()=>{
    if(state.tileOk||state.tileWarned)return;
    state.tileWarned=true;setTimeout(()=>{if(!state.tileOk)$("#mapNotice").hidden=false;},4000);
  });
}
function buildMapLayers(){
  state.mapLayers=[];
  if(!state.map)return;
  state.plan.days.forEach((day,di)=>{
    const group=L.layerGroup(),markers=[],pts=[];
    day.stops.forEach((p,i)=>{
      const m=L.marker([p.lat,p.lng],{
        title:p.name,alt:(i+1)+". "+p.name,keyboard:true,
        icon:L.divIcon({className:"vm",html:"<span>"+(i+1)+"</span>",iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-16]})
      });
      m.bindPopup(el("div",{class:"pop"},
        el("strong",{text:(i+1)+". "+p.name}),el("span",{text:p.area}),
        el("button",{type:"button",text:"Vai alla scheda",onclick:()=>goToCard(di,i)}),
        el("a",{href:dirUrl(p),target:"_blank",rel:"noopener noreferrer",text:"Indicazioni su Google Maps (esterno)"})));
      m.on("click",()=>highlightCard(di,i));
      group.addLayer(m);markers.push(m);pts.push([p.lat,p.lng]);
    });
    if(pts.length>1)group.addLayer(L.polyline(pts,{color:"#B69A67",weight:2,opacity:.9,dashArray:"4 7",interactive:false}));
    state.mapLayers.push({group,markers,pts});
  });
}
let shownLayer=null;
function updateMap(){
  if(!state.map)return;
  if(shownLayer)state.map.removeLayer(shownLayer);
  const l=state.mapLayers[state.active];
  if(!l)return;
  l.group.addTo(state.map);shownLayer=l.group;
  state.map.invalidateSize();
  if(l.pts.length===1)state.map.setView(l.pts[0],15);
  else state.map.fitBounds(l.pts,{padding:[34,34],maxZoom:15});
}
function highlightCard(di,i,focus){
  $$(".stop.is-active").forEach(c=>c.classList.remove("is-active"));
  const c=$("#stop-"+di+"-"+(i+1));
  if(!c)return null;
  c.classList.add("is-active");
  if(focus){scrollToEl(c,"center");c.focus({preventScroll:true});}
  return c;
}
function goToCard(di,i){if(di!==state.active)showDay(di);highlightCard(di,i,true);}
function focusMarker(di,i){
  highlightCard(di,i);
  if(!state.map){toast("La mappa non è disponibile: usa i link alle indicazioni.");return;}
  const l=state.mapLayers[di];if(!l)return;
  scrollToEl($("#map"),"center");
  state.map.setView(l.pts[i],16,{animate:!reduceMotion()});
  l.markers[i].openPopup();
}

/* ==========================================================================
   NAVIGAZIONE, CATEGORIE, EVENTI GLOBALI
   ========================================================================== */
function initMenu(){
  const btn=$("#menuToggle"),nav=$("#navLinks"),header=$("#siteHeader");
  const set=open=>{
    nav.classList.toggle("open",open);header.classList.toggle("menu-open",open);
    btn.setAttribute("aria-expanded",String(open));$("#menuLabel").textContent=open?"Chiudi":"Menu";
  };
  btn.addEventListener("click",()=>set(!nav.classList.contains("open")));
  $$("a",nav).forEach(a=>a.addEventListener("click",()=>set(false)));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("open")){set(false);btn.focus();}});
  document.addEventListener("click",e=>{if(nav.classList.contains("open")&&!header.contains(e.target))set(false);});
  const onScroll=()=>header.classList.toggle("scrolled",window.scrollY>40);
  window.addEventListener("scroll",onScroll,{passive:true});onScroll();
  window.matchMedia("(min-width:761px)").addEventListener("change",()=>set(false));
}
function initCategories(){
  $$(".cat-card").forEach(card=>{
    card.addEventListener("click",()=>{
      const k=card.dataset.interest,list=state.answers.interests;
      if(list.includes(k))toast(card.dataset.label+" è già tra i tuoi interessi.");
      else{list.push(k);syncOptions();toast(card.dataset.label+" aggiunta ai tuoi interessi. La ritrovi alla domanda 4.");}
    });
    lazyLoad(card,()=>{
      resolvePhoto({local:card.dataset.local,wiki:card.dataset.wiki.split("|"),commons:card.dataset.commons?card.dataset.commons.split("|"):[],width:500}).then(url=>{if(url)placePhoto(card,url,card.dataset.alt);});
    });
  });
}
function initHero(){
  const media=$("#heroMedia");
  resolvePhoto({local:"img/hero-boscolo.jpg",wiki:["Colosseo","Roma"],width:1280}).then(url=>{
    if(!url)return;
    const img=el("img",{src:url,alt:"",decoding:"async",fetchpriority:"high"});
    media.append(img);requestAnimationFrame(()=>img.classList.add("in"));
  });
}
function initReveal(){
  const items=$$(".reveal");
  if(!("IntersectionObserver"in window)||reduceMotion()){items.forEach(i=>i.classList.add("in"));return;}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}}),{threshold:.12});
  items.forEach(i=>io.observe(i));
}

/* Controllo di tutte le foto: aprire la pagina con ?photocheck in fondo all'indirizzo. Mostra per ogni tappa, categoria e hero se la foto si carica e da quale fonte. */
async function runPhotoAudit(){
  const box=el("div",{style:"position:fixed;inset:0;z-index:5000;overflow:auto;background:#fffcf7;color:#252321;padding:20px;font:14px/1.5 Inter,Arial,sans-serif"});
  const head=el("h2",{style:"margin:0 0 6px;font-size:28px",text:"Controllo foto VIVI Roma"});
  const sum=el("p",{style:"margin:0 0 14px",text:"Verifica in corso…"});
  const table=el("table",{style:"border-collapse:collapse;width:100%"});
  box.append(el("button",{type:"button",style:"float:right;padding:8px 14px",text:"Chiudi",onclick:()=>box.remove()}),head,sum,table);
  document.body.append(box);
  const rows=[];
  PLACES.forEach(p=>rows.push({tipo:"Tappa",nome:p.name,opt:{wiki:[p.wiki].concat(p.alt||[]),commons:p.commons||[],width:1280,fit:{w:190,h:815}}}));
  $$(".cat-card").forEach(c=>rows.push({tipo:"Categoria",nome:c.dataset.label,opt:{local:c.dataset.local,wiki:c.dataset.wiki.split("|"),commons:c.dataset.commons?c.dataset.commons.split("|"):[],width:500}}));
  rows.push({tipo:"Hero",nome:"Copertina",opt:{local:"img/hero-boscolo.jpg",wiki:["Colosseo","Roma"],width:1280}});
  let ok=0;
  for(const r of rows){
    const tr=el("tr",{style:"border-top:1px solid #ddd4c4"});
    const cell=(t,st)=>el("td",{style:"padding:6px 8px;vertical-align:middle;"+(st||"")},t);
    tr.append(cell(r.tipo),cell(r.nome),cell("controllo…"),cell(""),cell(""));table.append(tr);
    const url=await resolvePhoto(r.opt);
    const src=!url?"MANCANTE":/^img\//.test(url)?"file locale":/Special:FilePath/.test(url)?"Commons (curata)":"Wikipedia";
    if(url)ok++;
    const th=url?el("img",{src:url,alt:"",style:"width:64px;height:48px;object-fit:cover"}):"";
    tr.replaceChildren(cell(r.tipo),cell(r.nome),cell(src,"font-weight:600;color:"+(url?"#3d4f2a":"#762F3B")),cell(th),cell(url?el("span",{style:"word-break:break-all;font-size:11px",text:url}):""));
    sum.textContent=ok+" foto caricate su "+rows.length+(ok===rows.length?" — tutte ok.":" — controllo in corso o con mancanti.");
  }
  sum.textContent=ok+" foto caricate su "+rows.length+(ok===rows.length?": tutte ok.":". Le righe MANCANTE usano il segnaposto.");
}

function init(){
  $("#year").textContent=new Date().getFullYear();
  buildQuiz();syncOptions();setStep(0,false);
  $("#nextBtn").addEventListener("click",goNext);
  $("#prevBtn").addEventListener("click",()=>setStep(state.step-1,true));
  $("#quizForm").addEventListener("submit",e=>{
    e.preventDefault();
    if(state.step<QUIZ.length-1)goNext();else submitQuiz();
  });
  $("#editBtn").addEventListener("click",()=>{scrollToEl($("#crea"));setStep(0,false);});
  $("#printBtn").addEventListener("click",()=>window.print());
  initMenu();initCategories();initHero();initReveal();
  if(/[?&]photocheck/.test(location.search))runPhotoAudit();
}
init();
