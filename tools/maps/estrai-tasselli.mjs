/* VIVI Roma — estrae i tasselli vettoriali Protomaps di un riquadro in una cartella z/x/y.mvt (prototipo).
   Scarica solo i tasselli del riquadro (richieste HTTP Range sull'archivio pubblico) e li salva compressi gzip
   come z/x/y.mvt.gz: GitHub Pages e Cloudflare Pages non comprimono i file .mvt, quindi la decompressione
   la fa il browser (DecompressionStream, vedi js/map-style.js). Serve la libreria pmtiles: npm i pmtiles@4 (fuori dal sito).
   Uso: node tools/maps/estrai-tasselli.mjs <build.pmtiles> <ovest> <sud> <est> <nord> <zoomMax> <cartella>
   Esempio (centro storico): node tools/maps/estrai-tasselli.mjs https://build.protomaps.com/20261118.pmtiles \
            12.445 41.875 12.52 41.92 15 tiles */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {PMTiles,FetchSource} from "pmtiles";
const [,,URL_,W,S,E,N,ZMAX,OUT]=process.argv;
const [w,s,e,n]=[W,S,E,N].map(Number),zmax=Number(ZMAX);
const lon2x=(lon,z)=>Math.floor((lon+180)/360*2**z);
const lat2y=(lat,z)=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z);};
const p=new PMTiles(new FetchSource(URL_));
const h=await p.getHeader();
if(zmax>h.maxZoom)throw new Error("zoom massimo dell'archivio: "+h.maxZoom);
fs.rmSync(OUT,{recursive:true,force:true});
let count=0,raw=0,gz=0;const perZoom={};
for(let z=0;z<=zmax;z++){
  let zc=0,zb=0;
  for(let x=lon2x(w,z);x<=lon2x(e,z);x++)for(let y=lat2y(n,z);y<=lat2y(s,z);y++){
    const r=await p.getZxy(z,x,y);if(!r)continue;
    const buf=Buffer.from(r.data);const f=path.join(OUT,String(z),String(x),y+".mvt.gz");
    const g=zlib.gzipSync(buf,{level:9});
    fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,g);
    count++;zc++;raw+=buf.length;zb+=g.length;gz+=g.length;
  }
  perZoom[z]=[zc,Math.round(zb/1024)];
}
const meta={fonte:URL_,versione:h.specVersion,riquadro:[w,s,e,n],zoom:[0,zmax],tasselli:count,
  byte_decompressi:raw,byte_gzip:gz,estratto:new Date().toISOString().slice(0,10),
  formato:"z/x/y.mvt.gz (MVT compresso gzip, decompresso nel browser)",attribuzione:"Protomaps © OpenStreetMap (ODbL)",perZoom};
fs.writeFileSync(path.join(OUT,"meta.json"),JSON.stringify(meta,null,1)+"\n");
console.log(JSON.stringify(meta,null,1));
