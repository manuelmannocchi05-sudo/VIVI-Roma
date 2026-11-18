# Quiz in 6 passaggi: logica e corrispondenza con il motore

Restyling, blocco A. Il quiz passa da 7 domande a 5 passaggi e ammette risposte multiple dove le scelte sono compatibili.

**Aggiornamento (revisione del blocco B):** i passaggi diventano 6. «Con chi vivi Roma?» e «È la tua prima volta a Roma?» non condividono più la stessa schermata: ogni schermata ha una sola domanda principale. Motore, risposte salvate e link non cambiano, perché cambia solo la disposizione delle domande.
In questo blocco il motore cambia solo in un punto: accetta più atmosfere. Il resto dell'adattamento è previsto nel blocco B.

## Come le risposte influenzano il motore (analisi prima delle modifiche)

| Risposta | Dove agisce in `js/planner.js` |
|---|---|
| Compagnia | Punteggio dei luoghi: coppia → +2 ai romantici; famiglia → +3 ai luoghi per famiglie; amici → +2 ai luoghi vivaci; da solo/a → +1 a luoghi insoliti e locali. Titolo del risultato. |
| Prima volta / la conosco | Prima volta: +4 ai luoghi simbolo e +6 ai "must" pertinenti. La conosco: +3 ai luoghi insoliti. |
| Durata / giorni | Numero di giornate. Con mezza giornata: meno tappe, meno tempo e una zona più raccolta. |
| Interessi (multipli) | +5 per ogni interesse in comune con il luogo. Gli interessi determinano le tappe "pertinenti" e la ripartizione tra i giorni. "Roma di sera" sposta i luoghi serali a fine giornata. |
| Atmosfera | +4 se il luogo ha quella categoria. Una tappa senza interessi né atmosfera in comune è segnalata come "riempitivo". |
| Ritmo | Massimo di tappe e tempo di visita per giornata. |
| Camminata | Distanza massima tra tappe e raggio della zona. Con "poco" scende anche il numero di tappe. Penalità ai luoghi lontani dal centro. |
| Budget | Tetto agli ingressi a pagamento (contenuto ≈ uno ogni due giorni; medio ≈ uno al giorno; libero: nessun tetto). Con budget contenuto i luoghi gratuiti hanno un vantaggio. |

## Nuova struttura

| Passaggio | Domande | Tipo di selezione |
|---|---|---|
| 1. Con chi vivi Roma? | Compagnia (con «In famiglia» compare la domanda collegata «Viaggiate con bambini piccoli?») | singola |
| 2. È la tua prima volta a Roma? | «È la mia prima volta» / «La conosco già» | singola |
| 3. Quanto tempo hai? | Durata (+ numero di giorni se "più giorni") | singola |
| 4. Cosa vuoi scoprire e vivere? | Interessi (8 card fotografiche) | **multipla**: da 1 a 8, senza massimo |
| 5. Che atmosfera preferisci? | Atmosfera (4 card fotografiche) | **multipla**: da 1 a 4, senza massimo |
| 6. Come ti piace viaggiare? | Ritmo, camminata, budget | singola per ognuna (valori incompatibili tra loro) |

La camminata parte da "Il giusto", come prima. Le altre domande non hanno risposte predefinite.

## Corrispondenza tra vecchie e nuove risposte

| Vecchio quiz | Nuovo quiz | Valore per il motore |
|---|---|---|
| Compagnia, prima volta, durata, giorni, ritmo, camminata, budget | Stesse opzioni, testi più brevi | invariato |
| Interessi: storia, arte, religiosa, insoliti, romanticismo, natura, cibo, sera | Stessi 8 interessi, alcuni rinominati («Luoghi nascosti», «Roma sacra», «Verde e quiete», «Cibo e tradizioni») | invariato |
| Interesse «Vita locale» (`local`) | Assorbito dall'atmosfera **Autenticità** («Quartieri e tradizioni romane») | Se scegli Autenticità, il motore riceve anche l'interesse `local` |
| Interesse «Esperienze per tutti» (`family`) | Assorbito dalla compagnia **In famiglia** | Se scegli In famiglia, il motore riceve anche l'interesse `family` |
| Atmosfera: una sola | Atmosfera: una o più | `mood` diventa un elenco. Ogni luogo riceve +4 se ha almeno una delle atmosfere scelte (non +4 per ognuna). Così molte atmosfere non gonfiano i punteggi. |

La conversione avviene in `engineAnswers()` (`js/quiz-data.js`). Le risposte salvate restano quelle scelte nel quiz, e la conversione si ripete identica quando un viaggio viene riaperto o ricevuto da un link.

Effetti da conoscere:
- Chi sceglie «Autenticità» ora riceve più quartieri e luoghi della vita locale (+4 per l'atmosfera e +5 per l'interesse). Prima l'atmosfera da sola dava solo +4.
- Chi viaggia «In famiglia» ora riceve sempre il vantaggio dei luoghi per famiglie. Prima serviva scegliere anche l'interesse «Esperienze per tutti».

## Compatibilità

- **Viaggi salvati** con il vecchio quiz: le risposte restano valide, compresi gli interessi `local` e `family` che non compaiono più tra le opzioni. Un'atmosfera singola viene letta come elenco di un elemento.
- **Link condivisi:** il formato non cambia (`#itinerario=1.…`). Le atmosfere multiple sono separate da virgole nello stesso campo, come gli interessi. Un link con una sola atmosfera è identico a quello delle versioni precedenti.
- **Motore:** sulle 8.064 combinazioni del vecchio quiz il risultato è identico alla fase 7, sia con l'atmosfera come testo sia come elenco di un elemento (0 differenze).

## Test aggiornati

- `tests/quiz.test.js` (nuovo):
  - 6 passaggi, con compagnia e familiarità su schermate separate;
  - selezione multipla solo per interessi e atmosfera;
  - conversione verso il motore;
  - equivalenza testo/elenco;
  - effetto reale di una seconda atmosfera;
  - limiti di durata, ritmo e budget con tutte le opzioni selezionate;
  - viaggi e link delle versioni precedenti;
  - link con più atmosfere.
- `tests/i18n.test.js`: controlla anche i testi inglesi dei 6 passaggi e delle opzioni non più proposte. Nel controllo dei messaggi con parametri è stato aggiunto il parametro `list`.
- Prove nel browser (fuori dal repository): percorso a 6 passaggi; la camminata è una scelta a pulsanti invece di un menu a tendina; nuovi testi attesi ("Step 4 of 6", "Choose your budget."). Il carosello orizzontale delle categorie su smartphone è escluso dal controllo "fuori schermo", perché scorre di lato per scelta.

---

# Blocco B: personalizzazione del motore

## Problemi trovati

Analisi su 6.000 itinerari casuali con il nuovo quiz (interessi e atmosfere multipli, tutte le durate, ritmi, budget e camminate):
- Il 12% degli interessi scelti non compariva in nessuna tappa: gli interessi con molti luoghi (storia, arte) occupavano tutto lo spazio. Con un solo interesse la percentuale era il 7%.
- Il 13% delle atmosfere scelte non compariva in nessuna tappa.
- «In famiglia» aggiungeva sempre l'interesse «Esperienze per tutti». Il motore presupponeva così bambini piccoli, per esempio con Explora, il museo per bambini fino a 11 anni.
- Nessuna violazione di durata, ritmo, camminata o budget.

## Modifiche

1. **Interessi bilanciati** (`COVER_BONUS = 4`). Quando il motore sceglie la tappa successiva o confronta giornate alternative, un luogo che porta un interesse scelto e non ancora presente nell'itinerario riceve un vantaggio di 4 punti per interesse. Il punteggio di base non cambia: il vantaggio vale solo finché quell'interesse manca.
2. **Atmosfere rappresentate** (`MOOD_COVER = 3`). Funziona allo stesso modo per le atmosfere scelte e non ancora presenti.
3. **Bambini piccoli solo se indicati.**
   - Nuova domanda nel passo 1, collegata a «In famiglia» e visibile solo con quella scelta: «Viaggiate con bambini piccoli?» (Sì / No).
   - «Esperienze per tutti» si attiva solo con «Sì».
   - I luoghi pensati solo per bambini (quelli che nel catalogo hanno come unica categoria "famiglie"; oggi solo Explora) ricevono una penalità di 12 punti, salvo quando l'interesse per bambini è attivo.
   - Nei viaggi salvati prima di questa domanda la risposta manca: il motore non aggiunge l'interesse per bambini. Se un viaggio vecchio aveva scelto esplicitamente «Esperienze per tutti», quell'interesse resta.
4. Vincoli invariati: tempo di visita per il ritmo, numero di tappe, km del giorno e tratta massima per la camminata, tetto di spesa per il budget, giornate per durata.

## Risultati che cambiano e perché

**Sulle 8.064 combinazioni del vecchio quiz** (motore del blocco A → blocco B):

| | Blocco A | Blocco B |
|---|---|---|
| Itinerari con tappe o ordine diversi | — | 1.886 su 8.064 (23%) |
| di cui con un solo interesse | — | 284 su 4.608 (6%) |
| di cui con le stesse tappe in giorni o ordine diversi | — | 187 |
| Interessi scelti presenti | 90,9% | 95,5% |
| Km medi al giorno (linea d'aria) | 1,27 | 1,28 |
| Tappe medie per itinerario | 10,70 | 10,70 |
| Tappe senza interessi in comune | 3.413 | 3.516 (su circa 86.000 tappe) |
| Tratte segnalate come da fare con i mezzi | 332 | 334 |

Le differenze nascono dal bilanciamento: un luogo che porta un interesse ancora assente prende il posto di un luogo che ripeteva un interesse già presente. Le giornate restano compatte: in media 10 m in più al giorno.

**Sui 6.000 itinerari casuali del nuovo quiz**:
- interessi scelti presenti: dall'88,3% al 94,1%;
- atmosfere scelte presenti: dall'86,6% al 94,2%;
- km medi al giorno: da 1,67 a 1,70;
- 0 violazioni di tempo, tappe, km o budget, come prima;
- Explora proposto a famiglie senza bambini piccoli: 0.

**Viaggi salvati e link:** si riaprono con le stesse tappe nello stesso ordine, perché vengono ricostruiti dagli identificativi salvati e non ricalcolati. Cambiano solo le etichette «perché è qui».

## Limiti noti

Con un solo interesse molto specifico, due atmosfere opposte non trovano sempre spazio entrambe. Per esempio, con solo «Storia» scegliendo Meraviglia + Energia oppure Calma + Energia, nei test compare una sola delle due (2 casi su 18 nella prova automatica). Il catalogo ha pochi luoghi storici "vivaci".
