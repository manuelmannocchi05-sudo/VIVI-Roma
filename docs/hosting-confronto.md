# VIVI Roma — Confronto degli hosting gratuiti

**Stato: valutazione.** Nessuna migrazione effettuata, nessun account creato.
Dati raccolti il 19/11/2026 da documentazione ufficiale e da guide di confronto recenti. I piani gratuiti cambiano spesso: vanno ricontrollati al momento della scelta.

## Requisiti di VIVI Roma

- Sito statico: HTML, CSS, JS e immagini, nessuna compilazione obbligatoria. Il deploy pubblica il repository così com'è.
- Circa 31 MB in tutto, 587 file pubblicati (di cui 304 tasselli della mappa, 11,3 MB). Il file più grande pesa 0,4 MB. *(Aggiornato il 20/11/2026 dopo l'integrazione della mappa Protomaps.)*
- Service worker: `sw.js` deve essere servito dalla radice del sito con una cache HTTP breve.
- Possibile uso commerciale futuro (app, sponsor, versione a pagamento).
- Mappa Protomaps (integrata): cartella di tasselli statici `.mvt.gz`, nessuna richiesta Range necessaria (vedi `docs/mappa-protomaps.md`).

## Confronto

| | GitHub Pages (attuale) | **Cloudflare Pages** | Netlify | Vercel |
|---|---|---|---|---|
| Uso commerciale nel piano gratuito | **No** per siti principalmente commerciali | Sì | Sì | **No**: Hobby solo personale e non commerciale |
| Traffico | 100 GB/mese (limite «morbido») | **Illimitato** | A crediti: 300 al mese; 1 GB = 20 crediti, ogni deploy 15 crediti | 100 GB/mese |
| Cosa succede oltre il limite | Possibile richiamo di GitHub | — | **Il sito viene sospeso** fino al mese dopo, oppure si passa a Personal (9 $/mese, 1.000 crediti) | Attesa o passaggio a Pro |
| Limiti dei file | Sito ≤ 1 GB | 20.000 file per sito, 25 MiB per file, 500 deploy al mese | Inclusi nei crediti | — |
| Intestazioni HTTP personalizzate (cache di `sw.js`) | No | Sì (`_headers`) | Sì (`_headers` / `netlify.toml`) | Sì |
| Richieste Range (file `.pmtiles` unico) | Sì | **No**: oggi risponde con il file intero | Non verificato | Non verificato |
| Dominio personalizzato e HTTPS | Sì | Sì | Sì | Sì |
| Carta di credito | No | No | No | No |

## Raccomandazione

**Cloudflare Pages**, collegato al repository GitHub:
1. Consente l'uso commerciale nel piano gratuito e non ha limiti di traffico: niente sospensioni se la beta va bene.
2. Supporta le intestazioni personalizzate per controllare la cache di `sw.js` e delle pagine.
3. È compatibile con la mappa integrata: 304 tasselli statici, 587 file in tutto, ben sotto i 20.000; verificato con l'emulatore locale di Pages.

Limiti da conoscere:
- se un giorno servisse un file `.pmtiles` unico, va messo su Cloudflare R2 (gratuito fino a 10 GB, traffico gratuito), perché Pages non gestisce le richieste Range;
- un solo deploy alla volta, 500 al mese: più che sufficienti per questo progetto.

**Netlify** è una buona seconda scelta. Consente l'uso commerciale, ma con i crediti il sito si ferma quando finiscono:
- ogni visita completa pesa circa 0,5–1 MB;
- i 300 crediti mensili corrispondono a circa 15 GB di traffico, cioè 15–30 mila visite al mese.

**Vercel** è sconsigliato per un progetto che potrebbe diventare commerciale.

**GitHub Pages** va bene per la beta gratuita. Va lasciato prima di qualsiasi uso commerciale.

## Cosa servirebbe per migrare (non fatto)

1. Un account Cloudflare, che **devi creare tu**: richiede la tua email e l'accettazione dei termini.
2. Collegare il repository e il ramo da pubblicare, con comando di build vuoto e cartella di output la radice.
3. Aggiungere un file `_headers`:
   - `sw.js` e `*.html` con `Cache-Control: no-cache`;
   - `css/`, `js/` e `fonts/` con cache lunga, perché hanno l'impronta `?v=`.
4. Dominio: quello gratuito `*.pages.dev` oppure un dominio tuo.
5. Aggiornare i link e i riferimenti all'hosting nell'informativa privacy.

## Fonti

- GitHub Pages, limiti e uso commerciale: docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Cloudflare Pages, limiti: developers.cloudflare.com/pages/platform/limits
- Cloudflare Pages e richieste Range: developers.cloudflare.com/pages/configuration/serving-pages/
- Cloudflare R2, prezzi: developers.cloudflare.com/r2/pricing
- Vercel Hobby: vercel.com/docs/plans/hobby e vercel.com/terms
- Netlify, crediti e piani: hostfleet.pages.dev/cf-pages-vs-vercel-vs-netlify-2026, makerkit.dev/pricing-calculator/netlify, hackceleration.com/labs/netlify-pricing (fonti non ufficiali: verificare su netlify.com/pricing)
