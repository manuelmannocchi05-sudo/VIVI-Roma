# VIVI Roma — Misurazione anonima dell'uso

Ramo `startup-fase1`, modifica n. 1 della roadmap. **Stato al 25/11/2026:** collegamento Cloudflare configurato e verificato nell'anteprima (sezione 7). La misurazione resta **spenta per i visitatori reali** fino alla revisione della privacy (`events:false`, token di Web Analytics vuoto).

La misurazione ha due parti:

| Parte | Cosa misura | Dove finiscono i dati | Stato iniziale |
| --- | --- | --- | --- |
| Cloudflare Web Analytics (snippet manuale) | Visite, pagine, paesi, dispositivi, prestazioni (Core Web Vitals) | Dashboard Web Analytics di Cloudflare | Spento: token vuoto |
| Eventi anonimi del quiz | Avvio, passaggi, completamento, itinerari, salvataggi, condivisioni, clic esterni | Workers Analytics Engine, dataset `vivi_roma_events` | Spento: `events:false` |

## 1. Principi

- **Nessun dato personale.** Niente cookie, niente `localStorage` nuovo, nessun identificativo di utente, sessione o dispositivo, nessun orario inviato dal browser.
- **Elenco chiuso.** Solo gli eventi e i valori di `js/metrics-schema.js`: valori fissi del quiz, id dei luoghi, numeri piccoli. Il sito scarta tutto il resto prima dell'invio e il contatore lo ricontrolla.
- **Il contatore non legge** indirizzo IP, user agent, referrer o cookie (verificato da un test sul codice sorgente).
- **Mai fuori produzione.** Nessun invio in locale, in `http`, nelle anteprime dei rami o su altri indirizzi (`hosts` in `js/metrics-config.js`).
- **Global Privacy Control** rispettato: se il browser lo segnala non parte nulla, nemmeno Web Analytics.
- **Al massimo 60 eventi per pagina**; gli eventi `quiz_start`, `map_view`, `share_open` e `map_offline` una sola volta per pagina.
- **Nessun peso sul primo caricamento.** `js/metrics.js` si carica a pagina pronta, quando il browser è libero, oppure al primo evento. Lo snippet di Web Analytics parte nello stesso momento.
- **Errori silenziosi.** Una rete assente o un contatore che non risponde non interrompono mai l'app.

## 2. File

| File | Ruolo |
| --- | --- |
| `js/metrics-config.js` | Interruttori: `events`, `webAnalyticsToken`, `hosts`, `endpoint`, `maxEvents` |
| `js/metrics-schema.js` | Elenco chiuso degli eventi; trasformazione in punto dati di Analytics Engine; colonne per i report |
| `js/metrics.js` | `track(evento, campi)` e `startWebAnalytics()` nel browser |
| `js/main.js` | Chiamate `track()` nei punti del quiz e dell'itinerario; caricamento differito del modulo |
| `functions/api/e.js` | Contatore su Cloudflare Pages Functions: `POST /api/e` → 204 |
| `tools/analytics/report.mjs` | Report in Markdown dalla API SQL di Analytics Engine |
| `tests/metrics.test.js` | 22 test unitari su schema, modulo, contatore e report |
| `tests/contact.test.js` | 7 test su contatti e «Segnala un errore», compreso `error_report_click` |

`functions/` non viene copiata in `dist/` (`tools/cf-dist.mjs` copia solo i file del sito): Cloudflare Pages la legge dalla radice del repository quando costruisce il progetto da Git.

## 3. Eventi

| Evento | Quando | Campi |
| --- | --- | --- |
| `quiz_start` | Prima risposta del quiz | `lang` |
| `quiz_step` | Passaggio in avanti con «Avanti» | `step`: who, kids, know, time, interests, mood, pace, walking, budget (fino al restyling del quiz: practical) |
| `quiz_complete` | «Crea il mio itinerario» con risposte valide | `company`, `familiarity`, `duration`, `days` (0 se non più giorni), `interests`, `mood`, `pace`, `walking`, `budget`, `lang`. La risposta sui bambini **non** viene inviata |
| `result_view` | Itinerario mostrato | `source` (quiz, saved, link), `days`, `stops` |
| `trip_save` | Primo salvataggio dell'itinerario | — |
| `print` | Pulsante «Stampa» | — |
| `share` | Condivisione nativa riuscita, oppure apertura della finestra di copia | `method` (native, manual, copy) |
| `share_open` | Itinerario aperto da un link condiviso (il contenuto del link non viene inviato) | — |
| `ext_click` | Clic su «Indicazioni», OpenStreetMap o Wikipedia di una tappa | `kind`, `place` (id del luogo) |
| `error_report_click` | Clic su «Segnala un errore» di una tappa. Si misura il clic, **non** l'invio dell'email, che non è osservabile | `place` (id del luogo) |
| `map_view` | Mappa creata | `kind` (vector, raster) |
| `map_offline` | Avviso «sei offline» sulla mappa | — |
| `lang_switch` | Cambio di lingua | `to` |

In Analytics Engine: `index1` e `blob1` = nome dell'evento; `blob2…` = campi testuali nell'ordine dello schema; `double1` = versione dello schema (1); `double2…` = campi numerici. Gli insiemi (interessi, atmosfere) sono salvati ordinati come nel quiz e uniti da `+`, ad esempio `art+food`.

Per aggiungere o cambiare un evento: modificare `js/metrics-schema.js`. Se cambia la posizione dei campi, aumentare `SCHEMA_VERSION`, così i report possono distinguere i dati vecchi.

## 4. Prove in locale

```sh
npm test                                   # test unitari (compresi i 22 della misurazione)
node tools/analytics/report.mjs --dry-run  # mostra le query dei report, senza rete
```

- `?vivitest` registra gli eventi in `window.__viviEvents` senza inviarli (test automatici).
- `?metricstest` forza l'invio a `/api/e` anche in locale, senza Web Analytics, per provare il contatore con `wrangler pages dev dist` lanciato dalla radice del repository. Global Privacy Control vince anche qui.
- Senza il collegamento `VIVI_EVENTS` il contatore controlla gli eventi e risponde 204 senza salvare nulla.

## 5. Passaggi manuali su Cloudflare

Da fare dall'account Cloudflare del progetto.

| Passaggio | Stato al 25/11/2026 |
| --- | --- |
| 1. Web Analytics | Da fare |
| 2. Collegamento Analytics Engine | Fatto: Production `VIVI_EVENTS → vivi_roma_events`; Preview `VIVI_EVENTS → vivi_roma_events_preview` (dataset separato per le prove) |
| 3. Dominio definitivo | Da fare |
| 4. Token per i report | Da creare quando servono i report (token temporanei usati per le verifiche già eliminati o in scadenza) |
| 5. Informativa privacy | Da completare e revisionare: **condizione per accendere la misurazione** |

Nella dashboard del progetto `vivi-roma` non compare il selettore Production/Preview: il binding Preview è stato aggiunto con l'API Cloudflare (PATCH su `deployment_configs.preview`, token temporaneo «Cloudflare Pages: Edit»), con controllo prima e dopo che la configurazione Production fosse identica.

1. **Web Analytics, snippet manuale.**
    - Dashboard → Web Analytics → Add a site → `vivi-roma.pages.dev`, poi il dominio definitivo quando ci sarà.
    - Scegliere l'installazione manuale dello snippet e copiare il **token** dal codice proposto.
    - **Non** premere «Enable» in Workers & Pages → progetto → Metrics: inserirebbe un secondo snippet e conterebbe ogni visita due volte.
    - Mettere il token in `js/metrics-config.js` (`webAnalyticsToken`). Il token non è segreto: compare comunque nell'HTML.
2. **Collegamento Analytics Engine.**
    - Workers & Pages → progetto → Settings → Bindings → Add → Analytics Engine.
    - Production: variabile `VIVI_EVENTS`, dataset `vivi_roma_events`. Preview: variabile `VIVI_EVENTS`, dataset **`vivi_roma_events_preview`**, così le prove non si mescolano ai dati reali.
    - Il binding vale solo dai deployment successivi alla sua creazione.
    - Poi mettere `events:true` in `js/metrics-config.js`.
3. **Dominio definitivo.** Quando ci sarà, aggiungerlo a `hosts` in `js/metrics-config.js` e come sito in Web Analytics.
4. **Token API per i report** (solo quando servono): My Profile → API Tokens → Create Token con il permesso «Account → Account Analytics → Read». Usarlo solo come variabile d'ambiente:

   ```sh
   CF_ACCOUNT_ID=<id account> CF_API_TOKEN=<token> node tools/analytics/report.mjs --giorni 28
   ```

   Non salvarlo in file del repository.
5. **Informativa privacy.** Va aggiornata e pubblicata **prima** di accendere la misurazione (bozza in `docs/legale-privacy.md`, sezione 5).

## 6. Limiti noti

- I bloccatori di pubblicità possono bloccare lo snippet di Web Analytics; anche `sendBeacon` verso `/api/e` può essere bloccato da alcune estensioni. I numeri sono stime per difetto.
- Piano gratuito: le Pages Functions condividono 100.000 richieste al giorno con i Workers; Analytics Engine include 100.000 punti dati scritti e 10.000 query di lettura al giorno. Un quiz completo genera circa 10 eventi. Oltre il limite il contatore può non rispondere, ma il sito statico continua a funzionare.
- Senza identificativi non si possono contare gli utenti unici né seguire un percorso tra visite diverse: si misurano rapporti tra eventi (ad esempio quiz completati su quiz avviati).
- Analytics Engine può campionare i dati: i report usano `SUM(_sample_interval)`, quindi i totali sono stime corrette, non conteggi esatti.

## 7. Verifiche su Cloudflare (25/11/2026)

Esito: **superate**. Anteprima `https://62e6fe0c.vivi-roma.pages.dev` (ramo `startup-fase1`, commit `1b3174a`, primo deployment dopo il binding Preview).

| Verifica | Risultato |
| --- | --- |
| Configurazione via API (sola lettura) | Production `VIVI_EVENTS → vivi_roma_events` invariata; Preview `VIVI_EVENTS → vivi_roma_events_preview` |
| Interruttori sull'anteprima | `events:false`, token Web Analytics vuoto, `x-robots-tag: noindex` |
| Eventi di prova inviati al contatore alle 08:47:29 UTC | 3 × `map_offline` e 1 × `quiz_complete` → 204; 1 evento non valido → 400 |
| Lettura del dataset Preview (API SQL, token «Account Analytics: Read») | `map_offline` = 3, `quiz_complete` = 1 |
| Colonne di `quiz_complete` | `blob2…blob10` = solo, often, half, night, peaceful, full, high, high, en; `double1` = 1 (versione schema); `double2` = 0 (giorni): corrispondono allo schema |
| Dataset Production negli ultimi 2 giorni | 0 eventi |
| Sito ufficiale | Invariato (`restyling-premium` a `f9fc776`); nessun merge |

Prima di accendere la misurazione in produzione restano: revisione e pubblicazione dell'informativa, token di Web Analytics, `events:true` in `js/metrics-config.js`, merge autorizzato in `restyling-premium`.

