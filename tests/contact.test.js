/* «Segnala un errore» e contatti: indirizzo mai in chiaro nei file pubblicati, mailto corretto, evento anonimo. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {contactAddress,mailtoUrl,armMailLink} from "../js/contact.js";
import {encodeEvent,columnOf} from "../js/metrics-schema.js";
import {PLACES} from "../js/data/places.js";
import {t,setLang} from "../js/i18n.js";
import IT from "../js/i18n/it.js";
import EN from "../js/i18n/en.js";

const ROOT=new URL("..",import.meta.url).pathname;
const ADDRESS_RE=/viviroma\.contact\s*@\s*gmail\.com|viviroma\.contact%40gmail/i;

test("indirizzo ufficiale ricostruito correttamente", ()=>{
  assert.equal(contactAddress(),["viviroma","contact"].join(".")+"@"+"gmail.com");
});
test("l'indirizzo non compare in chiaro in nessun file del sito", ()=>{
  const skip=new Set(["node_modules",".git","dist","tests","docs","tools"]);
  const found=[];
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){
    if(skip.has(e.name))continue;
    const f=path.join(d,e.name);
    if(e.isDirectory())walk(f);
    else if(/\.(html|js|mjs|css|json|webmanifest|txt|md)$/.test(e.name)&&ADDRESS_RE.test(fs.readFileSync(f,"utf8")))found.push(path.relative(ROOT,f));
  }};
  walk(ROOT);
  assert.deepEqual(found,[]);
});
test("mailto: oggetto e testo codificati, righe CRLF, decodifica fedele", ()=>{
  const subject="VIVI Roma — Segnalazione: Sant'Agnese & co. (x)",body="Riga 1\nRiga 2 è più\n\n— fine?";
  const u=mailtoUrl({subject,body});
  assert.ok(u.startsWith("mailto:"+contactAddress()+"?subject="));
  assert.ok(!/[\s<>"]/.test(u),"nessun carattere non codificato");
  const q=new URLSearchParams(u.slice(u.indexOf("?")+1).replace(/\+/g,"%2B"));
  assert.equal(q.get("subject"),subject);
  assert.equal(q.get("body"),body.replace(/\n/g,"\r\n"));
  assert.ok(u.includes("%0D%0A"));
  assert.equal(mailtoUrl(),"mailto:"+contactAddress());
});
test("segnalazione per ogni luogo, in italiano e in inglese: nome e ID presenti, link di lunghezza ragionevole", ()=>{
  for(const l of ["it","en"]){
    setLang(l);
    for(const p of PLACES){
      const subject=t("report.subject",{name:p.name,id:p.id}),body=t("report.body",{name:p.name,id:p.id});
      assert.ok(subject.includes(p.name)&&subject.includes(p.id),l+" "+p.id);
      assert.ok(body.includes(p.name)&&body.includes("ID: "+p.id),l+" "+p.id);
      const u=mailtoUrl({subject,body});
      assert.ok(u.length<1800,l+" "+p.id+" "+u.length);
      assert.ok(t("stop.reportAria",{name:p.name}).includes(p.name));
    }
  }
  setLang("it");
});
test("testi del contatto presenti in entrambe le lingue", ()=>{
  const keys=Object.keys(IT).filter(k=>/^(stop\.report|report\.|contact\.|footer\.contact|credits\.contact\.)/.test(k));
  assert.equal(keys.length,15);
  for(const k of keys)assert.ok(k in EN,"manca in inglese: "+k);
  assert.match(EN["stop.report"],/Report an error/);
});
test("armMailLink: href di riserva finché non serve, poi mailto aggiornato; onUse solo al clic", ()=>{
  const listeners={},a={href:"crediti.html#contatti",addEventListener:(ev,f)=>{listeners[ev]=f;}};
  let n=0,used=0;
  armMailLink(a,()=>({subject:"Prova "+(++n)}),()=>used++);
  assert.equal(a.href,"crediti.html#contatti");
  assert.deepEqual(Object.keys(listeners).sort(),["click","focus","pointerenter","touchstart"]);
  listeners.focus();
  assert.equal(a.href,mailtoUrl({subject:"Prova 1"}));
  assert.equal(used,0);
  listeners.click();
  assert.equal(a.href,mailtoUrl({subject:"Prova 2"}));
  assert.equal(used,1);
});
test("evento error_report_click: solo l'ID del luogo", ()=>{
  for(const p of PLACES)assert.deepEqual(encodeEvent({e:"error_report_click",place:p.id}).blobs,["error_report_click",p.id]);
  for(const bad of [{e:"error_report_click"},{e:"error_report_click",place:"Colosseo"},{e:"error_report_click",place:"colosseo",email:"a@b.it"},{e:"error_report_click",place:"colosseo",lang:"it"},{e:"error_report",place:"colosseo"}])
    assert.equal(encodeEvent(bad),null,JSON.stringify(bad));
  assert.equal(columnOf("error_report_click","place"),"blob2");
});
