/* VIVI Roma — interfaccia: quiz, risultati, foto, mappa, navigazione. */
import {PLACES,buildItinerary,restoreItinerary} from "./planner.js";
import {createStore,tripFromPlan,tripTitle,MAX_TRIPS,shareUrl,shareText,decodeShare} from "./trips.js";
import {QUIZ,WALK_OPTS} from "./quiz-data.js";
import {t,getLang,setLang,detectLang,onLangChange,locale,num1,numHalf,qText,optText,walkText,answerLabel,durationLabel,paceLabel,placeText,placeGloss,areaText,foodTip,applyStatic} from "./i18n.js";
import {PHOTOS} from "./data/photos.js";

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
const state={step:0,answers:{company:null,familiarity:null,duration:null,days:null,interests:[],mood:null,pace:null,budget:null,walking:"medium"},plan:null,active:0,map:null,mapLayers:[],tileOk:false,tileWarned:false,savedId:null,selected:null,status:null};
const isTouch=()=>window.matchMedia("(pointer: coarse)").matches;
const isNarrow=()=>window.matchMedia("(max-width:760px)").matches;
const stepEls=[];

function optionButton(q,o){
  const isText=o[1].charAt(0)==="#";
  const ic=el("span",{class:"opt-icon","aria-hidden":"true"});
  if(isText)ic.textContent=o[1].slice(1);else ic.append(icon(o[1]));
  const tx=optText(q,o);
  const btn=el("button",{type:"button",class:"option","aria-pressed":"false","data-key":q.key,"data-value":o[0]},
    ic,el("span",{class:"opt-copy"},el("strong",{text:tx.title}),o[3]?el("small",{text:tx.desc}):null),el("span",{class:"opt-check","aria-hidden":"true"}));
  btn.addEventListener("click",()=>onOption(q,o[0]));
  return btn;
}
function buildQuiz(){
  const host=$("#quizSteps"),bar=$("#stepsBar");
  QUIZ.forEach((q,qi)=>{
    const legend=el("legend",{text:qText(q,"title"),tabindex:"-1"});
    const group=el("div",{class:"options"+(q.multi?" multi":""),role:"group","aria-label":qText(q,"title")});
    q.opts.forEach(o=>group.append(optionButton(q,o)));
    const fs=el("fieldset",{class:"step",hidden:qi!==0,"data-step":qi},legend,el("p",{class:"sub",text:qText(q,"sub")}),group);
    if(q.followUp){
      /* Domanda aggiuntiva: visibile solo quando è selezionata l'opzione "when" */
      const f=q.followUp;
      const fg=el("div",{class:"options",role:"group","aria-labelledby":"daysLabel"});
      f.opts.forEach(o=>fg.append(optionButton(f,o)));
      fs.append(el("div",{class:"walk",id:"daysQ",hidden:true},el("p",{class:"days-label",id:"daysLabel",text:qText(f,"title")}),fg));
    }
    if(q.multi)fs.append(el("p",{class:"sel-count",id:"selCount","aria-live":"polite"}));
    if(q.walking){
      const sel=el("select",{id:"walking"},WALK_OPTS.map(w=>el("option",{value:w[0],text:walkText(w),selected:w[0]==="medium"})));
      sel.addEventListener("change",e=>{state.answers.walking=e.target.value;});
      fs.append(el("div",{class:"walk"},el("label",{for:"walking",id:"walkingLabel",text:t("quiz.walking")}),sel));
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
  if(c)c.textContent=n?t("quiz.selCount",{n}):t("quiz.selNone");
}
function stepError(i){
  const q=QUIZ[i],v=state.answers[q.key];
  if(!(q.multi?v.length>0:!!v))return qText(q,"err");
  if(q.followUp&&v===q.followUp.when&&!state.answers[q.followUp.key])return qText(q.followUp,"err");
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
  $("#qCounter").textContent=t("quiz.counter",{n:state.step+1,total:QUIZ.length});
  $("#qName").textContent=qText(QUIZ[state.step],"name");
  $$("#stepsBar span").forEach((s,i)=>{s.className=i<state.step?"done":i===state.step?"now":"";});
  $("#stepsBar").setAttribute("aria-valuenow",String(state.step+1));
  $("#quizError").textContent="";
  if(focus){
    /* Su smartphone, dopo «Continua» la nuova domanda può iniziare sopra lo schermo: riportiamo in vista l'inizio del pannello. */
    const lg=$("legend",stepEls[state.step]);
    const check=()=>{
      const top=lg.getBoundingClientRect().top,head=$("#siteHeader").offsetHeight;
      if(top<head||top>window.innerHeight*0.5)scrollToEl($(".quiz-panel"),"start");
    };
    /* subito e di nuovo dopo l'eventuale scorrimento del browser dovuto al cambio di altezza della domanda */
    requestAnimationFrame(check);setTimeout(check,450);
    lg.focus({preventScroll:true});
  }
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
/* Cambio lingua: aggiorna i testi del quiz senza toccare risposte, passo corrente o selezioni. */
function relabelQuiz(){
  QUIZ.forEach((q,qi)=>{
    const fs=stepEls[qi];
    $("legend",fs).textContent=qText(q,"title");
    $(".sub",fs).textContent=qText(q,"sub");
    $(".options",fs).setAttribute("aria-label",qText(q,"title"));
    const groups=[q].concat(q.followUp?[q.followUp]:[]);
    groups.forEach(g=>g.opts.forEach(o=>{
      const b=$(`.option[data-key="${g.key}"][data-value="${o[0]}"]`,fs);if(!b)return;
      const tx=optText(g,o);$("strong",b).textContent=tx.title;const sm=$("small",b);if(sm)sm.textContent=tx.desc;
    }));
    if(q.followUp)$("#daysLabel").textContent=qText(q.followUp,"title");
    if(q.walking){$("#walkingLabel").textContent=t("quiz.walking");$$("#walking option").forEach(op=>{op.textContent=walkText(WALK_OPTS.find(w=>w[0]===op.value));});}
  });
  const shown=!!$("#quizError").textContent;
  setStep(state.step,false);syncOptions();
  if(shown){const err=stepError(state.step);$("#quizError").textContent=err;}
}

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

function createItinerary(){
  showPlan(buildItinerary(state.answers),{savedId:null});
}
/* Mostra un itinerario: appena creato, riaperto da «I miei viaggi» o ricevuto da un link. */
function showPlan(plan,{savedId=null,status=null}={}){
  state.plan=plan;state.active=0;state.savedId=savedId;
  renderResults();
  const r=$("#results");r.classList.add("visible");
  initMap();buildMapLayers();showDay(0);
  setTripStatus(status);syncSaveBtn();
  scrollToEl(r);
  setTimeout(()=>{$("#resultTitle").focus({preventScroll:true});if(state.map)state.map.invalidateSize();},reduceMotion()?0:600);
}
function renderResults(){
  const a=state.answers,plan=state.plan;
  $("#resultTitle").textContent=t("res.title."+a.company);
  const ints=a.interests.map(interestLabel);
  $("#resultSubtitle").textContent=t("res.subtitle",{days:plan.days.length,ints});
  const pills=$("#pills");pills.replaceChildren();
  [answerLabel("company",a.company),durationLabel(a),paceLabel(a.pace),answerLabel("familiarity",a.familiarity),answerLabel("mood",a.mood),answerLabel("budget",a.budget)].concat(ints)
    .forEach(x=>pills.append(el("span",{class:"pill",text:x})));
  const all=plan.days.flatMap(d=>d.stops);
  const free=all.filter(s=>s.fee==="free").length;
  const toCheck=all.length-free;
  const walk=plan.days.reduce((s,d)=>s+d.walkKm,0);
  const stat=(b,x)=>el("div",null,el("b",{text:b}),el("span",{text:x}));
  const stats=$("#tripStats");stats.replaceChildren(
    stat(String(plan.days.length),t("res.stat.days",{n:plan.days.length})),
    stat(String(all.length),t("res.stat.stops")),
    stat(String(free),t("res.stat.free")),
    stat(String(toCheck),t("res.stat.check"))
  );
  const notes=$("#notes");notes.replaceChildren();
  const list=plan.notes.map(n=>t("note."+n.k,n)).concat([t("res.noteData",{km:num1(walk)})]);
  list.forEach(x=>notes.append(el("li",{text:x})));
  $("#dayTabs").setAttribute("aria-label",t("res.tabsAria"));

  const tabs=$("#dayTabs");tabs.replaceChildren();
  tabs.hidden=plan.days.length<2;
  plan.days.forEach((d,i)=>{
    tabs.append(el("button",{type:"button",class:"day-tab",role:"tab",id:"tab-"+i,"aria-controls":"day-"+i,"aria-selected":"false",tabindex:"-1",text:t("res.day",{n:i+1}),
      onclick:()=>showDay(i,{scroll:true}),
      onkeydown:e=>{
        const n=plan.days.length;let k=null;
        if(e.key==="ArrowRight")k=(i+1)%n;else if(e.key==="ArrowLeft")k=(i-1+n)%n;else if(e.key==="Home")k=0;else if(e.key==="End")k=n-1;
        if(k!==null){e.preventDefault();showDay(k);$("#tab-"+k).focus();}
      }}));
  });
  const host=$("#days");host.replaceChildren();
  plan.days.forEach((d,i)=>host.append(renderDay(d,i,plan.days.length)));
}
function renderDay(day,di,total){
  const head=el("div",{class:"day-head"},
    el("h3",{text:total===1?t("res.single"):t("res.day",{n:di+1})}),
    el("p",{class:"areas",text:day.areas.slice(0,4).map(areaText).join(", ")+(day.areas.length>4?t("res.areasMore"):"")}),
    el("ul",{class:"day-facts"},
      el("li",{text:t("res.stops",{n:day.stops.length})}),
      el("li",{text:t("res.visits",{min:numHalf(day.minMins),max:numHalf(day.maxMins)})}),
      el("li",{text:t("res.distance",{km:num1(day.walkKm)})})));
  const index=el("ol",{class:"stop-index","aria-label":t("res.indexAria")},
    day.stops.map((p,i)=>el("li",null,el("button",{type:"button",onclick:()=>goToCard(di,i)},
      el("span",{class:"badge-n","aria-hidden":"true",text:String(i+1)}),el("span",{lang:"it",text:p.name})))));
  head.append(index);
  const list=el("div",{class:"stops"});
  const breakAfter=day.stops.length>=3?Math.floor(day.stops.length/2):-1;
  const bt=state.answers.budget==="low"?t("res.break.low"):state.answers.budget==="high"?t("res.break.high"):"";
  day.stops.forEach((p,i)=>{
    if(i>0)list.append(el("div",{class:"leg"+(p.transit?" leg-transit":"")},
      el("span",null,t("res.leg",{dist:fmtKm(p.legKm)}),
        p.transit?el("strong",{text:t("res.transit")}):null)));
    list.append(renderStop(p,di,i));
    if(i+1===breakAfter&&i<day.stops.length-1){
      list.append(el("div",{class:"leg"},el("span",{text:""})));
      list.append(el("div",{class:"break"},icon("coffee"),el("div",null,
        el("strong",{text:t("res.break.title")}),
        t("res.break.text",{name:p.name,food:foodTip(day,day.foodTip)})+bt+t("res.break.note"))));
    }
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
function renderStop(p,di,i){
  const n=i+1;
  const main=p.cats.find(c=>CAT_ICON[c])||"star";
  const photo=el("div",{class:"photo","aria-hidden":"false"},icon(CAT_ICON[main]));
  const why=p.matches.map(interestLabel);
  if(state.answers.familiarity==="first"&&p.cats.includes("iconic"))why.push(t("why.must"));
  if(state.answers.budget==="low"&&p.fee==="free")why.push(t("why.budget"));
  if(state.answers.familiarity==="often"&&p.cats.includes("hidden"))why.push(t("why.hidden"));
  const wikiLink=el("a",{href:wikiUrl(p),target:"_blank",rel:"noopener noreferrer",hreflang:"it",text:t("stop.wiki")});
  const gloss=placeGloss(p),bk=bookingLabel(p.booking);
  /* i nomi dei luoghi restano in italiano; in inglese, sotto il nome, una breve spiegazione */
  const card=el("article",{class:"stop",id:"stop-"+di+"-"+n,tabindex:"-1","aria-label":t("stop.aria",{n,name:p.name+(gloss?" ("+gloss+")":"")})},
    photo,
    el("div",{class:"stop-body"},
      el("div",{class:"stop-top"},el("span",{class:"badge-n","aria-hidden":"true",text:String(n)}),el("span",{text:t("stop.top",{n,area:areaText(p.area)})})),
      el("h4",{lang:"it",text:p.name}),
      gloss?el("p",{class:"gloss",text:gloss}):null,
      el("p",{text:placeText(p.desc)}),
      el("div",{class:"chips"},
        el("span",{class:"chip",text:t("stop.visit",{time:p.time})}),
        el("span",{class:"chip fee-"+p.fee,text:t("fee."+p.fee)}),
        bk?el("span",{class:"chip fee-paid",text:bk}):null,
        why.map(w=>el("span",{class:"chip",text:w}))),
      practicalInfo(p),
      el("div",{class:"links primary"},
        el("a",{href:dirUrl(p),target:"_blank",rel:"noopener noreferrer",text:t("stop.directions"),"aria-label":t("stop.directionsAria",{name:p.name})}),
        el("button",{type:"button",text:t("stop.onMap"),"aria-label":t("stop.onMapAria",{name:p.name}),onclick:()=>focusMarker(di,i)})),
      /* Consigli e link secondari: aperti su schermi grandi, a scomparsa su smartphone per accorciare la scheda. */
      el("details",{class:"more",open:!isNarrow()},
        el("summary",null,t("stop.more")),
        el("div",{class:"box"},el("b",{text:t("stop.chicca")}),placeText(p.chicca)),
        el("div",{class:"box"},el("b",{text:t("stop.consiglio")}),placeText(p.consiglio)),
        budgetBox(p),
        el("div",{class:"links"},
          el("a",{href:osmUrl(p),target:"_blank",rel:"noopener noreferrer",text:t("stop.osm")}),
          wikiLink))));
  const ph=PHOTOS[p.id];
  if(ph){
    photo.append(creditNode(ph,"photo-credit"));
    lazyLoad(card,()=>{
      const box=photo.getBoundingClientRect(),bw=box.width||190,bh=box.height||400;
      placePhoto(photo,ph,p.name+", Roma",Math.max(bw,bh*ph.ratio));   /* larghezza necessaria per coprire il riquadro */
    });
  }
  return card;
}
function showDay(i,{scroll}={}){
  state.active=i;
  if(state.map)state.map.closePopup();
  $("#mapSelected").hidden=true;
  $$(".day").forEach((d,k)=>{d.hidden=k!==i;});
  $$(".day-tab").forEach((t,k)=>{
    const on=k===i;
    t.setAttribute("aria-selected",String(on));t.tabIndex=on?0:-1;t.classList.toggle("active",on);
  });
  updateMap();
  /* Cambiando giornata più in basso nella pagina, si riparte dall'inizio della giornata (o dalla mappa su smartphone). */
  if(scroll){const target=isNarrow()&&state.map?$(".map-col"):$("#day-"+i);if(target.getBoundingClientRect().top<0)scrollToEl(target,"start");}
}

/* ==========================================================================
   MAPPA (Leaflet + OpenStreetMap)
   ========================================================================== */
function initMap(){
  const mapEl=$("#map");
  if(state.map||mapEl.dataset.failed)return;
  if(!window.L){
    mapEl.dataset.failed="1";
    mapEl.replaceChildren(el("div",{class:"map-fallback","data-i18n":"map.failed",text:t("map.failed")}));
    mapEl.style.height="auto";mapEl.style.minHeight="0";
    return;
  }
  /* Su touch: con un dito si scorre la pagina, con due dita si sposta e si ingrandisce la mappa;
     il pulsante «Sposta la mappa» attiva anche il trascinamento con un dito. Su computer: trascinamento normale. */
  const touch=isTouch();
  state.map=L.map(mapEl,{scrollWheelZoom:false,dragging:!touch,touchZoom:true,tap:false,zoomControl:false,bounceAtZoomLimits:false}).setView([41.9028,12.4964],12);
  state.zoom=L.control.zoom({zoomInTitle:t("map.zoomIn"),zoomOutTitle:t("map.zoomOut")}).addTo(state.map);
  if(touch)initTouchMap(mapEl);
  const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(state.map);
  tiles.on("tileload",()=>{state.tileOk=true;});
  tiles.on("tileerror",()=>{
    if(state.tileOk||state.tileWarned)return;
    state.tileWarned=true;setTimeout(()=>{if(!state.tileOk)$("#mapNotice").hidden=false;},4000);
  });
}
function initTouchMap(mapEl){
  const btn=$("#mapMove"),hint=$("#mapHint");
  btn.hidden=false;
  let hintTimer=null;
  const set=on=>{
    if(on)state.map.dragging.enable();else state.map.dragging.disable();
    btn.setAttribute("aria-pressed",String(on));
    btn.textContent=on?t("map.lock"):t("map.move");
    mapEl.classList.toggle("map-free",on);
  };
  btn.addEventListener("click",()=>set(!state.map.dragging.enabled()));
  mapEl.addEventListener("touchstart",e=>{
    if(e.touches.length!==1||state.map.dragging.enabled())return;
    hint.classList.add("show");clearTimeout(hintTimer);hintTimer=setTimeout(()=>hint.classList.remove("show"),1600);
  },{passive:true});
  mapEl.addEventListener("touchstart",e=>{if(e.touches.length>1)hint.classList.remove("show");},{passive:true});
  set(false);
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
        el("strong",{lang:"it",text:(i+1)+". "+p.name}),el("span",{text:placeGloss(p)||areaText(p.area)}),
        el("button",{type:"button",text:t("map.toCard"),onclick:()=>goToCard(di,i)}),
        el("a",{href:dirUrl(p),target:"_blank",rel:"noopener noreferrer",text:t("map.directions")})));
      m.on("click",()=>selectStop(di,i));
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
/* Tappa scelta sulla mappa: numero evidenziato, scheda evidenziata e riga sotto la mappa per raggiungerla. */
function selectStop(di,i){
  highlightCard(di,i);
  const p=state.plan.days[di].stops[i],box=$("#mapSelected");
  box.replaceChildren(el("span",null,el("span",{class:"badge-n","aria-hidden":"true",text:String(i+1)}),t("map.selected",{n:i+1}),el("strong",{lang:"it",text:p.name})),
    el("button",{type:"button",class:"btn btn-line",text:t("map.toCard"),onclick:()=>goToCard(di,i)}));
  box.hidden=false;state.selected=[di,i];
}
function highlightCard(di,i,focus){
  $$(".stop.is-active").forEach(c=>c.classList.remove("is-active"));
  $$(".vm.is-active").forEach(m=>m.classList.remove("is-active"));
  const l=state.mapLayers[di];
  if(l&&l.markers[i]&&l.markers[i].getElement())l.markers[i].getElement().classList.add("is-active");
  const c=$("#stop-"+di+"-"+(i+1));
  if(!c)return null;
  c.classList.add("is-active");
  if(focus){scrollToEl(c,"center");c.focus({preventScroll:true});}
  return c;
}
function goToCard(di,i){if(di!==state.active)showDay(di);highlightCard(di,i,true);}
function focusMarker(di,i){
  highlightCard(di,i);
  if(!state.map){toast(t("map.unavailable"));return;}
  const l=state.mapLayers[di];if(!l)return;
  scrollToEl($("#map"),"center");
  state.map.setView(l.pts[i],16,{animate:!reduceMotion()});
  l.markers[i].openPopup();
  selectStop(di,i);
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
  b.textContent=saved?t("res.saved"):t("res.save");
  b.disabled=saved;
}
function saveCurrent(){
  if(!state.plan)return;
  const r=getStore().save(tripFromPlan(state.answers,state.plan));
  if(!r.ok){toast(errText(r.error));setTripStatus([["err."+(["quota","full"].includes(r.error)?r.error:"unavailable"),{max:MAX_TRIPS}]]);return;}
  state.savedId=r.trip.id;syncSaveBtn();
  setTripStatus([[r.existing?"status.already":"status.saved"]]);
  renderTrips();
}
function renderTrips(){
  const r=getStore().list(),sec=$("#viaggi"),list=$("#tripList"),err=$("#tripsError");
  err.hidden=r.ok;err.textContent=r.ok?"":errText(r.error);
  sec.hidden=!r.trips.length&&r.ok;
  $("#navTrips").hidden=!r.trips.length;
  $("#heroTrips").hidden=!r.trips.length;
  $("#navTrips").textContent=r.trips.length?t("nav.tripsCount",{n:r.trips.length}):t("nav.trips");
  list.replaceChildren();
  if(!r.trips.length){list.append(el("li",{class:"trip-empty",text:t("trips.empty")}));return;}
  r.trips.forEach(trip=>{
    const stops=trip.days.reduce((n,d)=>n+d.length,0),title=tripTitle(trip.answers);
    list.append(el("li",{class:"trip-card"},
      el("div",{class:"trip-info"},
        el("h3",{text:title}),
        el("p",{text:t("trips.meta",{days:trip.days.length,stops,date:trip.savedAt?fmtSaved(trip.savedAt):""})})),
      el("div",{class:"trip-actions"},
        el("button",{type:"button",class:"btn btn-wine",text:t("trips.open"),"aria-label":t("trips.openAria",{title}),onclick:()=>openTrip(trip.id)}),
        el("button",{type:"button",class:"btn btn-line",text:t("trips.delete"),"aria-label":t("trips.deleteAria",{title}),onclick:()=>deleteTrip(trip)}))));
  });
}
function openTrip(id){
  const trip=getStore().get(id);
  if(!trip){toast(t("toast.tripGone"));renderTrips();return;}
  state.answers={...trip.answers,interests:[...trip.answers.interests]};syncOptions();
  const w=$("#walking");if(w)w.value=state.answers.walking;
  const plan=restoreItinerary(state.answers,trip.days);
  showPlan(plan,{savedId:trip.id,status:[["status.reopened"]].concat(plan.missing.length?[["status.missing",{n:plan.missing.length}]]:[])});
}
function confirmDialog(text){
  const d=$("#confirmDlg");
  if(typeof d.showModal!=="function")return Promise.resolve(window.confirm(text));
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
  if(state.savedId===trip.id){state.savedId=null;syncSaveBtn();setTripStatus(null);}
  renderTrips();toast(t("toast.deleted"));
  const first=$("#tripList button");if(first)first.focus();else $("#tripsTitle").setAttribute("tabindex","-1"),$("#tripsTitle").focus();
}
async function shareCurrent(){
  if(!state.plan)return;
  const url=shareUrl(location.href,state.answers,state.plan);
  const text=shareText(state.answers,state.plan,url);
  if(navigator.share){
    try{await navigator.share({title:t("share.title",{title:tripTitle(state.answers)}),text});return;}
    catch(e){if(e&&e.name==="AbortError")return;}   /* annullato dall'utente: nessun messaggio */
  }
  const d=$("#shareDlg");$("#shareText").value=text;$("#shareStatus").textContent="";
  if(typeof d.showModal==="function"){d.showModal();$("#shareText").focus();$("#shareText").select();}
  else copyText(text);
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
  state.answers={...data.answers};syncOptions();
  const w=$("#walking");if(w)w.value=state.answers.walking;
  const plan=restoreItinerary(state.answers,data.days);
  if(!plan.days.length){toast(t("toast.linkEmpty"));return false;}
  const saved=getStore().find(tripFromPlan(state.answers,plan));
  showPlan(plan,{savedId:saved?saved.id:null,status:[["status.fromLink"],[saved?"status.linkSaved":"status.linkCanSave"]]});
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
  $("#menuLabel").textContent=$("#navLinks").classList.contains("open")?t("menu.close"):t("menu.open");
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
    const zi=$(".leaflet-control-zoom-in"),zo=$(".leaflet-control-zoom-out");
    if(zi){zi.title=t("map.zoomIn");zi.setAttribute("aria-label",t("map.zoomIn"));}
    if(zo){zo.title=t("map.zoomOut");zo.setAttribute("aria-label",t("map.zoomOut"));}
    const mv=$("#mapMove");if(!mv.hidden)mv.textContent=state.map.dragging.enabled()?t("map.lock"):t("map.move");
  }
  $$(".day").forEach((d,k)=>{d.hidden=k!==state.active;});
  $$(".day-tab").forEach((tb,k)=>{const on=k===state.active;tb.setAttribute("aria-selected",String(on));tb.tabIndex=on?0:-1;tb.classList.toggle("active",on);});
  if(sel&&sel[0]===state.active)selectStop(sel[0],sel[1]);else $("#mapSelected").hidden=true;
  syncSaveBtn();setTripStatus(state.status);
  window.scrollTo({top:y,behavior:"instant"});
}
function toggleLang(){
  setLang(getLang()==="it"?"en":"it",storageOrNull());
  applyLang();
  toast(t("lang.changed"));
}

/* ==========================================================================
   NAVIGAZIONE, CATEGORIE, EVENTI GLOBALI
   ========================================================================== */
function initMenu(){
  const btn=$("#menuToggle"),nav=$("#navLinks"),header=$("#siteHeader");
  const set=open=>{
    nav.classList.toggle("open",open);header.classList.toggle("menu-open",open);
    btn.setAttribute("aria-expanded",String(open));$("#menuLabel").textContent=open?t("menu.close"):t("menu.open");
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
      const label=t("cat."+k+".label");
      if(list.includes(k))toast(t("cat.already",{label}));
      else{list.push(k);syncOptions();toast(t("cat.added",{label}));}
    });
    const ph=PHOTOS[card.dataset.photo];
    if(ph)lazyLoad(card,()=>placePhoto(card,ph,t("cat."+card.dataset.interest+".alt"),card.getBoundingClientRect().width||300));
  });
}
function initHero(){
  const media=$("#heroMedia"),land=PHOTOS.hero,port=PHOTOS["hero-portrait"];
  if(!land)return;
  const pic=el("picture",null,
    port?el("source",{media:"(max-aspect-ratio: 4/5)",type:"image/webp",srcset:srcsetOf(port),sizes:sizesFor(window.innerWidth)}):null,
    photoImg(land,"",window.innerWidth,{eager:true}));
  pic.querySelector("img").sizes=sizesFor(window.innerWidth);
  media.style.backgroundColor=land.color;
  media.append(pic);
  heroCredit();
}
function heroCredit(){
  const land=PHOTOS.hero,credit=$("#heroCredit");if(!land)return;
  credit.replaceChildren(el("a",{href:land.source,target:"_blank",rel:"noopener noreferrer",text:creditText(land)+t("photo.commons")}));
  credit.hidden=false;
}
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

function init(){
  /* lingua iniziale: scelta salvata → lingua del dispositivo → italiano (la scelta automatica non viene salvata) */
  setLang(detectLang(storageOrNull(),navigator.languages||[navigator.language]),null);
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
  $("#saveBtn").addEventListener("click",saveCurrent);
  $("#shareBtn").addEventListener("click",shareCurrent);
  $("#copyBtn").addEventListener("click",()=>copyText($("#shareText").value));
  /* In stampa servono tutte le informazioni: si aprono le parti a scomparsa. */
  window.addEventListener("beforeprint",()=>$$("details.more").forEach(d=>{d.open=true;}));
  $("#langToggle").addEventListener("click",toggleLang);
  initMenu();initCategories();initHero();initReveal();
  if(getLang()!=="it")applyLang();else{$("#langToggle").setAttribute("lang","en");renderTrips();}
  if(/[?&]vivitest\b/.test(location.search))window.__vivi=state;   /* solo per i test automatici */
  if(/[?&]photocheck/.test(location.search))runPhotoAudit();
  else openFromLink();
}
init();
