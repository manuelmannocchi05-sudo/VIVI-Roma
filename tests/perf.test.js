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

test("la copertina è nell'HTML, con priorità alta e densità limitata su smartphone",()=>{
  const html=R("index.html");
  const pic=html.slice(html.indexOf('id="heroMedia"'),html.indexOf("</picture>"));
  assert.match(pic,/<img [^>]*fetchpriority="high"/);
  assert.match(pic,/<img [^>]*width="1440" height="961"/);
  /* smartphone: ritaglio verticale, sizes 70vw ≈ densità massima 2,1× su un telefono 3× (860 px al massimo) */
  assert.match(pic,/media="\(max-width: 760px\)" type="image\/webp" srcset="img\/hero\/hero-portrait-720\.webp 720w, img\/hero\/hero-portrait-860\.webp 860w" sizes="70vw"/);
  assert.doesNotMatch(pic,/loading="lazy"/);
  /* il JavaScript non ricrea la copertina */
  assert.doesNotMatch(R("js/main.js"),/media\.append\(pic\)/);
});
