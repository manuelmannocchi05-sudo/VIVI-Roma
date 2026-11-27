/* VIVI Roma — interfaccia: quiz, risultati, foto, mappa, navigazione. */
import {PLACES,buildItinerary,restoreItinerary} from "./planner.js";
import {createStore,tripFromPlan,tripTitle,MAX_TRIPS,shareUrl,shareText,decodeShare} from "./trips.js";
import {activeSteps,STEPS,QUIZ,moodsOf,engineAnswers} from "./quiz-data.js";
import {loadLang,t,getLang,setLang,detectLang,onLangChange,locale,num1,numHalf,qText,optText,stepText,moodLabels,answerLabel,durationLabel,paceLabel,placeText,placeGloss,areaText,foodTip,applyStatic} from "./i18n.js";
import {PHOTOS} from "./data/photos.js";
import {registerSW} from "./pwa.js";

/* Misurazione anonima (js/metrics.js): caricata solo quando il browser è libero o al primo evento,
   così non pesa sul primo caricamento. Gli eventi precedenti restano in coda, nell'ordine. */
let metricsMod=null,metricsP=null;const metricsQueue=[];
function loadMetrics(){
  if(!metricsP)metricsP=import("./metrics.js").then(m=>{metricsMod=m;metricsQueue.splice(0).forEach(a=>m.track(...a));return m;},()=>null);
  return metricsP;
}
function track(name,fields){
  if(metricsMod){metricsMod.track(name,fields);return;}
  metricsQueue.push([name,fields]);loadMetrics();
}

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
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  coin:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ticket:'<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  closed:'<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
  cloudok:'<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>'
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
   QUIZ: 6 passaggi (STEPS), ognuno con una o più domande (QUIZ). Le domande multi:true accettano più risposte.
   ========================================================================== */
const state={step:0,answers:{company:null,familiarity:null,duration:null,days:null,interests:[],mood:[],pace:null,budget:null,walking:"medium",kids:null},plan:null,active:0,map:null,mapLayers:[],tiles:null,tileOk:false,tileWarned:false,savedId:null,selected:null,status:null};
const isNarrow=()=>window.matchMedia("(max-width:760px)").matches;
const stepEls=[];
const Q=Object.fromEntries(QUIZ.map(q=>[q.key,q]));

function optionButton(q,o){
  const isText=o[1].charAt(0)==="#",photo=o[5]&&PHOTOS[o[5]];
  const tx=optText(q,o);
  const check=el("span",{class:"opt-check","aria-hidden":"true"});
  let btn;
  if(photo){
    const media=el("span",{class:"opt-media","aria-hidden":"true"});
    media.style.backgroundColor=photo.color;
    /* foto della scelta scaricata solo quando il quiz è aperto e la scheda sta per apparire (non al primo caricamento) */
    lazyLoad(media,()=>media.append(photoImg(photo,"",isNarrow()?200:260)));
    btn=el("button",{type:"button",class:"option opt-photo","aria-pressed":"false","data-key":q.key,"data-value":o[0]},
      media,el("span",{class:"opt-copy"},el("strong",{text:tx.title}),o[3]?el("small",{text:tx.desc}):null),check);
  }else{
    const ic=el("span",{class:"opt-icon","aria-hidden":"true"});
    if(isText)ic.textContent=o[1].slice(1);else ic.append(icon(o[1]));
    btn=el("button",{type:"button",class:"option"+(q.compact?" opt-compact":""),"aria-pressed":"false","data-key":q.key,"data-value":o[0]},
      q.compact?null:ic,el("span",{class:"opt-copy"},el("strong",{text:tx.title}),o[3]?el("small",{text:tx.desc}):null),check);
  }
  btn.addEventListener("click",()=>onOption(q,o[0],btn));
  return btn;
}
function questionBlock(q,single){
  const id="q-"+q.key;
  const label=el("p",{class:"q-label"+(single?" sr-only":""),id:id+"-label",text:qText(q,"title")});
  const group=el("div",{class:"options opts-"+q.key+(q.multi?" multi":"")+(q.compact?" compact":""),role:"group","aria-labelledby":id+"-label"});
  q.opts.forEach(o=>group.append(optionButton(q,o)));
  const box=el("div",{class:"q-block",id},label,group);
  if(q.followUp){
    /* domanda aggiuntiva, visibile solo con l'opzione "when" (giorni per «Più giorni», bambini per «In famiglia») */
    const f=q.followUp,lid=f.key==="days"?"daysLabel":"q-"+f.key+"-label";
    const fg=el("div",{class:"options opts-"+f.key+" compact",role:"group","aria-labelledby":lid});
    f.opts.forEach(o=>fg.append(optionButton({...f,compact:true},o)));
    box.append(el("div",{class:"q-follow",id:f.key==="days"?"daysQ":"q-"+f.key+"-follow",hidden:true},el("p",{class:"q-label",id:lid,text:qText(f,"title")}),fg));
  }
  if(q.multi)box.append(el("p",{class:"sel-count",id:"selCount-"+q.key,"aria-live":"polite"}));
  return box;
}
function buildQuiz(){
  const host=$("#quizSteps"),bar=$("#stepsBar");
  STEPS.forEach((s,si)=>{
    const legend=el("legend",{text:stepText(s,"title"),tabindex:"-1"});
    const fs=el("fieldset",{class:"step step-"+s.id,hidden:si!==0,"data-step":si},legend,el("p",{class:"sub",text:stepText(s,"sub")}));
    s.keys.forEach(k=>fs.append(questionBlock(Q[k],s.keys.length===1)));
    host.append(fs);stepEls.push(fs);
  });
}
/* Passaggi visibili con le risposte attuali: 6, oppure 7 con «In famiglia» (domanda sui bambini). */
const visible=()=>activeSteps(state.answers);
function renderBar(){
  const v=visible(),bar=$("#stepsBar"),pos=v.indexOf(state.step);
  while(bar.children.length<v.length)bar.append(el("span",null,el("i")));
  while(bar.children.length>v.length)bar.lastElementChild.remove();
  [...bar.children].forEach((s,i)=>{s.className=i<pos?"done":i===pos?"now":"";});
  bar.setAttribute("aria-valuenow",String(pos+1));bar.setAttribute("aria-valuemax",String(v.length));
  $("#qCounter").textContent=t("quiz.counter",{n:pos+1,total:v.length});
  const last=pos===v.length-1;
  $("#nextBtn").hidden=last;$("#createBtn").hidden=!last;
}
const ORDER=k=>Q[k].opts.map(o=>o[0]);
function onOption(q,value,btn){
  /* il quiz è iniziato: la mappa si prepara in sottofondo, quando il browser è libero (non rallenta il quiz) */
  if(!window.L)(window.requestIdleCallback||(f=>setTimeout(f,1200)))(()=>loadLeaflet(),{timeout:4000});
  track("quiz_start",{lang:getLang()});   /* una sola volta per pagina */
  if(q.multi){
    const list=state.answers[q.key];
    const next=list.includes(value)?list.filter(v=>v!==value):list.concat(value);
    /* le atmosfere seguono l'ordine del quiz; gli interessi restano nell'ordine di scelta, come nelle versioni precedenti */
    state.answers[q.key]=q.key==="mood"?ORDER("mood").filter(v=>next.includes(v)):next;
  }else{
    state.answers[q.key]=value;
    if(q.key==="duration"&&value!=="multi")state.answers.days=null;
    if(q.key==="company"&&value!=="family")state.answers.kids=null;
  }
  if(btn&&!reduceMotion()){btn.classList.remove("tap");void btn.offsetWidth;btn.classList.add("tap");}
  syncOptions();$("#quizError").textContent="";
  if(q.key==="company")renderBar();   /* «In famiglia» aggiunge il passaggio sui bambini: 7 invece di 6 */
}
function syncOptions(){
  $$(".option[data-key]").forEach(b=>{
    const v=state.answers[b.dataset.key];
    const on=Array.isArray(v)?v.includes(b.dataset.value):v===b.dataset.value;
    b.setAttribute("aria-pressed",String(on));
  });
  const dq=$("#daysQ");if(dq)dq.hidden=state.answers.duration!=="multi";
  for(const k of ["interests","mood"]){
    const n=state.answers[k].length,c=$("#selCount-"+k);
    if(c)c.textContent=n?t("quiz.selCount."+k,{n}):t("quiz.selNone."+k);
  }
}
function stepError(i){
  for(const k of STEPS[i].keys){
    const q=Q[k],v=state.answers[k];
    if(!(q.multi?v.length>0:!!v))return qText(q,"err");
    if(q.followUp&&v===q.followUp.when&&!state.answers[q.followUp.key])return qText(q.followUp,"err");
  }
  return "";
}
function setStep(n,focus){
  const prev=state.step;
  state.step=Math.max(0,Math.min(STEPS.length-1,n));
  const dir=state.step<prev?"back":"fwd";
  stepEls.forEach((s,i)=>{
    const on=i===state.step;
    if(on&&s.hidden){s.hidden=false;s.classList.remove("enter","enter-back");void s.offsetWidth;if(!reduceMotion())s.classList.add(dir==="back"?"enter-back":"enter");}
    else if(!on)s.hidden=true;
  });
  $("#prevBtn").disabled=visible()[0]===state.step;
  $("#qName").textContent=stepText(STEPS[state.step],"name");
  renderBar();
  $("#quizError").textContent="";
  quizPhoto();
  if(focus){
    /* ogni domanda riparte dall'inizio del pannello, con il titolo come punto di partenza per la lettura */
    const sc=$("#qzScroll");if(sc)sc.scrollTop=0;
    $("legend",stepEls[state.step]).focus({preventScroll:true});
  }
}
function goNext(){
  const err=stepError(state.step);
  if(err){$("#quizError").textContent=err;return;}
  const v=visible(),next=v[v.indexOf(state.step)+1];
  const st=histState();
  pushState("crea",{qs:next,q0:st&&st.r==="crea"?st.q0:0});   /* ogni domanda è un passo della cronologia: il tasto Indietro torna alla precedente */
  setStep(next,true);
  track("quiz_step",{step:STEPS[next].id});
}
function goBack(){
  const v=visible(),i=v.indexOf(state.step);
  if(i<=0){closeQuiz();return;}
  const st=histState();
  if(st&&st.r==="crea"&&st.d>st.q0)history.back();   /* la domanda precedente è nella cronologia */
  else{pushState("crea",{qs:v[i-1],q0:st?st.q0:0},true);setStep(v[i-1],true);}
}
function submitQuiz(){
  for(const i of visible()){
    const err=stepError(i);
    if(err){setStep(i,true);$("#quizError").textContent=err;return;}
  }
  trackComplete(state.answers);
  generateItinerary();
}
/* Risposte del quiz: solo valori fissi delle opzioni (niente bambini: non serve alle decisioni di prodotto). */
function trackComplete(a){
  track("quiz_complete",{company:a.company,familiarity:a.familiarity,duration:a.duration,days:a.duration==="multi"?Number(a.days)||0:0,
    interests:a.interests,mood:moodsOf(a),pace:a.pace,walking:a.walking,budget:a.budget,lang:getLang()});
}
/* Cambio lingua: aggiorna i testi del quiz senza toccare risposte, passo corrente o selezioni. */
function relabelQuiz(){
  STEPS.forEach((s,si)=>{
    const fs=stepEls[si];
    $("legend",fs).textContent=stepText(s,"title");
    $(".sub",fs).textContent=stepText(s,"sub");
    s.keys.forEach(k=>{
      const q=Q[k];
      $("#q-"+k+"-label").textContent=qText(q,"title");
      [q].concat(q.followUp?[q.followUp]:[]).forEach(g=>g.opts.forEach(o=>{
        const b=$(`.option[data-key="${g.key}"][data-value="${o[0]}"]`,fs);if(!b)return;
        const tx=optText(g,o);$("strong",b).textContent=tx.title;const sm=$("small",b);if(sm)sm.textContent=tx.desc;
      }));
      if(q.followUp)$(q.followUp.key==="days"?"#daysLabel":"#q-"+q.followUp.key+"-label").textContent=qText(q.followUp,"title");
    });
  });
  const shown=!!$("#quizError").textContent;
  setStep(state.step,false);syncOptions();
  if(shown){const err=stepError(state.step);$("#quizError").textContent=err;}
}
/* Risposte ricevute da un viaggio salvato o da un link: copia indipendente, con le atmosfere sempre in elenco. */
function loadAnswers(a){state.answers={...a,interests:[...a.interests],mood:moodsOf(a).slice()};syncOptions();}

/* ==========================================================================
   IMMAGINI: solo file locali WebP (img/), generati da tools/photos/build.py con licenza verificata.
   Nessuna richiesta a servizi esterni. Senza foto resta il segnaposto (gradiente + icona).
   ========================================================================== */
const srcsetOf=ph=>ph.w.map(w=>ph.base+"-"+w+".webp "+w+"w").join(", ");
const LICENSE_SHORT=l=>/^public domain$/i.test(l||"")?t("photo.pd"):(l||"");
const AUTHOR=a=>a==="Autore non indicato"?t("photo.noAuthor"):a;
/* Testo dell'attribuzione: autore, licenza, fonte (obbligatoria per CC BY e CC BY-SA). */
function creditText(ph){return t("photo.credit",{author:AUTHOR(ph.author),license:LICENSE_SHORT(ph.license)});}
function creditNode(ph,cls){
  return el("p",{class:cls},
    el("a",{href:ph.source,target:"_blank",rel:"noopener noreferrer","aria-label":t("photo.creditAria",{author:AUTHOR(ph.author),license:LICENSE_SHORT(ph.license)}),text:creditText(ph)}));
}
/* Inserisce la foto nel contenitore. width = larghezza CSS da coprire (object-fit:cover), per scegliere il file giusto.
   Oltre 2× di densità la differenza non si vede su una foto: sugli schermi 3× si scarica il file per 2× (meno dati su smartphone). */
const sizesFor=width=>{const dpr=window.devicePixelRatio||1;return Math.ceil(width*Math.min(dpr,2)/dpr)+"px";};
function photoImg(ph,alt,width,{eager}={}){
  const img=el("img",{src:ph.base+"-"+ph.w[0]+".webp",srcset:srcsetOf(ph),sizes:sizesFor(width),alt:alt||"",
    width:ph.w[ph.w.length-1],height:Math.round(ph.w[ph.w.length-1]/ph.ratio),decoding:"async",loading:eager?"eager":"lazy"});
  if(eager)img.setAttribute("fetchpriority","high");
  const show=()=>requestAnimationFrame(()=>img.classList.add("in"));
  img.addEventListener("load",show);
  img.addEventListener("error",()=>{img.remove();});   /* file mancante: resta il segnaposto */
  if(img.complete&&img.naturalWidth)show();
  return img;
}
function placePhoto(container,ph,alt,width){
  container.style.backgroundColor=ph.color;            /* segnaposto: colore medio della foto mentre si carica */
  container.append(photoImg(ph,alt,width));
  container.classList.add("has-photo");
}
function afterLoad(fn){if(document.readyState==="complete")fn();else window.addEventListener("load",()=>fn(),{once:true});}
function lazyLoad(node,fn){
  if(!("IntersectionObserver"in window)){fn();return;}
  const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();fn();}},{rootMargin:"300px"});
  io.observe(node);
}

/* ==========================================================================
   RISULTATI
   ========================================================================== */
const CAT_ICON={history:"column",art:"frame",hidden:"compass",romantic:"heart",nature:"leaf",food:"utensils",religious:"dome",local:"pin",night:"moon",family:"smile",iconic:"star",peaceful:"leaf",lively:"sun"};
const interestLabel=i=>answerLabel("interests",i);
const dirUrl=p=>"https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lng+"&hl="+getLang();
const osmUrl=p=>"https://www.openstreetmap.org/?mlat="+p.lat+"&mlon="+p.lng+"#map=17/"+p.lat+"/"+p.lng;
const wikiUrl=p=>"https://it.wikipedia.org/wiki/"+encodeURIComponent(p.wiki);
const fmtKm=k=>k<0.1?t("res.legLess"):t("res.legKm",{km:num1(k)});

/* Schermata di generazione: il sole sorge nell'arco mentre il motore compone le giornate.
   L'itinerario è calcolato davvero dal motore con le risposte date (buildItinerary). Nessuna attesa artificiale:
   la schermata resta solo finché la foto di copertina dell'itinerario non è pronta (al massimo 1,2 s),
   così l'itinerario non si apre su un riquadro vuoto; con la foto già in memoria si passa subito. */
let genBusy=false;
function generateItinerary(){
  if(genBusy)return;
  genBusy=true;
  const gs=$("#genScreen"),t0=performance.now();
  gs.hidden=false;gs.classList.remove("out");
  requestAnimationFrame(()=>setTimeout(()=>{
    let plan=null;
    try{plan=buildItinerary(engineAnswers(state.answers));}catch(e){plan=null;}
    if(!plan||!plan.days.length){genBusy=false;gs.hidden=true;toast(t("toast.linkEmpty"));return;}
    showPlan(plan,{savedId:null,source:"quiz"});
    const img=$("#resCoverMedia img");
    const ready=Promise.race([img&&img.decode?img.decode().catch(()=>{}):Promise.resolve(),new Promise(r=>setTimeout(r,1200))]);
    ready.then(()=>leaveQuizTo("itinerario",()=>{
      $(".gen-text",gs).textContent=t("gen.done");
      gs.classList.add("out");
      setTimeout(()=>{gs.hidden=true;gs.classList.remove("out");$(".gen-text",gs).textContent=t("gen.text");genBusy=false;},reduceMotion()?0:260);
    }));
  },40));
}
/* Mostra un itinerario: appena creato, riaperto da «I miei viaggi», ricevuto da un link o ripreso dopo una ricarica.
   Prepara la schermata «itinerario» senza aprirla: la apre chi chiama (openItinerary / il quiz). */
function showPlan(plan,{savedId=null,status=null,source="quiz",cur=null}={}){
  state.plan=plan;state.active=0;state.savedId=savedId;state.source=source;state.cur=cur;
  closeSheetUI();
  if(["quiz","saved","link"].includes(source))track("result_view",{source,days:plan.days.length,stops:plan.days.reduce((n,d)=>n+d.stops.length,0)});
  renderResults();
  const r=$("#results");r.classList.add("visible");
  state.selected=null;
  scrollMem.itinerario=0;
  showDay(0);mountMap();
  setTripStatus(status);syncSaveBtn();
  saveSession();renderResume();
}
/* Elenco leggibile: "a, b e c" / "a, b and c"; oltre max voci: "a, b, c e molto altro". */
function listText(items,max){
  const l=items.slice(0,max||items.length),more=max&&items.length>max;
  if(more)return l.join(", ")+t("list.more");
  return l.length<2?(l[0]||""):l.slice(0,-1).join(", ")+t("list.and")+l[l.length-1];
}
const lowerFirst=s=>s?s.charAt(0).toLowerCase()+s.slice(1):s;
/* «3 giorni tra storia, sapori romani e romanticismo»: dalle risposte, senza nulla di inventato (copertina e «I miei viaggi»). */
function coverTheme(a){
  if(a.interests.length===1)return durationLabel(a)+" "+t("theme1."+a.interests[0]);
  return t("res.cover.theme",{dur:durationLabel(a),themes:listText(a.interests.map(i=>t("theme."+i)),3)});
}
/* Copertina: foto della tappa più pertinente dell'itinerario (solo foto locali con licenza verificata). */
function coverPlace(plan){
  const all=plan.days.flatMap(d=>d.stops).filter(p=>PHOTOS[p.id]&&PHOTOS[p.id].ratio>=1.2);
  const rank=p=>(p.cats.includes("iconic")?2:0)+(p.must?1:0)+p.matches.length;   /* un luogo simbolo e pertinente, per una copertina riconoscibile */
  return all.sort((x,y)=>(rank(y)-rank(x))||(y.score-x.score))[0]||null;
}
function renderCover(plan,a){
  const media=$("#resCoverMedia"),credit=$("#resCoverCredit");
  const p=coverPlace(plan);
  if(media.dataset.place!==(p?p.id:"")){
    media.replaceChildren();media.dataset.place=p?p.id:"";
    if(p){const ph=PHOTOS[p.id];media.style.backgroundColor=ph.color;const box=media.getBoundingClientRect(),w=Math.max(box.width||window.innerWidth,(box.height||400)*ph.ratio);
    media.append(photoImg(ph,"",Math.min(w,1280),{eager:true}));}
  }
  if(p){
    const ph=PHOTOS[p.id];
    credit.replaceChildren(el("a",{href:ph.source,target:"_blank",rel:"noopener noreferrer",lang:null,text:p.name+" · "+creditText(ph)+t("photo.commons")}));
    credit.hidden=false;
  }else credit.hidden=true;
}
function renderResults(){
  const a=state.answers,plan=state.plan;
  const all=plan.days.flatMap(d=>d.stops);
  /* Titolo e testi: solo dalle risposte del quiz e dai dati dell'itinerario. */
  $("#resultTitle").textContent=t("res.cover.title."+a.company);
  $("#resultTheme").textContent=coverTheme(a);
  const span=a.duration==="half"?t("res.span.half"):plan.days.length===1?t("res.span.one"):t("res.span.days",{n:plan.days.length});
  const who=t("res.who."+a.company)+(a.company==="family"&&a.kids==="yes"?t("res.who.kids"):"")+" "+t("res.fam."+a.familiarity);
  const moods=listText(moodLabels(a).map(lowerFirst));
  $("#resultSubtitle").textContent=t("res.cover.intro",{stops:all.length,span,who,moods})+" "+[paceLabel(a.pace),answerLabel("walking",a.walking),answerLabel("budget",a.budget)].join(" · ")+".";
  const pills=$("#pills");pills.replaceChildren();
  moodLabels(a).forEach(x=>pills.append(el("span",{class:"pill pill-mood",text:x})));
  a.interests.map(interestLabel).forEach(x=>pills.append(el("span",{class:"pill",text:x})));
  renderCover(plan,a);
  const free=all.filter(s=>s.fee==="free").length;
  const toCheck=all.length-free;
  const walk=plan.days.reduce((s,d)=>s+d.walkKm,0);
  const stat=(b,x)=>el("div",null,el("b",{text:b}),el("span",{text:x}));
  $("#tripStats").replaceChildren(
    stat(String(plan.days.length),t("res.stat.days",{n:plan.days.length})),
    stat(String(all.length),t("res.stat.stops")),
    stat(String(free),t("res.stat.free")),
    stat(String(toCheck),t("res.stat.check")));
  const notes=$("#notes");notes.replaceChildren();
  const nl=plan.notes.map(n=>t("note."+n.k,n)).concat([t("res.noteData",{km:num1(walk)})]);
  nl.forEach(x=>notes.append(el("li",{text:x})));
  $("#notesCount").textContent=String(nl.length);
  /* selettore delle giornate: nell'elenco (linguette) e sulla mappa a schermo intero (pulsanti) */
  const tabs=$("#dayTabs");tabs.replaceChildren();
  $("#dayBar").hidden=plan.days.length<2;
  const md=$("#mapDays");md.replaceChildren();md.hidden=plan.days.length<2;
  plan.days.forEach((d,i)=>{
    tabs.append(el("button",{type:"button",class:"day-tab",role:"tab",id:"tab-"+i,"aria-controls":"day-"+i,"aria-selected":"false",tabindex:"-1",
      onclick:()=>showDay(i,{scroll:true}),
      onkeydown:e=>{
        const n=plan.days.length;let k=null;
        if(e.key==="ArrowRight")k=(i+1)%n;else if(e.key==="ArrowLeft")k=(i-1+n)%n;else if(e.key==="Home")k=0;else if(e.key==="End")k=n-1;
        if(k!==null){e.preventDefault();showDay(k);$("#tab-"+k).focus();}
      }},el("span",{class:"tab-day",text:t("res.day",{n:i+1})}),el("span",{class:"tab-area",text:areaText(d.areas[0]||"")})));
    md.append(el("button",{type:"button",class:"md-btn","aria-pressed":"false",onclick:()=>{showDay(i);fitDay(true);}},t("res.day",{n:i+1})));
  });
  if(!state.cur||state.cur.length!==plan.days.length)state.cur=plan.days.map(()=>0);
  state.cur=state.cur.map((c,i)=>Math.min(Math.max(0,c|0),plan.days[i].stops.length-1));
  const host=$("#days");host.replaceChildren();
  plan.days.forEach((d,i)=>host.append(renderDay(d,i,plan.days.length)));
}
function renderDay(day,di,total){
  const areas=day.areas.map(areaText);
  const head=el("div",{class:"day-head"},
    el("p",{class:"day-kicker",text:total===1?t("res.single"):t("res.dayOf",{n:di+1,total})}),
    /* titolo dalle prime zone della giornata, introduzione da prima e ultima tappa: solo dati dell'itinerario */
    el("h3",{text:areas.length>2?areas.slice(0,2).join(", ")+t("res.areasMore"):listText(areas)}),
    el("p",{class:"areas",text:day.stops.length>1?(()=>{const f=day.stops[0],l=day.stops[day.stops.length-1],via=day.areas.filter(x=>x!==f.area&&x!==l.area&&x!==f.name&&x!==l.name).map(areaText);
      return via.length?t("res.dayIntroVia",{first:f.name,last:l.name,areas:listText(via,3)}):t("res.dayIntro",{first:f.name,last:l.name});})():t("res.dayIntroOne",{first:day.stops[0].name})}),
    el("ul",{class:"day-facts"},
      el("li",{text:t("res.stops",{n:day.stops.length})}),
      el("li",{text:t("res.visits",{min:numHalf(day.minMins),max:numHalf(day.maxMins)})}),
      el("li",{text:t("res.distance",{km:num1(day.walkKm)})})));
  const list=el("ol",{class:"stops","aria-label":t("res.indexAria")});
  const breakAfter=day.stops.length>=3?Math.floor(day.stops.length/2):-1;
  const bt=state.answers.budget==="low"?t("res.break.low"):state.answers.budget==="high"?t("res.break.high"):"";
  day.stops.forEach((p,i)=>{
    const li=el("li",{class:"stop-item"});
    /* distanza in linea d'aria calcolata dalle coordinate: nessun tempo o percorso stradale inventato */
    if(i>0)li.append(el("p",{class:"leg"+(p.transit?" leg-transit":"")},
      el("span",null,t("res.leg",{dist:fmtKm(p.legKm)}),p.transit?el("strong",{text:t("res.transit")}):null)));
    li.append(renderStop(p,di,i));
    if(i+1===breakAfter&&i<day.stops.length-1){
      li.append(el("div",{class:"break"},icon("coffee"),el("div",null,
        el("strong",{text:t("res.break.title")}),
        t("res.break.text",{name:p.name,food:foodTip(day,day.foodTip)})+bt+t("res.break.note"))));
    }
    list.append(li);
  });
  const nav=total>1?el("div",{class:"day-nav"},
    di>0?el("button",{type:"button",class:"btn btn-line",text:t("res.dayPrev",{n:di}),onclick:()=>showDay(di-1,{scroll:true})}):el("span"),
    di<total-1?el("button",{type:"button",class:"btn btn-wine",text:t("res.dayNext",{n:di+2}),onclick:()=>showDay(di+1,{scroll:true})}):null):null;
  return el("section",{class:"day",id:"day-"+di,role:"tabpanel","aria-labelledby":total>1?"tab-"+di:null,"aria-label":total===1?t("res.singleAria"):null,hidden:di!==state.active},head,list,nav);
}
function budgetBox(p){
  const b=state.answers.budget;
  if(p.fee==="free")return null;
  if(b==="high")return el("div",{class:"box"},el("b",{text:t("budget.high.title")}),t("budget.high.text"));
  if(b==="low")return el("div",{class:"box"},el("b",{text:t("budget.low.title")}),t("budget.low.text"));
  return null;
}
/* Informazioni pratiche: costo, orari, giorni di chiusura, momento ideale, prenotazione e fonte della verifica.
   I dati non verificati sono dichiarati come tali: niente prezzi o orari inventati. */
const bookingLabel=b=>b==="required"||b==="recommended"?t("booking."+b):null;
const fmtDate=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||"");if(!m)return "";
  return getLang()==="en"?new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}):m[3]+"/"+m[2]+"/"+m[1];};
function practicalInfo(p){
  const box=el("div",{class:"practical"});
  const line=(label,text)=>{if(text)box.append(el("p",{class:"cost-note"},el("strong",{text:label+": "}),text));};
  line(t("info.cost"),placeText(p.cost));
  const hours=placeText(p.hours||p.hoursNote),closed=p.closed?" "+t("info.closed")+": "+placeText(p.closed)+".":"";
  line(t("info.hours"),hours?hours+closed:closed.trim());
  line(t("info.when"),placeText(p.when));
  line(t("info.booking"),placeText(p.bookingNote));
  if(p.source&&p.checked){
    box.append(el("p",{class:"cost-note verify-note"},t("info.verified",{date:fmtDate(p.checked)}),
      el("a",{href:p.source,target:"_blank",rel:"noopener noreferrer",text:t("info.source")}),
      t("info.verifiedEnd")));
  }else if(!p.public){
    box.append(el("p",{class:"cost-note verify-note",text:t("info.notVerified")}));
  }
  return box;
}
/* motivi della scelta: solo dalle risposte e dalle categorie del luogo */
function whyOf(p){
  const why=p.matches.map(interestLabel);
  if(state.answers.familiarity==="first"&&p.cats.includes("iconic"))why.push(t("why.must"));
  if(state.answers.budget==="low"&&p.fee==="free")why.push(t("why.budget"));
  if(state.answers.familiarity==="often"&&p.cats.includes("hidden"))why.push(t("why.hidden"));
  return why;
}
function essentials(p){
  const bk=bookingLabel(p.booking);
  return el("ul",{class:"essentials"},
    el("li",{class:"ess"},icon("clock"),t("stop.visit",{time:p.time})),
    el("li",{class:"ess fee-"+p.fee},icon("coin"),t("fee."+p.fee)),
    bk?el("li",{class:"ess ess-book"},icon("ticket"),bk):null,
    p.closed?el("li",{class:"ess ess-closed"},icon("closed"),t("info.closed")+": "+placeText(p.closed)):null);
}
/* Approfondimento della tappa: nella scheda (dal basso o di lato) e, in stampa, sotto ogni tappa. */
function stopDetail(p){
  return [
    el("div",{class:"box box-gem"},el("b",{text:t("stop.chicca")}),placeText(p.chicca)),
    el("div",{class:"box"},el("b",{text:t("stop.consiglio")}),placeText(p.consiglio)),
    budgetBox(p),
    el("h3",{class:"sh-sub",text:t("sheet.practical")}),
    practicalInfo(p),
    el("div",{class:"links"},
      el("a",{href:osmUrl(p),target:"_blank",rel:"noopener noreferrer",onclick:()=>track("ext_click",{kind:"osm",place:p.id}),text:t("stop.osm")}),
      el("a",{href:wikiUrl(p),target:"_blank",rel:"noopener noreferrer",onclick:()=>track("ext_click",{kind:"wiki",place:p.id}),hreflang:"it",text:t("stop.wiki")})),
    reportLine(p)];
}
function renderStop(p,di,i){
  const n=i+1;
  const main=p.cats.find(c=>CAT_ICON[c])||"star";
  const photo=el("div",{class:"photo"},icon(CAT_ICON[main]),el("span",{class:"photo-n","aria-hidden":"true",text:String(n)}),el("span",{class:"cur-tag",text:t("cur.tag")}));
  const why=whyOf(p),gloss=placeGloss(p);
  /* i nomi dei luoghi restano in italiano; in inglese, sotto il nome, una breve spiegazione */
  const card=el("article",{class:"stop",id:"stop-"+di+"-"+n,tabindex:"-1","aria-label":t("stop.aria",{n,name:p.name+(gloss?" ("+gloss+")":"")})},
    photo,
    el("div",{class:"stop-body"},
      el("p",{class:"stop-top"},el("span",{class:"badge-n","aria-hidden":"true",text:String(n)}),el("span",{text:t("stop.top",{n,area:areaText(p.area)})})),
      /* tutta la scheda apre l'approfondimento: il nome è il pulsante, esteso a tutta la scheda */
      el("h4",null,el("button",{type:"button",class:"stop-open",lang:"it",onclick:()=>openStop(di,i)},p.name)),
      gloss?el("p",{class:"gloss",text:gloss}):null,
      essentials(p),
      el("p",{class:"stop-desc",text:placeText(p.desc)}),
      why.length?el("div",{class:"chips"},why.map(w=>el("span",{class:"chip",text:w}))):null,
      el("div",{class:"stop-actions"},
        el("a",{class:"btn btn-line btn-sm",href:dirUrl(p),target:"_blank",rel:"noopener noreferrer",onclick:()=>track("ext_click",{kind:"directions",place:p.id}),text:t("stop.directions"),"aria-label":t("stop.directionsAria",{name:p.name})}),
        el("span",{class:"stop-more","aria-hidden":"true"},t("stop.openCard"),el("span",{class:"arrow",text:"→"})))),
    el("div",{class:"stop-print"},stopDetail(p)));
  const ph=PHOTOS[p.id];
  if(ph){
    photo.append(creditNode(ph,"photo-credit"));
    lazyLoad(card,()=>{
      const box=photo.getBoundingClientRect(),bw=box.width||360,bh=box.height||220;
      placePhoto(photo,ph,p.name+", Roma",Math.max(bw,bh*ph.ratio));   /* larghezza necessaria per coprire il riquadro */
    });
  }
  if(state.cur&&state.cur[di]===i)card.classList.add("is-current");
  return card;
}
/* Contatti (js/contact.js): modulo caricato quando il browser è libero, fuori dal primo caricamento.
   Se un link viene usato prima che il modulo sia pronto, il clic attende il modulo e poi apre l'email. */
let contactMod=null,contactP=null;
function loadContact(){
  if(!contactP)contactP=import("./contact.js").then(m=>(contactMod=m),()=>{contactP=null;return null;});
  return contactP;
}
function armMail(a,build,onUse){
  const arm=()=>{ if(contactMod)a.href=contactMod.mailtoUrl(build()); else loadContact(); };
  a.addEventListener("pointerenter",arm);a.addEventListener("focus",arm);
  a.addEventListener("touchstart",arm,{passive:true});
  a.addEventListener("click",e=>{
    if(onUse)onUse();
    if(contactMod){a.href=contactMod.mailtoUrl(build());return;}
    e.preventDefault();
    loadContact().then(m=>{if(m)location.href=m.mailtoUrl(build());});
  });
  return a;
}
/* «Segnala un errore»: email precompilata con nome e ID del luogo (js/contact.js).
   Si misura solo il clic (error_report_click, con il solo ID del luogo): l'invio dell'email non è osservabile. */
function reportLine(p){
  const a=el("a",{class:"report-link",href:"crediti.html#contatti","aria-label":t("stop.reportAria",{name:p.name}),text:t("stop.report")});
  armMail(a,()=>({subject:t("report.subject",{name:p.name,id:p.id}),body:t("report.body",{name:p.name,id:p.id})}),
    ()=>track("error_report_click",{place:p.id}));
  return el("p",{class:"report"},el("span",{text:t("stop.reportQ")}),a);
}
/* ==========================================================================
   GIORNATE, TAPPA CORRENTE, SCHEDA DELLA TAPPA
   ========================================================================== */
const isDesk=()=>window.matchMedia("(min-width:1024px)").matches;
function showDay(i,{scroll}={}){
  state.active=i;
  if(state.selected&&state.selected[0]!==i)state.selected=null;
  $$(".day").forEach((d,k)=>{
    const was=d.hidden;d.hidden=k!==i;
    if(k===i&&was&&!reduceMotion()){d.classList.remove("enter");void d.offsetWidth;d.classList.add("enter");}
  });
  $$(".day-tab").forEach((t,k)=>{
    const on=k===i;
    t.setAttribute("aria-selected",String(on));t.tabIndex=on?0:-1;t.classList.toggle("active",on);
  });
  $$("#mapDays .md-btn").forEach((b,k)=>b.setAttribute("aria-pressed",String(k===i)));
  updateMap();renderCarousel();renderCurBar();
  const tb=$("#tab-"+i);if(tb&&tb.scrollIntoView)tb.scrollIntoView({block:"nearest",inline:"center",behavior:reduceMotion()?"auto":"smooth"});
  /* cambiando giornata più in basso nella pagina, si riparte dall'inizio della giornata */
  if(scroll){const target=$("#day-"+i);if(target&&target.getBoundingClientRect().top<appBarH())scrollToEl(target,"start");}
}
/* Tappa corrente: quella a cui si è arrivati camminando. «Successiva» la fa avanzare e apre la scheda della nuova tappa.
   Non registra nulla di definitivo: vale per questa sessione dell'itinerario. */
function setCurrent(di,i){
  if(!state.cur)return;
  state.cur[di]=i;
  $$(".stop.is-current").forEach(c=>c.classList.remove("is-current"));
  const c=$("#stop-"+di+"-"+(i+1));if(c)c.classList.add("is-current");
  markMarkers();renderCurBar();saveSession();
}
function renderCurBar(){
  const bar=$("#curBar");if(!bar||!state.plan)return;
  const di=state.active,day=state.plan.days[di],i=state.cur?state.cur[di]:0,p=day.stops[i],n=day.stops.length;
  $("#curN").textContent=String(i+1);
  $("#curLabel").textContent=t("cur.label",{n:i+1,total:n});
  $("#curName").textContent=p.name;
  const last=i>=n-1,nextDay=di<state.plan.days.length-1,nx=$("#curNext");
  $("#curNextLabel").textContent=last?(nextDay?t("cur.nextDay",{n:di+2}):t("cur.done")):t("cur.next");
  nx.disabled=last&&!nextDay;
  nx.setAttribute("aria-label",last?(nextDay?t("cur.nextDayAria",{n:di+2}):t("cur.done")):t("cur.nextAria",{name:day.stops[i+1].name}));
}
function goNextStop(){
  const di=state.active,day=state.plan.days[di],i=state.cur[di];
  if(i<day.stops.length-1){setCurrent(di,i+1);openStop(di,i+1);}
  else if(di<state.plan.days.length-1){showDay(di+1,{scroll:true});setCurrent(di+1,state.cur[di+1]||0);openStop(di+1,state.cur[di+1]||0);}
}
function sheetContent(di,i){
  const day=state.plan.days[di],p=day.stops[i],n=i+1,total=day.stops.length,ph=PHOTOS[p.id],gloss=placeGloss(p),why=whyOf(p);
  const main=p.cats.find(c=>CAT_ICON[c])||"star";
  const photo=el("div",{class:"sh-photo"},icon(CAT_ICON[main]));
  if(ph){placePhoto(photo,ph,p.name+", Roma",Math.min(window.innerWidth,isDesk()?460:window.innerWidth));photo.append(creditNode(ph,"photo-credit"));}
  const last=i===total-1,nextDay=di<state.plan.days.length-1;
  const nextLabel=last?(nextDay?t("sheet.nextDay",{n:di+2}):t("sheet.lastStop")):t("map.next");
  const navBtn=(k,txt,aria)=>el("button",{type:"button",class:"sh-nav-btn","aria-label":aria,disabled:k<0||k>=total,onclick:()=>{openStop(di,k,{replace:true});}},txt);
  return [
    photo,
    el("div",{class:"sh-main"},
      el("p",{class:"sh-kicker"},el("span",{class:"badge-n","aria-hidden":"true",text:String(n)}),
        el("span",{text:t("sheet.kicker",{n,total,area:areaText(p.area)})+(state.plan.days.length>1?" · "+t("res.day",{n:di+1}):"")})),
      el("h2",{id:"sheetTitle",lang:"it",tabindex:"-1",text:p.name}),
      gloss?el("p",{class:"gloss",text:gloss}):null,
      essentials(p),
      el("div",{class:"sh-actions"},
        el("a",{class:"btn btn-terra",href:dirUrl(p),target:"_blank",rel:"noopener noreferrer",onclick:()=>track("ext_click",{kind:"directions",place:p.id}),"aria-label":t("stop.directionsAria",{name:p.name})},icon("pin"),t("stop.directions")),
        el("button",{type:"button",class:"btn btn-line",id:"sheetNext",disabled:last&&!nextDay,onclick:sheetNext},nextLabel,last?null:el("span",{class:"arrow","aria-hidden":"true",text:"→"}))),
      el("button",{type:"button",class:"sh-link",onclick:()=>showOnMap(di,i),"aria-label":t("stop.onMapAria",{name:p.name})},icon("pin"),t("stop.onMap")),
      el("p",{class:"sh-desc",text:placeText(p.desc)}),
      why.length?el("div",{class:"chips"},why.map(w=>el("span",{class:"chip",text:w}))):null,
      ...stopDetail(p),
      el("div",{class:"sh-nav"},
        i>0?navBtn(i-1,"← "+t("sheet.stopN",{n:i}),t("map.prev")):el("span"),
        i<total-1?navBtn(i+1,t("sheet.stopN",{n:i+2})+" →",t("map.next")):el("span")))];
}
/* «Tappa successiva» nella scheda: la tappa dopo diventa la tappa corrente (fine giornata: giorno dopo). */
function sheetNext(){
  const [di,i]=state.sheet||[state.active,state.cur[state.active]];
  const total=state.plan.days[di].stops.length;
  if(i<total-1){setCurrent(di,i+1);openStop(di,i+1,{replace:true});}
  else if(di<state.plan.days.length-1){showDay(di+1);setCurrent(di+1,0);openStop(di+1,0,{replace:true});}
}
let sheetReturn=null;
function openStop(di,i,{replace=false,fromPop=false}={}){
  if(!state.plan||!state.plan.days[di]||!state.plan.days[di].stops[i])return;
  if(di!==state.active)showDay(di);
  const sh=$("#stopSheet"),body=$("#sheetBody"),wasOpen=!sh.hidden;
  if(!wasOpen)sheetReturn=document.activeElement;
  body.replaceChildren(...sheetContent(di,i).filter(Boolean));body.scrollTop=0;
  state.sheet=[di,i];
  selectStop(di,i,{pan:true,from:"sheet"});
  const desk=isDesk();
  if(!wasOpen){
    sh.hidden=false;sh.classList.toggle("side",desk);
    sh.setAttribute("aria-modal",String(!desk));
    if(!desk){$("#sheetScrim").hidden=false;$("#app").inert=true;document.documentElement.classList.add("sheet-open");}
    if(!reduceMotion()){sh.classList.remove("sh-in");void sh.offsetWidth;sh.classList.add("sh-in");}
  }
  if(!fromPop){
    const st=histState(),r=st?st.r:"itinerario",keep=st&&st.from?{from:st.from}:{};
    pushState(r,{...keep,sheet:[di,i]},replace||wasOpen&&!!(st&&st.sheet));   /* aprire una scheda è un passo indietro-abile; cambiarla no */
  }
  ($("#sheetTitle")||sh).focus({preventScroll:true});
}
function closeSheetUI(){
  const sh=$("#stopSheet");if(sh.hidden)return;
  sh.hidden=true;sh.style.transform="";$("#sheetScrim").hidden=true;
  $("#app").inert=!$("#crea").hidden;document.documentElement.classList.remove("sheet-open");
  const sel=state.sheet;state.sheet=null;
  const back=sheetReturn;sheetReturn=null;
  if(back&&document.contains(back)&&back.offsetParent)back.focus({preventScroll:true});
  else if(sel){const c=$("#stop-"+sel[0]+"-"+(sel[1]+1));if(c&&c.offsetParent)c.focus({preventScroll:true});}
}
/* chiusura: X, tocco sullo sfondo, gesto verso il basso, Esc o tasto Indietro (la scheda è una voce della cronologia) */
function closeStop(){const st=histState();if(st&&st.sheet)history.back();else closeSheetUI();}
function initSheet(){
  const sh=$("#stopSheet");
  $("#sheetClose").addEventListener("click",closeStop);
  $("#sheetScrim").addEventListener("click",closeStop);
  sh.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeStop();}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!sh.hidden&&!sh.contains(document.activeElement)&&$("#crea").hidden)closeStop();});
  /* gesto: trascinando verso il basso dalla maniglia, dalla foto o dall'inizio della scheda */
  let y0=null,dy=0,drag=false;
  sh.addEventListener("touchstart",e=>{
    if(sh.classList.contains("side")||e.touches.length>1){y0=null;return;}
    const body=$("#sheetBody");
    if(body.scrollTop>2&&!e.target.closest(".sh-grab,.sh-photo")){y0=null;return;}
    y0=e.touches[0].clientY;dy=0;drag=false;
  },{passive:true});
  sh.addEventListener("touchmove",e=>{
    if(y0===null)return;
    dy=e.touches[0].clientY-y0;
    if(!drag&&dy<-4){y0=null;return;}
    if(dy>8)drag=true;
    if(drag){e.preventDefault();sh.style.transition="none";sh.style.transform="translateY("+Math.max(0,dy)+"px)";}
  },{passive:false});
  sh.addEventListener("touchend",()=>{
    if(y0===null)return;
    sh.style.transition="";
    if(drag&&dy>110)closeStop();
    sh.style.transform="";y0=null;drag=false;
  });
}
/* «Vedi sulla mappa»: su computer la mappa è già accanto; su smartphone si apre la mappa a schermo intero */
function showOnMap(di,i){
  if(isDesk()){selectStop(di,i,{pan:true,from:"sheet"});return;}
  const go=()=>{openMapView();requestAnimationFrame(()=>selectStop(di,i,{pan:true,from:"sheet"}));};
  const st=histState();
  if(st&&st.sheet){pendingNav=go;history.back();}else{closeSheetUI();go();}
}
function openMapView(){
  if(isDesk()){navigate("mappa");return;}
  const st=histState();
  pushState("mappa",{from:st&&st.r==="itinerario"?"itinerario":null});
  render("mappa",histState());
}
function setMapMode(on){
  const r=$("#results");r.classList.toggle("map-mode",on);
  document.documentElement.classList.toggle("map-open",on&&!isDesk());
  if(state.map)requestAnimationFrame(()=>{state.map.invalidateSize();if(on||state.mapNeedsFit){state.mapNeedsFit=false;fitDay(false);}else declutter();attachTiles();
    if(on&&state.selected&&state.selected[0]===state.active)selectStop(state.selected[0],state.selected[1],{from:"mapmode"});});
  /* Ingresso animato della schermata (es. «Mappa» dalla barra di navigazione): finché dura l'animazione (transform)
     la mappa a schermo intero ha ancora le misure della pagina e la giornata verrebbe inquadrata su un riquadro
     sbagliato. A fine animazione si rimisura la mappa e si inquadrano di nuovo le tappe (o la tappa selezionata). */
  if(on&&!isDesk()&&r.getAnimations&&r.getAnimations().length){
    const done=e=>{
      if(e.target!==r)return;
      r.removeEventListener("animationend",done);r.removeEventListener("animationcancel",done);
      if(!state.map||!r.classList.contains("map-mode"))return;
      state.map.invalidateSize();fitDay(false);
      if(state.selected&&state.selected[0]===state.active)selectStop(state.selected[0],state.selected[1],{from:"mapmode"});
    };
    r.addEventListener("animationend",done);r.addEventListener("animationcancel",done);
  }
}

/* Carosello delle tappe sulla mappa: scorrendolo si seleziona la tappa al centro (e la mappa la inquadra);
   toccando un numero sulla mappa il carosello porta in vista la sua tappa. */
let carouselSilent=0,carouselTimer=null;
function renderCarousel(){
  const box=$("#mapCarousel");if(!box||!state.plan)return;
  const di=state.active,day=state.plan.days[di];
  box.replaceChildren(...day.stops.map((p,i)=>{
    const th=el("span",{class:"mc-thumb","aria-hidden":"true"});
    const ph=PHOTOS[p.id];if(ph)lazyLoad(th,()=>placePhoto(th,ph,"",88));
    return el("button",{type:"button",class:"mc-item","data-i":i,onclick:()=>openStop(di,i)},
      th,el("span",{class:"mc-text"},el("small",null,el("span",{class:"badge-n","aria-hidden":"true",text:String(i+1)}),areaText(p.area)),el("strong",{lang:"it",text:p.name}),el("em",{text:t("stop.visit",{time:p.time})})));
  }));
  box.scrollLeft=0;
}
function initCarousel(){
  const box=$("#mapCarousel");
  box.addEventListener("scroll",()=>{
    if(Date.now()<carouselSilent)return;
    clearTimeout(carouselTimer);
    carouselTimer=setTimeout(()=>{
      const r=box.getBoundingClientRect(),mid=r.left+r.width/2;
      let best=null,bd=1e9;
      $$(".mc-item",box).forEach(it=>{const b=it.getBoundingClientRect(),d=Math.abs(b.left+b.width/2-mid);if(d<bd){bd=d;best=it;}});
      if(best)selectStop(state.active,+best.dataset.i,{pan:true,from:"carousel"});
    },120);
  },{passive:true});
}

/* ==========================================================================
   MAPPA (Leaflet, tasselli OpenStreetMap)
   La libreria (≈150 KB) si scarica solo quando serve: all'inizio del quiz o all'apertura di un itinerario.
   ========================================================================== */
let leafletP=null,mapStyle=null;
function loadLeaflet(){
  if(window.L)return Promise.resolve(true);
  if(leafletP)return leafletP;
  leafletP=new Promise(res=>{
    const css=el("link",{rel:"stylesheet",href:"js/vendor/leaflet/leaflet.css"});
    document.head.insertBefore(css,document.querySelector('link[rel="stylesheet"]'));   /* prima di style.css: i nostri stili restano prioritari */
    const sc=el("script",{src:"js/vendor/leaflet/leaflet.js"});
    /* prototipo Protomaps: dopo Leaflet si carica il motore dei tasselli vettoriali (se manca, si torna a OSM) */
    sc.onload=()=>{
      if(!window.L)return res(false);
      /* stile e sorgente della mappa vettoriale: modulo caricato solo qui (non pesa su home e quiz) */
      const pm=el("script",{src:"js/vendor/protomaps-leaflet/protomaps-leaflet.js"});
      pm.onload=()=>import("./map-style.js").then(m=>{mapStyle=m;},()=>{}).then(()=>res(true));
      pm.onerror=()=>res(true);
      document.head.append(pm);
    };
    sc.onerror=()=>{leafletP=null;sc.remove();res(false);};
    document.head.append(sc);
  });
  return leafletP;
}
/* margini interni per non coprire le tappe con i controlli (in alto a destra) e con «Sposta la mappa» (in alto a sinistra) */
const fitPad=()=>isDesk()?{paddingTopLeft:[40,40],paddingBottomRight:[80,48],maxZoom:16}:{paddingTopLeft:[28,84],paddingBottomRight:[72,150],maxZoom:16};   /* margini per pulsanti, giornate e carosello */
function initMap(){
  const mapEl=$("#map");
  if(state.map)return;
  if(window.L&&mapEl.dataset.failed){delete mapEl.dataset.failed;mapEl.replaceChildren();mapEl.style.height="";mapEl.style.minHeight="";}   /* la rete è tornata: si riprova */
  if(mapEl.dataset.failed)return;
  if(!window.L){
    mapEl.dataset.failed="1";
    mapEl.replaceChildren(el("div",{class:"map-fallback","data-i18n":"map.failed",text:t("map.failed")}));
    mapEl.style.height="auto";mapEl.style.minHeight="0";
    return;
  }
  /* La mappa ha una schermata tutta sua (smartphone) o una colonna fissa (computer): si trascina sempre con un dito. */
  const S=mapStyle;
  const vector=!!(window.protomapsL&&S&&S.canDecompress());
  const bb=a=>L.latLngBounds([a.south,a.west],[a.north,a.east]);
  state.map=L.map(mapEl,{scrollWheelZoom:false,
    /* mappa vettoriale: si resta dentro l'area dei dati (niente sfondo vuoto) */
    ...(vector?{minZoom:S.MAP_MIN_ZOOM,maxBounds:bb(S.TILE_AREA_DETAIL),maxBoundsViscosity:1}:{}),dragging:true,touchZoom:true,tap:false,zoomControl:false,bounceAtZoomLimits:false,
    zoomAnimation:!reduceMotion(),fadeAnimation:!reduceMotion(),markerZoomAnimation:!reduceMotion()}).setView([41.9028,12.4964],12);
  state.map.attributionControl.setPrefix(false);
  /* Prototipo: tasselli vettoriali Protomaps ospitati con il sito (tiles/: tutta l'area dei 77 luoghi, zoom 12–15;
     oltre il 15 si ingrandiscono i vettori). Se il motore non è disponibile o il browser non sa decomprimere
     (DecompressionStream: Safari 16.4+, Chrome 80+, Firefox 113+): tasselli pubblici OSM come prima.
     Caricamento progressivo: solo i tasselli della zona visibile, nessun tassello durante le animazioni di zoom,
     e il livello si aggiunge solo quando la mappa è vicina allo schermo e già inquadrata sulla giornata. */
  const tileFailed=()=>{
    /* senza connessione: avviso chiaro, la mappa mostra solo le zone già consultate */
    if(!navigator.onLine){mapNotice("map.offline");return;}
    if(state.tileOk||state.tileWarned)return;
    state.tileWarned=true;setTimeout(()=>{if(!state.tileOk)mapNotice("map.notice");},4000);
  };
  const tiles=vector
    ?protomapsL.leafletLayer({url:S.tileSource(S.TILE_URL,{onError:tileFailed}),maxDataZoom:S.TILE_MAX_DATA_ZOOM,minZoom:S.MAP_MIN_ZOOM,maxZoom:19,bounds:bb(S.TILE_AREA_WIDE),
        updateWhenZooming:false,keepBuffer:1,...S.mapRules(protomapsL),attribution:S.ATTRIBUTION})
    :L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});
  mapEl.classList.toggle("map-vector",vector);
  track("map_view",{kind:vector?"vector":"raster"});
  state.tiles=tiles;
  if(!vector)tiles.addTo(state.map);
  tiles.on("tileload",()=>{state.tileOk=true;});
  /* connessione tornata dopo un periodo offline: si richiedono di nuovo i tasselli mancanti */
  window.addEventListener("online",()=>{if(!state.tiles)return;state.tileWarned=false;mapNotice(null);if(state.map.hasLayer(state.tiles))state.tiles.redraw();});
  tiles.on("tileerror",tileFailed);
  $("#mapCtrl").hidden=false;
  $("#mapZoomIn").onclick=()=>state.map.zoomIn();
  $("#mapZoomOut").onclick=()=>state.map.zoomOut();
  $("#mapFit").onclick=()=>fitDay(true);
  state.map.on("zoomend",declutter);
  window.addEventListener("resize",()=>{if(state.map){state.map.invalidateSize();declutter();}},{passive:true});
}
/* Tappe molto vicine (es. Vittoriano e Campidoglio): i numeri vengono allontanati quanto basta per non sovrapporsi
   (rilassamento a coppie, partendo dalle posizioni vere); un punto sottile resta sulla posizione vera.
   Ricalcolato a ogni livello di zoom. */
function declutter(){
  const l=state.mapLayers[state.active];if(!state.map||!l)return;
  const MIN=44,O=l.markers.map(m=>state.map.latLngToContainerPoint(m.getLatLng())),P=O.map(p=>({x:p.x,y:p.y}));
  for(let it=0;it<40;it++){
    let moved=false;
    for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){
      let dx=P[j].x-P[i].x,dy=P[j].y-P[i].y,d=Math.hypot(dx,dy);
      if(d>=MIN)continue;
      if(d<0.01){const a=(i+j)*2.39996;dx=Math.cos(a);dy=Math.sin(a);d=1;}   /* stessa posizione: direzione fissa e ripetibile */
      const push=(MIN-d)/2+0.5,ux=dx/d,uy=dy/d;
      P[i].x-=ux*push;P[i].y-=uy*push;P[j].x+=ux*push;P[j].y+=uy*push;moved=true;
    }
    if(!moved)break;
  }
  l.markers.forEach((m,i)=>{
    const e=m.getElement();if(!e)return;
    const dx=P[i].x-O[i].x,dy=P[i].y-O[i].y,shifted=Math.hypot(dx,dy)>0.5;
    e.querySelector(".vm-pin").style.transform=shifted?"translate("+dx.toFixed(1)+"px,"+dy.toFixed(1)+"px)":"";
    e.classList.toggle("vm-shifted",shifted);
  });
}
function fitDay(animate){
  const l=state.mapLayers[state.active];if(!state.map||!l)return;
  const opt={...fitPad(),animate:!!animate&&!reduceMotion()};
  if(l.pts.length===1)state.map.setView(l.pts[0],16,{animate:opt.animate});
  else state.map.fitBounds(l.pts,opt);
  declutter();
}
/* avviso sotto la mappa: testo secondo il caso (rete assente / tasselli non caricati); null = nascosto */
function mapNotice(key){
  const n=$("#mapNotice");if(!n)return;
  if(!key){n.hidden=true;return;}
  const p=n.querySelector("[data-i18n]")||n;p.setAttribute("data-i18n",key);p.textContent=t(key);n.hidden=false;
  if(key==="map.offline")track("map_offline");
}
/* il livello dei tasselli entra in mappa solo quando la mappa è vicina allo schermo (600 px, circa mezzo schermo
   prima che appaia) ed è già inquadrata sulla giornata: nessun tassello per una mappa che non si guarda */
let tileIO=null;
function attachTiles(){
  if(!state.tiles||state.map.hasLayer(state.tiles))return;
  const mapEl=$("#map");
  if(!("IntersectionObserver" in window)){state.tiles.addTo(state.map);return;}
  if(tileIO)return;
  tileIO=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){tileIO.disconnect();tileIO=null;state.tiles.addTo(state.map);}},{rootMargin:"600px 0px"});
  tileIO.observe(mapEl);
}
function buildMapLayers(){
  state.mapLayers=[];
  if(!state.map)return;
  /* solo i punti delle tappe, numerati: nessuna linea tra le tappe, che sembrerebbe un percorso a piedi verificato */
  state.plan.days.forEach((day,di)=>{
    const group=L.layerGroup(),markers=[],pts=[];
    day.stops.forEach((p,i)=>{
      const m=L.marker([p.lat,p.lng],{keyboard:true,riseOnHover:true,
        icon:L.divIcon({className:"vm",html:'<span class="vm-pin"><span class="vm-n">'+(i+1)+'</span></span>',iconSize:[44,44],iconAnchor:[22,22]})});
      /* marker come pulsante accessibile: nome letto dagli screen reader, Invio o clic per selezionare */
      m.on("add",()=>{const e=m.getElement();if(!e)return;e.setAttribute("role","button");
        if(!e.dataset.keys){e.dataset.keys="1";e.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();markerTap(di,i);}});}e.setAttribute("aria-label",t("map.markerAria",{n:i+1,name:p.name}));e.removeAttribute("title");
        markMarkers();});
      m.on("click",()=>markerTap(di,i));
      group.addLayer(m);markers.push(m);pts.push([p.lat,p.lng]);
    });
    state.mapLayers.push({group,markers,pts});
  });
}
/* tocco su un numero: su smartphone la tappa va in primo piano nel carosello; su computer si apre la scheda di lato */
function markerTap(di,i){
  if(isDesk()||!$("#results").classList.contains("map-mode"))openStop(di,i);
  else selectStop(di,i,{pan:false,from:"marker"});
}
function markMarkers(){
  const l=state.mapLayers[state.active];if(!l)return;
  const cur=state.cur?state.cur[state.active]:-1,sel=state.selected&&state.selected[0]===state.active?state.selected[1]:-1;
  l.markers.forEach((m,k)=>{const e=m.getElement();if(!e)return;e.classList.toggle("is-active",k===sel);e.classList.toggle("is-current",k===cur);m.setZIndexOffset(k===sel?1000:k===cur?500:0);});
}
let shownLayer=null;
function updateMap(){
  if(!state.map)return;
  if(shownLayer)state.map.removeLayer(shownLayer);
  const l=state.mapLayers[state.active];
  if(!l)return;
  l.group.addTo(state.map);shownLayer=l.group;
  state.map.invalidateSize();
  if(!$("#map").offsetWidth)state.mapNeedsFit=true;   /* mappa nascosta: si inquadra quando diventa visibile */
  fitDay(false);
  attachTiles();markMarkers();
}
/* Tappa selezionata: numero evidenziato sulla mappa, scheda dell'elenco e voce del carosello allineate. */
function selectStop(di,i,{pan,from}={}){
  if(di!==state.active)showDay(di);
  state.selected=[di,i];
  markMarkers();
  $$(".stop.is-active").forEach(c=>c.classList.remove("is-active"));
  const c=$("#stop-"+di+"-"+(i+1));if(c)c.classList.add("is-active");
  $$("#mapCarousel .mc-item").forEach(it=>{const on=+it.dataset.i===i;it.classList.toggle("is-active",on);if(on)it.setAttribute("aria-current","true");else it.removeAttribute("aria-current");});
  if(from!=="carousel"){
    const it=$('#mapCarousel .mc-item[data-i="'+i+'"]');
    if(it&&it.offsetParent){carouselSilent=Date.now()+700;const box=$("#mapCarousel");box.scrollTo({left:it.offsetLeft-(box.clientWidth-it.offsetWidth)/2,behavior:reduceMotion()?"auto":"smooth"});}
  }
  if(from==="marker"&&isDesk()&&c)scrollToEl(c,"center");
  if(pan&&state.map&&state.mapLayers[di]&&$("#map").offsetWidth){
    const ll=state.mapLayers[di].markers[i].getLatLng();
    if(!state.map.getBounds().pad(-0.2).contains(ll))state.map.panTo(ll,{animate:!reduceMotion()});
  }
}
/* Mappa pronta (libreria scaricata): costruisce i livelli dell'itinerario mostrato. */
function mountMap(){
  return loadLeaflet().then(()=>{
    if(!state.plan)return;
    initMap();buildMapLayers();updateMap();
  });
}

/* ==========================================================================
   I MIEI VIAGGI (salvataggio locale) E CONDIVISIONE
   ========================================================================== */
let store=null;
function getStore(){
  if(store)return store;
  let ls=null;try{ls=window.localStorage;}catch(e){ls=null;}
  store=createStore(ls||{getItem(){throw new Error("no storage");},setItem(){throw new Error("no storage");}});
  return store;
}
const fmtSaved=iso=>{const d=new Date(iso);return isNaN(d)?"":d.toLocaleDateString(locale(),{day:"numeric",month:"long",year:"numeric"});};
const errText=code=>t("err."+(["quota","full","corrupt"].includes(code)?code:"unavailable"),{max:MAX_TRIPS});
/* Il messaggio di stato è conservato come chiavi, così cambia lingua insieme al resto. */
function setTripStatus(parts){
  state.status=parts&&parts.length?parts:null;
  const p=$("#tripStatus");
  p.textContent=state.status?state.status.map(x=>t(x[0],x[1])).join(""):"";
  p.hidden=!state.status;
}
function syncSaveBtn(){
  const b=$("#saveBtn");
  const saved=!!state.savedId;
  $("#saveLabel").textContent=saved?t("res.savedShort"):t("res.saveShort");
  b.setAttribute("aria-label",saved?t("res.savedAria"):t("res.save"));
  b.classList.toggle("is-saved",saved);
  b.disabled=saved;
}
function saveCurrent(){
  if(!state.plan)return;
  const r=getStore().save(tripFromPlan(state.answers,state.plan));
  if(!r.ok){toast(errText(r.error));setTripStatus([["err."+(["quota","full"].includes(r.error)?r.error:"unavailable"),{max:MAX_TRIPS}]]);return;}
  state.savedId=r.trip.id;syncSaveBtn();setLast(r.trip.id);saveSession();
  if(!r.existing)track("trip_save");
  setTripStatus([[r.existing?"status.already":"status.saved"]]);
  renderTrips();
}
/* «I miei viaggi»: raccolta con copertina (foto della tappa più rappresentativa), titolo, durata, tappe e interessi.
   Più recenti per primi; oltre TRIPS_PAGE viaggi compare «Mostra altri». */
const TRIPS_PAGE=6;
let tripsShown=TRIPS_PAGE;
const tripPlan=trip=>restoreItinerary(engineAnswers(trip.answers),trip.days);
function tripCard(trip,last){
  const a=trip.answers,plan=tripPlan(trip),stops=plan.days.reduce((n,d)=>n+d.stops.length,0);
  const title=t("res.cover.title."+a.company),full=tripTitle(a);
  const cover=el("div",{class:"tc-cover"});
  const p=coverPlace(plan);
  if(p){const ph=PHOTOS[p.id];lazyLoad(cover,()=>placePhoto(cover,ph,"",isNarrow()?window.innerWidth:480));}
  const ints=a.interests.map(interestLabel);
  /* contrassegni sulla copertina: «Ultimo aperto» e, solo dopo la verifica della cache, «Offline» */
  const flags=el("div",{class:"tc-flags"},
    last?el("span",{class:"tc-last",text:t("trips.last")}):null,
    el("span",{class:"tc-off",hidden:true},icon("cloudok"),el("span",{text:t("trips.offlineFlag")})));
  return el("li",{class:"trip-card"+(last?" is-last":""),"data-trip":trip.id},
    el("article",{class:"tc","aria-label":full},
      cover,flags,
      el("div",{class:"tc-over"},
        el("h3",null,el("button",{type:"button",class:"tc-open",onclick:()=>openTrip(trip.id)},title)),
        el("p",{class:"tc-theme",text:coverTheme(a)})),
      el("div",{class:"tc-body"},
        el("p",{class:"tc-badge"},el("span",{text:durationLabel(a)}),el("span",{text:t("res.stops",{n:stops})})),
        el("ul",{class:"tc-tags","aria-label":t("trips.interests")},ints.slice(0,3).map(x=>el("li",{text:x})),ints.length>3?el("li",{class:"more",text:"+"+(ints.length-3)}):null),
        el("p",{class:"tc-offline",hidden:true}),
        el("div",{class:"tc-foot"},
          el("p",{class:"tc-date",text:trip.savedAt?t("trips.savedOn",{date:fmtSaved(trip.savedAt)}):""}),
          el("div",{class:"tc-actions"},
            el("button",{type:"button",class:"btn btn-wine btn-sm",text:t("trips.open"),"aria-label":t("trips.openAria",{title:full}),onclick:()=>openTrip(trip.id)}),
            el("button",{type:"button",class:"tc-icon",title:t("trips.share"),"aria-label":t("trips.shareAria",{title:full}),onclick:()=>shareTrip(trip)},icon("share")),
            el("button",{type:"button",class:"tc-icon tc-del",title:t("trips.delete"),"aria-label":t("trips.deleteAria",{title:full}),onclick:()=>deleteTrip(trip)},icon("trash")))))));
}
/* Disponibilità offline, verificata davvero: il service worker controlla la pagina e nella Cache Storage
   ci sono la pagina e tutti i file con cui l'app si avvia (CSS, moduli). Le foto di ogni viaggio si contano
   una per una nella cache delle immagini (il service worker le salva quando vengono mostrate). */
async function offlineCheck(){
  if(!("serviceWorker" in navigator)||!navigator.serviceWorker.controller||!("caches" in window))return null;
  try{
    const hero=$("#heroMedia img"),heroUrl=hero&&(hero.currentSrc||hero.src);
    const urls=[new URL("./",document.baseURI).href,import.meta.url,
      ...$$('link[rel="stylesheet"][href*="?v="],link[rel="modulepreload"]').map(l=>l.href),
      ...(heroUrl?[heroUrl]:[])];   /* la copertina della Home è una risorsa essenziale: senza, niente «Pronto» */
    const hits=await Promise.all(urls.map(u=>caches.match(u)));
    if(hits.some(h=>!h))return {shell:false};
    const keys=await caches.has(IMG_CACHE)?(await (await caches.open(IMG_CACHE)).keys()).map(r=>new URL(r.url).pathname):[];
    return {shell:true,imgs:keys};
  }catch(e){return null;}
}
const IMG_CACHE="vivi-roma-img-v1",HOME_CACHE="vivi-roma-home-v1";
/* Salva per l'uso offline le immagini della Home nella misura scelta da questo browser (la copertina subito,
   illustrazione e mappa quando vengono mostrate). Serve il service worker attivo: al primo accesso si aspetta
   che prenda il controllo della pagina. Poi si ricontrolla lo stato offline. */
async function keepHomeImage(img){
  if(!img||!("caches" in window)||!navigator.serviceWorker||!navigator.serviceWorker.controller)return;
  if(!img.complete)await new Promise(res=>img.addEventListener("load",res,{once:true}));
  const url=img.currentSrc||img.src;if(!url||!img.naturalWidth)return;
  try{const c=await caches.open(HOME_CACHE);if(!(await c.match(url)))await c.add(url);}catch(e){}
}
async function keepHomeImages(){
  await keepHomeImage($("#heroMedia img"));
  refreshOffline();
  for(const img of $$(".qc-art,.mc-img")){if(img.complete&&img.naturalWidth)keepHomeImage(img);else img.addEventListener("load",()=>keepHomeImage(img),{once:true});}
}
let offlineState=null;
async function refreshOffline(){
  offlineState=await offlineCheck();
  syncSettings();
  const ok=offlineState&&offlineState.shell;
  $$("#tripList .trip-card").forEach(li=>{
    const trip=getStore().get(li.dataset.trip),flag=$(".tc-off",li),line=$(".tc-offline",li);
    if(!trip||!ok){flag.hidden=true;line.hidden=true;return;}
    const ids=[...new Set(trip.days.flat())].filter(id=>PHOTOS[id]);
    const saved=ids.filter(id=>offlineState.imgs.some(k=>k.includes("/"+PHOTOS[id].base+"-"))).length;
    flag.hidden=false;line.hidden=false;
    line.textContent=t(saved===ids.length?"trips.offlineAll":"trips.offlineSome",{n:saved,total:ids.length});
  });
}
function renderTrips(){
  const r=getStore().list(),list=$("#tripList"),err=$("#tripsError"),n=r.trips.length;
  err.hidden=r.ok;err.textContent=r.ok?"":errText(r.error);
  const badge=$("#navTripsCount");badge.hidden=!n;badge.textContent=n?String(n):"";
  $("#navTripsSr").textContent=n?" ("+t("trips.count",{n})+")":"";
  $("#tripsCount").textContent=n?t("trips.count",{n}):"";
  $("#tripsEmpty").hidden=!!n||!r.ok;
  $("#tripsNote").hidden=!n;
  list.replaceChildren();
  const last=getLast();
  r.trips.slice(0,tripsShown).forEach(trip=>list.append(tripCard(trip,trip.id===last)));
  if(n)refreshOffline();
  const more=$("#tripsMore");
  more.hidden=n<=tripsShown;
  if(n>tripsShown)more.textContent=t("trips.more",{n:n-tripsShown});
  renderResume();
}
async function shareTrip(trip){
  const plan=tripPlan(trip),url=shareUrl(location.href,trip.answers,plan);
  shareContent(trip.answers,plan,url);
}
function openTrip(id,opts){
  const trip=getStore().get(id);
  if(!trip){toast(t("toast.tripGone"));renderTrips();return;}
  loadAnswers(trip.answers);
  const plan=restoreItinerary(engineAnswers(state.answers),trip.days);
  showPlan(plan,{savedId:trip.id,source:"saved",status:[["status.reopened"]].concat(plan.missing.length?[["status.missing",{n:plan.missing.length}]]:[])});
  setLast(trip.id);
  if(!opts||opts.open!==false)openItinerary();
}
function confirmDialog(text,{title="dlg.delete.title",ok="dlg.delete"}={}){
  const d=$("#confirmDlg");
  if(typeof d.showModal!=="function")return Promise.resolve(window.confirm(text));
  $("#confirmTitle").textContent=t(title);$("#confirmOk").textContent=t(ok);
  $("#confirmText").textContent=text;
  return new Promise(res=>{
    d.addEventListener("close",()=>res(d.returnValue==="ok"),{once:true});
    d.returnValue="";d.showModal();$("#confirmDlg [value=cancel]").focus();
  });
}
async function deleteTrip(trip){
  if(!await confirmDialog(t("dlg.delete.text",{title:tripTitle(trip.answers)})))return;
  const r=getStore().remove(trip.id);
  if(!r.ok){toast(r.error?errText(r.error):t("toast.deleteFailed"));return;}
  if(state.savedId===trip.id){state.savedId=null;syncSaveBtn();setTripStatus(null);saveSession();}
  if(getLast()===trip.id)setLast(null);
  renderTrips();toast(t("toast.deleted"));
  const first=$("#tripList .tc-open")||$("#tripsEmpty a");if(first)first.focus();else $("#tripsTitle").setAttribute("tabindex","-1"),$("#tripsTitle").focus();
}
async function shareCurrent(){
  if(!state.plan)return;
  shareContent(state.answers,state.plan,shareUrl(location.href,state.answers,state.plan));
}
async function shareContent(a,plan,url){
  const text=shareText(a,plan,url);
  if(navigator.share){
    try{await navigator.share({title:t("share.title",{title:tripTitle(a)}),text});track("share",{method:"native"});return;}
    catch(e){if(e&&e.name==="AbortError")return;}   /* annullato dall'utente: nessun messaggio */
  }
  const d=$("#shareDlg");$("#shareText").value=text;$("#shareStatus").textContent="";
  if(typeof d.showModal==="function"){d.showModal();$("#shareText").focus();$("#shareText").select();track("share",{method:"manual"});}
  else if(await copyText(text))track("share",{method:"copy"});
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);$("#shareStatus").textContent=t("dlg.copied");toast(t("toast.copied"));return true;}
  catch(e){
    const ta=$("#shareText");ta.value=text;ta.focus();ta.select();
    let ok=false;try{ok=document.execCommand("copy");}catch(_){}
    $("#shareStatus").textContent=ok?t("dlg.copied"):t("dlg.copyFailed");
    return ok;
  }
}
/* Itinerario ricevuto con un link (#itinerario=…): si apre senza rifare il quiz. */
function openFromLink(){
  const m=/[#&]itinerario=([^&]+)/.exec(location.hash);
  if(!m)return false;
  const data=decodeShare(decodeURIComponent(m[1]));
  if(!data){toast(t("toast.linkInvalid"));return false;}
  loadAnswers(data.answers);
  const plan=restoreItinerary(engineAnswers(state.answers),data.days);
  if(!plan.days.length){toast(t("toast.linkEmpty"));return false;}
  const saved=getStore().find(tripFromPlan(state.answers,plan));
  track("share_open");
  showPlan(plan,{savedId:saved?saved.id:null,source:"link",status:[["status.fromLink"],[saved?"status.linkSaved":"status.linkCanSave"]]});
  /* la voce della cronologia resta quella del link: ricaricando, l'itinerario si riapre */
  history.replaceState({vivi:1,r:"itinerario",d:0},"",location.href);
  render("itinerario",histState(),{initial:true});
  return true;
}

/* ==========================================================================
   LINGUA: italiano / inglese. Cambia solo i testi: risposte, itinerario, mappa e viaggi salvati restano gli stessi.
   ========================================================================== */
function storageOrNull(){try{return window.localStorage;}catch(e){return null;}}
function applyLang(){
  const l=getLang();
  document.documentElement.lang=l;
  document.title=t("meta.title");
  applyStatic(document);
  $("#langToggle").setAttribute("lang",l==="it"?"en":"it");
  syncSettings();
  relabelQuiz();
  $$(".cat-card").forEach(card=>{const img=$("img",card);if(img)img.alt=t("cat."+card.dataset.interest+".alt");});
  heroCredit();
  renderTrips();
  if(state.plan)rerenderResults();
}
/* Ridisegna i risultati nella nuova lingua mantenendo giornata attiva, vista della mappa e tappa selezionata. */
function rerenderResults(){
  const view=state.map?{c:state.map.getCenter(),z:state.map.getZoom()}:null,sel=state.selected,y=window.scrollY;
  renderResults();
  if(state.map){
    if(shownLayer){state.map.removeLayer(shownLayer);shownLayer=null;}
    buildMapLayers();updateMap();
    if(view)state.map.setView(view.c,view.z,{animate:false});
    declutter();
  }
  $$(".day").forEach((d,k)=>{d.hidden=k!==state.active;});
  $$(".day-tab").forEach((tb,k)=>{const on=k===state.active;tb.setAttribute("aria-selected",String(on));tb.tabIndex=on?0:-1;tb.classList.toggle("active",on);});
  $$("#mapDays .md-btn").forEach((b,k)=>b.setAttribute("aria-pressed",String(k===state.active)));
  renderCarousel();renderCurBar();
  if(sel&&sel[0]===state.active)selectStop(sel[0],sel[1],{from:"lang"});
  if(state.sheet){const [di,i]=state.sheet;$("#sheetBody").replaceChildren(...sheetContent(di,i).filter(Boolean));}
  syncSaveBtn();setTripStatus(state.status);
  window.scrollTo({top:y,behavior:"instant"});
}
async function toggleLang(){
  const next=getLang()==="it"?"en":"it";
  if(!await loadLang(next)){toast(t("lang.loadFailed"));return;}   /* senza connessione l'inglese può non arrivare: si resta in italiano */
  setLang(next,storageOrNull());
  applyLang();
  track("lang_switch",{to:next});
  toast(t("lang.changed"));
}

/* ==========================================================================
   NAVIGAZIONE, CATEGORIE, EVENTI GLOBALI
   ========================================================================== */
function initCategories(){
  $$(".cat-card").forEach(card=>{
    card.addEventListener("click",()=>{
      const k=card.dataset.interest,list=state.answers.interests;
      const label=interestLabel(k);
      if(list.includes(k))toast(t("cat.already",{label}));
      else{list.push(k);syncOptions();toast(t("cat.added",{label}));}
    });
    const ph=PHOTOS[card.dataset.photo];
    /* dopo il caricamento della pagina: le categorie non competono con la copertina sulle reti lente */
    if(ph)afterLoad(()=>lazyLoad(card,()=>placePhoto(card,ph,t("cat."+card.dataset.interest+".alt"),card.getBoundingClientRect().width||300)));
  });
}
function initRail(){
  const rail=$("#catRail"),prev=$("#catPrev"),next=$("#catNext");if(!rail)return;
  const sync=()=>{const max=rail.scrollWidth-rail.clientWidth-2;prev.disabled=rail.scrollLeft<=2;next.disabled=rail.scrollLeft>=max;};
  const go=d=>rail.scrollBy({left:d*rail.clientWidth*.9,behavior:reduceMotion()?"auto":"smooth"});
  prev.addEventListener("click",()=>go(-1));next.addEventListener("click",()=>go(1));
  rail.addEventListener("scroll",()=>requestAnimationFrame(sync),{passive:true});
  window.addEventListener("resize",sync,{passive:true});sync();
}
function initHero(){
  /* la copertina è già nell'HTML (index.html), così il browser la scarica prima del JavaScript:
     qui si aggiungono solo il colore medio di riserva e il credito della foto */
  const media=$("#heroMedia"),land=PHOTOS.hero;
  if(!land)return;
  media.style.backgroundColor=land.color;
  heroCredit();
}
function heroCredit(){
  const land=PHOTOS.hero,credit=$("#heroCredit");if(!land)return;
  credit.replaceChildren(el("a",{href:land.source,target:"_blank",rel:"noopener noreferrer",text:creditText(land)+t("photo.commons")}));
  credit.hidden=false;
}
/* Esempio: un itinerario vero, calcolato adesso dal motore con risposte di esempio (nessun dato inventato). */
const SAMPLE={company:"couple",familiarity:"first",duration:"one",days:null,interests:["history","food","romantic"],mood:["iconic"],pace:"balanced",budget:"mid",walking:"medium"};
let samplePlan=null;
function initReveal(){
  const items=$$(".reveal");
  if(!("IntersectionObserver"in window)||reduceMotion()){items.forEach(i=>i.classList.add("in"));return;}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}}),{threshold:.12});
  items.forEach(i=>io.observe(i));
}

/* Controllo di tutte le foto: aprire la pagina con ?photocheck in fondo all'indirizzo.
   Per ogni tappa, categoria e copertina mostra se il file locale si carica, le sue dimensioni e l'attribuzione. */
async function runPhotoAudit(){
  const box=el("div",{style:"position:fixed;inset:0;z-index:5000;overflow:auto;background:#fffcf7;color:#252321;padding:20px;font:14px/1.5 Inter,Arial,sans-serif"});
  const sum=el("p",{style:"margin:0 0 14px",text:"Verifica in corso…"});
  const table=el("table",{style:"border-collapse:collapse;width:100%"});
  box.append(el("button",{type:"button",style:"float:right;padding:8px 14px",text:"Chiudi",onclick:()=>box.remove()}),
    el("h2",{style:"margin:0 0 6px;font-size:28px",text:"Controllo foto VIVI Roma"}),sum,table);
  document.body.append(box);
  const rows=PLACES.map(p=>({tipo:"Tappa",nome:p.name,key:p.id}))
    .concat($$(".cat-card").map(c=>({tipo:"Categoria",nome:c.dataset.label,key:c.dataset.photo})))
    .concat([{tipo:"Copertina",nome:"Orizzontale",key:"hero"},{tipo:"Copertina",nome:"Verticale (smartphone)",key:"hero-portrait"}]);
  const loads=src=>new Promise(res=>{const i=new Image();i.onload=()=>res(i.naturalWidth+"×"+i.naturalHeight);i.onerror=()=>res(null);i.src=src;});
  let ok=0;
  for(const r of rows){
    const ph=PHOTOS[r.key],cell=(t,st)=>el("td",{style:"padding:6px 8px;vertical-align:middle;"+(st||"")},t);
    const sizes=ph?await Promise.all(ph.w.map(w=>loads(ph.base+"-"+w+".webp"))):[];
    const good=ph&&sizes.every(Boolean);if(good)ok++;
    table.append(el("tr",{style:"border-top:1px solid #ddd4c4"},cell(r.tipo),cell(r.nome),
      cell(good?"ok":ph?"FILE ROTTO":"SEGNAPOSTO","font-weight:600;color:"+(good?"#3d4f2a":"#762F3B")),
      cell(ph?el("img",{src:ph.base+"-"+ph.w[0]+".webp",alt:"",style:"width:96px;height:64px;object-fit:cover"}):""),
      cell(ph?sizes.join(" · "):""),cell(ph?creditNode(ph,""):"")));
  }
  sum.textContent=ok+" foto locali caricate su "+rows.length+(ok===rows.length?": tutte ok.":". Le altre usano il segnaposto.");
}

/* ==========================================================================
   APP: schermate, cronologia (tasto Indietro), transizioni
   Ogni schermata è una voce della cronologia (#scopri, #viaggi, #mappa, #impostazioni, #itinerario, #crea),
   così il tasto Indietro del telefono e del browser torna davvero alla schermata precedente.
   Le domande del quiz sono passi della cronologia: Indietro torna alla domanda precedente.
   ========================================================================== */
const SCREENS=["scopri","viaggi","mappa","impostazioni","itinerario"];
const OLD_HASH={home:"scopri",esplora:"scopri",anteprima:"scopri","come-funziona":"scopri",results:"itinerario"};
let screen=null,pendingNav=null;
const scrollMem={};
function routeOf(hash){
  const h=String(hash||"").replace(/^#/,"");
  if(/^itinerario=/.test(h))return "link";
  if(h==="crea"||SCREENS.includes(h))return h;
  return OLD_HASH[h]||"scopri";
}
function histState(){const s=history.state;return s&&typeof s==="object"&&s.vivi?s:null;}
const urlFor=r=>r==="scopri"?location.pathname+location.search:"#"+r;
function pushState(route,extra,replace){
  const cur=histState(),d=replace?(cur?cur.d:0):(cur?cur.d+1:1);
  history[replace?"replaceState":"pushState"]({vivi:1,r:route,d,...(extra||{})},"",urlFor(route));
}
function navigate(route,{replace=false}={}){
  if(route===screen&&route!=="crea"&&!replace){window.scrollTo({top:0,behavior:reduceMotion()?"auto":"smooth"});return;}   /* tocco sulla scheda già aperta: si torna all'inizio */
  if(route==="crea"){const cur=histState();pushState("crea",{qs:firstOpenStep(),q0:replace?(cur?cur.d:0):(cur?cur.d+1:1)},replace);}
  else pushState(route,null,replace);
  render(route,histState());
}
/* Indietro dentro l'app (frecce in alto): se c'è una schermata precedente si torna lì, altrimenti a «Scopri». */
function appBack(){const st=histState();if(st&&st.d>0)history.back();else navigate("scopri",{replace:true});}
function render(route,st,{initial=false}={}){
  if(route==="crea"){openQuiz(st,initial);return;}
  closeQuizUI();
  if(route==="itinerario"){
    if(!state.plan&&!restoreSession()){navigate("scopri",{replace:true});return;}
    setMapMode(false);
    showScreen("itinerario",{focus:!initial&&!(st&&st.sheet)});
    syncSheet(st);return;
  }
  if(route==="mappa"){openMapRoute(initial,st);return;}
  closeSheetUI();setMapMode(false);
  showScreen(route,{focus:!initial});
}
function showScreen(name,{focus=true,nav=null}={}){
  const prev=screen;
  if(prev&&prev!==name)scrollMem[prev]=window.scrollY;
  screen=name;
  $$("#main [data-screen]").forEach(s=>{
    const on=s.dataset.screen===name;
    if(on&&s.hidden){s.hidden=false;if(prev&&!reduceMotion()){s.classList.remove("screen-in");void s.offsetWidth;s.classList.add("screen-in");}}
    else if(!on&&!s.hidden)s.hidden=true;
  });
  const navKey=nav||(name==="itinerario"?(state.savedId?"viaggi":null):name);
  $$("#appNav [data-route]").forEach(a=>{if(a.dataset.route===navKey&&!a.classList.contains("an-brand"))a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  document.documentElement.dataset.screen=name;
  if(name==="viaggi"&&prev!==name)renderTrips();   /* «Ultimo aperto» e disponibilità offline sempre aggiornati */
  window.scrollTo(0,prev===name?window.scrollY:(scrollMem[name]||0));
  if(name==="impostazioni")refreshOffline();
  if(name==="impostazioni")syncData();
  if(name==="itinerario"){
    syncResBar();
    if(state.map)requestAnimationFrame(()=>{state.map.invalidateSize();if(state.mapNeedsFit){state.mapNeedsFit=false;fitDay(false);}else declutter();});
  }
  if(focus){const h=$("#"+(name==="itinerario"?"resultTitle":name==="scopri"?"main":({viaggi:"tripsTitle",mappa:"mapEmptyTitle",impostazioni:"settingsTitle"})[name]));if(h)h.focus({preventScroll:true});}
}
function openItinerary(){navigate("itinerario");}
/* «Mappa»: la mappa del viaggio aperto (a schermo intero su smartphone, accanto all'elenco su computer);
   senza un viaggio aperto, l'ultimo viaggio aperto o salvato; altrimenti un invito a crearne uno. */
function openMapRoute(initial,st){
  if(!state.plan&&!restoreSession()){
    const tg=resumeTarget();
    if(tg&&tg.trip)openTrip(tg.trip.id,{open:false});
  }
  if(!state.plan){closeSheetUI();setMapMode(false);showScreen("mappa",{focus:!initial});return;}
  showScreen("itinerario",{focus:false,nav:"mappa"});
  setMapMode(true);
  if(isDesk()&&!initial){const m=$("#mapCol");m.setAttribute("tabindex","-1");m.focus({preventScroll:true});
    /* computer: la colonna della mappa (fissa sotto la barra) parte sotto la copertina; si scorre fin dove è tutta
       visibile, così le tappe inquadrate sono tutte sullo schermo */
    const y=m.getBoundingClientRect().top+window.scrollY-appBarH();
    if(m.getBoundingClientRect().bottom>window.innerHeight+1)window.scrollTo({top:Math.max(0,y),behavior:"instant"});}
  syncSheet(st);
}
/* la scheda segue la cronologia: aperta se la voce la prevede, chiusa altrimenti */
function syncSheet(st){
  if(st&&Array.isArray(st.sheet))openStop(st.sheet[0],st.sheet[1],{fromPop:true});
  else closeSheetUI();
}
const appBarH=()=>{const b=$("#resBar");return b?b.offsetHeight:0;};
function syncResBar(){
  const bar=$("#resBar"),h=$("#resultTitle");if(!bar||!h)return;
  $("#resBarTitle").textContent=h.textContent;
  bar.classList.toggle("solid",screen==="itinerario"&&h.getBoundingClientRect().bottom<bar.offsetHeight);
}

/* ---------- Quiz a schermo intero ---------- */
const STEP_PHOTO={who:"hero-portrait",kids:"cat-nature",know:"colosseo",time:"castel",interests:"cat-art",mood:"trevi",practical:"aranci"};
/* primo passo da mostrare aprendo il quiz: il primo senza risposta; con tutte le risposte già date
   (nuovo viaggio dopo uno appena creato) si riparte dall'inizio, con le scelte precedenti già segnate */
function firstOpenStep(){const v=visible();return v.find(i=>stepError(i))??v[0];}
function openQuizAt(step){
  const cur=histState();
  pushState("crea",{qs:step,q0:cur?cur.d+1:1});
  render("crea",histState());
}
function openQuiz(st,initial){
  const qz=$("#crea");
  if(!screen)showScreen("scopri",{focus:false});   /* sotto il quiz resta una schermata (arrivo diretto su #crea) */
  if(qz.hidden){
    qz.hidden=false;document.documentElement.classList.add("quiz-open");
    $("#app").inert=true;
    if(!reduceMotion()&&!initial){qz.classList.remove("qz-in");void qz.offsetWidth;qz.classList.add("qz-in");}
    if(!window.L)(window.requestIdleCallback||(f=>setTimeout(f,1200)))(()=>loadLeaflet(),{timeout:4000});
  }
  const v=visible();let step=st&&Number.isInteger(st.qs)?st.qs:firstOpenStep();
  if(!v.includes(step))step=v.filter(i=>i<=step).pop()??v[0];
  setStep(step,true);
}
function closeQuizUI(){
  const qz=$("#crea");if(qz.hidden)return;
  qz.hidden=true;document.documentElement.classList.remove("quiz-open");
  $("#app").inert=false;
}
/* Chiudi (X o Esc): si torna alla schermata da cui si è aperto il quiz, saltando le domande già viste. */
function closeQuiz(){
  const st=histState();
  if(st&&st.r==="crea"&&st.q0>0)history.go(-(st.d-st.q0+1));
  else navigate(screen&&screen!=="crea"?screen:"scopri",{replace:true});
}
/* Dal quiz a un'altra schermata: le voci del quiz escono dalla cronologia, così Indietro dall'itinerario porta
   alla schermata da cui era partito il quiz e non all'ultima domanda. */
function leaveQuizTo(route,done){
  const st=histState();
  const finish=()=>{pushState(route);render(route,histState());if(done)done();};
  if(st&&st.r==="crea"&&st.q0>0){pendingNav=finish;history.go(-(st.d-st.q0+1));}
  else{pushState(route,null,true);render(route,histState());if(done)done();}
}
function quizPhoto(){
  const box=$("#qzPhoto");if(!box||!stepEls.length)return;
  const sid=STEPS[state.step].id;
  let key=STEP_PHOTO[sid];
  if(sid==="interests"&&state.answers.interests.length){const o=Q.interests.opts.find(x=>x[0]===state.answers.interests[state.answers.interests.length-1]);if(o&&o[5])key=o[5];}
  const ph=PHOTOS[key];
  if(!ph||box.dataset.photo===key)return;
  box.dataset.photo=key;
  if(!window.matchMedia("(min-width:1024px)").matches)return;   /* la foto laterale c'è solo su computer */
  box.style.backgroundColor=ph.color;
  const img=photoImg(ph,"",Math.round(window.innerWidth*0.42));
  img.classList.add("qz-img");
  const old=$$(".qz-img",box);
  box.prepend(img);
  setTimeout(()=>old.forEach(o=>o.remove()),reduceMotion()?0:700);
}

/* ---------- Riprendi il viaggio e sessione ---------- */
const LAST_KEY="vivi-roma:ultimo",SESSION_KEY="vivi-roma:corrente";
function getLast(){try{return localStorage.getItem(LAST_KEY);}catch(e){return null;}}
function setLast(id){try{if(id)localStorage.setItem(LAST_KEY,id);else localStorage.removeItem(LAST_KEY);}catch(e){}}
/* L'itinerario aperto resta nella sessione della scheda: se il telefono ricarica la pagina, si riprende da lì. */
function saveSession(){
  if(!state.plan)return;
  try{const tr=tripFromPlan(state.answers,state.plan);sessionStorage.setItem(SESSION_KEY,JSON.stringify({answers:tr.answers,days:tr.days,savedId:state.savedId||null,cur:state.cur||null}));}catch(e){}
}
function readSession(){try{const x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");return x&&x.answers&&Array.isArray(x.days)?x:null;}catch(e){return null;}}
function restoreSession(){
  const x=readSession();if(!x)return false;
  try{
    loadAnswers({interests:[],mood:[],...x.answers});
    const plan=restoreItinerary(engineAnswers(state.answers),x.days);
    if(!plan.days.length)return false;
    const saved=x.savedId&&getStore().get(x.savedId)?x.savedId:null;
    showPlan(plan,{savedId:saved,source:"session",cur:Array.isArray(x.cur)?x.cur:null});
    return true;
  }catch(e){return false;}
}
function resumeTarget(){
  if(state.plan)return {kind:"current",answers:state.answers,plan:state.plan};
  const x=readSession();
  if(x){try{const a={interests:[],mood:[],...x.answers};const plan=restoreItinerary(engineAnswers(a),x.days);if(plan.days.length)return {kind:"current",answers:a,plan};}catch(e){}}
  const r=getStore().list();if(!r.trips.length)return null;
  const last=getLast(),trip=r.trips.find(x=>x.id===last);
  return trip?{kind:"last",trip}:{kind:"recent",trip:r.trips[0]};
}
function renderResume(){
  const card=$("#resumeCard");if(!card)return;
  const tg=resumeTarget();
  if(!tg){card.hidden=true;return;}
  const a=tg.trip?tg.trip.answers:tg.answers,plan=tg.trip?tripPlan(tg.trip):tg.plan;
  const stops=plan.days.reduce((n,d)=>n+d.stops.length,0),title=t("res.cover.title."+a.company);
  $("#resumeKicker").textContent=t(tg.kind==="current"?"home.resume.current":tg.kind==="last"?"home.resume.last":"home.resume.recent");
  $("#resumeTitle").textContent=title;
  $("#resumeMeta").textContent=t("home.resume.meta",{dur:durationLabel(a),stops});
  const cover=$("#resumeCover"),p=coverPlace(plan),key=p?p.id:"";
  if(cover.dataset.place!==key){cover.replaceChildren();cover.dataset.place=key;if(p){const ph=PHOTOS[p.id];placePhoto(cover,ph,"",96);}}
  card.dataset.kind=tg.kind;card.dataset.trip=tg.trip?tg.trip.id:"";
  card.hidden=false;
}
function onResume(){
  const card=$("#resumeCard");
  if(card.dataset.trip){openTrip(card.dataset.trip);return;}
  if(state.plan||restoreSession())openItinerary();else renderResume();
}

/* ---------- Esempio, scelte rapide, impostazioni ---------- */
function openSample(){
  loadAnswers(SAMPLE);
  if(!samplePlan)samplePlan=buildItinerary(engineAnswers(SAMPLE));
  showPlan(restoreItinerary(engineAnswers(state.answers),tripFromPlan(state.answers,samplePlan).days),{savedId:null,source:"sample",status:[["status.sample"]]});
  openItinerary();
}
function initQuick(){
  $$(".quick-chip").forEach(b=>b.addEventListener("click",()=>{
    state.answers.duration=b.dataset.duration;state.answers.days=b.dataset.days||null;
    syncOptions();renderBar();
    navigate("crea");
    toast(t("quick.toast",{label:$("strong",b).textContent}));
  }));
}
async function setLangTo(l){if(l!==getLang())await toggleLang();}
/* «Pronto» solo quando la verifica della Cache Storage è andata a buon fine (vedi offlineCheck). */
function offlineInfo(){
  if(!("serviceWorker" in navigator)||!("caches" in window))return "none";
  return offlineState&&offlineState.shell?"ready":"pending";
}
function syncSettings(){
  const l=getLang();
  $("#setLangIt").setAttribute("aria-pressed",String(l==="it"));
  $("#setLangEn").setAttribute("aria-pressed",String(l==="en"));
  const nl=$("#navLang");if(nl)nl.value=l;
  const o=offlineInfo();
  $("#offlineState").textContent=t("settings.offline."+o);$("#offlineState").dataset.state=o;
  $("#offlineText").textContent=t("settings.offline."+o+"Text");
  $("#privacyMetrics").textContent=t(metricsActive?"settings.privacy.metricsOn":"settings.privacy.metricsOff");
  syncVersion();
}
/* Versione: quella dell'app (APP_VERSION) e l'impronta dei file installati, chiesta al service worker. */
const APP_VERSION="0.1.0";
let buildId=null;
function syncVersion(){
  const v=$("#appVersion");if(!v)return;
  v.textContent=t("settings.versionValue",{id:APP_VERSION})+(buildId?" · "+t("settings.build",{id:buildId.slice(0,7)}):"");
}
function askBuild(){
  const c=navigator.serviceWorker&&navigator.serviceWorker.controller;if(!c||typeof MessageChannel!=="function")return;
  const ch=new MessageChannel();
  ch.port1.onmessage=e=>{if(e.data&&typeof e.data.version==="string"){buildId=e.data.version;syncVersion();}};
  try{c.postMessage({type:"vivi:version"},[ch.port2]);}catch(e){}
}
/* Dati salvati su questo dispositivo: viaggi, ultimo viaggio aperto, lingua, viaggio in corso, copie offline di foto e mappa. */
async function syncData(){
  const n=getStore().list().trips.length;
  $("#dataTrips").textContent=n?t("trips.count",{n}):t("settings.data.noTrips");
  $("#delTrips").disabled=!n;
  let photos=0;
  try{if("caches" in window&&await caches.has(IMG_CACHE))photos=(await (await caches.open(IMG_CACHE)).keys()).length;}catch(e){}
  $("#dataPhotos").textContent=photos?t("settings.data.photos",{n:photos}):t("settings.data.noPhotos");
}
async function deleteAllTrips(){
  const n=getStore().list().trips.length;if(!n)return;
  if(!await confirmDialog(t("settings.data.delTripsConfirm",{n}),{title:"settings.data.delTripsTitle",ok:"settings.data.delTripsOk"}))return;
  let ok=true;
  try{localStorage.removeItem("vivi-roma:viaggi:v1");}catch(e){ok=false;}
  setLast(null);
  if(state.savedId){state.savedId=null;syncSaveBtn();setTripStatus(null);saveSession();}
  renderTrips();syncData();
  toast(t(ok?"settings.data.tripsDeleted":"toast.deleteFailed"));
  $("#settingsTitle").focus();
}
async function deleteAllData(){
  if(!await confirmDialog(t("settings.data.delAllConfirm"),{title:"settings.data.delAllTitle",ok:"settings.data.delAllOk"}))return;
  try{Object.keys(localStorage).filter(k=>k.startsWith("vivi-roma:")).forEach(k=>localStorage.removeItem(k));}catch(e){}
  try{Object.keys(sessionStorage).filter(k=>k.startsWith("vivi-roma:")).forEach(k=>sessionStorage.removeItem(k));}catch(e){}
  try{if("caches" in window)for(const k of await caches.keys())if(k===IMG_CACHE||k.startsWith("vivi-roma-tiles-"))await caches.delete(k);}catch(e){}
  /* si riparte da zero, senza ricaricare dalla rete: la guida resta utilizzabile anche offline */
  try{sessionStorage.setItem("vivi-roma:cancellato","1");}catch(e){}
  history.replaceState(null,"",location.pathname+location.search+"#impostazioni");
  location.reload();
}
let metricsActive=false;
function initApp(){
  history.scrollRestoration="manual";
  /* link interni (#crea, #viaggi…): navigazione tra schermate invece del salto nella pagina */
  document.addEventListener("click",e=>{
    const a=e.target.closest&&e.target.closest('a[href^="#"]');
    if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.classList.contains("skip"))return;
    const r=routeOf(a.getAttribute("href"));if(r==="link")return;
    e.preventDefault();navigate(r);
  });
  window.addEventListener("popstate",()=>{
    if(pendingNav){const f=pendingNav;pendingNav=null;f();return;}
    let st=histState();
    if(!st){   /* indirizzo scritto o link esterno con #…: diventa una voce dell'app, con una schermata precedente a cui tornare */
      const r=routeOf(location.hash);if(r==="link"){location.reload();return;}
      st={vivi:1,r,d:1,...(r==="crea"?{q0:1,qs:firstOpenStep()}:{})};
      history.replaceState(st,"",location.href);
    }
    render(st.r,st);
  });
  $("#qzClose").addEventListener("click",closeQuiz);
  $("#qzBack").addEventListener("click",goBack);
  $("#crea").addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#genScreen").hidden){e.preventDefault();closeQuiz();}});
  $("#resBack").addEventListener("click",appBack);
  $("#curOpen").addEventListener("click",()=>openStop(state.active,state.cur[state.active]));
  $("#curNext").addEventListener("click",goNextStop);
  $("#curMap").addEventListener("click",openMapView);
  $("#mapList").addEventListener("click",()=>{const st=histState();if(st&&st.from==="itinerario")history.back();else navigate("itinerario");});
  initSheet();initCarousel();
  $("#heroSample").addEventListener("click",openSample);
  $("#resumeCard").addEventListener("click",onResume);
  $("#setLangIt").addEventListener("click",()=>setLangTo("it"));
  $("#setLangEn").addEventListener("click",()=>setLangTo("en"));
  $$("[data-contact=report]").forEach(a=>armMail(a,()=>({subject:t("contact.reportSubject"),body:t("contact.reportBody")})));
  $("#year").textContent=new Date().getFullYear();
  window.addEventListener("scroll",()=>{if(screen==="itinerario")syncResBar();},{passive:true});
  if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("controllerchange",()=>{askBuild();refreshOffline();keepHomeImages();});
  afterLoad(keepHomeImages);
  askBuild();whenIdle(refreshOffline);
  $("#delTrips").addEventListener("click",deleteAllTrips);
  $("#delAll").addEventListener("click",deleteAllData);
  try{if(sessionStorage.getItem("vivi-roma:cancellato")){sessionStorage.removeItem("vivi-roma:cancellato");setTimeout(()=>toast(t("settings.data.allDeleted")),300);}}catch(e){}
  whenIdle(()=>import("./metrics-config.js").then(({METRICS_CONFIG:c})=>{metricsActive=!!(c&&(c.events||c.webAnalyticsToken)&&(c.hosts||[]).includes(location.hostname));syncSettings();},()=>{}));
  initQuick();syncSettings();
}
function startRoute(){
  const r=routeOf(location.hash);
  const st={vivi:1,r:r==="link"?"scopri":r,d:0};
  if(st.r==="crea"){st.q0=0;st.qs=firstOpenStep();}
  history.replaceState(st,"",st.r==="crea"||st.r!=="scopri"?location.href:urlFor("scopri"));
  render(st.r,st,{initial:true});
}

async function init(){
  /* lingua iniziale: scelta salvata → lingua del dispositivo → italiano (la scelta automatica non viene salvata) */
  let l=detectLang(storageOrNull(),navigator.languages||[navigator.language]);
  if(!await loadLang(l))l="it";
  setLang(l,null);
  $("#year").textContent=new Date().getFullYear();
  buildQuiz();syncOptions();setStep(0,false);
  $("#nextBtn").addEventListener("click",goNext);
  $("#prevBtn").addEventListener("click",goBack);
  $("#quizForm").addEventListener("submit",e=>{
    e.preventDefault();
    if(state.step!==visible()[visible().length-1])goNext();else submitQuiz();
  });
  $("#editBtn").addEventListener("click",()=>openQuizAt(visible()[0]));
  $("#printBtn").addEventListener("click",()=>{track("print");window.print();});
  $("#tripsMore").addEventListener("click",()=>{const k=tripsShown;tripsShown=Infinity;renderTrips();const c=$$("#tripList .tc-open")[k];if(c)c.focus();});
  $("#saveBtn").addEventListener("click",saveCurrent);
  $("#shareBtn").addEventListener("click",shareCurrent);
  $("#copyBtn").addEventListener("click",()=>copyText($("#shareText").value));
  /* In stampa servono tutte le informazioni: si aprono le parti a scomparsa. */
  /* in stampa (PDF) si aprono le sezioni richiudibili, compreso «Da sapere»; dopo, «Da sapere» torna com'era */
  let notesWasOpen=null;
  window.addEventListener("beforeprint",()=>{$$("details.more").forEach(d=>{d.open=true;});const n=$("details.res-notes");if(n){notesWasOpen=n.open;n.open=true;}});
  window.addEventListener("afterprint",()=>{const n=$("details.res-notes");if(n&&notesWasOpen===false)n.open=false;notesWasOpen=null;});
  $("#langToggle").addEventListener("click",toggleLang);
  $("#navLang").addEventListener("change",e=>{const v=e.target.value;setLangTo(v).then(()=>{e.target.value=getLang();});});
  $$("[data-contact]").forEach(a=>armMail(a,()=>({subject:t("contact.subject")})));
  initCategories();initRail();initHero();initReveal();initApp();
  if(getLang()!=="it")applyLang();else{$("#langToggle").setAttribute("lang","en");renderTrips();}
  document.documentElement.classList.remove("i18n-wait");   /* testi pronti: la pagina diventa visibile */
  if(/[?&]vivitest\b/.test(location.search))window.__vivi=state;   /* solo per i test automatici */
  if(/[?&]photocheck/.test(location.search))runPhotoAudit();
  if(!openFromLink())startRoute();
}
init();
registerSW();
/* Cloudflare Web Analytics: solo se configurato (js/metrics-config.js), a pagina caricata e con il browser libero. */
function whenIdle(f){(window.requestIdleCallback||(g=>setTimeout(g,1500)))(f,{timeout:5000});}
const startMetrics=()=>whenIdle(()=>{loadContact();loadMetrics().then(m=>{if(m)m.startWebAnalytics();});});
if(document.readyState==="complete")startMetrics();else window.addEventListener("load",startMetrics,{once:true});
