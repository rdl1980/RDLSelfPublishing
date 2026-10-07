# lib/ai — riservato

Posto per le funzioni AI (Claude API) previste dopo l'MVP: generatore titoli/sottotitoli, descrizioni,
7 keyword backend, analisi inserzione. Contratto previsto: funzioni server-only che ricevono dati già
raccolti (prodotti, SERP, keyword) e restituiscono testo strutturato; i job di tipo `ai_reserved` nella
tabella `jobs` sono il segnaposto per esecuzioni asincrone.
