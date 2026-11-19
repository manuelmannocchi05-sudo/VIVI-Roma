# VIVI Roma — Licenze, privacy e aspetti legali (Blocco D)

**Questo documento non è un parere legale e non attesta la conformità normativa.**
È un inventario tecnico di ciò che il sito usa e trasmette, preparato per un consulente (avvocato o DPO) che dovrà confermarlo prima di un lancio commerciale.
Ogni voce indica se è **verificata nel codice** o se **richiede una verifica professionale**.

## 1. Cosa fa il sito (verificato nel codice, commit del Blocco D)

| Elemento | Situazione | Stato |
|---|---|---|
| Cookie | Nessun cookie impostato dal sito | Verificato |
| Analisi del traffico, pixel, pubblicità | Nessuno | Verificato |
| Account, login, database, server propri | Nessuno | Verificato |
| Memoria del browser | `localStorage`, chiave `vivi-roma:viaggi:v1`: solo i viaggi salvati dall'utente (risposte al quiz e tappe). Resta sul dispositivo, non viene inviata a nessuno | Verificato |
| Lingua scelta | Non viene memorizzata | Verificato |
| Font | Ospitati sul sito (nessuna richiesta a Google Fonts) | Verificato |
| Foto | Ospitate sul sito come WebP (nessuna richiesta a Wikimedia durante la navigazione) | Verificato |
| Leaflet (mappa) | Copiato nel progetto, nessun CDN | Verificato |
| Link di condivisione | L'itinerario è codificato nella parte dopo `#` dell'indirizzo: il browser non la invia al server | Verificato |

### Richieste verso servizi esterni

| Servizio | Quando | Cosa riceve | Stato |
|---|---|---|---|
| **GitHub Pages** (hosting) | Ogni visita | Indirizzo IP, User-Agent, pagine richieste (log del server gestiti da GitHub) | Comportamento noto dell'hosting; termini e ruolo di GitHub (titolare o responsabile) **da verificare con un professionista** |
| **tile.openstreetmap.org** (OSMF, Regno Unito) | Solo quando si apre la mappa dei risultati | IP, User-Agent, Referer (indirizzo del sito senza l'itinerario), zona di Roma visualizzata | Verificato nel codice; trasferimento verso il Regno Unito e informativa **da valutare** |
| Google Maps, OpenStreetMap, Wikipedia, Wikimedia Commons, siti ufficiali dei luoghi | Solo se l'utente tocca un link | Ciò che ogni sito raccoglie normalmente; i link hanno `rel="noopener noreferrer"` | Verificato |

## 2. Fotografie

- 84 immagini da Wikimedia Commons: CC BY-SA 4.0 (39), CC BY-SA 3.0 (13), CC BY 4.0 (11), CC BY 2.0 (8), Pubblico dominio (6), CC BY 3.0 (4), CC0 (2), CC BY-SA 2.0 (1).
- Lo script `tools/photos/build.py` accetta solo CC0, pubblico dominio, CC BY e CC BY-SA, e salva autore, licenza e pagina d'origine. **Verificato.**
- Attribuzione: autore e licenza sotto ogni foto e nella pagina «Crediti fotografici», che dichiara che le immagini sono state ridimensionate e in parte ritagliate. **Verificato.**
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
| Leaflet 1.9.4 | BSD 2-Clause | Mantenere l'avviso di copyright | Verificato: `js/vendor/leaflet/LICENSE` |
| Dati OpenStreetMap | ODbL 1.0 | Attribuzione «© OpenStreetMap» visibile | Verificato: sulla mappa e nel piè di pagina |

I file dei font variabili sono stati ridotti ai pesi 400–600: la licenza OFL lo consente. Il nome del font non è stato cambiato, perché lo richiede solo la «Reserved Font Name» e queste famiglie non la dichiarano. **Da ricontrollare** nei file OFL se si modificano ancora i font.

## 4. Hosting

- GitHub dichiara che Pages **non è pensato né consentito** come hosting gratuito per un'attività online o un sito destinato principalmente a transazioni commerciali (docs.github.com, «GitHub Pages limits»). Limiti: 1 GB per sito, 100 GB di traffico al mese (soglia «morbida»).
- Per la beta gratuita va bene. **Prima di un'eventuale versione commerciale** valuta un altro hosting statico (molti consentono l'uso commerciale anche nel piano gratuito) e verifica i termini con un professionista.

## 5. Bozza di informativa privacy

Testo di partenza da far rivedere a un professionista. **Non è stato pubblicato sul sito.**

> **Informativa sulla privacy — VIVI Roma (versione beta)**
>
> **Titolare**: [nome, indirizzo e contatto del titolare — da completare].
>
> **Dati raccolti dal sito**: VIVI Roma non usa cookie, non ha sistemi di analisi del traffico né pubblicità, non richiede registrazione.
>
> **Viaggi salvati**: se salvi un itinerario, le tue risposte al quiz e le tappe vengono conservate solo nel browser del tuo dispositivo (memoria locale). Non le riceviamo e non le possiamo vedere. Puoi cancellarle eliminando i viaggi da «I miei viaggi» o cancellando i dati del sito nel browser.
>
> **Hosting**: il sito è ospitato da GitHub Pages (GitHub, Inc.). Come ogni server, registra dati tecnici della connessione (ad esempio indirizzo IP e tipo di browser) per far funzionare e proteggere il servizio. [Base giuridica, conservazione e trasferimento extra UE — da completare].
>
> **Mappa**: quando apri la mappa dell'itinerario, il tuo browser scarica le immagini della mappa dai server della OpenStreetMap Foundation (Regno Unito), che ricevono l'indirizzo IP, il tipo di browser e l'indirizzo del sito. Si applica l'informativa della OpenStreetMap Foundation. [Base giuridica — da completare].
>
> **Link esterni**: i link a Google Maps, Wikipedia, OpenStreetMap, Wikimedia Commons e ai siti ufficiali dei luoghi portano a servizi di terzi con proprie informative.
>
> **Diritti**: [diritti degli interessati e reclamo al Garante — da completare].

Le linee guida del Garante sui cookie (10 giugno 2021) prevedono, per i soli strumenti tecnici, un'informativa e nessun banner di consenso. Va confermato da un professionista se `localStorage`, usato solo su azione dell'utente, rientra tra gli strumenti tecnici e se basta questa informativa.

## 6. Riepilogo

**Verificato (tecnico):**
- nessun cookie e nessun tracciamento;
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
