/* «VIVI app» (nuova identità, fase 1): marchio, navigazione e Home. */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const R=f=>fs.readFileSync(path.join(ROOT,f),"utf8");
const html=R("index.html");

test("navigazione: Home, Crea, I miei viaggi, Mappa, Impostazioni e lingua; nessuna funzione inesistente",()=>{
  const nav=html.slice(html.indexOf('<nav class="app-nav"'),html.indexOf("</nav>"));
  for(const r of ["scopri","crea","viaggi","mappa","impostazioni"])assert.match(nav,new RegExp('data-route="'+r+'"'),r);
  assert.match(nav,/<select id="navLang">/);
  /* ricerca e preferiti non esistono ancora: non devono comparire come se funzionassero */
  assert.doesNotMatch(html,/Preferiti|Esplora tutte|data-route="cerca"|data-route="preferiti"/);
});
test("marchio: Colosseo stilizzato nella barra laterale, nella barra della Home e nelle icone",()=>{
  assert.ok((html.match(/class="brand-mark" viewBox="0 0 64 44"/g)||[]).length>=2);
  const m=JSON.parse(R("manifest.webmanifest"));
  assert.equal(m.theme_color,"#ffffff");
  for(const i of m.icons)assert.ok(fs.existsSync(path.join(ROOT,i.src)),i.src);
});
test("Home: copertina, «Scegli la tua Roma» con 8 categorie, quiz su misura e mappa",()=>{
  assert.match(html,/id="heroTitle"/);assert.match(html,/id="heroSample"/);
  assert.equal((html.match(/class="cat-card"/g)||[]).length,8);
  assert.match(html,/class="quiz-card"/);assert.match(html,/img\/home\/su-misura\.svg/);
  assert.match(html,/<a class="map-card" href="#mappa" data-route="mappa"/);
  assert.match(html,/© OpenStreetMap/);
  for(const f of ["img/home/su-misura.svg","img/home/mappa-900.webp","img/home/mappa-1800.webp","img/home/mappa-900.avif"])assert.ok(fs.existsSync(path.join(ROOT,f)),f);
  /* l'anteprima promozionale è stata tolta dalla Home */
  assert.doesNotMatch(html,/id="previewHost"/);
});
test("testi della Home in italiano e in inglese",async()=>{
  const it=(await import("../js/i18n/it.js")).default,en=(await import("../js/i18n/en.js")).default;
  for(const k of ["nav.home","brand.tag","home.quiz.title","home.quiz.text","home.quiz.cta","home.map.title","home.map.text","home.cats.prev","home.cats.next","explore.title","hero.lead"])assert.ok(it[k]&&en[k],k);
  assert.equal(it["hero.h1a"],"Non visitare Roma.");assert.equal(it["hero.h1b"],"Vivila.");
});
test("copertina: nuova foto del Colosseo con autore e licenza",async()=>{
  const {PHOTOS}=await import("../js/data/photos.js");
  assert.equal(PHOTOS.hero.author,"Yana Drabyshchak");assert.equal(PHOTOS.hero.license,"CC BY-SA 4.0");
  assert.equal(PHOTOS["hero-portrait"].file,PHOTOS.hero.file);
});
test("offline: copertina della Home salvata in una cache propria e richiesta per «Pronto»",()=>{
  const sw=R("sw.js"),js=R("js/main.js");
  assert.match(sw,/const HOME="vivi-roma-home-v1"/);
  assert.match(sw,/const home=await caches\.open\(HOME\);\s*const kept=await home\.match\(request\)/);
  /* l'attivazione non cancella la cache della Home */
  assert.doesNotMatch(sw.slice(sw.indexOf('addEventListener("activate"'),sw.indexOf("const sameOrigin")),/HOME/);
  assert.match(js,/HOME_CACHE="vivi-roma-home-v1"/);
  assert.match(js,/\.\.\.\(heroUrl\?\[heroUrl\]:\[\]\)/);
  assert.match(js,/controllerchange",\(\)=>\{askBuild\(\);refreshOffline\(\);keepHomeImages\(\);\}/);
});
test("mappa: a fine ingresso animato della schermata si rimisura e si inquadra la giornata",()=>{
  const js=R("js/main.js"),f=js.slice(js.indexOf("function setMapMode("),js.indexOf("/* Carosello delle tappe"));
  assert.match(f,/getAnimations\(\)\.length/);
  assert.match(f,/addEventListener\("animationend",done\)/);
  assert.match(f,/state\.map\.invalidateSize\(\);fitDay\(false\)/);
});
test("durata nella Home: mezza giornata, un giorno, più giorni con 2–7 giorni; niente «weekend»/«settimana»",()=>{
  const box=html.slice(html.indexOf('id="homeDur"'),html.indexOf('</div>\n            </div>',html.indexOf('id="homeDur"')));
  assert.deepEqual([...box.matchAll(/data-duration="(\w+)"/g)].map(m=>m[1]),["half","one","multi"]);
  assert.deepEqual([...box.matchAll(/class="dur-day" type="button" data-days="(\d)"/g)].map(m=>m[1]),["2","3","4","5","6","7"]);
  assert.match(box,/id="durDays" role="group" aria-labelledby="durDaysLabel" hidden/);
  assert.doesNotMatch(html,/quick\.weekend|quick\.week"|Un weekend|Una settimana/);
  const js=R("js/main.js");
  assert.match(js,/while\(idx<v\.length-1&&state\.quickDuration&&STEPS\[v\[idx\]\]\.id==="time"&&!stepError\(v\[idx\]\)\)idx\+\+/);
  assert.match(html,/id="qzDur"/);
});
