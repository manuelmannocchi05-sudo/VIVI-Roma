# VIVI Roma — Prototipo Protomaps (ramo `prototipo-protomaps`)

**Stato: prototipo, non integrato.** Il ramo parte da `restyling-premium` (commit `a9f4985`). `main` e `restyling-premium` non contengono nulla di questo prototipo.

## 1. Cosa cambia

| | `restyling-premium` | Prototipo |
|---|---|---|
| Libreria della mappa | Leaflet 1.9.4 | **Leaflet 1.9.4, invariato** + protomaps-leaflet 5.1.0 (disegna i tasselli vettoriali su canvas, come livello Leaflet) |
| Sfondo | Immagini PNG da tile.openstreetmap.org | Tasselli vettoriali Protomaps ospitati con il sito (`tiles/`) |
| Marcatori, numeri, linea puntinata, controlli, pannello della tappa, «Vai alla scheda», frecce, declutter | — | **Invariati**: è cambiato solo il livello di sfondo |
| Richieste a terzi per la mappa | Sì (OSMF) | **Nessuna** nell'area del prototipo |
| Offline | Vietato dalla politica OSM | Sì, per le zone già viste |

Leaflet resta la scelta giusta: protomaps-leaflet è pensato proprio per sostituire uno sfondo raster in Leaflet. Passare a MapLibre GL avrebbe richiesto di riscrivere marcatori, controlli e test, oltre a una libreria molto più pesante.

### File modificati o aggiunti
- `js/map-style.js` (nuovo):
  - colori della mappa: tema «light» di Protomaps ritoccato verso i toni di OpenStreetMap, così il filtro CSS già approvato dà lo stesso aspetto;
  - regole delle etichette: nomi delle vie da zoom 15, nomi di parchi, monumenti e piazze principali;
  - riquadro dei dati;
  - sorgente dei tasselli con decompressione nel browser.
- `js/main.js`:
  - `loadLeaflet()` carica anche protomaps-leaflet;
  - `initMap()` usa il livello vettoriale. Se manca il motore o il browser non ha `DecompressionStream`, torna ai tasselli OSM come prima.
- `js/vendor/protomaps-leaflet/`: libreria (copia invariata del pacchetto npm), `LICENSE`, `NOTICE.md` con le librerie incluse.
- `tiles/`: 95 tasselli `z/x/y.mvt.gz` + `meta.json` (fonte, data, riquadro, dimensioni).
- `sw.js`:
  - cache separata per i tasselli (`vivi-roma-tiles-<data>`), riempita mentre si guarda la mappa;
  - il motore vettoriale è salvato in anticipo con il resto del sito.
- `tools/stamp.mjs`: versione dei tasselli nel service worker. `tools/cf-dist.mjs`: include `tiles/`.
- `tools/maps/estrai-tasselli.mjs`: estrazione di un riquadro dall'archivio pubblico.
- `tests/protomaps.test.js`: 6 test nuovi.

### Perché `.mvt.gz` e non un unico `.pmtiles`
Cloudflare Pages non gestisce le richieste Range (risponde con il file intero), e GitHub Pages e Cloudflare Pages non comprimono i file `.mvt`.
I tasselli sono quindi file statici già compressi (gzip), decompressi dal browser con `DecompressionStream` (Chrome 80+, Safari 16.4+, Firefox 113+).
Se un hosting li decomprimesse già, la sorgente se ne accorge dai primi byte e li usa così come sono.
Provato con un server statico semplice (come GitHub Pages) e con l'emulatore di Cloudflare Pages, che li serve come `application/gzip`.

## 2. Dati cartografici effettivi

Archivio: `https://build.protomaps.com/20261118.pmtiles` (build del 18/11/2026). Riquadro: centro storico, ovest 12,445 · sud 41,875 · est 12,52 · nord 41,92, zoom 0–15.

| | Valore |
|---|---|
| Tasselli | **95** |
| Dimensione su disco, compressi gzip (quanto si scarica) | **6,19 MB** (6.486.535 byte) |
| Dimensione decompressa | 9,76 MB |
| Zoom 0–10 (1 tassello per livello, coprono aree vaste) | 1,11 MB |
| Zoom 11 / 12 / 13 | 419 / 442 / 428 KB (4 tasselli ciascuno) |
| Zoom 14 | 1,06 MB (16 tasselli) |
| Zoom 15 | 2,75 MB (56 tasselli; il più pesante 228 KB, centro di Roma) |
| Motore protomaps-leaflet | 128 KB (37,7 KB compresso), caricato all'inizio del quiz come Leaflet |
| Luoghi del catalogo dentro il riquadro | **66 su 77** |
| Luoghi fuori dal riquadro | 11: Appia Antica, Garbatella, Ostiense, EUR, San Paolo, Catacombe di San Callisto, Parco degli Acquedotti, Porta San Sebastiano, Centrale Montemartini, Pigneto, Caffarella |

Come richiesto, l'area completa dei 77 luoghi non è stata scaricata.

## 3. Prestazioni misurate

Condizioni:
- Chrome automatizzato, smartphone 390×844 a densità 3;
- service worker disattivato, per misurare la rete;
- itinerario «un giorno» Colosseo → Foro Romano → Fori Imperiali → Campidoglio, zoom 15;
- una misura per condizione.

| | OSM (attuale) | Protomaps (prototipo) |
|---|---|---|
| Prima vista della mappa: richieste / dati | 6 tasselli / 229 KB | **2 tasselli / 169 KB** |
| Dopo due ingrandimenti (zoom 17) | 21 tasselli / 683 KB | **6 tasselli / 542 KB** |
| Sfondo visibile dopo «Crea il mio itinerario», rete senza limiti | 0,88 s | **0,49 s** |
| Idem, rete «3G veloce» simulata | 1,91 s | **1,38 s** |

- I tasselli OSM arrivano da internet, quelli Protomaps dal server locale: il confronto dei tempi favorisce il prototipo e va ripetuto con l'hosting reale.
- Il numero di richieste e i byte invece non dipendono dal server.
- Oltre lo zoom 15 il prototipo non scarica nulla: ingrandisce i vettori già scaricati.

## 4. Zoom massimo 15

- I dati arrivano fino a 15 (`maxDataZoom: 15`); la mappa si può ingrandire fino a 19, con i vettori del 15 ridisegnati nitidi.
- Verificato a zoom 15 e 17 sul Colosseo: schermate `*-zoom15.png` e `*-zoom17.png`.
- Il riquadro limita le richieste (`bounds`): fuori dal centro non si chiedono tasselli inesistenti.

## 5. Senza connessione

Prova automatica `protooffline.mjs`, 8 controlli superati sia sul server semplice sia sull'emulatore Cloudflare:
1. Si apre la mappa online, si salva il viaggio, si passa offline e si ricarica.
2. Il viaggio si riapre: motore vettoriale dalla cache, sfondo disegnato (non vuoto) allo stesso zoom, marcatori presenti, nessun avviso.
3. Offline si ingrandisce fino a 17 con i dati del 15 già salvati.
4. Tornati online, uno zoom mai visto (13) si scarica normalmente.

**Limite:** offline si vedono solo le zone e gli zoom già guardati. Si potrebbe scaricare tutta l'area (6,2 MB) alla prima apertura della mappa: è una scelta che consuma dati mobili, quindi da decidere (vedi sotto).

## 6. Attribuzioni e licenze

| Elemento | Licenza | Obbligo | Stato nel prototipo |
|---|---|---|---|
| Dati della mappa (archivio Protomaps) | ODbL, «Produced Work» di OpenStreetMap | Attribuzione visibile «© OpenStreetMap» con link | ✓ «Protomaps © OpenStreetMap» nell'angolo della mappa, con link a openstreetmap.org/copyright |
| Stili della mappa di base (@protomaps/basemaps) | BSD-3 (codice); il disegno della mappa è CC0 | Conservare l'avviso | ✓ incluso nel file della libreria; elencato in `NOTICE.md` |
| protomaps-leaflet 5.1.0 | BSD-3, Protomaps LLC | Conservare l'avviso | ✓ `js/vendor/protomaps-leaflet/LICENSE` |
| Librerie incluse (pmtiles, vector-tile, pbf: BSD-3; point-geometry, quickselect, potpack: ISC; color2k, rbush: MIT) | Libere, anche per uso commerciale | Conservare gli avvisi | ⚠ elencate in `NOTICE.md`; prima di un rilascio vanno aggiunti i testi completi |

Da aggiornare in caso di integrazione:
- il piè di pagina (oggi dice «Mappa © contributori di OpenStreetMap»);
- `docs/legale-privacy.md` e la bozza di informativa: sparirebbero le richieste ai server OSMF per l'area coperta.

## 7. Aggiornamento delle mappe

- Le strade del centro cambiano poco. Proposta: **aggiornamento trimestrale, manuale**.
- Ogni aggiornamento aggiunge circa 6,5 MB alla cronologia del repository: con un aggiornamento al trimestre, circa 26 MB all'anno, sotto il limite consigliato di 1 GB.

Procedura (si può trasformare in un workflow GitHub Actions da avviare a mano):
```
npm i pmtiles@4                                   # fuori dal sito
curl -s https://build-metadata.protomaps.dev/builds.json   # ultima build
node tools/maps/estrai-tasselli.mjs https://build.protomaps.com/AAAAMMGG.pmtiles 12.445 41.875 12.52 41.92 15 tiles
node tools/stamp.mjs        # nuova TILES_VERSION: il service worker sostituisce la cache dei tasselli
npm test                    # controlla numero, dimensioni, formato e riquadro
```

## 8. Limitazioni note

1. **Area**: 11 luoghi su 77 sono fuori dal riquadro. Un itinerario che li comprende mostra i marcatori su sfondo vuoto in quella zona. Per l'integrazione serve l'area del catalogo (≈ 13,6 MB stimati) oppure un ritorno a OSM fuori dal riquadro.
2. **Aspetto**:
   - le strade minori sono meno contrastate che su OSM;
   - mancano icone e simboli dei luoghi (croci degli ospedali, metro);
   - alcuni nomi sono in latino o nella forma OSM («Forum Romanum», «Basilica Iulia»);
   - le etichette possono passare sotto la linea puntinata, come già accade con OSM.

   Da tarare con te sulle schermate.
3. **Tasselli pesanti al centro**: a zoom 15 alcuni superano i 200 KB.
4. **Browser vecchi** (Safari < 16.4): niente `DecompressionStream`, quindi la mappa torna a OSM. Funziona, ma senza offline.
5. **Offline** solo per le zone già viste (vedi §5).
6. **Prove** solo con Chrome automatizzato e con l'emulatore di Cloudflare: nessun iPhone o Android reale, nessun Safari.
7. **Peso del repository**: +6,6 MB di tasselli nel ramo del prototipo.
