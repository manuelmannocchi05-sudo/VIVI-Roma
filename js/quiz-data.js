/* VIVI Roma — quiz in 6 passaggi (7 per chi viaggia in famiglia), una domanda per schermata.
   when: passaggio mostrato solo se la condizione sulle risposte è vera.
   STEPS: i passaggi mostrati; ogni passaggio contiene una o più domande (chiavi di QUIZ).
   QUIZ: le domande. Opzioni: [valore, icona (o "#testo"), titolo, descrizione, etichetta breve per il riepilogo].
   multi:true = si possono scegliere più risposte (nessun minimo oltre a una, nessun massimo).
   photo = foto locale (js/data/photos.js) mostrata nella card dell'opzione.
   legacy = opzioni non più proposte nel quiz ma ancora valide nei viaggi salvati e nei link condivisi
   delle versioni precedenti (vedi docs/quiz-logica.md). */

const STEPS=[
 {id:"who",name:"Compagnia",title:"Con chi vivi Roma?",sub:"Ogni compagnia scopre la città a modo suo.",keys:["company"]},
 {id:"kids",name:"Famiglia",title:"Viaggiate con bambini piccoli?",sub:"Così proponiamo luoghi per bambini solo se servono davvero.",keys:["kids"],when:a=>a.company==="family"},
 {id:"know",name:"Roma e te",title:"È la tua prima volta a Roma?",sub:"Così sappiamo se puntare sui grandi classici o su qualcosa di nuovo.",keys:["familiarity"]},
 {id:"time",name:"Durata",title:"Quanto tempo hai?",sub:"Giornate realistiche, da mezza giornata a una settimana.",keys:["duration"]},
 {id:"interests",name:"Interessi",title:"Cosa vuoi scoprire e vivere?",sub:"Scegline quante vuoi: anche una sola va benissimo.",keys:["interests"]},
 {id:"mood",name:"Atmosfera",title:"Che atmosfera preferisci?",sub:"Una o più: ci aiutano a scegliere tra luoghi simili.",keys:["mood"]},
 {id:"practical",name:"Preferenze",title:"Come ti piace viaggiare?",sub:"Ritmo, passi e budget: tre scelte rapide.",keys:["pace","walking","budget"]}
];

const QUIZ=[
 {key:"company",title:"Con chi viaggi?",err:"Scegli con chi viaggi.",opts:[
  ["solo","user","Da solo/a","Libertà e curiosità"],
  ["couple","heart","In coppia","Atmosfera e momenti speciali"],
  ["friends","users","Con amici","Esperienze e buon cibo"],
  ["family","home","In famiglia","Scoperte da condividere"]]},
 /* solo per «In famiglia»: schermata a sé, subito dopo la compagnia */
 {key:"kids",title:"Viaggiate con bambini piccoli?",err:"Dicci se viaggiate con bambini piccoli.",opts:[
  ["yes","smile","Sì","Fino a 11 anni circa","Con bambini piccoli"],
  ["no","users","No","Adulti o ragazzi","Senza bambini piccoli"]]},
 {key:"familiarity",title:"È la tua prima volta a Roma?",err:"Dicci se è la tua prima volta a Roma.",opts:[
  ["first","star","È la mia prima volta","I luoghi simbolo da non perdere","Prima volta a Roma"],
  ["often","refresh","La conosco già","Qualcosa di nuovo da scoprire","Conosce già Roma"]]},
 {key:"duration",title:"Quanto tempo hai?",err:"Scegli quanto tempo hai a disposizione.",opts:[
  ["half","#½","Mezza giornata","Qualche ora"],
  ["one","#1","Un giorno","Il meglio in una giornata"],
  ["multi","#+","Più giorni","Da 2 a 7 giorni"]],
  followUp:{key:"days",when:"multi",title:"Quanti giorni?",err:"Scegli per quanti giorni resti a Roma.",opts:[
   ["2","#2","2",""],["3","#3","3",""],["4","#4","4",""],["5","#5","5",""],["6","#6","6",""],["7","#7","7",""]]}},
 {key:"interests",multi:true,title:"Cosa vuoi scoprire e vivere?",err:"Scegli almeno un interesse.",opts:[
  ["history","column","Storia e monumenti","Colosseo, Fori, l'impero",null,"cat-history"],
  ["art","frame","Arte e architettura","Musei e capolavori",null,"cat-art"],
  ["religious","dome","Roma sacra","Basiliche e spiritualità",null,"cat-religious"],
  ["hidden","compass","Luoghi nascosti","Angoli poco conosciuti",null,"cat-hidden"],
  ["romantic","heart","Roma romantica","Panorami e tramonti",null,"cat-romantic"],
  ["nature","leaf","Verde e quiete","Parchi e giardini",null,"cat-nature"],
  ["food","utensils","Cibo e tradizioni","Mercati e sapori romani",null,"cat-food"],
  ["night","moon","Roma di sera","Luci e atmosfera",null,"castel"]],
  legacy:[
  ["local","pin","Vita locale","Quartieri e tradizioni"],
  ["family","smile","Adatto ai bambini","Idee adatte alle famiglie"]]},
 {key:"mood",multi:true,title:"Che atmosfera preferisci?",err:"Scegli almeno un'atmosfera.",opts:[
  ["iconic","star","Meraviglia","I luoghi che tolgono il fiato",null,"trevi"],
  ["local","pin","Autenticità","Quartieri e tradizioni romane",null,"cat-local"],
  ["peaceful","leaf","Calma","Verde, silenzio e panorami",null,"aranci"],
  ["lively","sun","Energia","Piazze, mercati e movimento",null,"campo"]]},
 {key:"pace",title:"Ritmo",err:"Scegli il tuo ritmo.",compact:true,opts:[
  ["slow","coffee","Con calma","Poche tappe","Ritmo lento"],
  ["balanced","sliders","Equilibrato","Scoperte e pause","Ritmo equilibrato"],
  ["full","bolt","Intenso","Giornate piene","Ritmo intenso"]]},
 {key:"walking",title:"Quanto vuoi camminare?",err:"Scegli quanto vuoi camminare.",compact:true,opts:[
  ["low","pin","Poco","Tratti brevi","Camminate brevi"],
  ["medium","pin","Il giusto","Mi piace camminare","Camminate medie"],
  ["high","pin","Molto","Esplorare a piedi","Camminate lunghe"]]},
 {key:"budget",title:"Budget",err:"Scegli il tuo budget.",compact:true,opts:[
  ["low","coin","Contenuto","Spendere poco","Budget contenuto"],
  ["mid","sliders","Medio","Qualche ingresso","Budget medio"],
  ["high","star","Libero","Senza troppe rinunce","Budget libero"]]}
];
QUIZ.forEach(q=>{q.step=STEPS.findIndex(s=>s.keys.includes(q.key));});

/* Compatibilità: etichette della camminata usate in versioni precedenti */
const WALK_OPTS=[["low","Poco: preferisco spostamenti brevi"],["medium","Il giusto: camminare mi piace"],["high","Molto: adoro esplorare a piedi"]];
const LABELS={};QUIZ.forEach(q=>{LABELS[q.key]={};q.opts.concat(q.legacy||[]).forEach(o=>LABELS[q.key][o[0]]=o[4]||o[2]);});
const durationLabel=a=>a.duration==="half"?"Mezza giornata":a.duration==="one"?"1 giorno":a.days+" giorni";
const PACE_LABEL={slow:"Ritmo lento",balanced:"Ritmo equilibrato",full:"Ritmo intenso"};

/* Atmosfere scelte: sempre un elenco (i dati delle versioni precedenti hanno un solo valore). */
const moodsOf=a=>a&&a.mood?(Array.isArray(a.mood)?a.mood:[a.mood]):[];

/* Dalle risposte del quiz a quelle usate dal motore (docs/quiz-logica.md):
   - "Vita locale" non è più un interesse a sé: è compresa nell'atmosfera «Autenticità»;
   - "Esperienze per tutti" non è più un interesse a sé: si attiva solo con «In famiglia» + «Sì, con bambini piccoli»
     (blocco B: «In famiglia» da solo non presuppone bambini piccoli).
   I viaggi salvati prima del nuovo quiz che contengono questi interessi restano invariati. */
function engineAnswers(a){
  const ints=a.interests.slice();
  const add=v=>{if(!ints.includes(v))ints.push(v);};
  if(moodsOf(a).includes("local"))add("local");
  if(a.company==="family"&&a.kids==="yes")add("family");
  return {...a,interests:ints,mood:moodsOf(a)};
}

/* Passaggi da mostrare con queste risposte (indici in STEPS). */
const activeSteps=a=>STEPS.map((s,i)=>i).filter(i=>!STEPS[i].when||STEPS[i].when(a));

export {activeSteps,STEPS,QUIZ,WALK_OPTS,LABELS,durationLabel,PACE_LABEL,moodsOf,engineAnswers};
