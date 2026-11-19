# VIVI Roma — Preparazione per Cloudflare Pages

**Stato: pronto, non pubblicato.** Nessun account creato, nessun servizio collegato.
Le verifiche sono state fatte in locale con l'emulatore ufficiale `wrangler pages dev` (wrangler 4.165.0), che riproduce il comportamento di Pages: reindirizzamenti, `_headers`, pagina 404. Il comportamento in produzione va riconfermato dopo il primo deploy.

## 1. Cosa è stato verificato e corretto

| Punto | Comportamento di Pages | Intervento |
|---|---|---|
| Percorsi | Il sito usa solo percorsi relativi: funziona sia nella radice (Pages) sia in `/VIVI-Roma/` (GitHub Pages) | Nessuno |
| `/index.html` e `/crediti.html` | Pages li **reindirizza** (308) a `/` e `/crediti` | Il service worker riconosce entrambe le forme. Salva copie «pulite» delle pagine reindirizzate, perché una risposta reindirizzata non può servire una navigazione offline. `./index.html` non è più nell'elenco da salvare |
| File inesistenti | Senza `404.html` Pages risponde **200 con la home** a qualsiasi indirizzo, comportamento da app a pagina singola. Una foto o un tassello mancante riceverebbe una pagina HTML | Aggiunta `404.html`, autonoma e nello stile del sito. Il service worker salva una foto solo se la risposta è davvero un'immagine |
| Cache HTTP | Predefinita `public, max-age=0, must-revalidate` con ETag: ogni file viene ricontrollato (risposta 304 se invariato) | Mantenuta di proposito. Le visite successive non scaricano nulla perché i file li serve il service worker. Nessuna cache «immutable»: un browser senza import map caricherebbe file senza impronta che resterebbero vecchi |
| `sw.js` | Deve essere sempre ricontrollato | `_headers`: `Cache-Control: no-cache` |
| Manifest | Servito come `application/manifest+json`, `start_url` e `scope` relativi (`./`) | Nessuno |
| Sicurezza di base | — | `_headers`: `X-Content-Type-Options: nosniff`. `Referrer-Policy: strict-origin-when-cross-origin` è il valore predefinito dei browser e invia comunque il Referer richiesto dalla politica OSM |
| File da pubblicare | Pages pubblica la cartella indicata | `tools/cf-dist.mjs` copia in `dist/` solo il sito (277 file, 19,3 MB), senza `docs/`, `tests/`, `tools/` e `.github/`. Controlla i limiti di Pages (20.000 file, 25 MiB per file) e che ogni file del service worker esista |

## 2. Cache e aggiornamenti: come funziona

1. **Pagine**: prima la rete, con un limite di 4 secondi. Se la rete manca o è troppo lenta si usa la copia salvata, e intanto la copia viene aggiornata.
2. **CSS e JavaScript** hanno un'impronta (`?v=`) che cambia a ogni modifica: dalla copia salvata, senza rischio di versioni mescolate.
3. **Nuovo deploy**:
   - il browser trova un `sw.js` diverso, scarica la nuova versione completa e la attiva;
   - cancella la copia vecchia;
   - non ricarica la pagina aperta;
   - controlla di nuovo quando un'app installata torna in primo piano (al massimo una volta l'ora).
4. **Deploy difettoso** (un file dell'elenco manca o dà errore): la nuova versione non si installa, la precedente resta in uso, nessuna copia a metà.
5. **Viaggi e lingua** stanno in `localStorage`: aggiornamenti, svuotamento delle cache o rimozione del service worker non li toccano.

### Interruttore di emergenza (se un service worker difettoso arrivasse in produzione)

Sostituire `sw.js` con questo contenuto e pubblicare:

```js
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k.startsWith("vivi-roma-"))await caches.delete(k);
  await self.registration.unregister();
  for(const c of await self.clients.matchAll({type:"window"}))c.navigate(c.url);
})()));
```

Rimuove il service worker e le sue copie, ma **non** i viaggi salvati, e ricarica le pagine aperte.

## 3. Istruzioni per la futura pubblicazione (da fare solo dopo la tua approvazione)

1. Crea un account su dash.cloudflare.com. **Lo crei tu**: richiede la tua email e l'accettazione dei termini.
2. Workers & Pages → Create → Pages → **Connect to Git** → autorizza GitHub solo sul repository `VIVI-Roma`.
3. Impostazioni del progetto:
   - Production branch: il ramo che deciderai di pubblicare (ad esempio `restyling-premium`, oppure `main` dopo il merge);
   - Framework preset: *None*;
   - Build command: `node tools/cf-dist.mjs`;
   - Build output directory: `dist`;
   - Variabile d'ambiente `NODE_VERSION` = `20` o superiore.
4. Salva e attendi il primo deploy: indirizzo `https://<nome-progetto>.pages.dev`.
5. Verifica dopo il deploy:
   - `https://<nome>.pages.dev/sw.js` risponde con `Cache-Control: no-cache`;
   - un indirizzo inesistente mostra la pagina «Pagina non trovata» con codice 404;
   - `/crediti.html` porta a `/crediti`;
   - la checklist `docs/beta-checklist.md`, sezioni 5 e 6 (installazione e uso offline).
6. Dominio personalizzato (facoltativo): Custom domains → aggiungi il dominio e segui le istruzioni DNS.
7. Aggiorna l'informativa privacy: il fornitore dell'hosting diventa Cloudflare.
8. Se GitHub Pages resta attivo in parallelo, i due siti hanno origini diverse: i viaggi salvati su uno **non** compaiono sull'altro. Conviene comunicare un solo indirizzo.

### Come riprovare in locale

```
node tools/stamp.mjs && node tools/cf-dist.mjs
npx wrangler pages dev dist      # emulatore locale, non richiede account
```
