# VIVI Roma

*Non visitare Roma. Vivila.* — itinerari personalizzati a Roma creati da un quiz di sei domande (sette per chi viaggia in famiglia), con schede, mappa e versione stampabile.

## Struttura

```
index.html            markup della pagina
css/style.css         stili (token, layout, responsive, stampa)
js/main.js            interfaccia: quiz, risultati, foto, mappa, navigazione
js/quiz-data.js       domande del quiz ed etichette
js/planner.js         motore degli itinerari (puro, senza DOM)
js/data/places.js     catalogo dei luoghi
tests/                test automatici e report di qualità
manifest.webmanifest  manifest PWA
sw.js                 service worker (sito apribile senza rete)
js/pwa.js             registrazione del service worker
img/icons/            icone PNG per Android e iPhone
icon.svg              icona
tools/stamp.mjs       impronte ?v= dei file e elenco del service worker
```

Il sito è statico e usa moduli JavaScript nativi: nessuna build, GitHub Pages lo pubblica così com'è.

**Dopo ogni modifica a CSS, JavaScript, pagine, font o icone** esegui `node tools/stamp.mjs`: aggiorna le impronte dei file e l'elenco/versione di `sw.js`. Un test (`tests/pwa.test.js`) fallisce se te ne dimentichi. Il service worker si attiva solo su HTTPS o `localhost`.

## Provarlo in locale

I moduli JavaScript non funzionano aprendo `index.html` con doppio clic: serve un piccolo server locale.

```
npm start            # oppure: python3 -m http.server 8080
```

Poi apri http://localhost:8080.

## Test

Serve Node.js 20 o superiore.

```
npm test             # controlli su catalogo e itinerari (devono passare sempre)
npm run report       # misure di qualità degli itinerari, da confrontare dopo ogni modifica al motore
```

Aggiungendo un luogo in `js/data/places.js`, `npm test` verifica campi obbligatori, categorie, costo e coordinate.

## Catalogo dei luoghi

`js/data/places.js` contiene 77 luoghi. Regole per aggiungerne o modificarne uno:

- **Coordinate** da OpenStreetMap, controllate sul posto indicato dal nome.
- **Prezzi, orari, chiusure, prenotazione**: solo da una fonte verificabile, preferibilmente ufficiale. Se il dato è verificato, inserisci `source` (URL) e `checked` (data `AAAA-MM-GG`); la scheda mostrerà "Informazioni verificate il …".
- **Mai inventare**: se un prezzo o un orario non è verificabile, scrivilo nel testo ("prezzo non verificato") o usa `hoursNote`.
- `when` è la fascia oraria ideale mostrata nella scheda; `slot` serve solo a ordinare le tappe (`am` = aperto solo al mattino, `morning`, `late` = tramonto, `evening` = sera).
- `ticket` raggruppa i luoghi coperti dallo stesso biglietto (es. Colosseo e Foro Romano); `cheap` indica un biglietto sotto i 10 €; `must` i grandi classici per chi visita Roma la prima volta.
- I dati variabili vanno ricontrollati periodicamente: la data di verifica è nella scheda.

## Regole del motore degli itinerari

Vincoli rigidi, controllati da `npm test`:

- **Tempo di visita**: la somma dei tempi medi (`time`) di una giornata non supera il tempo del ritmo scelto. Un grande museo può occupare da solo una giornata se la sua durata minima ci sta.
- **Visite da mezza giornata** (3 ore o più, es. Musei Vaticani): accanto solo tappe leggere, nessun'altra visita impegnativa (90 minuti o più, oppure museo a pagamento da almeno un'ora).
- **Camminata**: il percorso di ogni giornata resta entro i km giornalieri del livello di camminata scelto; le tratte oltre la tratta comoda sono segnalate (mezzi pubblici).
- **Budget = tetto, mai obiettivo**: contenuto circa un ingresso a pagamento ogni due giorni (almeno uno), equilibrato circa uno al giorno (almeno uno e mezzo), "concedermi qualcosa" senza limite. Nessun budget obbliga a spendere: un itinerario gratuito va bene anche con budget alto.
- **Numero di tappe**: due per giornata è l'obiettivo, non un obbligo. Se nulla entra nel tempo, nel budget o nella zona, la giornata resta di una tappa.

## Fotografie

Le foto sono file locali WebP in `img/` (tappe 480/800/1280 px, categorie 420/840 px, copertina 960–2400 px più una versione verticale per smartphone). Il sito non chiama Wikipedia né Wikimedia Commons.

- **Scelta**: `tools/photos/selection.json` associa a ogni luogo, categoria e copertina un file di Wikimedia Commons (`focus` sposta il ritaglio).
- **Generazione**: `python3 tools/photos/build.py` legge da Commons autore e licenza, scarta i file senza licenza per uso commerciale (ammesse: pubblico dominio, CC0, CC BY, CC BY-SA), crea i WebP e scrive `js/data/photos.js` e `tools/photos/report.json`. Sul branch di sviluppo lo stesso script gira in automatico (`.github/workflows/photos.yml`) quando cambia la selezione.
- **Attribuzione**: autore e licenza compaiono su ogni foto delle tappe e sulla copertina; l'elenco completo è in `crediti.html`.
- **Senza foto**: i luoghi in `tools/photos/missing.json` mostrano il segnaposto (gradiente e icona della categoria).
- **Controllo**: `npm test` verifica file, pesi, licenze e attribuzioni; aprendo il sito con `?photocheck` si vede l'elenco di tutte le foto con dimensioni e crediti.

## Uso su smartphone, mappa, viaggi salvati e condivisione

- **Mappa** (`js/vendor/leaflet/`, Leaflet 1.9.4 incluso nel sito, licenza BSD-2): su touch un dito scorre la pagina e due dita spostano e ingrandiscono la mappa; il pulsante «Sposta la mappa» attiva anche il trascinamento con un dito. Toccando un numero si evidenziano il marker e la scheda, con il pulsante «Vai alla scheda». La linea tratteggiata è solo l'ordine di visita in linea d'aria. Le tessere della mappa arrivano da OpenStreetMap.
- **I miei viaggi** (`js/trips.js`): gli itinerari si salvano nel `localStorage` del browser (chiave `vivi-roma:viaggi:v1`, massimo 30), senza account né server e senza sincronizzazione tra dispositivi. Si salvano risposte e tappe; schede, prezzi e orari si ricostruiscono dal catalogo attuale (`restoreItinerary` in `js/planner.js`). Dati non validi vengono scartati; un archivio illeggibile viene conservato a parte, non cancellato.
- **Condivisione**: «Condividi» usa la condivisione nativa del dispositivo quando c'è, altrimenti mostra il riepilogo da copiare. Il link contiene l'itinerario dopo `#itinerario=` (nessun dato inviato a un server) e lo riapre senza rifare il quiz.
- **Test**: `npm test` copre anche salvataggio, eliminazione, errori di memoria e link condivisi (`tests/trips.test.js`).

## Lingue (italiano e inglese)

- **Cambio lingua**: pulsante `EN` / `IT` nell'intestazione, sempre visibile (anche su smartphone e nella pagina dei crediti). La scelta resta salvata nel browser (`vivi-roma:lingua`). Alla prima visita la lingua segue le preferenze del dispositivo; se non è né italiano né inglese, si parte in italiano.
- **Struttura** (`js/i18n.js`): testi dell'interfaccia in `js/i18n/it.js` e `js/i18n/en.js` (stesse chiavi); domande del quiz in italiano in `js/quiz-data.js`, in inglese nelle chiavi `q.*`; catalogo dei luoghi in italiano in `js/data/places.js`, traduzioni inglesi in `js/data/places-en.js` (testo italiano → testo inglese, più una breve spiegazione accanto ai nomi italiani). Nell'HTML, `data-i18n` e `data-i18n-attr` indicano i testi da tradurre.
- **Cosa non cambia**: il motore non conosce la lingua (le note sono codici tradotti dall'interfaccia). Tappe, budget, distanze, viaggi salvati e link condivisi sono identici; un link si apre nella lingua di chi lo riceve.
- **Aggiornare un testo**: se cambi un testo italiano del catalogo, aggiungi la nuova traduzione in `places-en.js`; `npm test` segnala ogni testo senza traduzione, ogni chiave mancante e ogni prezzo o anno diverso tra le due lingue.
