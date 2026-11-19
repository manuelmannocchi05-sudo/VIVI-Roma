# VIVI Roma — Confronto dei fornitori di mappe (Blocco D)

Documento di valutazione: **non è stato attivato nessun servizio, non è stata richiesta nessuna chiave API**.
Prezzi e limiti verificati sulle pagine ufficiali o su fonti che le citano il 19 novembre 2026; cambiano spesso, vanno ricontrollati prima di decidere.

## Situazione attuale

- Libreria: **Leaflet 1.9.4** (licenza BSD-2), copiata nel progetto e caricata solo quando serve la mappa.
- Sfondo: tasselli raster pubblici di **tile.openstreetmap.org**, con filtro CSS per i colori.
- Attribuzione «© OpenStreetMap» visibile in basso a destra; il sito non imposta una Referrer-Policy restrittiva, quindi il browser invia il Referer richiesto.
- Nessuna chiave, nessun costo, nessun account.

### Perché non è una soluzione definitiva

La politica d'uso dei tasselli OSM (operations.osmfoundation.org/policies/tiles) dice in sostanza:

| Punto | Cosa chiede | VIVI Roma oggi |
|---|---|---|
| Attribuzione | Visibile sulla mappa, non nascosta | ✓ presente |
| Referer (web) | Deve essere inviato, niente Referrer-Policy restrittive | ✓ comportamento predefinito del browser |
| Cache | Rispettare le intestazioni di cache, niente no-cache | ✓ lo fa il browser |
| Offline / prefetch | **Vietati** su tile.openstreetmap.org | ✓ non li usiamo — ma esclude la mappa offline in una futura app |
| Uso intenso | Può essere bloccato senza preavviso, nessuna garanzia di servizio | ⚠ rischio se il traffico cresce |
| Uso commerciale | Nessuna regola separata, ma l'accesso «può essere ritirato in qualsiasi momento»; per i servizi commerciali rimanda ai fornitori alternativi | ⚠ non adatto a un prodotto commerciale |
| App native | User-Agent distinto e stabile obbligatorio | da prevedere nell'app (senza email personali nell'User-Agent: usare un URL del progetto) |

Va bene per la **beta pubblica a traffico contenuto**; non va presentato come soluzione commerciale definitiva.

## Opzioni a confronto

| | OSM pubblico (attuale) | Protomaps / PMTiles autoospitato | Stadia Maps | MapTiler Cloud | Mapbox |
|---|---|---|---|---|---|
| **Costo** | 0 € | 0 € di licenza; costo = hosting del file | Gratuito solo non commerciale; Starter 20 $/mese | Gratuito solo non commerciale; Flex 30 $/mese | 50.000 caricamenti web/mese gratis, poi ~5 $ ogni 1.000 |
| **Limiti gratuiti** | Nessun numero, ma uso «ragionevole» | Nessuno (dipende dall'hosting) | 200.000 crediti/mese, si ferma senza addebiti | 5.000 sessioni e 100.000 richieste/mese, poi si ferma | 50.000 caricamenti/mese; app mobili: 25.000 utenti attivi/mese |
| **Uso commerciale nel piano gratuito** | Tollerato, revocabile | Sì (dati ODbL) | No | No | Sì, entro la soglia |
| **Account / chiave API** | No | No | Sì | Sì | Sì (token; serve carta di credito secondo alcune fonti) |
| **Licenza dati e attribuzione** | ODbL, «© OpenStreetMap» | ODbL, «Protomaps © OpenStreetMap» | OSM + attribuzione Stadia | OSM + logo MapTiler nel piano gratuito | Attribuzione e logo Mapbox |
| **Compatibile con Leaflet** | Sì (attuale) | Sì, con il plugin protomaps-leaflet | Sì (raster) o MapLibre (vettoriale) | Sì (raster) o MapLibre | Meglio con Mapbox GL JS (licenza proprietaria) |
| **GitHub Pages** | Sì | Sì: GitHub Pages supporta le richieste a intervalli (Range) necessarie | Sì | Sì | Sì |
| **Offline nell'app** | **Vietato** | Sì: il file può essere incluso nell'app | Secondo piano/contratto | Secondo piano | Con SDK mobile, secondo condizioni |
| **Privacy** | Richieste ai server OSMF (IP, Referer) | Nessuna richiesta a terzi se il file è sullo stesso dominio | Dichiara niente cookie e log per 30 giorni | Server in Svizzera/SEE secondo fonti terze | Server USA, telemetria del SDK da valutare |

### Prestazioni (stima, non misurata)

- **Raster OSM**: 8–20 immagini PNG da ~15–40 KB per vista. Semplice, nessun motore aggiuntivo.
- **Vettoriale (Protomaps, MapLibre)**: tasselli più piccoli e mappa nitida su schermi densi, ma serve un motore di disegno in più (protomaps-leaflet o MapLibre GL, quest'ultimo ~200 KB compressi) e i font per le etichette.
- **Ritaglio di Roma in PMTiles**: un'area urbana fino al livello di zoom 15 pesa in genere qualche decina di MB. Va misurato con `pmtiles extract --dry-run` prima di decidere: GitHub Pages ha un limite di 1 GB per sito e un limite «morbido» di 100 GB di traffico al mese.

## Raccomandazione

1. **Beta pubblica**: restare su Leaflet + OSM pubblico, come oggi. Costo zero, regole rispettate, traffico atteso basso.
2. **Prima di un lancio con traffico reale o dell'app**: passare a **Protomaps/PMTiles con un ritaglio di Roma**, ospitato insieme al sito (o su un hosting statico che supporti i Range). Nessun account, nessun costo variabile, offline possibile nell'app, dati sotto ODbL con attribuzione.
3. **Alternativa gestita**: se non si vuole gestire il file, **Stadia Maps Starter (20 $/mese)** è l'opzione commerciale più economica tra quelle viste. Richiede la tua autorizzazione e una registrazione.
4. Mapbox ha la soglia gratuita più alta, ma lega il progetto alla sua libreria e alla sua licenza: sconsigliato per un progetto piccolo che vuole restare portabile.

Nessuna di queste migrazioni è stata avviata.

## Fonti

- [Politica d'uso dei tasselli OSM](https://operations.osmfoundation.org/policies/tiles/)
- [Stadia Maps — prezzi](https://stadiamaps.com/pricing/) e [limiti](https://docs.stadiamaps.com/limits)
- [MapTiler — prezzi](https://www.maptiler.com/cloud/pricing/) e [condizioni](https://www.maptiler.com/terms/cloud/)
- [Mapbox — prezzi](https://www.mapbox.com/pricing/)
- [Protomaps — download e licenze](https://docs.protomaps.com/basemaps/downloads), [Leaflet](https://docs.protomaps.com/basemaps/leaflet)
- [GitHub Pages — limiti](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
