/* Prototipo Protomaps (ramo prototipo-protomaps). npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";
import {TILE_AREA,TILE_MAX_DATA_ZOOM,TILE_URL,ATTRIBUTION,FLAVOR,tileSource} from "../js/map-style.js";
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(path.join(ROOT,"tiles")).filter(f=>f.endsWith(".mvt.gz"));
const meta=JSON.parse(R("tiles/meta.json"));

test("tasselli: numero e dimensioni coerenti con meta.json, zoom massimo 15",()=>{
  assert.equal(files.length,meta.tasselli);
  const zs=files.map(f=>+path.relative(path.join(ROOT,"tiles"),f).split(path.sep)[0]);
  assert.equal(Math.max(...zs),15);assert.equal(TILE_MAX_DATA_ZOOM,15);
  assert.equal(files.reduce((a,f)=>a+fs.statSync(f).size,0),meta.byte_gzip);
  assert.deepEqual(meta.riquadro,[TILE_AREA.west,TILE_AREA.south,TILE_AREA.east,TILE_AREA.north]);
});
test("tasselli: ogni file è gzip valido e contiene dati MVT",()=>{
  for(const f of files){const b=fs.readFileSync(f);assert.equal(b[0],0x1f,f);const raw=zlib.gunzipSync(b);assert.ok(raw.length>0,f);}
});
test("solo il centro storico: nessun tassello di zoom 15 fuori dal riquadro",()=>{
  const x2lon=(x,z)=>x/2**z*360-180;
  for(const f of files.filter(f=>f.includes(path.sep+"15"+path.sep))){
    const [,x]=path.relative(path.join(ROOT,"tiles"),f).split(path.sep).map(Number);
    assert.ok(x2lon(x+1,15)>=TILE_AREA.west&&x2lon(x,15)<=TILE_AREA.east,f);
  }
});
test("sorgente: decomprime i .mvt.gz e accetta byte già decompressi; tassello assente → nessun errore",async()=>{
  const real=globalThis.fetch;
  const one=files.find(f=>f.includes(path.sep+"15"+path.sep));
  try{
    globalThis.fetch=async u=>u.includes("missing")?new Response("",{status:404}):new Response(fs.readFileSync(one));
    const s=tileSource(TILE_URL);
    const r=await s.getZxy(15,1,2);assert.deepEqual(Buffer.from(r.data),zlib.gunzipSync(fs.readFileSync(one)));
    globalThis.fetch=async()=>new Response(zlib.gunzipSync(fs.readFileSync(one)));
    const r2=await s.getZxy(15,1,2);assert.deepEqual(Buffer.from(r2.data),zlib.gunzipSync(fs.readFileSync(one)));
    globalThis.fetch=async()=>new Response("",{status:404});
    assert.equal(await tileSource("missing/{z}/{x}/{y}").getZxy(1,1,1),undefined);
  }finally{globalThis.fetch=real;}
});
test("attribuzione e licenze",()=>{
  assert.match(ATTRIBUTION,/Protomaps/);assert.match(ATTRIBUTION,/openstreetmap\.org\/copyright/);
  assert.match(meta.attribuzione,/OpenStreetMap \(ODbL\)/);
  assert.ok(fs.existsSync(path.join(ROOT,"js/vendor/protomaps-leaflet/LICENSE")));
  assert.match(R("js/vendor/protomaps-leaflet/LICENSE"),/Protomaps LLC/);
  for(const k of ["background","earth","water","buildings","major","minor_a","park_b"])assert.match(FLAVOR[k],/^#[0-9a-f]{6}$/i,k);
});
test("service worker: tasselli in una cache propria, motore vettoriale salvato in anticipo",()=>{
  const sw=R("sw.js");
  assert.match(sw,/const TILES_VERSION="/);
  assert.match(sw,/startsWith\(scopePath\+"tiles\/"\)/);
  assert.ok(sw.includes('"./js/vendor/protomaps-leaflet/protomaps-leaflet.js"'));
  assert.ok(!/\.mvt/.test(sw.match(/PRECACHE=(\[[\s\S]*?\]);/)[1]),"i tasselli non si salvano tutti in anticipo");
});
