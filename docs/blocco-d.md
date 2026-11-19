# VIVI Roma — Blocco D: rifinitura, prestazioni, preparazione alla beta

Ramo `restyling-premium`, partenza dal commit `4caaa07`. `main` non è stato toccato.

## 1. Revisione del percorso completo

Percorso provato in Chrome automatizzato (Playwright):
- smartphone 390 px in italiano e in inglese;
- desktop 1280 px.

Percorso: Home → categoria → quiz (6 e 7 passi) → risultati → mappa → salvataggio → condivisione → I miei viaggi → riapertura.
Le schermate sono in `/home/claude/shots/journey`: 72 immagini, fuori dal repository.

| Problema trovato | Correzione |
|---|---|
| L'avviso della categoria citava «passo 3» (ora gli interessi sono al passo 4 o 5) e sbagliava l'accordo («Sapori romani aggiunta») | «Interesse aggiunto: «Cibo e tradizioni». È già selezionato nel quiz.» Usa il nome mostrato nel quiz, non quello della categoria |
| Su smartphone l'avviso copriva i pulsanti del quiz | Su smartphone l'avviso compare in alto, sotto l'intestazione |
| Cifre in stile antico: «1» di «Un giorno» simile a una «I», giorni 2–7 disallineati | Cifre allineate nelle icone e nei giorni |
| Copertina dei risultati su smartphone: banda verde vuota sopra la foto | La foto parte dal bordo, con una velatura in alto per l'intestazione |
| Numero della tappa sulle foto poco leggibile | Badge rotondo verde con numero oro |
| «Salvato nei miei viaggi ✓» andava a capo | «✓ Salvato» / «✓ Saved» |
| «Copia il testo» andava a capo nel dialogo | Pulsanti senza ritorno a capo |
| «I miei viaggi»: occhiello su tre righe accanto al contatore | Intestazione impilata su smartphone |
| Interesse famiglia «Esperienze per tutti» poco chiaro | «Adatto ai bambini» / «Child-friendly» |
| `og:description` diceva «sette domande» | «sei domande» |

## 2. Prestazioni

Condizioni identiche prima e dopo:
- smartphone 390×844, densità 3, Chrome;
- prima visita senza cache;
- server con compressione gzip, come GitHub Pages;
- una misura per condizione, con variazioni tra esecuzioni dell'ordine del ±5–10 %.

### Interventi

1. **Font**: 8 file statici (189 KB) sostituiti da 3 file variabili, limitati ai pesi 400–600 (110 KB). Stesso disegno, stessa licenza OFL.
2. **Precaricamento**: solo i due font del primo schermo (prima erano tre file statici).
3. **Copertina su smartphone**: densità massima 1,8× e priorità alta. Scarica la versione da 720 px (82 KB) invece di 1080 px (163 KB); a confronto visivo la differenza non si nota sotto la velatura.

### Risultati (gzip)

| Rete | Indicatore | Prima | Dopo |
|---|---|---|---|
| 3G lenta | Primo contenuto (FCP) | 5,7 s | 5,4 s |
| | Contenuto principale (LCP) | 6,4 s | 6,5 s |
| | DOM pronto | 11,0 s | 8,8 s |
| | Caricamento completo | 17,1 s | 13,1 s |
| 3G veloce | FCP / LCP | 1,6 / 2,4 s | 1,6 / 2,5 s |
| | Caricamento completo | 5,0 s | 4,0 s |
| Rete normale | Caricamento completo | 0,68 s | 0,68 s |
| | **Peso del primo caricamento** | **389 KB, 17 richieste** | **277 KB, 14 richieste (−29 %)** |

**Senza compressione** (solo per confronto):
- peso: 586 → 474 KB;
- caricamento completo su 3G lenta: 19,3 → 17,1 s;
- FCP su 3G lenta: 8,8 → 9,5 s, un peggioramento dentro la variabilità che non si vede con gzip.

**Non intervenuto:**
- JavaScript e CSS non sono stati minificati, perché servirebbe un passaggio di compilazione che il progetto oggi non ha;
- `places.js` (16 KB compresso) e `photos.js` (6 KB) servono già alla home.

## 3. Foto mancanti

Revisione visiva su Wikimedia Commons, con fogli di anteprima generati dal workflow GitHub Actions perché da qui Commons rifiuta le richieste:

- **Pigneto**: 21 candidati visti. Esclusi: voragini stradali, cantieri, lapidi, persone riconoscibili, murales (diritti degli artisti). Nessuno mostra l'isola pedonale descritta nella scheda. Un candidato possibile, **non applicato**: `AQUILA2100912A.jpg`, via L'Aquila, in bianco e nero, CC BY-SA 4.0.
- **San Lorenzo**: nessun risultato pertinente (l'unico è uno stemma araldico).
- **Mercato Trionfale**: nessun risultato.

Le tre schede restano con il segnaposto; i motivi sono in `tools/photos/missing.json`.

## 4. Testi IT/EN

Revisione fatta da Claude (non madrelingua; **non è una revisione madrelingua**):
- dizionari dell'interfaccia (IT ed EN, letti per intero);
- testi del quiz;
- un campione del catalogo inglese.

Correzioni:
- etichette del cammino coerenti: «Camminate brevi/medie/lunghe», «Short/Moderate/Long walks»;
- budget alto in inglese: «Flexible / Happy to splurge»;
- «free to visit» invece di «free to enter»;
- note sulle tappe di completamento riscritte;
- «le risposte non si perdono» invece di «restano salvate», per non confonderlo con il salvataggio dei viaggi;
- rimosse 9 stringhe non più usate.

## 5–7. Documenti

- `docs/mappe-confronto.md`: OSM pubblico, Protomaps/PMTiles, Stadia, MapTiler, Mapbox.
- `docs/legale-privacy.md`: licenze, dati trasmessi, bozza di informativa, beni culturali, verificato e da verificare.
- `docs/beta-checklist.md`: prove su dispositivi reali e blocchi al lancio.

## 8. Test

| Suite | Esito |
|---|---|
| `npm test` (unitari, +3 nuovi in `tests/perf.test.js`) | 47/47 |
| phase5 (smartphone) | 36/36 |
| phase6 (lingua, viaggi) | 37/37, dopo aver aggiornato l'attesa «✓ Saved» |
| steps7 (sequenza 6/7 passi) | 40/40 |
| blockC (mappa, viaggi) | 72/72 |
| widthsB / widthsC (320–1280 px) | nessun problema |
| photos-ui (foto e crediti) | 84 foto, 84 crediti, 3 segnaposto attesi |
| phase7 (rete assente dopo il caricamento) | nessun errore |
| axe-core (accessibilità automatica) | 0 violazioni |
| mobile-audit | vedi problemi aperti (minori) |

Nessuna prova su dispositivi fisici.
