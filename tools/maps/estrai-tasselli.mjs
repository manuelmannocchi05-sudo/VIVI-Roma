/* VIVI Roma — estrae i tasselli vettoriali Protomaps dell'area di VIVI in una cartella z/x/y.mvt.gz.
   Scarica solo i tasselli dei riquadri indicati (richieste HTTP Range sull'archivio pubblico) e li salva compressi
   gzip: GitHub Pages e Cloudflare Pages non comprimono i file .mvt, quindi la decompressione la fa il browser
   (DecompressionStream, vedi js/map-style.js). Serve la libreria pmtiles (fuori dal sito): npm i pmtiles@4
   Uso: node tools/maps/estrai-tasselli.mjs tools/maps/area-roma.json tiles [build.pmtiles]
   Elenco delle build: https://build-metadata.protomaps.dev/builds.json */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {PMTiles,FetchSource} from "pmtiles";
const [,,CONF,OUT,BUILD]=process.argv;
const conf=JSON.parse(fs.readFileSync(CONF,"utf8"));const URL_=BUILD||conf.build;
const lon2x=(lon,z)=>Math.floor((lon+180)/360*2**z);
const lat2y=(lat,z)=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z);};
const p=new PMTiles(new FetchSource(URL_));
const h=await p.getHeader();
const tmp=OUT+".nuovo";fs.rmSync(tmp,{recursive:true,force:true});
let count=0,raw=0,gz=0;const perZoom={};
for(const lv of conf.livelli){
  const [w,s,e,n]=lv.riquadro;
  for(let z=lv.zoom[0];z<=lv.zoom[1];z++){
    if(z>h.maxZoom)throw new Error("zoom massimo dell'archivio: "+h.maxZoom);
    let zc=0,zb=0;
    for(let x=lon2x(w,z);x<=lon2x(e,z);x++)for(let y=lat2y(n,z);y<=lat2y(s,z);y++){
      const r=await p.getZxy(z,x,y);if(!r)continue;
      const buf=Buffer.from(r.data),g=zlib.gzipSync(buf,{level:9});
      const f=path.join(tmp,String(z),String(x),y+".mvt.gz");
      fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,g);
      count++;zc++;raw+=buf.length;zb+=g.length;gz+=g.length;
    }
    perZoom[z]=[zc,Math.round(zb/1024)];
  }
}
const meta={fonte:URL_,versione_pmtiles:h.specVersion,livelli:conf.livelli,tasselli:count,byte_decompressi:raw,byte_gzip:gz,
  estratto:new Date().toISOString().slice(0,10),formato:"z/x/y.mvt.gz (MVT compresso gzip, decompresso nel browser)",
  attribuzione:"Protomaps © OpenStreetMap (ODbL)",perZoom,nota_perZoom:"[tasselli, KB compressi gzip]"};
fs.writeFileSync(path.join(tmp,"meta.json"),JSON.stringify(meta,null,1)+"\n");
fs.rmSync(OUT,{recursive:true,force:true});fs.renameSync(tmp,OUT);   /* si sostituisce la cartella solo a estrazione completa */
console.log(JSON.stringify({tasselli:count,MB_gzip:(gz/1048576).toFixed(2),MB_decompressi:(raw/1048576).toFixed(2),perZoom}));
