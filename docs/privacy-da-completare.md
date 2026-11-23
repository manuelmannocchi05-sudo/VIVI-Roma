# VIVI Roma — Informazioni da fornire per completare l'informativa, e punti legali aperti

Questo elenco serve a completare la bozza in `docs/legale-privacy.md`, sezione 5.
**Nessun dato del titolare è stato inventato.** Questo documento **non** attesta la conformità normativa: la versione finale va rivista da un professionista (avvocato o consulente privacy).

## A. Informazioni che devi fornirmi

### 1. Titolare del trattamento
1. Chi è il titolare: tu come persona fisica, oppure un'impresa, ad esempio STUDIO WEB se è un'attività registrata.
2. Nome e cognome, oppure ragione sociale e forma giuridica.
3. Indirizzo (sede legale o domicilio), da pubblicare nell'informativa.
4. Partita IVA o codice fiscale, se è un'impresa e se vuoi indicarli.
5. Contatto per le richieste privacy: email dedicata o PEC. Indica tu quale indirizzo pubblicare; non userò un'email senza tua indicazione esplicita.
6. Responsabile della protezione dei dati (DPO), se nominato. Per un sito di queste dimensioni di solito non è obbligatorio, ma va confermato.

### 2. Il servizio
7. Nome pubblico e indirizzo definitivo del sito: dominio tuo oppure indirizzo dell'hosting.
8. Hosting scelto per la beta: GitHub Pages oppure Cloudflare Pages (vedi `docs/hosting-confronto.md`). Cambiano il fornitore citato e le condizioni sui trasferimenti di dati.
9. ~~Mappa~~ — deciso: Protomaps ospitata con il sito, senza richieste a terzi. Resta da decidere se mantenere la riserva OSM per i browser più vecchi (Safari < 16.4): se sì, va citata nell'informativa.
10. Se il servizio sarà **gratuito**, con **ricavi** (sponsor, pubblicità, app a pagamento) o di **promozione** della tua attività. Incide su informativa, hosting e immagini dei beni culturali.
11. A chi è rivolto: tutti, oppure anche minori di 14 anni come utenti diretti.
12. Da quale data l'informativa entra in vigore, e dove vuoi il link: piè di pagina, menu, pagina dedicata.

### 3. Piani futuri che cambierebbero l'informativa
13. Analisi del traffico. **Deciso il 23/11/2026:** Cloudflare Web Analytics con snippet manuale + eventi anonimi del quiz su Workers Analytics Engine (`docs/misurazione.md`). Il codice è pronto ma spento. Da indicare: data di accensione e conferma del professionista sul fatto che non serve un banner.
14. Modulo di contatto o di segnalazione errori: oggi non c'è.
15. App su App Store o Google Play: richiedono schede privacy proprie e, per Apple, un'informativa raggiungibile da un URL.
16. Newsletter, account, sincronizzazione: oggi esclusi, ma vanno indicati se previsti.

## B. Cosa il sito fa oggi (verificato nel codice, aggiornato il 20/11/2026)

- Nessun cookie, nessuna analisi del traffico attiva, nessuna pubblicità, nessun account.
- Misurazione anonima pronta ma spenta (ramo `startup-fase1`): si accende solo dopo la configurazione su Cloudflare e l'aggiornamento dell'informativa.
- `localStorage` del browser:
  - `vivi-roma:viaggi:v1`: viaggi salvati, solo su azione dell'utente;
  - `vivi-roma:lingua`: lingua scelta, solo quando l'utente la cambia.
- Service worker e Cache Storage: copia dei file del sito, delle foto viste e delle zone della mappa già guardate, per l'uso senza rete. Nessun dato personale.
- Richieste a terzi:
  - hosting, a ogni visita;
  - mappa: nessuna (tasselli ospitati con il sito); ai server OSM solo come riserva, nei browser che non supportano la mappa vettoriale;
  - link esterni (Google Maps, Wikipedia, OpenStreetMap, Wikimedia Commons, siti ufficiali), solo se l'utente li apre.
- Font, foto e librerie sono ospitati sul sito.

## C. Punti legali ancora da verificare con un professionista

| # | Tema | Perché | Priorità |
|---|---|---|---|
| 1 | Informativa privacy completa | Basi giuridiche, tempi di conservazione dei log dell'hosting, diritti, reclamo al Garante | Prima della beta pubblica |
| 2 | Ruolo dell'hosting (e della OSMF, solo se resta la riserva) | Titolari autonomi o responsabili del trattamento; trasferimenti verso USA e Regno Unito | Prima della beta pubblica |
| 3b | Misurazione anonima (Cloudflare Web Analytics + contatore eventi) | Confermare che rientri tra gli strumenti di analisi assimilabili a quelli tecnici, quindi senza consenso; ruolo di Cloudflare e trasferimenti | Prima di accendere la misurazione |
| 3 | `localStorage` e service worker come strumenti tecnici | Confermare che basti l'informativa senza banner (linee guida del Garante del 10/06/2021 sui cookie e altri strumenti di tracciamento) | Prima della beta pubblica |
| 4 | Foto CC BY-SA ridimensionate o ritagliate | Adeguatezza dell'attribuzione e dell'indicazione della licenza per le opere adattate | Prima della beta pubblica |
| 5 | Immagini di beni culturali (artt. 107–108 del Codice dei beni culturali, D.M. 161/2023 e D.M. 108/2024) | Probabilmente libere senza scopo di lucro; con ricavi possono servire autorizzazioni e canoni | Prima di qualsiasi uso commerciale |
| 6 | Persone riconoscibili nelle foto | Diritto all'immagine per usi promozionali | Prima di usi promozionali |
| 7 | Responsabilità su prezzi, orari e indicazioni | Il sito invita già a verificare le fonti ufficiali: valutare un testo di esclusione di responsabilità | Prima della beta pubblica |
| 8 | Hosting in uso commerciale; attribuzione ODbL della mappa | GitHub Pages non è pensato per usi commerciali; la mappa ora è ospitata con il sito (dati ODbL, da confermare l'attribuzione per un uso commerciale) | Prima di qualsiasi uso commerciale |
| 9 | Marchio «VIVI Roma» | Verificare che il nome non sia già registrato o usato da altri nel turismo | Prima del lancio pubblico |
| 10 | Pubblicazione in app store | Termini Apple e Google, schede privacy, eventuale età minima | Prima dell'app |

## D. Cosa farò quando avrò le informazioni

Completerò la bozza dell'informativa con i dati che mi dai e la preparerò come pagina del sito, senza pubblicarla. Il testo resterà marcato «da revisionare» finché non confermi la revisione professionale.
