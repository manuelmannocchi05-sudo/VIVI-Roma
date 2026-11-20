# VIVI Roma — Mappa Protomaps

**Stato: integrata in `restyling-premium` il 20/11/2026** (unione compressa in un solo commit del prototipo `421330d`, design approvato). `main` non contiene questa mappa.
Le misure e le prove qui sotto sono quelle del prototipo, ripetute dopo l'integrazione: vedi la sezione 9.

## 1. Cosa cambia rispetto alla mappa precedente

| | Prima (OSM) | Ora |
|---|---|---|
| Libreria | Leaflet 1.9.4 | **Leaflet 1.9.4, invariato** + protomaps-leaflet 5.1.0, che disegna i tasselli vettoriali come livello Leaflet |
| Sfondo | Immagini PNG da tile.openstreetmap.org | Tasselli vettoriali Protomaps ospitati con il sito (`tiles/`), stile VIVI |
| Marcatori numerati, linea puntinata, controlli, «Sposta la mappa», pannello della tappa, «Vai alla scheda», frecce, declutter, schede | — | **Invariati** |
| Area | Tutto il mondo (servizio esterno) | **Tutti i 77 luoghi del catalogo**, con almeno 1,5 km di margine |
| Richieste a terzi per la mappa | Sì (OSMF) | **Nessuna** |
| Offline | Vietato dalla politica OSM | Sì, per le zone già consultate |

Se protomaps-leaflet non si carica, o il browser non ha `DecompressionStream` (Safari < 16.4), la mappa torna da sola ai tasselli OSM come oggi.

## 2. Copertura dei 77 luoghi

L'area è definita in `tools/maps/area-roma.json`:

| Dati (zoom) | Zoom della mappa | Riquadro (ovest, sud, est, nord) | Perché |
|---|---|---|---|
| 12–15 | 13–16 (oltre il 16 si ingrandiscono i vettori) | 12,427 · 41,821 · 12,583 · 41,934 | I 77 luoghi con almeno 1,5 km di margine: da Monte Mario a EUR, dal Gianicolo ad Acquedotti e Pigneto |
| 11 | 12 | 12,33 · 41,76 · 12,67 · 41,99 | Riquadro più ampio, perché a zoom 12 lo schermo mostra più dell'area di dettaglio |

- protomaps-leaflet disegna allo zoom N della mappa i dati dello zoom N-1 (tasselli vettoriali da 512 px). Per questo lo zoom 12 della mappa usa i dati dell'11.
- Nella prima versione questo dettaglio era sfuggito: i giorni con tappe lontane, a zoom 12, avevano lo sfondo vuoto.
- La mappa vettoriale **non scende sotto lo zoom 12** e **non esce dall'area di dettaglio** (`maxBounds`): un turista non vede mai uno sfondo vuoto.

**Verifiche:**
- `tests/protomaps.test.js` controlla che, per ognuno dei 77 luoghi, esistano tutti i tasselli dei dati 12–15 in un riquadro di ±1,5 km e quello del dato 11.
- `protocover.mjs`, nel browser, centra la mappa su ciascuno dei 77 luoghi a zoom 13 e 15 e controlla che sotto il luogo lo sfondo sia disegnato: **154 casi su 154**.
- Controprova sulla versione precedente: 20 casi falliti, i 10 luoghi fuori dal centro. La prova distingue davvero.

## 3. Dimensioni effettive della cartografia

Archivio: `https://build.protomaps.com/20261118.pmtiles` (build del 18/11/2026).

| | Valore |
|---|---|
| Tasselli | **304** |
| Dimensione su disco, compressi gzip (quanto si scaricherebbe vedendo tutto) | **11,33 MB** (11.881.920 byte) |
| Dimensione decompressa | 18,0 MB (18.871.006 byte) |
| Dati 11 (riquadro ampio) | 9 tasselli, 635 KB |
| Dati 12 / 13 / 14 | 9 / 20 / 56 tasselli, 769 KB / 1,33 MB / 2,52 MB |
| Dati 15 | 210 tasselli, 6,11 MB |
| Tassello più pesante | 130 KB |
| Motore protomaps-leaflet | 128 KB (37,7 KB compresso) |
| Stile della mappa (`js/map-style.js`) | 8,6 KB (3,7 KB compresso) |
| Cartella da pubblicare su Cloudflare Pages (`dist/`) | 587 file, 30,8 MB, il più grande 373 KB: dentro i limiti (20.000 file, 25 MiB per file) |

Prima versione: 95 tasselli, 6,19 MB, solo il centro.

## 4. Caricamento progressivo

| Requisito | Come |
|---|---|
| Solo i tasselli della zona visibile | Leaflet chiede solo i tasselli dentro lo schermo (`keepBuffer: 1`). Fuori dall'area non chiede nulla (`bounds`) |
| Niente download durante le animazioni | `updateWhenZooming: false`: niente tasselli degli zoom intermedi |
| Niente tasselli per una mappa che non si guarda | Il livello entra in mappa solo quando la mappa arriva a circa mezzo schermo di distanza ed è già inquadrata sulla giornata. Prima si scaricavano anche i tasselli della vista iniziale (zoom 12 su tutta Roma), poi subito abbandonati |
| Spostamenti veloci | Ogni richiesta è annullabile: le richieste di zone già lasciate si interrompono |
| Cambio di giornata | Inquadratura diretta, senza animazione, sulla nuova giornata. Le zone già viste non si riscaricano: copia in memoria di protomaps-leaflet e cache del service worker |
| Conservati offline i tasselli consultati | Cache `vivi-roma-tiles-<data>` del service worker, cancellata e sostituita solo quando cambiano i dati |
| Home e quiz non rallentati | La home non carica nulla della mappa. Leaflet e protomaps-leaflet si scaricano dopo l'inizio del quiz, quando il browser è libero (`requestIdleCallback`). Lo stile della mappa è un modulo caricato solo con la mappa, non all'avvio |
| Connessione assente | Avviso dedicato sotto la mappa: «Sei offline: la mappa mostra solo le zone già consultate. Le schede delle tappe e i tuoi viaggi restano disponibili.». Sparisce al ritorno della rete, quando le zone mancanti si scaricano da sole |
| Nessun download di tutta Roma | Nessun pulsante, nessuno scaricamento automatico dell'area completa |

### Misure (Chrome automatizzato, smartphone 390×844, una misura per condizione)

**Home, primo caricamento** (server con compressione, confronto con `restyling-premium`):

| | `restyling-premium` | Prototipo |
|---|---|---|
| Rete normale: primo contenuto / contenuto principale | 0,15 / 0,20 s | 0,14 / 0,20 s |
| 3G veloce: contenuto principale / caricamento completo | 2,55 / 4,03 s | 2,56 / 4,06 s |
| 3G lenta: contenuto principale / caricamento completo | 6,51 / 13,17 s | 6,55 / 13,20 s |
| Peso e richieste | 278 KB, 15 | 280 KB, 15 |

Nessuna richiesta della mappa sulla home in entrambi i casi.

**Prima vista della mappa** (itinerario Colosseo → Campidoglio):

| | OSM | Prototipo 1 | Prototipo 2 |
|---|---|---|---|
| Tasselli / dati | 6 / 229 KB | 2 / 169 KB | 2 / 169 KB |
| Dopo due ingrandimenti | 21 / 683 KB | 6 / 542 KB | 6 / 541 KB |
| Sfondo visibile, 3G veloce | — | 1,36 s | 1,36 s |
| Sfondo visibile, 3G veloce + CPU rallentata 4 volte (telefono medio) | 2,13 s | 1,72 s | 1,70 s |

Il nuovo stile, con bordi delle strade ed edifici, non rallenta il disegno rispetto al primo prototipo. Il dato OSM viene da internet, quindi il confronto non è alla pari.

**Cambio di giornata** (4 giorni: centro, Appia, Garbatella–EUR, Pigneto–San Pietro; service worker spento, per contare la rete):

| Giorno | Zoom | Tasselli scaricati |
|---|---|---|
| 1 (prima apertura) | 15 | 2 (169 KB) |
| 2 | 12 | 4 (410 KB) |
| 3 | 13 | 4 (380 KB) |
| 4 | 12 | **0** (stessi tasselli del giorno 2) |
| di nuovo 1 e 2 | — | **0** |

Totale per vedere tutte e quattro le giornate: circa 1 MB.

## 5. Stile grafico

Nessun tema di serie: le regole di disegno sono scritte per VIVI (`js/map-style.js`). Il filtro CSS resta solo per l'eventuale ritorno a OSM.

| Indicazione | Realizzazione |
|---|---|
| Sfondo avorio caldo | `#F3EDE2`, scuole, ospedali e simili appena distinti (`#EFE8DB`) |
| Parchi verde tenue | `#DCE5C9` parchi, giardini e ville; boschi `#CFDCB9` |
| Tevere riconoscibile | Acqua `#A8C8D2`, linea del fiume visibile anche a zoom 12, nome «Tevere» in corsivo blu |
| Strade principali più visibili | Riempimento sabbia chiara con bordo dorato (`#FBF1DA` / `#CDAE74`); grandi arterie ambra (`#F3DDAA`) |
| Strade secondarie distinguibili | Bianche con bordo beige (`#DDD1BC`) dallo zoom 14, più larghe a zoom alto |
| Nomi delle vie leggibili | Inter 600 su alone avorio, principali dallo zoom 13, secondarie dal 15 |
| Meno etichette | Restano solo vie, Tevere, quartieri (in maiuscolo, fino allo zoom 15) e nomi dei grandi parchi. Tolti negozi, alberghi, fermate, monumenti e ruderi: i luoghi della visita li nominano già marcatori e schede |
| Nomi italiani | Sempre `name:it` prima del nome locale. Le denominazioni latine dei ruderi («Basilica Iulia», «Curia Iulia», «Meta Sudans») non compaiono più, perché le etichette dei monumenti non si disegnano |

## 6. Senza connessione

Prova `protooffline.mjs`, 11 controlli superati. Sequenza:
1. Online: si apre la mappa e si salva il viaggio. Poi si passa offline e si ricarica.
2. Offline: il viaggio si riapre con il motore della mappa dalla cache, lo sfondo disegnato, i marcatori e nessun avviso. Ingrandendo fino a 17 la mappa funziona con i dati già salvati.
3. Offline, spostandosi su una zona mai vista (EUR): compare l'avviso «Sei offline…».
4. Di nuovo online: l'avviso sparisce, EUR e lo zoom 13 si scaricano da soli. Nessun errore JavaScript.

## 7. Attribuzioni, licenze, aggiornamento

- **Attribuzioni e licenze** invariate rispetto alla prima versione:
  - nella mappa compare «Protomaps © OpenStreetMap» con link;
  - i dati sono sotto licenza ODbL;
  - protomaps-leaflet è BSD-3, e le librerie che include sono elencate in `js/vendor/protomaps-leaflet/NOTICE.md`.
- **Aggiornamento**:
  ```
  node tools/maps/estrai-tasselli.mjs tools/maps/area-roma.json tiles [https://build.protomaps.com/AAAAMMGG.pmtiles]
  node tools/stamp.mjs && npm test
  ```
  - Lo script sostituisce `tiles/` solo a estrazione completa.
  - Lo stamp cambia la versione dei tasselli nel service worker, e la cache vecchia viene sostituita.
  - I test ricontrollano la copertura dei 77 luoghi: se si aggiunge un luogo fuori area, falliscono finché non si allarga `area-roma.json`.
  - Ogni aggiornamento aggiunge circa 11,3 MB alla cronologia del repository. Proposta: un aggiornamento ogni sei mesi.

## 8. Problemi aperti

1. **Nomi delle vie secondarie**: protomaps-leaflet scrive il nome solo dove un tratto di via è abbastanza dritto e lungo. Nelle zone a vie curve e corte (Garbatella, centro storico) molti vicoli restano senza nome anche a zoom 16. Le vie principali hanno il nome.
2. **Etichette sotto i marcatori**: i nomi dei quartieri (es. «Colle Palatino», «Campidoglio») possono passare sotto un numero o sotto la linea puntinata, come già con OSM.
3. **Peso del repository**: +11,3 MB di tasselli, che si ripetono a ogni aggiornamento.
4. **Browser senza `DecompressionStream`** (Safari < 16.4): ritorno a OSM, senza offline.
5. **Offline** solo per le zone già consultate. Il download di tutta Roma (11,3 MB) non c'è, come richiesto.
6. **Prove** solo con Chrome automatizzato e con l'emulatore di Cloudflare Pages: nessun iPhone o Android reale, nessun Safari.
7. ~~Da aggiornare all'integrazione~~ — fatto: piè di pagina («Mappa: Protomaps, dati © contributori di OpenStreetMap»), pagina «Crediti e licenze» (dati, tasselli, Leaflet, protomaps-leaflet con le licenze delle librerie incluse in `THIRD-PARTY-LICENSES.txt`, caratteri), `docs/legale-privacy.md`, bozza dell'informativa, `docs/cloudflare-pages.md`.

## 9. Integrazione in `restyling-premium`

- Unione compressa in un solo commit (la cronologia di `restyling-premium` non contiene i tasselli della prima versione del prototipo, solo quelli definitivi).
- `restyling-premium` non era cambiato dal punto di partenza del prototipo (`a9f4985`): nessun conflitto, nessuna correzione precedente toccata. Le differenze riguardano solo mappa, service worker, crediti e documenti.
- Aggiunti in questa fase: sezione «Mappa, caratteri e software» nei crediti, `MAP_DATA_BUILD` in `js/map-style.js` (data dei dati, controllata da un test contro `tiles/meta.json`), testi completi delle licenze delle librerie incluse in protomaps-leaflet.
