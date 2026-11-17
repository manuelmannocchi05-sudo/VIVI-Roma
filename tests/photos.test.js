/* Test delle fotografie locali: npm test */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {PHOTOS} from "../js/data/photos.js";
import {PLACES} from "../js/data/places.js";

const root=new URL("../",import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),"utf8");
const LICENSE=/^(CC0|Public domain|CC BY(-SA)? \d(\.\d)?( \w+)?)$/i;
/* Luoghi ancora senza una foto con licenza verificata: mostrano il segnaposto. Da svuotare quando si trova una foto adatta. */
const MISSING=JSON.parse(read("tools/photos/missing.json")).map(m=>m.key);

test("foto: ogni luogo ha una foto locale o è dichiarato senza foto", ()=>{
  for(const p of PLACES){
    if(MISSING.includes(p.id)){assert.ok(!PHOTOS[p.id],p.id+": ha una foto ma è ancora in missing.json");continue;}
    assert.ok(PHOTOS[p.id],p.id+": nessuna foto e non dichiarato in tools/photos/missing.json");
  }
});

test("foto: categorie e copertina presenti", ()=>{
  const html=read("index.html");
  const cats=[...html.matchAll(/data-photo="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(cats.length,8);
  cats.forEach(k=>assert.ok(PHOTOS[k],"categoria senza foto: "+k));
  assert.ok(PHOTOS.hero&&PHOTOS["hero-portrait"],"copertina mancante");
});

test("foto: file esistenti, dimensioni contenute, attribuzione completa", ()=>{
  let total=0;
  for(const [k,ph] of Object.entries(PHOTOS)){
    assert.ok(Array.isArray(ph.w)&&ph.w.length,k+": nessuna larghezza");
    assert.deepEqual([...ph.w].sort((a,b)=>a-b),ph.w,k+": larghezze non ordinate");
    for(const w of ph.w){
      const f=new URL(ph.base+"-"+w+".webp",root);
      assert.ok(fs.existsSync(f),k+": manca "+ph.base+"-"+w+".webp");
      const buf=fs.readFileSync(f);total+=buf.length;
      assert.equal(buf.subarray(8,12).toString(),"WEBP",k+": il file non è WebP");
      assert.ok(buf.length<=(w<=480?90:w<=1080?260:420)*1024,k+": "+w+" px pesa "+Math.round(buf.length/1024)+" KB");
    }
    assert.match(ph.color,/^#[0-9a-f]{6}$/,k+": colore del segnaposto");
    assert.ok(ph.author&&ph.author.trim(),k+": autore mancante");
    assert.match(ph.license,LICENSE,k+": licenza non ammessa ("+ph.license+")");
    assert.match(ph.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,k+": fonte non valida");
    if(/^CC BY/.test(ph.license))assert.match(ph.licenseUrl||"",/^https?:\/\/creativecommons\.org\//,k+": link alla licenza mancante");
  }
  assert.ok(total<30*1024*1024,"immagini troppo pesanti in totale: "+(total/1048576).toFixed(1)+" MB");
});

test("foto: nessuna immagine usata due volte (tranne le due versioni della copertina)", ()=>{
  const seen={};
  for(const [k,ph] of Object.entries(PHOTOS)){
    const id=k==="hero-portrait"?"hero":k;
    if(seen[ph.file]&&seen[ph.file]!==id)assert.fail("stessa foto per "+seen[ph.file]+" e "+k+": "+ph.file);
    seen[ph.file]=id;
  }
});

test("foto: l'interfaccia non carica immagini da Wikipedia o Commons", ()=>{
  const js=read("js/main.js");
  assert.ok(!/wikipedia\.org\/api|Special:FilePath|upload\.wikimedia\.org/.test(js),"main.js chiama ancora servizi esterni per le foto");
});
