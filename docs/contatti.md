# VIVI Roma — Contatti e «Segnala un errore»

Intervento n. 2 della roadmap, ramo `startup-fase1` (25/11/2026). Nessun modulo, nessun server, nessun servizio esterno: solo link email (`mailto:`) verso la casella ufficiale `viviroma.contact [at] gmail.com`.

In questo documento l'indirizzo è scritto con `[at]` di proposito: il repository è pubblico.

## 1. Dove si trova

| Punto | Cosa fa |
| --- | --- |
| Scheda di ogni luogo → «Orari, prezzi e consigli di VIVI» (approfondimento) → «Hai notato un dato non corretto? **Segnala un errore**» | Apre l'app di posta con destinatario, oggetto `VIVI Roma — Segnalazione: <nome> (<ID>)` e un testo guida: cosa non è corretto, quando, fonte |
| Piè di pagina della home → «Contattaci» | Apre l'app di posta con oggetto `VIVI Roma — Contatto` |
| `crediti.html#contatti` → sezione «Contatti» | «Scrivi a VIVI Roma» (email) e «Copia l'indirizzo» (mostra l'indirizzo e lo copia, per chi non ha un'app di posta configurata). Nota sull'uso dei dati |
| Piè di pagina dei crediti → «Contattaci» | Come nella home |

- **Lingue:** testi, oggetto e testo guida seguono la lingua attiva, italiano o inglese.
- **Nome del luogo:** resta in italiano anche nella versione inglese, come nel resto del sito; l'ID è sempre presente.
- **Stampa:** il link non compare nella versione stampata.

## 2. File

| File | Ruolo |
| --- | --- |
| `js/contact.js` | Indirizzo diviso in parti, `contactAddress()`, `mailtoUrl()` (RFC 6068, righe CRLF), `armMailLink()` |
| `js/main.js` | `reportLine()` nelle schede; collegamento dei link `[data-contact]` |
| `index.html`, `crediti.html` | «Contattaci» nel piè di pagina; sezione «Contatti» nei crediti |
| `css/style.css` | Stile di `.report` / `.report-link` (area toccabile di 44px, nascosti in stampa) |
| `js/i18n/it.js`, `js/i18n/en.js` | 15 testi nuovi (`stop.report*`, `report.*`, `contact.subject`, `footer.contact*`, `credits.contact.*`) |
| `js/metrics-schema.js` | Evento anonimo `error_report_click` (solo ID del luogo) |
| `tools/analytics/report.mjs` | Riga e tabella «Segnala un errore» nei report |
| `tests/contact.test.js` | 7 test unitari |

## 3. Protezione antispam e suoi limiti

**Come funziona:**
- l'indirizzo non è scritto in nessun file HTML;
- in `js/contact.js` è diviso in tre parti, quindi un'espressione regolare che cerca indirizzi email nel codice non lo trova (un test verifica che non compaia in chiaro in nessun file pubblicato);
- i link hanno un indirizzo di riserva (`crediti.html#contatti`) e diventano `mailto:` solo quando servono: passaggio del mouse, focus da tastiera, tocco o clic. Il primo clic funziona sempre, perché l'indirizzo viene aggiornato prima dell'azione del browser;
- nei crediti l'indirizzo compare come testo solo dopo «Copia l'indirizzo».

**Limiti:**
- **Protezione leggera.** Ferma i raccoglitori più semplici, quelli che leggono l'HTML o i file con espressioni regolari. Non ferma un programma che esegue JavaScript e simula un clic, né chi legge `js/contact.js`.
- **Indirizzo comunque visibile a chi scrive.** Dopo un clic l'indirizzo compare nell'app di posta dell'utente, ed è giusto così.
- **Lo spam va gestito nella casella.** Servono i filtri di Gmail. Se lo spam diventasse un problema, la strada successiva è un modulo con protezione anti-bot, che però richiede un servizio esterno o una funzione Cloudflare e un aggiornamento dell'informativa.

## 4. Compatibilità

- **Telefoni:** `mailto:` apre l'app di posta predefinita (Mail, Gmail, Outlook).
- **Computer:** senza un'app di posta configurata il clic può non fare nulla, oppure aprire un'app di posta non usata. Per questo i crediti offrono «Copia l'indirizzo».
- **Lunghezza:** l'oggetto e il testo guida restano sotto i 1.800 caratteri codificati per tutti i 77 luoghi, nelle due lingue (verificato da test), sotto i limiti pratici dei client di posta.
- **Browser in-app di Instagram e TikTok:** alcuni bloccano i link `mailto:`. In quel caso resta la pagina dei crediti, con «Copia l'indirizzo». Non è stato verificato su dispositivi reali.

## 5. Misurazione

Il clic su «Segnala un errore» genera l'evento anonimo `error_report_click` con il **solo ID del luogo**. Non si misura e non si può misurare se l'email viene poi inviata. «Contattaci» non genera eventi.

Come tutta la misurazione, l'evento resta spento finché `events:false` (`docs/misurazione.md`).

## 6. Privacy delle email ricevute

Il sito non trasmette nulla: l'utente decide se e cosa inviare dalla propria casella. Le email ricevute contengono dati personali (indirizzo, eventuale nome, testo) e vanno trattate come indicato nella bozza di informativa (`docs/legale-privacy.md`, «Contatti e segnalazioni»):
- usarle solo per verificare i dati e rispondere;
- nessuna newsletter;
- nessuna cessione a terzi;
- conservazione limitata, con durata da definire.

Restano da decidere e da far verificare a un professionista (`docs/privacy-da-completare.md`, punti 14 e 3c):
- tempi di conservazione;
- chi legge la casella;
- ruolo di Google come fornitore di Gmail e trasferimenti extra UE.
