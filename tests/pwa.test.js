/* Beta pubblica: PWA (service worker, manifest, icone). npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {stampData,precacheList,stampSW} from "../tools/stamp.mjs";
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const pngSize=p=>{const b=fs.readFileSync(path.join(ROOT,p));assert.equal(b.toString("ascii",1,4),"PNG",p);return [b.readUInt32BE(16),b.readUInt32BE(20)];};

test("sw.js è aggiornato: elenco e versione coincidono con i file attuali (node tools/stamp.mjs)",()=>{
  const sw=R("sw.js");
  assert.equal(stampSW(sw,precacheList(stampData())),sw);
});
test("ogni file dell'elenco esiste e le versioni ?v= sono quelle della import map",()=>{
  const sw=R("sw.js"),list=JSON.parse(sw.match(/PRECACHE=(\[[\s\S]*?\]);/)[1]);
  const map=JSON.parse(R("index.html").match(/<script type="importmap">(.*?)<\/script>/)[1]).imports;
  for(const u of list){const f=u.replace(/^\.\//,"").replace(/\?.*$/,"")||"index.html";assert.ok(fs.existsSync(path.join(ROOT,f)),u);}
  for(const v of Object.values(map))assert.ok(list.includes(v),v);
  assert.ok(list.some(u=>u.startsWith("./css/style.css?v=")));
  assert.ok(!list.some(u=>u.startsWith("./img/places/")),"le foto dei luoghi non vanno salvate in anticipo");
});
test("il service worker non intercetta richieste verso altri siti (tasselli OSM)",()=>{
  const sw=R("sw.js");
  assert.match(sw,/if\(!sameOrigin\(url\)\)return;/);
  assert.ok(!/tile\.openstreetmap/.test(sw.replace(/\/\*[\s\S]*?\*\//g,"")));
});
test("manifest e icone per Android e iPhone",()=>{
  const m=JSON.parse(R("manifest.webmanifest"));
  assert.equal(m.display,"standalone");assert.equal(m.start_url,"./");
  const by=(s,p)=>m.icons.find(i=>i.sizes===s&&i.purpose===p);
  for(const [s,p] of [["192x192","any"],["512x512","any"],["512x512","maskable"]]){
    const i=by(s,p);assert.ok(i,s+" "+p);assert.deepEqual(pngSize(i.src),s.split("x").map(Number));
  }
  assert.deepEqual(pngSize("img/icons/apple-touch-icon.png"),[180,180]);
  for(const page of ["index.html","crediti.html"]){
    const h=R(page);
    assert.match(h,/<link rel="manifest" href="manifest\.webmanifest">/,page);
    assert.match(h,/<link rel="apple-touch-icon" href="img\/icons\/apple-touch-icon\.png">/,page);
  }
});
test("le due pagine registrano il service worker",()=>{
  assert.match(R("js/main.js"),/registerSW\(\);/);
  assert.match(R("crediti.html"),/registerSW\(\);/);
  assert.match(R("js/pwa.js"),/register\("\.\/sw\.js",\{scope:"\.\/"\}\)/);
});

test("Cloudflare Pages: 404.html autonoma, _headers con sw.js sempre ricontrollato",()=>{
  const h=R("404.html");
  assert.ok(!/<link[^>]+stylesheet|<script[^>]+src=/.test(h),"la pagina 404 non deve dipendere da altri file");
  const hd=R("_headers");
  assert.match(hd,/\/sw\.js\n\s+Cache-Control: no-cache/);
  assert.ok(!/immutable/.test(hd),"niente cache «immutable»: i file senza impronta resterebbero vecchi");
});
test("service worker: pagine con e senza .html e risposte reindirizzate",()=>{
  const sw=R("sw.js");
  assert.match(sw,/\\\/crediti\(\\\.html\)\?\$/);
  assert.match(sw,/res\.redirected/);
  assert.ok(!JSON.parse(sw.match(/PRECACHE=(\[[\s\S]*?\]);/)[1]).includes("./index.html"),"index.html: Cloudflare lo reindirizza a /");
});
