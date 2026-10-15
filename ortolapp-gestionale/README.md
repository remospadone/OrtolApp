# OrtolApp Gestionale

Web app amministrativa dimostrativa, separata dall'app cliente. Non richiede installazione, server o compilazione.

## Avvio

Aprire `index.html` in un browser moderno. Il gestionale usa il font, il logo e le immagini prodotto presenti in `../sito/` senza modificare il progetto originale.

Le icone aggiuntive sono in `assets/icons/`: SVG disegnati nello stile delle icone originali, con tratto sottile e terminali arrotondati. Colori e stati usano soltanto la palette OrtolApp.

## Funzioni simulate

- dashboard operativa e andamento settimanale;
- ricerca globale;
- gestione e avanzamento degli ordini;
- Magazzino unificato: catalogo completo, prezzi, disponibilità, ricerca e filtri per categoria;
- aggiunta e modifica prodotti, carico manuale e correzione delle giacenze;
- caricamento immagine prodotto con anteprima (PNG, JPG, WebP e GIF fino a 5 MB), conservata solo nella sessione;
- anagrafica clienti;
- analisi di vendita;
- creazione manuale di un ordine.

I dati vivono solo nella memoria della pagina e vengono ripristinati al ricaricamento.
