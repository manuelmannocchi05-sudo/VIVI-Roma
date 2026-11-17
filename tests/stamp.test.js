/* La versione dei file (import map e ?v=) deve corrispondere al contenuto attuale: altrimenti eseguire node tools/stamp.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {stampData,stampHtml} from "../tools/stamp.mjs";
test("versione dei file aggiornata in index.html e crediti.html", ()=>{
  const d=stampData();
  for(const f of ["index.html","crediti.html"]){
    const html=fs.readFileSync(new URL("../"+f,import.meta.url),"utf8");
    assert.equal(stampHtml(html,d),html,f+" non aggiornato: eseguire node tools/stamp.mjs");
    assert.ok(html.indexOf('type="importmap"')<html.indexOf('type="module"'),f+": la import map deve precedere i moduli");
  }
});
