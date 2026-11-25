/* VIVI Roma — report degli eventi anonimi da Workers Analytics Engine.
   Uso:
     CF_ACCOUNT_ID=… CF_API_TOKEN=… node tools/analytics/report.mjs [--giorni 28] [--dataset vivi_roma_events]
     node tools/analytics/report.mjs --dry-run      (mostra solo le query, senza rete né credenziali)
   Il token serve solo in lettura (permesso «Account Analytics: Read») e non va mai salvato nel repository.
   I conteggi usano SUM(_sample_interval): Analytics Engine può campionare, i totali restano stime corrette. */
import path from "node:path";
import {pathToFileURL} from "node:url";
import {EVENTS,EVENT_NAMES,columnOf} from "../../js/metrics-schema.js";

const QUIZ_STEPS=["who","kids","know","time","interests","mood","practical"];

export function parseArgs(argv){
  const o={days:28,dataset:"vivi_roma_events",dryRun:false};
  for(let i=0;i<argv.length;i++){
    const a=argv[i];
    if(a==="--dry-run")o.dryRun=true;
    else if(a==="--giorni"||a==="--days"){const n=Number(argv[++i]);if(!Number.isInteger(n)||n<1||n>90)throw new Error("--giorni: un numero intero da 1 a 90");o.days=n;}
    else if(a==="--dataset"){const d=String(argv[++i]||"");if(!/^[a-z0-9_]{1,64}$/.test(d))throw new Error("--dataset: solo lettere minuscole, cifre e _");o.dataset=d;}
    else throw new Error("opzione sconosciuta: "+a);
  }
  return o;
}

/* Query SQL di Analytics Engine. I nomi vengono da valori fissi (schema e opzioni controllate), mai dall'esterno. */
export function buildQueries({days,dataset}){
  const where=`timestamp > NOW() - INTERVAL '${days}' DAY`;
  const by=(ev,field)=>`SELECT ${columnOf(ev,field)} AS valore, SUM(_sample_interval) AS n FROM ${dataset} WHERE ${where} AND index1 = '${ev}' GROUP BY valore ORDER BY n DESC`;
  return [
    {id:"eventi",title:"Eventi per tipo",sql:`SELECT index1 AS valore, SUM(_sample_interval) AS n FROM ${dataset} WHERE ${where} GROUP BY valore ORDER BY n DESC`},
    {id:"passaggi",title:"Quiz: arrivi a ogni passaggio",sql:by("quiz_step","step")},
    {id:"lingua",title:"Quiz avviati per lingua",sql:by("quiz_start","lang")},
    {id:"durata",title:"Quiz completati per durata",sql:by("quiz_complete","duration")},
    {id:"compagnia",title:"Quiz completati per compagnia",sql:by("quiz_complete","company")},
    {id:"interessi",title:"Combinazioni di interessi",sql:by("quiz_complete","interests")},
    {id:"budget",title:"Quiz completati per budget",sql:by("quiz_complete","budget")},
    {id:"fonte",title:"Itinerari mostrati per provenienza",sql:by("result_view","source")},
    {id:"condivisioni",title:"Condivisioni per metodo",sql:by("share","method")},
    {id:"link",title:"Clic esterni per tipo",sql:by("ext_click","kind")},
    {id:"luoghi",title:"Clic su «Indicazioni» per luogo",sql:`SELECT ${columnOf("ext_click","place")} AS valore, SUM(_sample_interval) AS n FROM ${dataset} WHERE ${where} AND index1 = 'ext_click' AND ${columnOf("ext_click","kind")} = 'directions' GROUP BY valore ORDER BY n DESC LIMIT 20`},
    {id:"mappa",title:"Tipo di mappa mostrata",sql:by("map_view","kind")},
    {id:"segnalazioni",title:"Clic su «Segnala un errore» per luogo (clic, non email inviate)",sql:by("error_report_click","place")}
  ];
}

const toMap=rows=>new Map((rows||[]).map(r=>[String(r.valore),Number(r.n)||0]));
const pct=(a,b)=>b?(100*a/b).toFixed(1).replace(".",",")+"%":"—";
const int=n=>Math.round(n).toLocaleString("it-IT");

/* Report leggibile in Markdown. results: {id: righe [{valore,n}]}. */
export function formatReport(results,{days}){
  const ev=toMap(results.eventi);
  const get=k=>ev.get(k)||0;
  const start=get("quiz_start"),done=get("quiz_complete"),views=get("result_view");
  const out=[`# VIVI Roma — misurazione degli ultimi ${days} giorni`,"",
    "Valori stimati da Workers Analytics Engine (eventi anonimi). Le visite alle pagine sono in Cloudflare Web Analytics.","",
    "## Imbuto del quiz","",
    "| Passo | Eventi | Rispetto all'avvio |","| --- | --- | --- |",
    `| Quiz avviati | ${int(start)} | 100% |`];
  const steps=toMap(results.passaggi);
  for(const s of QUIZ_STEPS.slice(1))if(steps.has(s))out.push(`| Arrivati a «${s}» | ${int(steps.get(s))} | ${pct(steps.get(s),start)} |`);
  out.push(`| Quiz completati | ${int(done)} | ${pct(done,start)} |`,"",
    "## Valore percepito","",
    "| Indicatore | Eventi | Per itinerario mostrato |","| --- | --- | --- |",
    `| Itinerari mostrati | ${int(views)} | — |`,
    `| Salvati | ${int(get("trip_save"))} | ${pct(get("trip_save"),views)} |`,
    `| Stampati | ${int(get("print"))} | ${pct(get("print"),views)} |`,
    `| Condivisi | ${int(get("share"))} | ${pct(get("share"),views)} |`,
    `| Aperti da un link condiviso | ${int(get("share_open"))} | — |`,
    `| Clic esterni (indicazioni, mappa, Wikipedia) | ${int(get("ext_click"))} | ${pct(get("ext_click"),views)} |`,
    `| Clic su «Segnala un errore» | ${int(get("error_report_click"))} | — |`,"");
  for(const q of buildQueries({days,dataset:"x"}).filter(q=>!["eventi","passaggi"].includes(q.id))){
    const rows=results[q.id]||[];
    out.push(`## ${q.title}`,"");
    if(!rows.length){out.push("Nessun dato.","");continue;}
    out.push("| Valore | Eventi |","| --- | --- |",...rows.map(r=>`| ${String(r.valore).replace(/\|/g,"/")} | ${int(Number(r.n)||0)} |`),"");
  }
  return out.join("\n");
}

async function runQuery(sql,{accountId,token,fetchFn}){
  const res=await fetchFn(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/analytics_engine/sql`,
    {method:"POST",headers:{authorization:"Bearer "+token},body:sql+" FORMAT JSON"});
  const text=await res.text();
  if(!res.ok)throw new Error(`Analytics Engine ha risposto ${res.status}: ${text.slice(0,300)}`);
  return JSON.parse(text).data||[];
}

export async function main(argv=process.argv.slice(2),env=process.env,fetchFn=globalThis.fetch,log=console.log){
  const opts=parseArgs(argv);
  const queries=buildQueries(opts);
  if(opts.dryRun){for(const q of queries)log(`-- ${q.title}\n${q.sql};\n`);return null;}
  const accountId=env.CF_ACCOUNT_ID,token=env.CF_API_TOKEN;
  if(!accountId||!token)throw new Error("servono le variabili CF_ACCOUNT_ID e CF_API_TOKEN (token in sola lettura). Prova --dry-run.");
  const results={};
  for(const q of queries)results[q.id]=await runQuery(q.sql,{accountId,token,fetchFn});
  const md=formatReport(results,opts);log(md);return md;
}

/* Controllo di coerenza: ogni campo usato dai report esiste nello schema. */
for(const name of ["quiz_step","quiz_start","quiz_complete","result_view","share","ext_click","map_view","error_report_click"])if(!EVENT_NAMES.includes(name)||!EVENTS[name])throw new Error("evento mancante nello schema: "+name);

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(e=>{console.error("Errore: "+e.message);process.exit(1);});
}
