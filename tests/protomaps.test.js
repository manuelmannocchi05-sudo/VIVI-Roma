/* Prototipo Protomaps (ramo prototipo-protomaps): dati, copertura dei 77 luoghi, sorgente, service worker. npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";
import {TILE_AREA_DETAIL,TILE_AREA_WIDE,MAP_MIN_ZOOM,TILE_MAX_DATA_ZOOM,TILE_URL,ATTRIBUTION,COLORS,tileSource} from "../js/map-style.js";
import {PLACES} from "../js/data/places.js";
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(path.join(ROOT,"tiles")).filter(f=>f.endsWith(".mvt.gz"));
const meta=JSON.parse(R("tiles/meta.json"));
const area=JSON.parse(R("tools/maps/area-roma.json"));
const has=(z,x,y)=>fs.existsSync(path.join(ROOT,"tiles",String(z),String(x),y+".mvt.gz"));
const lon2x=(lon,z)=>Math.floor((lon+180)/360*2**z);
const lat2y=(lat,z)=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z);};
const box=a=>[a.west,a.south,a.east,a.north];

test("tasselli: numero e dimensioni coerenti con meta.json; dati fino allo zoom 15",()=>{
  assert.equal(files.length,meta.tasselli);
  assert.equal(files.reduce((a,f)=>a+fs.statSync(f).size,0),meta.byte_gzip);
  const zs=new Set(files.map(f=>+path.relative(path.join(ROOT,"tiles"),f).split(path.sep)[0]));
  assert.deepEqual([...zs].sort((a,b)=>a-b),[11,12,13,14,15]);
  assert.equal(TILE_MAX_DATA_ZOOM,15);
});
test("aree del codice uguali a tools/maps/area-roma.json e a meta.json",()=>{
  assert.deepEqual(area.livelli,meta.livelli);
  assert.deepEqual(area.livelli.find(l=>l.zoom[0]===11).riquadro,box(TILE_AREA_WIDE));
  assert.deepEqual(area.livelli.find(l=>l.zoom[0]===12).riquadro,box(TILE_AREA_DETAIL));
  assert.equal(MAP_MIN_ZOOM,12);   /* zoom 12 della mappa = dati 11 */
});
test("copertura: tutti i 77 luoghi hanno i dati a ogni zoom, con almeno 1,5 km di margine",()=>{
  assert.equal(PLACES.length,77);
  const D=TILE_AREA_DETAIL,mLat=1.5/111,mLon=1.5/(111*Math.cos(41.9*Math.PI/180));
  for(const p of PLACES){
    assert.ok(p.lat-mLat>=D.south&&p.lat+mLat<=D.north&&p.lng-mLon>=D.west&&p.lng+mLon<=D.east,p.id+": margine < 1,5 km");
    assert.ok(has(11,lon2x(p.lng,11),lat2y(p.lat,11)),p.id+" z11");
    for(let z=12;z<=15;z++){
      /* tutti i tasselli di un riquadro di ±1,5 km intorno al luogo */
      for(let x=lon2x(p.lng-mLon,z);x<=lon2x(p.lng+mLon,z);x++)for(let y=lat2y(p.lat+mLat,z);y<=lat2y(p.lat-mLat,z);y++)
        assert.ok(has(z,x,y),`${p.id}: manca ${z}/${x}/${y}`);
    }
  }
});
test("tasselli: ogni file è gzip valido",()=>{
  for(const f of files){const b=fs.readFileSync(f);assert.equal(b[0],0x1f,f);assert.ok(zlib.gunzipSync(b).length>0,f);}
});
test("sorgente: decomprime, accetta byte già decompressi, 404 = vuoto, errore di rete = errore",async()=>{
  const real=globalThis.fetch;const one=files.find(f=>f.includes(path.sep+"15"+path.sep));const raw=zlib.gunzipSync(fs.readFileSync(one));
  try{
    const s=tileSource(TILE_URL);
    globalThis.fetch=async()=>new Response(fs.readFileSync(one));
    assert.deepEqual(Buffer.from((await s.getZxy(15,1,2)).data),raw);
    globalThis.fetch=async()=>new Response(raw);
    assert.deepEqual(Buffer.from((await s.getZxy(15,1,2)).data),raw);
    globalThis.fetch=async()=>new Response("",{status:404});
    assert.equal(await s.getZxy(1,1,1),undefined);
    globalThis.fetch=async()=>{throw new TypeError("Failed to fetch");};
    await assert.rejects(s.getZxy(1,1,1));
    globalThis.fetch=async()=>new Response("",{status:503});
    await assert.rejects(s.getZxy(1,1,1));
  }finally{globalThis.fetch=real;}
});
test("stile: nomi italiani prima, colori della palette, attribuzione e licenze",()=>{
  const st=R("js/map-style.js");
  assert.match(st,/const NAME=\["name:it","name"\]/);
  for(const k of ["background","park","water","major","minor","label","halo"])assert.match(COLORS[k],/^#[0-9A-F]{6}$/i,k);
  assert.match(ATTRIBUTION,/Protomaps/);assert.match(ATTRIBUTION,/openstreetmap\.org\/copyright/);
  assert.match(meta.attribuzione,/OpenStreetMap \(ODbL\)/);
  assert.match(R("js/vendor/protomaps-leaflet/LICENSE"),/Protomaps LLC/);
});
test("caricamento progressivo: nessun tassello durante lo zoom, livello aggiunto quando la mappa è visibile",()=>{
  const m=R("js/main.js");
  assert.match(m,/updateWhenZooming:false/);
  assert.match(m,/function attachTiles\(\)/);
  assert.match(m,/requestIdleCallback/);
  assert.match(m,/maxBounds:bb\(S\.TILE_AREA_DETAIL\)/);
  assert.ok(!/^import .*map-style/m.test(m),"map-style.js non va importato all'avvio");
});
test("service worker: tasselli in una cache propria, mai salvati in anticipo",()=>{
  const sw=R("sw.js");
  assert.match(sw,/const TILES_VERSION="/);
  assert.match(sw,/startsWith\(scopePath\+"tiles\/"\)/);
  assert.ok(sw.includes('"./js/vendor/protomaps-leaflet/protomaps-leaflet.js"'));
  assert.ok(!/\.mvt/.test(sw.match(/PRECACHE=(\[[\s\S]*?\]);/)[1]));
});
test("offline: avviso dedicato in italiano e inglese",async()=>{
  const it=(await import("../js/i18n/it.js")).default,en=(await import("../js/i18n/en.js")).default;
  assert.match(it["map.offline"],/offline/);assert.match(en["map.offline"],/offline/);
});
