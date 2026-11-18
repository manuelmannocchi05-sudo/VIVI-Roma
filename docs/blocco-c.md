# Blocco C: mappa premium, «I miei viaggi», prestazioni

## 1. Mappa

### Cosa cambia
- **Marker propri**: cerchio verde romano con numero in oro, bordo avorio. La tappa selezionata diventa oro, è leggermente più grande e ha un anello che pulsa piano (con «riduci movimento» l'anello è fermo).
- **Nessuna sovrapposizione**: quando due tappe sono troppo vicine per lo zoom attuale (per esempio Vittoriano e Campidoglio), i numeri vengono allontanati quanto basta e un punto sottile resta sulla posizione vera. Lo spostamento si ricalcola a ogni zoom. Le coordinate delle tappe non cambiano.
- **Controlli propri** da 46 px in alto a destra: ingrandisci, riduci, «mostra tutte le tappe del giorno». Su smartphone «Sposta la mappa» è in alto a sinistra. L'inquadratura lascia margini sotto i controlli, così le tappe non finiscono coperte.
- **Niente fumetti sopra la mappa.** La tappa selezionata compare sotto la mappa, con:
  - miniatura, «Tappa 2 di 4», nome, zona e durata della visita;
  - tappa precedente e successiva, comodo mentre si cammina;
  - «Vai alla scheda» e «Indicazioni».
- **Collegamento nei due sensi**:
  - marker → scheda evidenziata e riquadro;
  - «Vedi sulla mappa» nella scheda → mappa in vista, marker centrato, evidenziato e con il fuoco della tastiera.
- **Accessibilità**: ogni marker è un pulsante con nome («Tappa 3: Pantheon»), selezionabile con Invio o Spazio. Tutti i controlli hanno un nome in italiano e in inglese.
- **Intestazione della mappa**: «Giorno 1 · 4 tappe».
- **Linea dell'ordine di visita**: puntinata, con un alone chiaro sotto. Resta la dicitura: è l'ordine in linea d'aria, non un percorso pedonale.
- **Nessuna distanza o tempo di percorrenza nuovo**: la mappa mostra solo i dati che c'erano già.

### Soluzione cartografica
- **Libreria**: Leaflet 1.9.4, già inclusa nel progetto (licenza BSD-2). Nessuna nuova dipendenza.
- **Tasselli**: restano quelli pubblici di OpenStreetMap, con l'attribuzione richiesta. La palette calda si ottiene solo con un filtro CSS sui tasselli: nessun servizio in più, nessuna chiave, nessuna registrazione.
- **Uso commerciale**: i tasselli pubblici di OpenStreetMap **non sono una soluzione commerciale definitiva**. La loro policy vieta l'uso intenso, come la distribuzione di un'app, senza permesso, e prevede il blocco senza preavviso.
- **Alternative** (analizzate nella fase 7, prezzi da ricontrollare prima della scelta):
  - **Stadia Maps**: piano Starter a pagamento per l'uso commerciale. Funziona con Leaflet cambiando solo l'indirizzo dei tasselli.
  - **MapTiler**: piano gratuito solo non commerciale, piano a pagamento per l'uso commerciale.
  - **Protomaps / PMTiles**: mappa di Roma ospitata insieme al sito, senza chiavi né costi a consumo, ma serve un lavoro tecnico di integrazione.
- **Nessun servizio attivato**: la scelta del fornitore richiede la tua autorizzazione.

## 2. I miei viaggi
- **Raccolta di schede**. Ogni scheda ha:
  - una **copertina fotografica**: la foto della tappa più rappresentativa del viaggio, con lo stesso criterio della copertina dei risultati e solo foto locali con licenza verificata;
  - un **titolo dalle risposte** («Roma per due») e un sottotitolo («3 giorni tra storia, sapori romani e romanticismo»);
  - durata e numero di tappe, fino a 3 interessi (più «+n») e la data di salvataggio;
  - le azioni **Apri** (anche toccando il titolo o la scheda), **Condividi** ed **Elimina** (con conferma).
- **Più recenti per primi**. Oltre 6 viaggi compare «Mostra altri n viaggi».
- **Stato vuoto curato**: la sezione è sempre visibile, con l'invito «Il tuo primo viaggio ti aspetta» e il pulsante verso il quiz. Il link «I miei viaggi» nel menu è sempre presente.
- **Condivisione dalla raccolta**: stesso testo e stesso link della condivisione dai risultati.
- **Compatibilità**: i viaggi salvati dalle versioni precedenti (formato della fase 5, atmosfera singola, interessi «Vita locale» ed «Esperienze per tutti») compaiono con copertina e si aprono. Formato dei dati e link condivisi invariati.
- **Nessun account, login, database o sincronizzazione**: i viaggi restano in questo browser, come spiegato nella nota.

## 3. Prestazioni

### Cosa pesava (homepage, cache vuota, 390 px)
| Risorsa | Peso (senza compressione) | Prima |
|---|---|---|
| Foto di copertina (verticale, 1080 px) | 163 KB | necessaria, invariata |
| Libreria della mappa (JS + CSS) | 144 + 14 KB | caricata anche in homepage, senza mappa |
| Testi inglesi dei luoghi | 60 KB | caricati anche in italiano |
| Dizionario inglese dell'interfaccia | 23 KB | caricato anche in italiano |
| Moduli JavaScript | 8 file | scaricati a catena, uno dopo l'altro |

### Ottimizzazioni (nessuna perdita di qualità delle foto)
1. **Mappa a richiesta**: Leaflet si scarica all'inizio del quiz (in sottofondo) o all'apertura di un itinerario, non all'apertura della pagina. Senza connessione l'itinerario resta completo con un avviso sulla mappa, e quando la rete torna la mappa riprova da sola.
2. **Inglese a richiesta**: interfaccia e luoghi in inglese si scaricano solo se la lingua è l'inglese (all'apertura o al cambio lingua). Finché non arrivano, i testi restano in italiano: nessuna chiave vuota.
3. **Moduli in parallelo**: `tools/stamp.mjs` aggiunge un `<link rel="modulepreload">` per ogni modulo che la pagina importa all'avvio, calcolato seguendo gli `import` statici. L'inglese resta escluso.
4. **Provata e scartata**: la copertina inserita direttamente nell'HTML anticipava la foto, ma su 3G lenta toglieva banda a CSS e font e ritardava di circa 1 s la comparsa del testo. Resta inserita da JavaScript.

### Misure (Chrome emulato, 390 px, cache vuota, stessa macchina e stesse condizioni)
Profili di rete: 3G veloce = 1,6 Mb/s con 562 ms di latenza; 3G lenta = 400 kb/s con 2 s di latenza.

**Server locale senza compressione** (stessa condizione della misura del Blocco B):

| | Prima | Dopo |
|---|---|---|
| Byte all'apertura | 810 KB, 21 richieste | 586 KB, 17 richieste |
| 3G lenta: primo contenuto | 8,4 s | 8,9 s |
| 3G lenta: contenuto principale (LCP) | 12,4 s | 12,6 s |
| 3G lenta: pagina pronta (DOM) | 21,1 s | 13,2 s |
| 3G lenta: caricamento completo | 27,2 s | 19,4 s |
| 3G veloce: caricamento completo | 7,5 s | 5,2 s |

**Con compressione gzip dei file di testo, come su GitHub Pages:**

| | Prima | Dopo |
|---|---|---|
| Byte all'apertura | 459 KB | 388 KB |
| 3G lenta: primo contenuto | 5,6 s | 5,6 s |
| 3G lenta: contenuto principale (LCP) | 6,4 s | 6,4 s |
| 3G lenta: pagina pronta (DOM) | 13,1 s | 10,9 s |
| 3G lenta: caricamento completo | 19,2 s | 17,1 s |
| 3G veloce: caricamento completo | 5,6 s | 5,0 s |

**Come leggere i numeri:**
- **Caricamento iniziale** (primo contenuto e contenuto principale): invariato con la compressione. Senza compressione è più lento di 0,2–0,5 s, perché i moduli precaricati condividono la banda con CSS e font.
- **Caricamento completo**: sempre migliore. Il limite che resta è la foto di copertina (163 KB), che non ho ridotto per non perdere qualità, insieme ai 6 file dei font (140 KB).
- Sono misure in emulazione, **non su dispositivi fisici**.
