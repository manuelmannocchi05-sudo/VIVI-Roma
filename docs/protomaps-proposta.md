# VIVI Roma — Proposta tecnica: mappa con Protomaps

**Stato: proposta.** Leaflet e i tasselli OpenStreetMap restano in uso. Non è stato scaricato nessun file cartografico.
Per le stime sono stati letti **solo l'intestazione e gli indici** dell'archivio pubblico Protomaps (circa 1 MB in tutto, nessun tassello) con lo script `tools/maps/stima-pmtiles.mjs`.

## 1. Cosa cambierebbe

| | Oggi | Con Protomaps |
|---|---|---|
| Sfondo | Immagini PNG da tile.openstreetmap.org | Tasselli vettoriali di Roma, ospitati con il sito |
| Libreria | Leaflet 1.9.4 | Leaflet 1.9.4 **+ protomaps-leaflet** (disegna i vettori nel browser) |
| Richieste a terzi | Sì (OSMF, Regno Unito) | Nessuna |
| Offline / app | Vietato dalla politica OSM | Consentito: i dati sono nostri (ODbL) e il service worker può salvarli |
| Costi | 0 € | 0 € (solo spazio sull'hosting) |
| Account / chiavi | No | No |

Marcatori, numeri delle tappe, linea puntinata, controlli, pannello della tappa e attribuzione restano identici: cambia solo il livello di sfondo, cioè una riga di `mountMap()` in `js/main.js`.

## 2. Dimensioni stimate (archivio Protomaps del 18/11/2026, v4.15.2, zoom 0–15)

Misura dagli indici: somma dei tasselli unici dentro il riquadro, compressi gzip come nell'archivio.

| Area | Riquadro (lon/lat) | Tasselli | Dimensione |
|---|---|---|---|
| **Area del catalogo VIVI** (77 luoghi + margine) | 12,42–12,59 / 41,82–41,94 | ~370 | **≈ 13,6 MB** |
| Roma dentro il GRA | 12,36–12,62 / 41,79–41,99 | ~840 | ≈ 19,8 MB |

Ripartizione per l'area del catalogo:
- zoom 0–10 ≈ 1,1 MB: un tassello per livello, perché i livelli bassi coprono il mondo intero;
- zoom 11–13 ≈ 2,7 MB;
- zoom 14 ≈ 3,0 MB;
- zoom 15 ≈ 7,0 MB.

Oltre lo zoom 15 la mappa ingrandisce i vettori senza nuovi dati.

Tagliando a zoom 14 l'area del catalogo scende a ≈ 6,8 MB, ma i vicoli del centro sono meno dettagliati. Da decidere guardando il prototipo.

**Quanto scarica l'utente:** non tutto il file, solo i tasselli che vede.
- Vista tipica di una giornata: smartphone, zoom 14–15, 4–8 tasselli. Al centro un tassello di zoom 15 pesa in media ~50 KB, in periferia ~17 KB, quindi circa **150–400 KB per vista**.
- Oggi una vista OSM richiede 9–15 immagini PNG: un ordine di grandezza simile, da misurare nel prototipo.
- In più: protomaps-leaflet 5.1.0 pesa **37,7 KB compresso** (128 KB non compresso), caricato solo con la mappa come oggi Leaflet. Licenza BSD-3.

## 3. Come ospitare i dati: due strade

### A. Un solo file `.pmtiles` letto a pezzi (richieste HTTP «Range»)
- Funziona su GitHub Pages: supporta le richieste a intervalli necessarie a PMTiles.
- **Non funziona su Cloudflare Pages**: la documentazione ufficiale dice che oggi Pages risponde con l'intero file (200) invece del pezzo richiesto (206). Servirebbe Cloudflare R2, lo spazio di archiviazione di Cloudflare (gratuito fino a 10 GB, senza costi di traffico, ma con account e configurazione CORS).
- Il service worker attuale andrebbe adattato: le risposte parziali non si possono salvare nella cache come quelle normali.

### B. Cartella di tasselli singoli (consigliata)
Si estrae il ritaglio e lo si converte in ~370 file `z/x/y.mvt`, decompressi; la compressione la fa l'hosting.
- Funziona su **qualsiasi** hosting statico (GitHub Pages, Cloudflare Pages, Netlify) senza Range. Rientra nei limiti di Cloudflare Pages: 20.000 file, 25 MiB per file.
- Il service worker può salvarli come le foto: mappa offline per le zone già viste, o per tutta l'area se lo si decide.
- Aggiornare significa sostituire una cartella.

## 4. Attribuzioni e licenze

- **Dati**: l'archivio Protomaps è un «Produced Work» di OpenStreetMap con licenza ODbL. L'attribuzione OpenStreetMap è obbligatoria.
- Testo consigliato nell'angolo della mappa: «Protomaps © OpenStreetMap», con link a openstreetmap.org/copyright.
- **Software**: protomaps-leaflet, pmtiles e gli stili della mappa di base sono BSD-3, codice da conservare con il suo avviso di licenza.
- Il **disegno** della mappa di base è CC0.
- Da aggiornare: crediti, piè di pagina e `docs/legale-privacy.md`. Sparisce la richiesta verso i server OSMF e la relativa voce dell'informativa.

## 5. Aggiornamenti dei dati

- Protomaps pubblica una nuova build ogni giorno; Roma cambia poco.
- Proposta: un workflow GitHub Actions **manuale o trimestrale**, sullo stesso modello di quello delle foto:
  1. estrae il riquadro con `pmtiles extract` usando l'opzione `--bbox`;
  2. converte in cartella;
  3. apre una modifica da approvare.
- Il peso nel repository cresce di ~14 MB per ogni aggiornamento conservato nella cronologia. Alternativa: tenere i tasselli fuori dal repository e pubblicarli con il deploy.

## 6. Compatibilità con l'architettura attuale

| Punto | Impatto |
|---|---|
| Nessuna compilazione | ✓ protomaps-leaflet esiste come file unico da copiare in `js/vendor/`, come Leaflet |
| Caricamento solo quando serve | ✓ stesso `loadLeaflet()`, un file in più |
| Marcatori e controlli personalizzati | ✓ invariati: restano livelli di Leaflet |
| Colori della mappa | Oggi c'è un filtro CSS sui PNG; con i vettori i colori si impostano nello stile, più nitidi e coerenti con la palette. Da tarare nel prototipo per **non cambiare** l'aspetto approvato |
| Etichette e lingue | Disegnate dal browser con i suoi font; nomi in italiano dai dati OSM |
| Test | Le prove della mappa (marcatori, declutter, pannello) restano valide; vanno aggiunte prove sul livello vettoriale |
| Service worker | Strada B: nuova regola per `tiles/` simile alle foto. Strada A: da riscrivere per le risposte parziali |
| App futura | ✓ i tasselli possono essere inclusi nell'app per l'uso offline |

## 7. Piano proposto (dopo la tua autorizzazione)

1. Prototipo su un ramo separato con la sola area del centro: ~2–3 MB, pochi file. Confronto visivo e prestazioni contro OSM.
2. Se approvato, area completa del catalogo con la strada B. Attribuzioni e documenti aggiornati.
3. Workflow di aggiornamento trimestrale.

**Da decidere:**
- quale area: catalogo ≈ 13,6 MB oppure GRA ≈ 19,8 MB;
- quale zoom massimo: 14 oppure 15;
- se salvare tutta l'area per l'uso offline, cioè circa 14 MB sul telefono dell'utente.

## Fonti

- Archivio e licenze: docs.protomaps.com/basemaps/downloads, github.com/protomaps/basemaps
- protomaps-leaflet: docs.protomaps.com/basemaps/leaflet; versioni e licenze da npm (protomaps-leaflet 5.1.0, pmtiles 4.5.0, BSD-3)
- Cloudflare Pages e richieste Range: developers.cloudflare.com/pages/configuration/serving-pages/
- Cloudflare Pages, limiti: developers.cloudflare.com/pages/platform/limits
- Cloudflare R2, piano gratuito: developers.cloudflare.com/r2/pricing
- Elenco delle build: build-metadata.protomaps.dev/builds.json (20261118.pmtiles, 139,6 GB, v4.15.2)
