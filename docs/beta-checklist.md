# VIVI Roma — Checklist per la beta pubblica (Blocco D)

Da completare **su dispositivi reali** prima di pubblicare.
Le prove del Blocco D sono state fatte solo con Chrome automatizzato (Playwright) e con viewport simulati. **Nessuna prova è stata eseguita su iPhone o Android fisici.**

Per ogni riga, segna ✅ / ❌ e annota modello, sistema e browser.

## 0. Prima di iniziare

- [ ] Apri l'anteprima del ramo `restyling-premium` (link nel rapporto) e non il sito principale.
- [ ] Svuota la cache o usa una finestra nuova.
- [ ] Dispositivi minimi:
  - un iPhone con Safari;
  - un Android con Chrome;
  - un computer con Safari, Chrome e Firefox o Edge.

## 1. Percorso completo (su ogni dispositivo)

- [ ] Home: copertina, titolo «Non visitare Roma. Vivila.», pulsanti leggibili e toccabili.
- [ ] Tocca una categoria in «Quale Roma vuoi incontrare?»: compare l'avviso in alto e il quiz si apre con quell'interesse già scelto.
- [ ] Quiz da solo / in coppia / con amici: **6 passi**. In famiglia: **7 passi**, con la domanda sui bambini.
- [ ] Torna indietro e cambia «Con chi»: la risposta sui bambini sparisce se non sei più «In famiglia».
- [ ] Prova a continuare senza scegliere: compare l'errore e il pulsante non avanza.
- [ ] Mezza giornata, un giorno, 2 e 7 giorni: l'itinerario ha senso, nessuna tappa ripetuta.
- [ ] Copertina dei risultati: foto, titolo e statistiche, nessuna banda vuota sotto l'intestazione.
- [ ] Schede delle tappe: badge con il numero leggibile; «Orari, prezzi e consigli» si apre e si chiude.
- [ ] Cambia giorno con le schede «Giorno 1/2/…» e con «← / →» in fondo.

## 2. Mappa

- [ ] La mappa compare con i numeri delle tappe e la linea puntinata.
- [ ] Su smartphone una sola dita scorre la pagina, non la mappa; «Sposta la mappa» la sblocca.
- [ ] Tocca un numero: si apre il pannello con «Tappa X di Y», «Vai alla scheda» e le frecce.
- [ ] Pulsanti + / − / «mostra tutte»: funzionano e sono abbastanza grandi.
- [ ] Attribuzione «© OpenStreetMap» visibile e non coperta.
- [ ] Rete lenta o assente: compare l'avviso e i link «Indicazioni» funzionano lo stesso.

## 3. Salvataggio, condivisione, riapertura

- [ ] «Salva nei miei viaggi» → «✓ Salvato»; il contatore nel menu si aggiorna.
- [ ] Ricarica la pagina: il viaggio è in «I miei viaggi» con copertina e data.
- [ ] Apri un viaggio salvato: torna identico (giorni, tappe, ordine).
- [ ] Elimina: compare la conferma, il viaggio sparisce.
- [ ] Navigazione privata di Safari: il salvataggio mostra un messaggio chiaro se non è possibile.
- [ ] «Condividi»:
  - [ ] su smartphone si apre il pannello di condivisione del sistema;
  - [ ] su computer, «Copia il testo» copia il riepilogo con il link.
- [ ] Apri il link condiviso su **un altro dispositivo**: l'itinerario si apre senza rifare il quiz.
- [ ] Incolla il link in WhatsApp o Messaggi e aprilo dall'app: si apre correttamente.
- [ ] «Stampa o PDF»: il PDF è leggibile, senza mappa vuota né pulsanti.

## 4. Lingua

- [ ] Pulsante EN / IT: tutta l'interfaccia cambia, quiz compreso; i nomi dei luoghi restano in italiano con la spiegazione in inglese.
- [ ] Con rete assente, il passaggio all'inglese mostra l'avviso e la pagina resta in italiano.
- [ ] **Facoltativo ma consigliato:** far leggere i testi inglesi a un madrelingua. La revisione del Blocco D **non** è una revisione madrelingua.

## 5. Installazione come app (PWA)

- [ ] Android, Chrome: menu ⋮ → «Installa app» o «Aggiungi a schermata Home».
  - [ ] Verifica l'icona (sfondo avorio e V verde, non ritagliata male) e il nome «VIVI Roma».
  - [ ] Verifica l'apertura a schermo intero.
- [ ] iPhone, Safari: Condividi → «Aggiungi alla schermata Home».
  - [ ] Verifica che l'icona sia quella di VIVI, non uno screenshot.
  - [ ] Verifica che il nome sia «VIVI Roma».
- [ ] Dall'icona installata:
  - [ ] il quiz funziona;
  - [ ] i viaggi salvati nel browser **potrebbero non comparire** nell'app installata (su iPhone la memoria dell'app è separata da quella di Safari): annota cosa succede.

## 6. Connessione lenta o assente

- [ ] Strumenti di Chrome → rete «3G lento»: la home mostra il testo in pochi secondi e il resto arriva dopo.
- [ ] Apri il sito una volta online, poi attiva la modalità aereo e riaprilo:
  - [ ] la home si apre;
  - [ ] il quiz crea un itinerario;
  - [ ] i viaggi salvati si riaprono;
  - [ ] il passaggio IT/EN funziona;
  - [ ] la pagina dei crediti si apre.
- [ ] Offline, la mappa mostra marcatori e linea; lo sfondo compare solo per le zone già viste (cache del browser), altrimenti compare l'avviso. È voluto: la politica OSM vieta la mappa offline.
- [ ] Offline, le foto compaiono solo se già viste: le altre mostrano lo sfondo colorato.
- [ ] Aggiornamento: dopo un nuovo deploy, la pagina aperta non si ricarica da sola. Chiudi e riapri il sito: deve comparire la versione nuova.

## 7. Accessibilità

- [ ] VoiceOver (iPhone) e TalkBack (Android):
  - le domande del quiz vengono lette con il passo;
  - le opzioni dicono se sono selezionate;
  - le tappe sulla mappa hanno un nome.
- [ ] Solo tastiera sul computer: tutto è raggiungibile con Tab, il focus è visibile e Esc chiude i dialoghi.
- [ ] Testo ingrandito al 200% (iOS: Dimensioni testo; Android: Dimensione carattere): nessun testo tagliato.
- [ ] «Riduci movimento» attivo: niente animazioni di ingresso.

## 8. Blocchi al lancio (se uno fallisce, non pubblicare)

1. Il quiz non porta a un itinerario su almeno un dispositivo.
2. Il salvataggio perde i dati o la riapertura mostra un viaggio diverso.
3. Il link condiviso non si apre su un altro dispositivo.
4. La mappa copre la pagina o impedisce lo scorrimento su smartphone.
5. Testi tagliati o pulsanti non toccabili a 320 px di larghezza.
6. Informativa privacy non pubblicata (vedi `docs/legale-privacy.md`).

## 9. Dopo la pubblicazione della beta

- [ ] Aggiungi un contatto per le segnalazioni, che è un'indicazione della politica OSM. **Non** usare un'email personale senza deciderlo.
- [ ] Controlla periodicamente che la mappa OSM risponda.
- [ ] Ricontrolla prezzi e orari con data di verifica più vecchia di 6 mesi.
