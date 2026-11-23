# VIVI Roma — Licenze, privacy e aspetti legali (Blocco D)

**Questo documento non è un parere legale e non attesta la conformità normativa.**
È un inventario tecnico di ciò che il sito usa e trasmette, preparato per un consulente (avvocato o DPO) che dovrà confermarlo prima di un lancio commerciale.
Ogni voce indica se è **verificata nel codice** o se **richiede una verifica professionale**.

## 1. Cosa fa il sito (verificato nel codice; aggiornato il 20/11/2026 con la mappa Protomaps)

| Elemento | Situazione | Stato |
|---|---|---|
| Cookie | Nessun cookie impostato dal sito | Verificato |
| Analisi del traffico, pixel, pubblicità | Nessuno attivo. Dal ramo `startup-fase1` c'è una misurazione anonima **pronta ma spenta** (Cloudflare Web Analytics + eventi anonimi del quiz, vedi `docs/misurazione.md`): senza cookie, senza identificativi, rispetta Global Privacy Control | Verificato (23/11/2026) |
| Account, login, database, server propri | Nessuno | Verificato |
| Memoria del browser | `localStorage`, chiave `vivi-roma:viaggi:v1`: solo i viaggi salvati dall'utente (risposte al quiz e tappe). Resta sul dispositivo, non viene inviata a nessuno | Verificato |
| Lingua scelta | `localStorage`, chiave `vivi-roma:lingua` (valore «it» o «en»), solo quando l'utente cambia lingua. Resta sul dispositivo. *(Correzione: nel Blocco D era indicato per errore che la lingua non veniva memorizzata.)* | Verificato |
| Service worker (dalla beta) | Copia sul dispositivo dei file del sito (pagine, stili, codice, font, icone, foto viste, zone della mappa già guardate) per l'apertura senza rete. Nessun dato personale, nessuna richiesta a terzi | Verificato |
| Font | Ospitati sul sito (nessuna richiesta a Google Fonts) | Verificato |
| Foto | Ospitate sul sito come WebP (nessuna richiesta a Wikimedia durante la navigazione) | Verificato |
| Mappa | Leaflet e protomaps-leaflet copiati nel progetto; tasselli vettoriali Protomaps (dati OpenStreetMap) ospitati con il sito in `tiles/`. Nessuna richiesta a server di mappe esterni nel funzionamento normale | Verificato |
| Link di condivisione | L'itinerario è codificato nella parte dopo `#` dell'indirizzo: il browser non la invia al server | Verificato |

### Richieste verso servizi esterni

| Servizio | Quando | Cosa riceve | Stato |
|---|---|---|---|
| **GitHub Pages** (hosting) | Ogni visita | Indirizzo IP, User-Agent, pagine richieste (log del server gestiti da GitHub) | Comportamento noto dell'hosting; termini e ruolo di GitHub (titolare o responsabile) **da verificare con un professionista** |
| **tile.openstreetmap.org** (OSMF, Regno Unito) — **solo riserva** | Solo se il browser non può usare la mappa vettoriale (manca `DecompressionStream`, ad esempio Safari precedente alla 16.4) o se il motore della mappa non si carica | IP, User-Agent, Referer (indirizzo del sito senza l'itinerario), zona di Roma visualizzata | Verificato nel codice; nei browser attuali non avviene. Se si mantiene la riserva, va citata nell'informativa (trasferimento verso il Regno Unito **da valutare**) |
| **Cloudflare Web Analytics** — solo quando sarà acceso | A ogni visita in produzione, dopo il caricamento | Script da `static.cloudflareinsights.com`; Cloudflare riceve IP e user agent della richiesta e misure di prestazione e navigazione, senza cookie | Spento nel codice; ruolo di Cloudflare e trasferimenti **da verificare con un professionista** |
| **Contatore eventi** `/api/e` (Cloudflare Pages Functions + Workers Analytics Engine) — solo quando sarà acceso | Durante il quiz e l'uso dell'itinerario | Solo i valori dello schema (`js/metrics-schema.js`): risposte chiuse del quiz, conteggi, id dei luoghi. Il contatore non legge né salva IP, user agent o cookie; la connessione passa comunque dall'infrastruttura di Cloudflare | Spento nel codice; verificato con test |
| Google Maps, OpenStreetMap, Wikipedia, Wikimedia Commons, siti ufficiali dei luoghi | Solo se l'utente tocca un link | Ciò che ogni sito raccoglie normalmente; i link hanno `rel="noopener noreferrer"` | Verificato |

## 2. Fotografie

- 84 immagini da Wikimedia Commons: CC BY-SA 4.0 (39), CC BY-SA 3.0 (13), CC BY 4.0 (11), CC BY 2.0 (8), Pubblico dominio (6), CC BY 3.0 (4), CC0 (2), CC BY-SA 2.0 (1).
- Lo script `tools/photos/build.py` accetta solo CC0, pubblico dominio, CC BY e CC BY-SA, e salva autore, licenza e pagina d'origine. **Verificato.**
- Attribuzione: autore e licenza sotto ogni foto e nella pagina «Crediti e licenze», che dichiara che le immagini sono state ridimensionate e in parte ritagliate. **Verificato.**
- **Da verificare con un professionista:**
  - Le immagini CC BY-SA ridimensionate o ritagliate sono adattamenti: vanno rese disponibili con la stessa licenza. Va confermato che la pagina dei crediti basti.
  - La licenza di Commons riguarda il diritto d'autore del fotografo. Non copre i diritti su opere riprodotte nella foto, come murales o opere d'arte recenti. In Italia non c'è libertà di panorama per le opere protette. Per questo nel Blocco D sono state escluse le foto di murales.
  - Le foto con persone riconoscibili sollevano il tema del diritto all'immagine. Le immagini attuali vanno controllate una per una prima di un uso promozionale.

### Beni culturali (Codice dei beni culturali, d.lgs. 42/2004, artt. 107–108)

- La riproduzione di beni culturali pubblici **a scopo di lucro** può richiedere autorizzazione e un canone all'ente che li ha in consegna. Il D.M. 161/2023, poi modificato dal D.M. 108/2024, fissa le tariffe minime per i beni dello Stato.
- Le riproduzioni senza scopo di lucro e la divulgazione per promuovere la conoscenza del patrimonio sono libere, secondo l'art. 108, commi 3 e 3-bis, nei limiti di legge.
- VIVI Roma usa foto di beni culturali (Colosseo, Pantheon, musei e altri):
  - **finché la beta è gratuita e senza ricavi**, il rischio appare basso;
  - **prima di qualsiasi uso commerciale** (app a pagamento, pubblicità, sponsor, materiale promozionale) serve un parere legale. Il quadro normativo è dibattuto e i casi recenti (David di Michelangelo, Uomo Vitruviano) mostrano che gli enti lo fanno valere.

## 3. Font e software

| Componente | Licenza | Obblighi | Stato |
|---|---|---|---|
| Cormorant Garamond (variabile, da Fontsource) | SIL Open Font License 1.1 | Includere la licenza; non vendere il font da solo | Verificato: `fonts/OFL-Cormorant-Garamond.txt` |
| Inter (variabile, da Fontsource) | SIL Open Font License 1.1 | Come sopra | Verificato: `fonts/OFL-Inter.txt` |
| Leaflet 1.9.4 | BSD 2-Clause | Mantenere l'avviso di copyright | Verificato: `js/vendor/leaflet/LICENSE`, citato nei crediti |
| protomaps-leaflet 5.1.0 | BSD 3-Clause | Mantenere l'avviso di copyright | Verificato: `js/vendor/protomaps-leaflet/LICENSE`, citato nei crediti |
| Librerie incluse in protomaps-leaflet (@protomaps/basemaps, pmtiles, vector-tile, pbf: BSD-3; point-geometry, quickselect, potpack: ISC; color2k, rbush: MIT) | Licenze libere, anche commerciali | Mantenere gli avvisi | Verificato: testi completi in `js/vendor/protomaps-leaflet/THIRD-PARTY-LICENSES.txt`, collegato dai crediti |
| Dati OpenStreetMap (tasselli Protomaps, opera derivata) | ODbL 1.0 | Attribuzione «© OpenStreetMap» visibile, con link | Verificato: «Protomaps © OpenStreetMap» sulla mappa, piè di pagina, sezione «Mappa, caratteri e software» dei crediti |
| Stile della mappa | Disegnato per VIVI Roma (`js/map-style.js`) | — | — |

**Da verificare con un professionista (ODbL):** i tasselli sono un «Produced Work» ricavato dal database OpenStreetMap. Per un Produced Work la ODbL chiede l'attribuzione, non la condivisione dei tasselli con la stessa licenza; i tasselli sono comunque pubblici nel sito. Va confermato che l'attribuzione attuale sia sufficiente anche per un uso commerciale e per un'eventuale app.

I file dei font variabili sono stati ridotti ai pesi 400–600: la licenza OFL lo consente. Il nome del font non è stato cambiato, perché lo richiede solo la «Reserved Font Name» e queste famiglie non la dichiarano. **Da ricontrollare** nei file OFL se si modificano ancora i font.

## 4. Hosting

- GitHub dichiara che Pages **non è pensato né consentito** come hosting gratuito per un'attività online o un sito destinato principalmente a transazioni commerciali (docs.github.com, «GitHub Pages limits»). Limiti: 1 GB per sito, 100 GB di traffico al mese (soglia «morbida»).
- Per la beta gratuita va bene. **Prima di un'eventuale versione commerciale** valuta un altro hosting statico (molti consentono l'uso commerciale anche nel piano gratuito) e verifica i termini con un professionista.

## 5. Bozza di informativa privacy

Testo di partenza da far rivedere a un professionista. **Non è stato pubblicato sul sito.** Aggiornato il 20/11/2026 ai servizi effettivamente usati da `restyling-premium` (mappa ospitata con il sito, service worker, lingua memorizzata). Hosting: oggi GitHub Pages; se si passa a Cloudflare Pages va sostituito il paragrafo «Hosting».

> **Informativa sulla privacy — VIVI Roma (versione beta)**
>
> **Titolare**: [nome, indirizzo e contatto del titolare — da completare].
>
> **Dati raccolti dal sito**: VIVI Roma non usa cookie, non ha pubblicità e non richiede registrazione.
>
> [Solo quando la misurazione sarà accesa — testo da revisionare:] **Statistiche anonime**: per capire come viene usato il sito usiamo Cloudflare Web Analytics, che misura visite e prestazioni senza cookie, e un contatore di eventi che registra in forma anonima alcune azioni (ad esempio avvio e completamento del quiz, le opzioni scelte tra quelle proposte, salvataggi, condivisioni, clic sui link delle tappe). Non registriamo identificativi, non colleghiamo gli eventi tra loro né a una persona, e non conserviamo l'indirizzo IP. Se il tuo browser invia il segnale Global Privacy Control, non viene misurato nulla. Fornitore: Cloudflare, Inc. [ruolo, sede, trasferimenti extra UE e tempi di conservazione — da completare].
>
> **Viaggi salvati**: se salvi un itinerario, le tue risposte al quiz e le tappe vengono conservate solo nel browser del tuo dispositivo (memoria locale). Non le riceviamo e non le possiamo vedere. Puoi cancellarle eliminando i viaggi da «I miei viaggi» o cancellando i dati del sito nel browser.
>
> **Lingua e uso senza connessione**: se cambi lingua, la scelta («it» o «en») viene ricordata nel browser. Per funzionare anche senza connessione, il sito conserva nel browser una copia dei propri file (pagine, stili, codice, caratteri, icone) e delle foto e zone della mappa che hai già visto. Sono file del sito, non dati su di te; puoi eliminarli cancellando i dati del sito nel browser.
>
> **Hosting**: il sito è ospitato da GitHub Pages (GitHub, Inc.). Come ogni server, registra dati tecnici della connessione (ad esempio indirizzo IP e tipo di browser) per far funzionare e proteggere il servizio. [Base giuridica, conservazione e trasferimento extra UE — da completare].
>
> **Mappa**: la mappa è ospitata insieme al sito e non comporta richieste a fornitori di mappe esterni. Le zone della mappa che guardi vengono conservate nel browser del tuo dispositivo per l'uso senza connessione. [Solo se si mantiene la riserva per i browser più vecchi: in quei browser la mappa viene scaricata dai server della OpenStreetMap Foundation (Regno Unito), che ricevono l'indirizzo IP, il tipo di browser e l'indirizzo del sito. Si applica l'informativa della OpenStreetMap Foundation. Base giuridica — da completare.]
>
> **Link esterni**: i link a Google Maps, Wikipedia, OpenStreetMap, Wikimedia Commons e ai siti ufficiali dei luoghi portano a servizi di terzi con proprie informative.
>
> **Diritti**: [diritti degli interessati e reclamo al Garante — da completare].

Le linee guida del Garante sui cookie (10 giugno 2021) prevedono, per i soli strumenti tecnici, un'informativa e nessun banner di consenso. Gli strumenti di analisi possono essere assimilati a quelli tecnici solo a condizioni precise (statistiche aggregate su un solo sito, senza incroci con altri dati): la misurazione di `startup-fase1` è progettata per restare in questo perimetro, ma la conclusione va confermata da un professionista prima di accenderla. Va confermato da un professionista se `localStorage`, usato solo su azione dell'utente, rientra tra gli strumenti tecnici e se basta questa informativa.

## 6. Riepilogo

**Verificato (tecnico):**
- nessun cookie e nessun tracciamento attivo (misurazione anonima pronta ma spenta, vedi `docs/misurazione.md`);
- dati dei viaggi solo sul dispositivo;
- font e foto ospitati sul sito;
- attribuzioni di foto, OSM, font e Leaflet presenti;
- solo licenze libere ammesse per le foto.

**Da far verificare a un professionista prima del lancio pubblico o commerciale:**
1. Informativa privacy definitiva:
   - titolare;
   - basi giuridiche;
   - ruolo di GitHub e della OSMF;
   - trasferimenti verso USA e Regno Unito.
2. Adeguatezza dell'attribuzione per le immagini CC BY-SA adattate.
3. Uso commerciale di immagini di beni culturali (artt. 107–108 del Codice e D.M. 161/2023).
4. Diritto all'immagine per eventuali persone riconoscibili nelle foto.
5. Compatibilità di GitHub Pages e dei tasselli OSM con un uso commerciale.
6. Disclaimer su prezzi e orari: il testo attuale invita a verificare le fonti ufficiali, ma va valutata la responsabilità.

## Fonti

- [Politica d'uso dei tasselli OSM](https://operations.osmfoundation.org/policies/tiles/)
- [GitHub Pages — limiti d'uso](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Garante privacy — Linee guida cookie e altri strumenti di tracciamento, 10 giugno 2021](https://gpdp.it/garante/doc.jsp?ID=9677876)
- [Codice dei beni culturali, art. 108](https://archiviodistatoprato.cultura.gov.it/fileadmin/user_upload/Codice-BBCC_Articolo-108.pdf); [D.M. 108/2024 che modifica il D.M. 161/2023](https://archiviodistatotrento.cultura.gov.it/pdf/DM%2021%20marzo%202024%20rep.%20108-signed.pdf)
- [Finestre sull'Arte — riproduzione delle immagini dei beni culturali](https://www.finestresullarte.info/opinioni/la-riproduzione-delle-immagini-dei-beni-culturali-tra-accesso-aperto-e-forme-di-controllo)
