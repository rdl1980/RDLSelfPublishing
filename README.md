# RDL Self Publishing

Ricerca di mercato e tracking per autori Amazon KDP, **solo amazon.it**. Web app + estensione Chrome.
Alternativa personale a Self Publishing Titans limitata alla parte di ricerca.

## Struttura

| Cartella | Cosa contiene |
|---|---|
| `apps/web` | Web app Next.js (login Supabase, keyword research, calcolatori, Deep View, tracking, API per l'estensione) |
| `apps/extension` | Estensione Chrome (WXT, Manifest V3): Quick View sulle ricerche amazon.it, pannello prodotto, esecuzione job |
| `packages/core` | Logica condivisa in TypeScript puro: parser delle pagine amazon.it, modelli BSR→vendite, royalty, keyword |
| `supabase/migrations` | Schema del database (copia versionata di ciò che è applicato al progetto Supabase) |
| `scripts` | Utility: generazione token estensione, tipi DB, smoke test autocomplete |

## Requisiti

Node 22+ (consigliato 24), npm 10+, Chrome. Nessun Docker: Supabase è hosted.

## Setup

```bash
npm install
```

1. **Supabase**: il progetto hosted è `RDLSelfPublishing` (ref `qxqqlvzrkzxgvkszemme`, regione eu-central-1).
   - Dashboard → Authentication → Providers → Email: lascia attivo; in *Sign In / Up* disattiva "Allow new users to sign up".
   - Authentication → Users → *Add user* → crea il tuo utente con email e password (conferma automatica).
   - Project Settings → API Keys → copia la chiave **secret** in `apps/web/.env.local` come `SUPABASE_SECRET_KEY`.
2. **Web app**: `npm run dev:web` → http://localhost:3000 → login.
3. **Token estensione**: `npm run mint-token` stampa il token e l'SQL da eseguire nell'SQL editor di Supabase
   (serve l'uuid dell'utente: Authentication → Users). In alternativa la pagina Impostazioni della web app.
4. **Estensione**: `npm run dev:ext` (oppure `npm run build -w @rdl/extension`), poi Chrome → `chrome://extensions`
   → Modalità sviluppatore → *Carica estensione non pacchettizzata* → `apps/extension/.output/chrome-mv3`.
   Apri le Opzioni dell'estensione, inserisci URL della web app e token, "Salva e verifica".

## Script

| Comando | Effetto |
|---|---|
| `npm run dev:web` / `npm run dev:ext` | sviluppo |
| `npm run build` / `npm run test` / `npm run typecheck` / `npm run lint` | su tutti i workspace |
| `npm run smoke` | verifica l'endpoint autocomplete amazon.it e il proxy della web app |
| `npm run db:types` | rigenera i tipi TypeScript del DB (richiede `npx supabase login`) |
| `npm run mint-token` | genera un token per l'estensione |

## Note importanti

- **Uso personale e responsabile.** Lo scraping avviene solo dal tuo browser (estensione), con al massimo 2-3 richieste
  simultanee, pause casuali, cache di 24 ore e stop automatico di 30 minuti se Amazon mostra un CAPTCHA. Nessun aggiramento.
  Tieni il volume sotto qualche centinaio di pagine al giorno. L'uso automatizzato può violare le condizioni d'uso di Amazon:
  valuta tu il rischio. I dati raccolti non vanno redistribuiti.
- **Le stime sono stime.** La curva BSR→vendite e i costi di stampa KDP sono valori iniziali indicativi, editabili nelle
  Impostazioni; verifica i costi di stampa su kdp.amazon.com/help prima di decidere un prezzo.
- Il tracking giornaliero gira dentro Chrome: Chrome deve essere aperto (o con "Continua a eseguire app in background").
