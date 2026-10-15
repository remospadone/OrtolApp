# OrtolApp — guida al progetto

## Avvio

Estrarre l’intero RAR. Aprire `LEGGIMI.html` oppure `sito/index.html`.
Per pubblicare su GitHub Pages, caricare il contenuto di `sito/` nella radice del repository. Tutti gli URL sono relativi. Non sono richiesti Node.js, npm, compilazione o server applicativi.

## File da modificare

- `sito/index.html`: cornice del dispositivo e caricamento delle risorse.
- `sito/css/style.css`: palette, impaginazione, componenti, cornice desktop e comportamento mobile.
- `sito/js/data.js`: categorie, catalogo, prezzi, incrementi di peso, Weekly Bag e fasce orarie.
- `sito/js/app.js`: stato della sessione, rendering e interazioni.
- `sito/assets/`: immagini ottimizzate e vettori originali.
- `sito/vendor/`: copie locali di librerie, font e licenze.

## Scelte concordate

1. Applicazione dimostrativa esclusivamente front-end, in HTML, CSS e JavaScript.
2. Tutti i dati esistono in memoria. Un ricaricamento completo azzera l’intera sessione e mostra l’onboarding. Nessun localStorage, sessionStorage, database o cookie applicativo.
3. Accesso libero con email formalmente valida e password non vuota. La registrazione simula un profilo; non c’è autenticazione reale. Le password non sono salvate nello stato.
4. Cinquantadue prodotti in sei categorie. Prezzi in centesimi per kg, pesi in grammi e arrotondamento ai centesimi per riga. Quantità minima: 500 g per frutta/verdura/radici/agrumi, 100 g per frutta secca, 50 g per aromi. Prezzi dimostrativi plausibili, non quotazioni verificate del mercato locale o aggiornate in tempo reale.
5. Aggiungere un prodotto già presente incrementa il suo peso nel carrello. I pulsanti nella scheda impostano il peso da aggiungere; quelli nel carrello modificano la riga. Il totale deriva sempre dalle righe effettive. Il conteggio indica le righe distinte.
6. Ordine minimo: 5 €. Nessuna spesa di consegna simulata, nessuna disponibilità e nessuna verifica della copertura geografica.
7. La Weekly Bag costa 23 € e contiene dieci prodotti, come nel prototipo. Si acquista una box per ordine, fuori dal carrello; gli ordini appaiono nello stesso storico.
8. Il calendario considera Europe/Rome, compresa l’ora legale, e blocca le date senza fasce disponibili. Fasce di 30 minuti dalle 08:00 alle 13:00 e dalle 17:00 alle 20:00. Ultimi inizi: 12:30 e 19:30. Il primo inizio deve essere almeno 60 minuti dopo l’istante corrente; ad esempio, alle 18:15 è 19:30. La validità è ricontrollata prima di inviare l’ordine.
9. Quattro metodi simulati: contanti, carta, conto corrente e Paypal. Le carte aggiunte diventano metodi selezionabili. Vengono mantenuti in memoria solo etichetta, ultime quattro cifre, titolare e scadenza. Non si inviano richieste a gateway di pagamento e non si conserva il CVV.
10. Riepilogo senza lista acquisti, secondo indicazione dell’autore. Indirizzo, recapiti, data/orario e pagamento possono essere modificati.
11. Invio simulato con conferma, numero progressivo e stato Ricevuto. Nessun avanzamento automatico. Un annullamento esplicito marca l’ordine come annullato.
12. Profilo modificabile, compresa una foto locale temporanea. Notifiche, Privacy, Contattaci e Password dimenticata non sono cliccabili.
13. Interfaccia mobile: su desktop viene presentata dentro una cornice ispirata a iPhone 16 Pro. Non è una versione desktop dell’interfaccia. La cornice scala mantenendo lo schermo logico a 393 × 852, coerente con il design originale; non è un emulatore iOS.
14. Navbar ancorata allo schermo e contenuti scorrevoli. Su telefono, nessuna cornice. Le preferenze di movimento ridotto sono rispettate per le transizioni principali.

## Struttura JavaScript

`ORTOL_DATA` espone il catalogo immutato. `app.js` incapsula lo stato della demo in una funzione immediata.
Le funzioni `render...` producono le schermate; `navigate` gestisce gli hash della pagina e la cronologia. Gli eventi sono delegati al contenitore `#app` tramite `data-action` e `data-go`. I dati inseriti vengono codificati prima di essere inseriti nell’HTML.

Le funzioni `cartTotal` e `linePrice` centralizzano i calcoli. `availableSlots` confronta gli istanti di inizio nel fuso italiano con l’istante corrente più un’ora. `beginCheckout` crea una bozza separata dal carrello; `placeOrder` registra un ordine nella sessione e svuota il carrello soltanto per la spesa libera.

`window.OrtolApp` offre tre funzioni di sola lettura per le verifiche: `getState()`, `getCartTotal()` e `availableSlots(dataISO, istanteOpzionale)`.
Nei browser che lo espongono, un piccolo adattatore facoltativo WebMCP registra `ortolapp_read_cart`, che legge lo stesso stato senza modificarlo. Negli altri browser non viene attivato e non è necessario per la demo.

## Risorse

Le immagini sono derivate dai file forniti da Remo. Le copie per il sito hanno il bordo trasparente superfluo ritagliato e una risoluzione ridotta per il web; le immagini originali sono nell’archivio `originali/App-originali.rar`, conservato byte per byte.
La palette riprende #4C7A52, #C85A3E, #5C4433, #FAF6EE. Icone e marchi provengono dai vettori forniti. Il prototipo Figma non è stato modificato.

## Limiti intenzionali

La demo non è un servizio commerciale e non realizza account, transazioni, notifiche, sincronizzazione tra dispositivi, disponibilità, magazzino o gestione amministrativa. L’orologio usato è quello del dispositivo: una modifica manuale all’orologio del sistema influisce sulle fasce disponibili. Se si chiude semplicemente il browser lasciando la scheda sospesa, la pagina può rimanere in memoria; ricaricarla azzera sempre tutto.
