/* Report di qualità degli itinerari: npm run report
   Non fa fallire nulla: misura i punti deboli noti, così ogni modifica al motore si può confrontare con i numeri precedenti. */
import {PLACES,buildItinerary,timeRange,spendOf} from "../js/planner.js";
import {sampleAnswers} from "./combos.js";

const per={};PLACES.forEach(p=>p.cats.forEach(c=>per[c]=(per[c]||0)+1));
const BY=Object.fromEntries(PLACES.map(p=>[p.id,p])),mid=p=>(timeRange(p)[0]+timeRange(p)[1])/2;
let days=0,oneStop=0,spendSum={low:[0,0],mid:[0,0],high:[0,0]},stops=0,offInterest=0,longLegs=0,transit=0,singleDay=0,singleSpread=0,maxSpread=0,maxSpreadCase=null;
const combos=sampleAnswers();
for(const a of combos){
  const r=buildItinerary(a);
  r.days.forEach(d=>{days++;if(d.stops.length===1)oneStop++;});
  const sp=spendOf(r.days.flatMap(d=>d.stops.map(s=>({p:BY[s.id]}))));spendSum[a.budget][0]+=sp;spendSum[a.budget][1]++;
  r.days.forEach(d=>d.stops.forEach(s=>{stops++;if(!s.matches.length)offInterest++;if(s.legKm>2.5)longLegs++;if(s.transit)transit++;}));
  if(r.days.length===1){
    singleDay++;singleSpread+=r.days[0].walkKm;
    if(r.days[0].walkKm>maxSpread){maxSpread=r.days[0].walkKm;maxSpreadCase={a,stops:r.days[0].stops.map(s=>s.id)};}
  }
}
const pct=x=>(100*x/stops).toFixed(1)+"%";
console.log("VIVI Roma — report qualità itinerari ("+combos.length+" combinazioni)\n");
console.log("Luoghi in catalogo:",PLACES.length);
console.log("Luoghi per categoria:",Object.entries(per).sort((a,b)=>a[1]-b[1]).map(([k,v])=>k+" "+v).join(", "));
console.log("Tappe che non corrispondono agli interessi scelti:",pct(offInterest));
console.log("Tratte oltre 2,5 km in linea d'aria:",pct(longLegs));
console.log("Tratte segnalate con i mezzi pubblici:",pct(transit));
console.log("Itinerari di 1 giorno o mezza giornata: distanza media",(singleSpread/singleDay).toFixed(1),"km, massima",maxSpread.toFixed(1),"km");
console.log("  caso peggiore:",maxSpreadCase.stops.join(" → "),"·",JSON.stringify(maxSpreadCase.a));
console.log("Giornate con una sola tappa (per tempo, budget o zona):",oneStop+" su "+days);
console.log("Ingressi a pagamento in media per itinerario:",Object.entries(spendSum).map(([k,v])=>k+" "+(v[0]/Math.max(1,v[1])).toFixed(2)).join(" · "));
