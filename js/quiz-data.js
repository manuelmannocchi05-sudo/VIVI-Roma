/* VIVI Roma — domande del quiz ed etichette.
   Opzioni: [valore, icona (o "#testo"), titolo, descrizione] */

const QUIZ=[
 {key:"company",name:"Compagnia",title:"Con chi vivi Roma?",sub:"La compagnia cambia il modo di scoprire una città.",err:"Scegli con chi viaggi per continuare.",opts:[
  ["solo","user","Da solo/a","Libertà di seguire la curiosità"],
  ["couple","heart","In coppia","Atmosfera e momenti speciali"],
  ["friends","users","Con amici","Esperienze, risate e buon cibo"],
  ["family","home","In famiglia","Scoperte da condividere"]]},
 {key:"familiarity",name:"Esperienza",title:"È la tua prima volta a Roma?",sub:"Troviamo il giusto equilibrio tra grandi classici e sorprese.",err:"Dicci se è la tua prima volta a Roma.",opts:[
  ["first","star","Sì, la prima volta","Voglio vedere i luoghi simbolo"],
  ["often","refresh","La conosco già","Voglio scoprire qualcosa di nuovo"]]},
 {key:"duration",name:"Durata",title:"Quanto tempo hai?",sub:"Costruiamo giornate realistiche. Gli itinerari arrivano fino a 7 giorni.",err:"Scegli quanto tempo hai a disposizione.",opts:[
  ["half","#½","Mezza giornata","Una piccola fuga a Roma"],
  ["one","#1","1 giorno","Un assaggio della città"],
  ["multi","#+","Più giorni","Da 2 a 7 giorni"]],
  followUp:{key:"days",when:"multi",title:"Se hai selezionato più giorni, quanti?",err:"Scegli per quanti giorni resti a Roma.",opts:[
   ["2","#2","2 giorni",""],["3","#3","3 giorni",""],["4","#4","4 giorni",""],
   ["5","#5","5 giorni",""],["6","#6","6 giorni",""],["7","#7","7 giorni",""]]}},
 {key:"interests",multi:true,name:"Interessi",title:"Cosa ti fa brillare gli occhi?",sub:"Scegli quante risposte vuoi: useremo tutte le tue preferenze.",err:"Scegli almeno un interesse.",opts:[
  ["history","column","Storia e monumenti","Le tracce del passato"],
  ["art","frame","Arte e architettura","Capolavori e bellezza"],
  ["hidden","compass","Luoghi insoliti","Angoli poco conosciuti"],
  ["romantic","heart","Romanticismo","Panorami e passeggiate"],
  ["nature","leaf","Natura e relax","Parchi e giardini"],
  ["food","utensils","Cibo e mercati","La Roma da assaggiare"],
  ["religious","dome","Roma religiosa","Basiliche e spiritualità"],
  ["local","pin","Vita locale","Quartieri e tradizioni"],
  ["night","moon","Roma di sera","Luci e atmosfera"],
  ["family","smile","Esperienze per tutti","Idee adatte alle famiglie"]]},
 {key:"mood",name:"Atmosfera",title:"Che atmosfera cerchi?",sub:"Immagina la sensazione che vuoi portare a casa.",err:"Scegli l'atmosfera che cerchi.",opts:[
  ["iconic","star","Meraviglia","I luoghi che tolgono il fiato"],
  ["local","home","Autenticità","La città vissuta dai romani"],
  ["peaceful","leaf","Calma e bellezza","Verde, silenzio e panorami"],
  ["lively","sun","Energia","Piazze, mercati e movimento"]]},
 {key:"pace",name:"Ritmo",title:"Qual è il tuo ritmo ideale?",sub:"Non tutti viaggiano allo stesso passo.",err:"Scegli il tuo ritmo ideale.",walking:true,opts:[
  ["slow","coffee","Con molta calma","Poche tappe, tempo per fermarsi"],
  ["balanced","sliders","Un buon equilibrio","Scoperte e pause"],
  ["full","bolt","Voglio vedere tanto","Giornate piene e dinamiche"]]},
 {key:"budget",name:"Budget",title:"Qual è il tuo budget?",sub:"Adatteremo tappe ed esperienze a come vuoi vivere Roma.",err:"Scegli il tuo budget per continuare.",opts:[
  ["low","coin","Budget contenuto","Voglio vivere Roma spendendo poco."],
  ["mid","sliders","Budget equilibrato","Voglio alternare risparmio ed esperienze."],
  ["high","star","Voglio concedermi qualcosa","Voglio godermi Roma senza troppe rinunce."]]}
];
const WALK_OPTS=[["low","Poco: preferisco spostamenti brevi"],["medium","Il giusto: camminare mi piace"],["high","Molto: adoro esplorare a piedi"]];
const LABELS={};QUIZ.forEach(q=>{LABELS[q.key]={};q.opts.forEach(o=>LABELS[q.key][o[0]]=o[2]);});
const durationLabel=a=>a.duration==="half"?"Mezza giornata":a.duration==="one"?"1 giorno":a.days+" giorni";
const PACE_LABEL={slow:"Ritmo lento",balanced:"Ritmo equilibrato",full:"Ritmo intenso"};

export {QUIZ,WALK_OPTS,LABELS,durationLabel,PACE_LABEL};
