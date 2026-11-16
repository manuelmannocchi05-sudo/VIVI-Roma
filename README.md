# VIVI Roma

*Non visitare Roma. Vivila.* — itinerari personalizzati a Roma creati da un quiz di sette domande, con schede, mappa e versione stampabile.

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
icon.svg              icona
```

Il sito è statico e usa moduli JavaScript nativi: nessuna build, GitHub Pages lo pubblica così com'è.

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
