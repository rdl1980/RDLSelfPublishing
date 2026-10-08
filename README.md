# RDL Self Publishing

Ricerca di mercato e tracking per autori Amazon KDP, **solo amazon.it**. Web app + estensione Chrome.
Alternativa personale a Self Publishing Titans limitata alla parte di ricerca.

## Struttura

| Cartella              | Cosa contiene                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/web`            | Web app Next.js (login Supabase, keyword research, calcolatori, Deep View, tracking, API per l'estensione)   |
| `apps/extension`      | Estensione Chrome (WXT, Manifest V3): Quick View sulle ricerche amazon.it, pannello prodotto, esecuzione job |
| `packages/core`       | Logica condivisa in TypeScript puro: parser delle pagine amazon.it, modelli BSR→vendite, royalty, keyword    |
| `supabase/migrations` | Schema del database (copia versionata di ciò che è applicato al progetto Supabase)                           |
| `scripts`             | Utility: generazione token estensione, tipi DB, smoke test autocomplete                                      |

## Requisiti

Node 22+ (consigliato 24), npm 10+, Chrome. Nessun Docker: Supabase è hosted.

## Setup

```bash
npm install
```

1. **Supabase**: il progetto hosted è `RDLSelfPublishing` (ref `qxqqlvzrkzxgvkszemme`, regione eu-central-1).
   - Dashboard → Authentication → Providers → Email: lascia attivo; in _Sign In / Up_ disattiva "Allow new users to sign up".
   - Authentication → Users → _Add user_ → crea il tuo utente con email e password (conferma automatica).
   - Project Settings → API Keys → copia la chiave **secret** in `apps/web/.env.local` come `SUPABASE_SECRET_KEY`.
2. **Web app**: `npm run dev:web` → http://localhost:3000 → login.
3. **Token estensione**: `npm run mint-token` stampa il token e l'SQL da eseguire nell'SQL editor di Supabase
   (serve l'uuid dell'utente: Authentication → Users). In alternativa la pagina Impostazioni della web app.
4. **Estensione**: `npm run dev:ext` (oppure `npm run build -w @rdl/extension`), poi Chrome → `chrome://extensions`
   → Modalità sviluppatore → _Carica estensione non pacchettizzata_ → `apps/extension/.output/chrome-mv3`.
   Apri le Opzioni dell'estensione, inserisci URL della web app e token, "Salva e verifica".

## Produzione (Vercel)

Progetto Vercel `rdl-self-publishing` collegato al repo GitHub (root directory `apps/web`): ogni push su `main` ridistribuisce.
URL: https://rdl-self-publishing-rdl1980s-projects.vercel.app — le variabili `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sono impostate; `SUPABASE_SECRET_KEY` va aggiunta a mano in Vercel → Settings →
Environment Variables (poi redeploy). Nelle Opzioni dell'estensione usa questo URL al posto di localhost.

## Come si usa

| Funzione                | Dove                                        | Cosa fa                                                                                                                                                          |
| ----------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ricerca keyword         | web app → Keyword                           | espande una keyword seme con l'autocomplete di amazon.it, salva sessioni, esporta CSV, aggiunge a nicchie/tracking                                               |
| Quick View              | estensione, pagine di ricerca amazon.it     | badge per ogni risultato (BSR, vendite/mese stimate, ricavo, royalty, pagine, data, KDP, A+) e riepilogo nicchia con punteggio                                   |
| Pannello prodotto       | estensione, pagine `/dp/`                   | stime, royalty, categorie, pulsanti Traccia ASIN e Reverse ASIN                                                                                                  |
| Deep View               | web app → Deep View                         | job eseguito dall'estensione: 1-5 pagine di risultati arricchite con i dati prodotto, tabella ordinabile, CSV                                                    |
| Reverse ASIN            | web app → Reverse ASIN                      | per quali keyword si posiziona un libro (candidate da titolo + autocomplete, verifica fino a 3 pagine)                                                           |
| Tracking                | web app → Tracking                          | posizione giornaliera delle keyword e storico BSR/prezzo/recensioni degli ASIN; alarm giornaliero nell'estensione all'ora scelta nelle Opzioni                   |
| Calcolatori             | web app → Calcolatori                       | BSR → vendite (fattori calibrabili) e royalty KDP cartaceo/Kindle, con tabella prezzo → royalty → copie/mese → ricavo mensile da un BSR obiettivo                |
| Calibrazione BSR        | web app → Impostazioni                      | inserisci coppie (BSR medio, copie vendute in N giorni) dai report KDP: il fattore di mercato italiano viene stimato dai tuoi dati                               |
| Confronto nicchie       | web app → Deep View → Confronta le nicchie  | tutti i Deep View in una tabella ordinabile (punteggio, domanda, concorrenza, prezzo, quota KDP), CSV                                                            |
| Keyword dei concorrenti | web app → Deep View → Reverse ASIN in massa | una sola ricerca per keyword verifica i primi N libri della nicchia; aggregato per keyword e proposta dei 7 campi KDP                                            |
| Inserzioni              | web app → Deep View → inserzioni            | lunghezza titoli, descrizioni, A+, termini ricorrenti dei top e cosa manca alla tua inserzione (libro segnato come «mio» nel tracking)                           |
| Avvisi                  | web app → Avvisi                            | dopo ogni tracking: posizioni perse/guadagnate, uscite dai risultati, BSR peggiorato/migliorato, prezzo, recensioni; soglie in Impostazioni, contatore nel popup |
| Stagionalità            | web app → Tracking → keyword                | serie giornaliera di risultati totali, vendite stimate top 10, prezzo e recensioni mediane su 12 mesi                                                            |
| Categorie               | web app → Categorie                         | scansione Best seller / Nuove uscite di una categoria (id dall'URL della classifica), riepilogo e tabella come nel Deep View                                     |
| Report                  | web app → Deep View → report                | pagina stampabile (PDF dal browser) e JSON                                                                                                                       |
| 7 campi KDP             | sessioni keyword e keyword dei concorrenti  | proposta dei 7 campi backend da 50 caratteri senza parole del titolo e senza ripetizioni                                                                         |

I job (Deep View, Reverse ASIN, tracking) vengono prelevati dall'estensione ogni minuto quando Chrome è aperto; dal popup «Esegui ora» li avvia subito.

## Script

| Comando                                                                 | Effetto                                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev:web` / `npm run dev:ext`                                   | sviluppo                                                                         |
| `npm run build` / `npm run test` / `npm run typecheck` / `npm run lint` | su tutti i workspace (gli stessi controlli girano in GitHub Actions a ogni push) |
| `npm run smoke`                                                         | verifica l'endpoint autocomplete amazon.it e il proxy della web app              |
| `npm run db:types`                                                      | rigenera i tipi TypeScript del DB (richiede `npx supabase login`)                |
| `npm run mint-token`                                                    | genera un token per l'estensione                                                 |

## Note importanti

- **Uso personale e responsabile.** Lo scraping avviene solo dal tuo browser (estensione), con al massimo 2-3 richieste
  simultanee, pause casuali, cache di 24 ore e stop automatico di 30 minuti se Amazon mostra un CAPTCHA. Nessun aggiramento.
  Tieni il volume sotto qualche centinaio di pagine al giorno. L'uso automatizzato può violare le condizioni d'uso di Amazon:
  valuta tu il rischio. I dati raccolti non vanno redistribuiti.
- **Le stime sono stime.** La curva BSR→vendite e i costi di stampa KDP sono valori iniziali indicativi, editabili nelle
  Impostazioni; verifica i costi di stampa su kdp.amazon.com/help prima di decidere un prezzo.
- Il tracking giornaliero gira dentro Chrome: Chrome deve essere aperto (o con "Continua a eseguire app in background").
- **Schema del database.** Le migrazioni in `supabase/migrations` hanno le stesse versioni registrate sul progetto hosted:
  le modifiche future vanno aggiunte come nuovo file e applicate con `npm run db:push` (dopo `npx supabase link`), poi `npm run db:types`.
- **Ponte web app → estensione.** Dalla pagina Impostazioni il token viene passato all'estensione solo verso l'origine della pagina
  stessa; per un host nuovo l'estensione chiede conferma con una finestra del browser.
