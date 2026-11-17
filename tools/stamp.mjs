/* VIVI Roma — versione dei file dopo ogni modifica: node tools/stamp.mjs
   Aggiunge a CSS e moduli JavaScript un'impronta del contenuto (?v=…) tramite una import map in index.html e crediti.html.
   Così, dopo un aggiornamento, il browser non mescola file vecchi in cache con file nuovi.
   I moduli continuano a importarsi con percorsi normali ("./i18n.js"): è la import map a sostituirli. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const hash=f=>crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT,f))).digest("hex").slice(0,10);
const walk=d=>fs.readdirSync(path.join(ROOT,d),{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==="vendor"?[]:walk(d+"/"+e.name)):e.name.endsWith(".js")?[d+"/"+e.name]:[]);
export function stampData(){
  const mods=walk("js").sort();
  const imports={};mods.forEach(m=>{imports["./"+m]="./"+m+"?v="+hash(m);});
  return {imports,css:hash("css/style.css"),main:hash("js/main.js")};
}
export function stampHtml(html,{imports,css,main}){
  const map='<!-- importmap:start -->\n<script type="importmap">'+JSON.stringify({imports},null,0)+'</script>\n<!-- importmap:end -->';
  html=html.replace(/<!-- importmap:start -->[\s\S]*?<!-- importmap:end -->/,map);
  html=html.replace(/href="css\/style\.css(\?v=[0-9a-f]+)?"/,'href="css/style.css?v='+css+'"');
  html=html.replace(/src="js\/main\.js(\?v=[0-9a-f]+)?"/,'src="js/main.js?v='+main+'"');
  return html;
}
if(process.argv[1]&&process.argv[1].endsWith("stamp.mjs")){
  const d=stampData();
  for(const f of ["index.html","crediti.html"]){
    const p=path.join(ROOT,f),before=fs.readFileSync(p,"utf8"),after=stampHtml(before,d);
    if(!after.includes("importmap:start"))throw new Error(f+": manca il segnaposto della import map");
    fs.writeFileSync(p,after);console.log(f,before===after?"invariato":"aggiornato");
  }
}
