/* Blocco C, prestazioni: inglese e mappa scaricati solo quando servono. npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("lingua: prima di caricare l'inglese i testi restano in italiano, poi passano all'inglese", async ()=>{
  const I=await import("../js/i18n.js?isolato");   /* istanza separata: inglese non ancora caricato */
  I.setLang("en");
  assert.equal(I.t("trips.title"),"I miei viaggi","nessuna chiave vuota mentre l'inglese arriva");
  assert.equal(I.foodTip({index:1},"carbonara"),"carbonara");
  assert.equal(I.langReady("en"),false);
  assert.equal(await I.loadLang("en"),true);
  assert.equal(I.langReady("en"),true);
  assert.equal(I.t("trips.title"),"My trips");
  assert.notEqual(I.foodTip({index:1},"carbonara"),"carbonara");
  assert.equal(await I.loadLang("it"),true);
});

test("pagina: libreria della mappa non caricata all'avvio", ()=>{
  const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.ok(!/leaflet\.js|leaflet\.css/.test(html),"Leaflet si carica solo quando serve la mappa");
  const main=fs.readFileSync(new URL("../js/main.js",import.meta.url),"utf8");
  assert.ok(/js\/vendor\/leaflet\/leaflet\.js/.test(main)&&/function loadLeaflet/.test(main));
});
