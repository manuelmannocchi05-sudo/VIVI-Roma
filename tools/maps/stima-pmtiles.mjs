/* Stima delle dimensioni di un ritaglio PMTiles leggendo SOLO l'intestazione e gli indici (nessun tassello scaricato).
   Uso (fuori dal sito, serve la libreria pmtiles: npm i pmtiles@4):
     node tools/maps/stima-pmtiles.mjs https://build.protomaps.com/AAAAMMGG.pmtiles
   Elenco delle build: https://build-metadata.protomaps.dev/builds.json */
import {PMTiles,FetchSource,zxyToTileId,findTile} from "pmtiles";
const URL_=process.argv[2];
let bytes=0;const realFetch=globalThis.fetch;
globalThis.fetch=async(u,o)=>{const r=await realFetch(u,o);const l=Number(r.headers.get("content-length")||0);bytes+=l;return r;};
const p=new PMTiles(new FetchSource(URL_));
const h=await p.getHeader();
console.log("archivio: zoom",h.minZoom,"-",h.maxZoom,"tipo",h.tileType,"compressione",h.tileCompression);
const lon2x=(lon,z)=>Math.floor((lon+180)/360*2**z);
const lat2y=(lat,z)=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z);};
async function entryFor(id){
  let off=h.rootDirectoryOffset,len=h.rootDirectoryLength;
  for(let depth=0;depth<=3;depth++){
    const dir=await p.cache.getDirectory(p.source,off,len,h);
    const e=findTile(dir,id);if(!e)return null;
    if(e.runLength>0)return e;
    off=h.leafDirectoryOffset+e.offset;len=e.length;
  }
  return null;
}
const areas={
  "Area del catalogo VIVI (77 luoghi + margine)":[12.42,41.82,12.59,41.94],
  "Roma dentro il GRA":[12.36,41.79,12.62,41.99],
  
};
for(const [name,[w,s,e,n]] of Object.entries(areas)){
  const per={};let total=0,count=0;
  for(let z=0;z<=h.maxZoom;z++){
    const seen=new Set();let zb=0,zc=0;
    for(let x=lon2x(w,z);x<=lon2x(e,z);x++)for(let y=lat2y(n,z);y<=lat2y(s,z);y++){
      const id=zxyToTileId(z,x,y);const en=await entryFor(id);if(!en)continue;
      const key=en.offset;if(seen.has(key)){zc++;continue;}seen.add(key);zb+=en.length;zc++;}
    per[z]=[zc,Math.round(zb/1024)];total+=zb;count+=zc;
  }
  console.log("\n"+name,JSON.stringify({w,s,e,n}));
  let cum=0;for(const z of Object.keys(per)){cum+=per[z][1];console.log(" z"+z,"tasselli",per[z][0],"KB",per[z][1],"cumulato fino a z"+z,Math.round(cum/1024*10)/10,"MB");}
}
console.log("\nscaricati solo indici:",Math.round(bytes/1024),"KB");
