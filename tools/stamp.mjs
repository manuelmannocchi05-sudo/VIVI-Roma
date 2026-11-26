/* VIVI Roma — versione dei file dopo ogni modifica: node tools/stamp.mjs
   Aggiunge a CSS e moduli JavaScript un'impronta del contenuto (?v=…) tramite una import map in index.html e crediti.html.
   Così, dopo un aggiornamento, il browser non mescola file vecchi in cache con file nuovi.
   I moduli continuano a importarsi con percorsi normali ("./i18n.js"): è la import map a sostituirli.
   Subito dopo la import map aggiunge i <link rel="modulepreload"> dei moduli di avvio. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const hash=f=>crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT,f))).digest("hex").slice(0,10);
const walk=d=>fs.readdirSync(path.join(ROOT,d),{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==="vendor"?[]:walk(d+"/"+e.name)):e.name.endsWith(".js")?[d+"/"+e.name]:[]);
/* Moduli importati staticamente dalla pagina (script type=module in linea o js/main.js), seguendo gli import. */
const STATIC_IMPORT=/^\s*import\s[^'"]*?from\s*["']([^"']+)["']/gm;
export function startModules(html){
  const seen=new Set(),todo=[];
  const add=(spec,fromDir)=>{if(!spec.startsWith("."))return;const p="./"+path.posix.normalize(path.posix.join(fromDir,spec));if(!seen.has(p)){seen.add(p);todo.push(p);}};
  if(/<script type="module" src="js\/main\.js/.test(html))add("./js/main.js","");
  for(const m of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g))for(const i of m[1].matchAll(STATIC_IMPORT))add(i[1],"");
  while(todo.length){
    const f=todo.shift(),file=path.join(ROOT,f);if(!fs.existsSync(file))continue;
    for(const i of fs.readFileSync(file,"utf8").matchAll(STATIC_IMPORT))add(i[1],path.posix.dirname(f.slice(2)));
  }
  return [...seen].sort();
}
export function stampData(){
  const mods=walk("js").sort();
  const imports={};mods.forEach(m=>{imports["./"+m]="./"+m+"?v="+hash(m);});
  return {imports,css:hash("css/style.css"),main:hash("js/main.js")};
}
export function stampHtml(html,{imports,css,main}){
  const map='<!-- importmap:start -->\n<script type="importmap">'+JSON.stringify({imports},null,0)+'</script>\n<!-- importmap:end -->';
  /* precaricamento parallelo dei moduli che la pagina importa all'avvio (import statici: l'inglese, caricato
     con import() solo se serve, resta fuori). Su reti lente evita di scaricarli uno dopo l'altro. */
  const pre=startModules(html).filter(k=>imports[k]).map(k=>'<link rel="modulepreload" href="'+imports[k]+'" fetchpriority="low">').join("\n");
  html=html.replace(/\n<!-- modulepreload:start -->[\s\S]*?<!-- modulepreload:end -->/g,"");
  html=html.replace(/<!-- importmap:start -->[\s\S]*?<!-- importmap:end -->/,map+"\n<!-- modulepreload:start -->\n"+pre+"\n<!-- modulepreload:end -->");
  html=html.replace(/href="css\/style\.css(\?v=[0-9a-f]+)?"/,'href="css/style.css?v='+css+'"');
  html=html.replace(/src="js\/main\.js(\?v=[0-9a-f]+)?"/,'src="js/main.js?v='+main+'"');
  return html;
}
/* Service worker: elenco dei file da salvare in anticipo e VERSION (impronta del loro contenuto).
   Pagine, CSS e moduli con impronta, font, icone, manifest, Leaflet. Le foto no: le salva sw.js mentre si naviga. */
export function precacheList({imports,css}){
  const files=fs.readdirSync(path.join(ROOT,"fonts")).filter(f=>f.endsWith(".woff2")).map(f=>"./fonts/"+f).sort();
  const icons=fs.readdirSync(path.join(ROOT,"img/icons")).filter(f=>f.endsWith(".png")).map(f=>"./img/icons/"+f).sort();
  return ["./","./crediti.html","./manifest.webmanifest","./icon.svg","./css/style.css?v="+css,
    ...Object.values(imports).sort(),...files,...icons,"./js/vendor/leaflet/leaflet.css","./js/vendor/leaflet/leaflet.js",
    ...(fs.existsSync(path.join(ROOT,"js/vendor/protomaps-leaflet/protomaps-leaflet.js"))?["./js/vendor/protomaps-leaflet/protomaps-leaflet.js"]:[])];
}
export function stampSW(sw,list){
  /* la versione dipende dal contenuto di tutti i file dell'elenco (pagine comprese) */
  const h=crypto.createHash("sha256");
  for(const u of list){const f=u.replace(/^\.\//,"").replace(/\?.*$/,"")||"index.html";h.update(u);h.update(fs.readFileSync(path.join(ROOT,f)));}
  const tm=path.join(ROOT,"tiles/meta.json");
  const tiles=fs.existsSync(tm)?"\nconst TILES_VERSION="+JSON.stringify(JSON.parse(fs.readFileSync(tm,"utf8")).estratto+"-"+crypto.createHash("sha256").update(fs.readFileSync(tm)).digest("hex").slice(0,8))+";":"";
  const block="/* precache:start */\nconst VERSION="+JSON.stringify(h.digest("hex").slice(0,12))+";"+tiles+"\nconst PRECACHE="+JSON.stringify(list,null,0).replace(/","/g,'",\n "')+";\n/* precache:end */";
  if(!/\/\* precache:start \*\/[\s\S]*?\/\* precache:end \*\//.test(sw))throw new Error("sw.js: manca il segnaposto precache");
  return sw.replace(/\/\* precache:start \*\/[\s\S]*?\/\* precache:end \*\//,block);
}
if(process.argv[1]&&process.argv[1].endsWith("stamp.mjs")){
  const d=stampData();
  for(const f of ["index.html","crediti.html"]){
    const p=path.join(ROOT,f),before=fs.readFileSync(p,"utf8"),after=stampHtml(before,d);
    if(!after.includes("importmap:start"))throw new Error(f+": manca il segnaposto della import map");
    fs.writeFileSync(p,after);console.log(f,before===after?"invariato":"aggiornato");
  }
  const swp=path.join(ROOT,"sw.js"),swb=fs.readFileSync(swp,"utf8"),swa=stampSW(swb,precacheList(d));
  fs.writeFileSync(swp,swa);console.log("sw.js",swb===swa?"invariato":"aggiornato");
}
