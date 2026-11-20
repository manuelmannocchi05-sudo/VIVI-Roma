/* VIVI Roma — prepara la cartella da pubblicare su Cloudflare Pages: node tools/cf-dist.mjs → dist/
   Copia solo i file del sito (niente docs/, tests/, tools/, .github/) e controlla i limiti di Pages
   (20.000 file, 25 MiB per file). Su Cloudflare: comando di build «node tools/cf-dist.mjs», cartella «dist». */
import fs from "node:fs";
import path from "node:path";
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const OUT=path.join(ROOT,"dist");
const FILES=["index.html","crediti.html","404.html","sw.js","manifest.webmanifest","icon.svg","_headers"];
const DIRS=["css","js","fonts","img"].concat(fs.existsSync(path.join(ROOT,"tiles"))?["tiles"]:[]);
const MAX_FILES=20000,MAX_SIZE=25*1024*1024;
fs.rmSync(OUT,{recursive:true,force:true});
let n=0,bytes=0,biggest=["",0];
const copy=(rel)=>{
  const src=path.join(ROOT,rel),dst=path.join(OUT,rel),st=fs.statSync(src);
  if(st.isDirectory()){for(const e of fs.readdirSync(src))copy(path.join(rel,e));return;}
  if(st.size>MAX_SIZE)throw new Error(rel+": "+st.size+" byte, oltre il limite di 25 MiB di Cloudflare Pages");
  fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);
  n++;bytes+=st.size;if(st.size>biggest[1])biggest=[rel,st.size];
};
for(const f of FILES.concat(DIRS))copy(f);
if(n>MAX_FILES)throw new Error(n+" file: oltre il limite di 20.000 di Cloudflare Pages");
/* ogni file elencato nel service worker deve esistere nella cartella pubblicata */
const sw=fs.readFileSync(path.join(OUT,"sw.js"),"utf8");
const list=JSON.parse(sw.match(/PRECACHE=(\[[\s\S]*?\]);/)[1]);
for(const u of list){const f=u.replace(/^\.\//,"").replace(/\?.*$/,"")||"index.html";if(!fs.existsSync(path.join(OUT,f)))throw new Error("manca in dist: "+f);}
console.log(`dist/: ${n} file, ${(bytes/1048576).toFixed(1)} MB, il più grande ${biggest[0]} (${(biggest[1]/1024).toFixed(0)} KB)`);
