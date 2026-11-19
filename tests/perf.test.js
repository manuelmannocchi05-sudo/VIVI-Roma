// Blocco D: guardie sulle risorse del primo caricamento
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const R=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("i font sono tre file variabili e tutti esistono",()=>{
  const css=R("css/style.css");
  const urls=[...css.matchAll(/url\(\.\.\/(fonts\/[^)]+\.woff2)\)/g)].map(m=>m[1]);
  const uniq=[...new Set(urls)];
  assert.equal(uniq.length,3,uniq.join(", "));
  for(const u of uniq)assert.ok(fs.existsSync(path.join(__dirname,"..",u)),u);
  assert.ok(!/font-weight:(400|500|600);/.test(css.split("/* 1. TOKEN")[0]),"font-face con pesi statici");
});

test("index.html precarica solo font che esistono, al massimo due",()=>{
  for(const page of ["index.html","crediti.html"]){
    const pre=[...R(page).matchAll(/rel="preload" href="([^"]+)" as="font"/g)].map(m=>m[1]);
    assert.ok(pre.length>=1&&pre.length<=2,page+": "+pre.length);
    for(const f of pre)assert.ok(fs.existsSync(path.join(__dirname,"..",f)),f);
  }
});

test("la copertina limita la densità e ha priorità alta",()=>{
  const js=R("js/main.js");
  assert.match(js,/Math\.min\(dpr,1\.8\)/);
  assert.match(js,/fetchPriority="high"/);
});
