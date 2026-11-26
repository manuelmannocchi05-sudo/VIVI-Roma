/* Blocco D: versione, crediti delle categorie, copertina AVIF, pagina 404, testi delle impostazioni. */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const R=f=>fs.readFileSync(path.join(ROOT,f),"utf8");

test("versione mostrata nelle impostazioni = versione di package.json",()=>{
  const v=JSON.parse(R("package.json")).version;
  assert.match(R("js/main.js"),new RegExp('const APP_VERSION="'+v.replace(/\./g,"\\.")+'"'));
});
test("crediti: ogni foto di categoria ha il nome della categoria in italiano e in inglese",async()=>{
  const {PHOTOS}=await import("../js/data/photos.js");
  const it=(await import("../js/i18n/it.js")).default,en=(await import("../js/i18n/en.js")).default;
  for(const k of Object.keys(PHOTOS).filter(k=>k.startsWith("cat-"))){
    const key="cat."+k.slice(4)+".label";assert.ok(it[key]&&en[key],key);
  }
  assert.equal(it["cat.local.label"],"Autenticità");assert.equal(en["cat.local.label"],"Authenticity");
});
test("copertina: AVIF più leggere delle WebP corrispondenti, WebP sempre disponibili come alternativa",()=>{
  const h=R("index.html");
  for(const n of ["hero-portrait-720","hero-960","hero-1600"]){
    const a=fs.statSync(path.join(ROOT,"img/hero/"+n+".avif")).size,w=fs.statSync(path.join(ROOT,"img/hero/"+n+".webp")).size;
    assert.ok(a<w*.85,n+": "+a+" vs "+w);
  }
  assert.ok(fs.existsSync(path.join(ROOT,"img/hero/hero-portrait-900.avif")));
  assert.match(h,/type="image\/avif" srcset="img\/hero\/hero-portrait-720\.avif 720w/);
  assert.match(h,/<img src="img\/hero\/hero-1600\.webp"[^>]+fetchpriority="high"/);
  assert.match(R("css/style.css"),/\.hero-media::before\{[^}]*data:image\/webp;base64,/);
});
test("404: autonoma, bilingue, collegamenti alla guida e al quiz",()=>{
  const h=R("404.html");
  assert.ok(!/<link[^>]+stylesheet|<script[^>]+src=/.test(h));
  assert.match(h,/Pagina non trovata/);assert.match(h,/Page not found/);
  assert.match(h,/id="home"/);assert.match(h,/#crea/);
});
test("impostazioni: privacy presentata come bozza, dati locali con conferma, in entrambe le lingue",async()=>{
  const it=(await import("../js/i18n/it.js")).default,en=(await import("../js/i18n/en.js")).default;
  assert.match(it["settings.privacy.draft"],/non è un'informativa sulla privacy definitiva/);
  assert.match(en["settings.privacy.draft"],/not a final privacy notice/);
  for(const k of ["settings.data.delTripsConfirm","settings.data.delAllConfirm","trips.last","trips.offlineAll","trips.offlineSome","settings.version"])assert.ok(it[k]&&en[k],k);
  const h=R("index.html");
  for(const id of ["delTrips","delAll","appVersion","dataTrips","dataPhotos"])assert.match(h,new RegExp('id="'+id+'"'));
});
