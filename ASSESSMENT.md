# Assessment: dove siamo e cosa manca

Data: 8 ottobre 2026. Commit analizzato: `110524c` (branch `main`, albero di lavoro pulito, nessuna modifica non committata).
Verifiche eseguite in una sessione cloud pulita (Node 22.22, npm 10.9) e, per lo stato reale di produzione, interrogando direttamente il database Supabase.

## In sintesi

- **Tutte le cinque fasi del piano sono implementate** e il codice compila, passa typecheck, lint e i 76 test del core.
- **La catena completa web app → coda job → estensione (offscreen) → ingest → riepilogo funziona davvero**: nel database ci sono 3 Deep View completati il 7 ottobre sera, eseguiti dall'estensione, con 38 prodotti e 6 pagine SERP salvati.
- **Mai usati finora**: ricerca keyword con salvataggio sessione, nicchie, Reverse ASIN, tracking keyword e ASIN (tabelle vuote). Sono scritti ma non provati end to end.
- **Non verificabile da qui**: le variabili d'ambiente su Vercel (l'API Vercel rifiuta lo scope del team con 403, e il proxy della sessione cloud blocca `*.vercel.app`) e la disattivazione del signup su Supabase Auth (configurazione non leggibile via SQL).
- **Tre cose da sistemare prima di andare avanti**: il ponte web app → estensione accetta il token da qualsiasi sito `*.vercel.app` (rischio di dirottamento); la cronologia migrazioni sul DB ha nomi diversi dai file in `supabase/migrations`, quindi `npm run db:push` andrebbe in conflitto; tre avvisi di sicurezza del linter Supabase (funzioni con `search_path` mutabile e `handle_new_user` eseguibile da anon).

## 1. Stato per fase

Legenda: **Implementato** = codice presente; **Verificato** = coperto da test automatici o confermato da dati reali in produzione; **Solo scritto** = funziona a build ma nessuno lo ha ancora esercitato.

| Fase | Implementato | Verificato | Solo scritto / non provato |
|---|---|---|---|
| **0 · Scaffold** | Monorepo npm (3 workspace), TypeScript strict, Prettier, `.editorconfig`, `.gitattributes` LF, schema Supabase in 5 migrazioni, login Supabase, estensione WXT | `npm install`, `typecheck`, `lint`, `build` verdi su tutti i workspace; 18 tabelle con RLS attiva sul progetto hosted | Nessuna CI (manca `.github/workflows`): i controlli girano solo a mano |
| **1 · Core** | Parser SERP e pagina prodotto (IT/EN), layout a tabella, Kindle Unlimited, titoli sponsorizzati, BSR con DOM e fallback testuale, curva BSR→vendite, royalty KDP (IVA 4%, fasce 50/60%), punteggio nicchia, espansione keyword, protocollo job con Zod | 76 test in 7 file, 10 fixture reali (3 SERP, 6 prodotto, 1 autocomplete). Il parser prodotto ha retto su 38 ASIN reali in produzione | Nessuna fixture per: ebook Kindle (`digital-text`), hardcover come pagina prodotto, pagina CAPTCHA (rilevamento testato solo in negativo), audiolibri. Ancore BSR e costi KDP sono stime marcate DA VERIFICARE |
| **2 · Web app** | Login, ricerca keyword con sessioni e CSV, calcolatori BSR e royalty, nicchie, Deep View, Reverse ASIN, impostazioni con token, 13 route API, proxy middleware | Build produzione: 25 route, nessun errore. Deep View usato in produzione (3 run completi, riepilogo nicchia calcolato). Pagina Impostazioni usata (2 token generati) | Sessioni keyword (0 righe), nicchie (0), Reverse ASIN (0 run), tracking (0): nessuna delle quattro è stata provata con login reale. Nessun test automatico su `lib/db` |
| **3 · Estensione Quick View** | Badge per card su `amazon.it/s`, riepilogo nicchia, pannello prodotto su `/dp/`, cache 24h, coda di sync offline, badge sull'icona, pausa 30 min su CAPTCHA, ponte con la web app | Build MV3 ok (1,18 MB). 2 snapshot `quick_view` in produzione: il Quick View ha parlato con l'API almeno una volta | Pannello prodotto: 0 snapshot `product_page`, quindi mai sincronizzato. Nessun test automatico. Estensione senza script `lint` |
| **4 · Coda job** | `claim_jobs` atomico con `skip locked`, requeue dopo 15 min senza heartbeat, chunk con stato ripristinabile, offscreen document, retry con backoff, annullamento da web app (409) | **Verificato in produzione**: 3 job `deep_view` `done` al primo tentativo, worker `ext-r4lj6c7j`, da 2 a 4 chunk ciascuno, 35 prodotti arricchiti in 1m43s | Reverse ASIN mai lanciato. Job `enrich_asins`, `category_scan`, `ai_reserved` senza UI |
| **5 · Tracking** | Tabelle, materializzazione giornaliera idempotente (`dedupe_key`), job `track_keyword` e `track_asins`, alarm giornaliero nell'estensione, pagine con grafici Recharts | Nessuna evidenza: 0 keyword tracciate, 0 ASIN tracciati, 0 rank snapshot | Tutto il flusso (alarm, materialize, run, grafici) è da provare in Chrome reale |

## 2. Verifica concreta del codice (risultati reali)

Eseguito nell'ordine, dalla radice del repo:

| Comando | Esito | Note |
|---|---|---|
| `npm install` | OK | 8 vulnerabilità segnalate da `npm audit` (1 moderata, 5 alte, 2 critiche), tutte in dipendenze **di sviluppo**: `tinypool`/`@vitest/mocker` (via vitest 3, fix = vitest 5, breaking) e `braces`/`micromatch` (via `eslint-config-next`). Nessuna nel bundle runtime |
| `npm run typecheck` | OK | 3 workspace: extension (`wxt prepare` + tsc), web (`next typegen` + tsc), core |
| `npm run lint` | OK | Solo web e core hanno lo script; **l'estensione non ha lint** |
| `npm run test` | **76/76 passati** | 7 file: models (15), keywords (13), locale (29), search-page (8), product-page (7), smoke (1), product-page-layouts (3). Durata 2,4 s |
| `npm run build` | OK | Estensione: 1,18 MB totali (content script 341-353 kB ciascuno). Web: compilazione 9,8 s, 25 route, tutte dinamiche tranne `_not-found` |

Stato del database di produzione (progetto `qxqqlvzrkzxgvkszemme`, letto l'8 ottobre):

| Tabella | Righe | Lettura |
|---|---|---|
| `auth.users` / `profiles` | 1 / 1 | utente creato, trigger `handle_new_user` ha funzionato |
| `api_tokens` attivi | 2 | il secondo ha `last_used_at` 7 ott 21:27 UTC; il primo mai usato (probabilmente il tentativo prima del ponte) |
| `jobs` | 3 | tutti `deep_view`, tutti `done`, 1 tentativo |
| `deep_views` | 3 | tutti con `summary` calcolato |
| `products` / `product_snapshots` | 38 / 41 | 39 snapshot da `deep_view`, 2 da `quick_view`, 0 da `product_page`, 0 da `tracker` |
| `serp_snapshots` / `serp_items` | 6 / 44 | |
| `keywords` | 2 | create dai Deep View, non dalla ricerca keyword |
| `research_sessions`, `niches`, `reverse_asin_runs`, `tracked_*`, `keyword_rank_snapshots` | 0 | mai usati |

Due osservazioni dai dati:
- La keyword "algoritmo che governa" è stata lanciata due volte in 4 minuti (job identici): **nessuna deduplica sui Deep View**. Piccolo spreco, ma facile da evitare con una `dedupe_key` a finestra temporale.
- Su quei due job il progresso mostra `4/98` a fine lavoro: il totale è stimato come `pagine × 48` finché la SERP non è completa e non viene corretto quando i risultati sono pochi (3). Solo cosmetico, ma confonde.

## 3. Lacune note, controllate una per una

### 3.1 `SUPABASE_SECRET_KEY` su Vercel
**Non verificabile da questa sessione.** L'API Vercel risponde 403 sullo scope `rdl1980s-projects` (il token del connettore non copre il team) e il proxy di rete della sessione rifiuta le connessioni verso `*.vercel.app`, quindi non ho potuto nemmeno chiamare `/api/ext/me` per distinguere 503 (chiave mancante) da 401 (chiave presente, token errato).
Indizio indiretto: i 3 job del 7 ottobre sono stati prelevati e completati tramite `/api/ext/*`, quindi almeno un'istanza della web app aveva la chiave. Non so se fosse `localhost:3000` o Vercel. **Da confermare tu**: apri `https://rdl-self-publishing-rdl1980s-projects.vercel.app/api/ext/me` nel browser: se risponde `{"error":"Token non valido o mancante"}` (401) la chiave c'è; se risponde 503 va aggiunta in Settings → Environment Variables e rideployato.

### 3.2 Signup su Supabase Auth
La configurazione Auth non è leggibile via SQL. Il linter Supabase segnala inoltre **Leaked Password Protection disattivata** (controllo contro HaveIBeenPwned): con un solo utente è secondario, ma si attiva con un clic in Authentication → Providers → Email.
Da fare a mano in dashboard: Authentication → Sign In / Up → disattiva "Allow new users to sign up"; Authentication → URL Configuration → Site URL e Redirect URLs con l'URL Vercel.

### 3.3 Fixture e copertura dei layout Amazon
Il commit `110524c` ha aggiunto 3 fixture prodotto (layout a tabella Moleskine `B0G41L9ZHY`, Demetra `8844072904` senza rank di store, KDP `B0HFQRFS88` con categorie anomale) e i relativi test: coperti. Il prezzo Kindle Unlimited "0,00 €" e il prefisso "Annuncio sponsorizzato" sono testati sulle SERP.
Mancano:
- fixture **ebook Kindle** (pagina `/dp/` con `#kindle-price`, BSR nello Store Kindle) e SERP con alias `digital-text`: il ramo `bsrStore = 'kindle'` è testato solo via `parseBsrText`, non su DOM reale;
- fixture **pagina CAPTCHA**: `isBotChallenge` è verificato solo come falso su pagine buone; un falso negativo qui significa salvare spazzatura in `products`;
- fixture **hardcover come pagina prodotto** e **audiolibro** (formato `audiobook` esiste nei tipi ma nessun test lo esercita);
- test del **parser URL di ricerca** con filtri (`rh=`, `i=`), che nelle SERP reali compaiono spesso.

### 3.4 Costi di stampa KDP e ancore BSR
In `packages/core/src/config`:
- `kdp-print-costs.eu.ts`: tabella costi con `effectiveDate` 2025-06-10 e fasce royalty 50% sotto 9,99 € / 60% sopra, entrambe marcate DA VERIFICARE. Il commento promette override da `profiles.settings.kdp`, **ma `apps/web/lib/settings.ts` gestisce solo `bsr` e `score`**: l'override KDP non esiste (la pagina Impostazioni lo dice onestamente).
- `bsr-anchors.it.ts`: ancore .com da calcolatori di settore, mercato IT scalato con fattore 0,12 (libri) e 0,10 (Kindle). Il fattore è modificabile dal calcolatore BSR. Nessun dato reale è stato ancora usato per calibrare: serve almeno una coppia (BSR osservato, copie/giorno dal report KDP) per libro tuo.
- `score-weights.ts`: pesi e soglie plausibili ma arbitrari (600 vendite/mese nei top 10 = 100 punti di domanda). Sul Deep View "agenda 2027" il punteggio è uscito 81, su "algoritmo che governa" 56: ordine sensato, ma andrebbe tarato su 10-20 nicchie che conosci.

### 3.5 Test automatici solo sul core
Confermato: `apps/web` e `apps/extension` non hanno né test né (per l'estensione) lint. La logica a rischio più alto senza test è `apps/web/lib/db/jobs.ts` (`applyProgress`, `completeJob`, `failJob`) e `ingest.ts`: sono le funzioni che scrivono nel DB e hanno già mostrato un bug (il `last_used_at` sistemato in `110524c`).

### 3.6 Pagine web non provate con login reale
Provate (dati in DB): login, Impostazioni/token, Deep View (form, dettaglio, riepilogo). Non provate: Keyword (ricerca, sessioni, CSV), Nicchie, Reverse ASIN, Tracking keyword e ASIN, Calcolatori (nessuna persistenza, quindi non rilevabile), pagina Prodotto `/prodotti/[asin]`.

### 3.7 Alarm giornaliero e offscreen runner in Chrome reale
- **Offscreen runner: provato.** I 3 Deep View sono passati dal documento offscreen (è l'unico percorso di esecuzione dei job).
- **Alarm `tracking:daily`: non provato.** Dipende da Chrome aperto all'ora impostata, da `chrome.alarms` che sopravvive al riavvio e dalla deduplica `lastTrackingDay`. Da provare con "Esegui tracking ora" dal popup prima di fidarsi dell'alarm.

### 3.8 CAPTCHA: solo pausa 30 minuti
Confermato. Alla prima `BotChallengeError` l'estensione mette in pausa 30 minuti, segna il job `pending` con `retryAfterMs`, e mostra un avviso nel Quick View. Mancano: notifica all'utente (notification API), apertura automatica di una scheda Amazon per risolvere il CAPTCHA a mano, e riconoscimento delle altre pagine interstiziali di Amazon (login wall, "Continua a fare acquisti") che non sono CAPTCHA ma non sono nemmeno pagine prodotto.

### 3.9 Fuori MVP (non toccati, come da piano)
Category explorer (`category_scan` è solo un tipo nel DB), strumenti AI per le inserzioni (`apps/web/lib/ai/README.md` è un segnaposto, `ai_reserved` idem), auth multiutente e Stripe (`profiles.plan` esiste ma vale solo `free`), pubblicazione su Chrome Web Store.

## 4. Rischi tecnici e debito

In ordine di gravità.

1. **Ponte web app → estensione troppo permissivo** (`apps/extension/entrypoints/webapp.content.ts`). Il content script gira su `https://*.vercel.app/*` e accetta `postMessage` di tipo `connect` da qualunque pagina su cui è iniettato: **qualsiasi sito ospitato su vercel.app** può sovrascrivere URL e token dell'estensione e dirottare verso il proprio server tutto ciò che il Quick View raccoglie. Fix: limitare `matches` e `host_permissions` all'host esatto del deploy (o leggerlo dalle Opzioni), e chiedere conferma nell'estensione prima di salvare un token arrivato dalla pagina.

2. **Cronologia migrazioni disallineata.** Sul DB le 5 migrazioni risultano con versione `20261007160940…20261007161308` (applicate il 7 ottobre via MCP), mentre i file in `supabase/migrations` si chiamano `20260101000000…000400`. `npm run db:push` tenterebbe di riapplicare le 5 migrazioni e fallirebbe su `create type job_status`. Fix: rinominare i file con le versioni presenti nel DB (o `supabase migration repair`), poi usare solo `db:push` per le modifiche future.

3. **Avvisi di sicurezza del linter Supabase** (letti l'8 ottobre):
   - `claim_jobs` e `requeue_stale_jobs` hanno `search_path` mutabile: aggiungere `set search_path = public` alla definizione;
   - `handle_new_user()` è `SECURITY DEFINER` ed eseguibile da `anon` e `authenticated` via `/rest/v1/rpc`: revocare `execute` (serve solo al trigger);
   - `pg_trgm` installata in `public`: spostarla in `extensions`.
   Nessuno dei tre è sfruttabile oggi (un solo utente, nessun signup), ma sono correzioni da 10 minuti.

4. **Duplicazione tra Quick View e job runner.** `QuickViewApp.tsx` (content script) e `job-runner.ts` → `enrichAsins` (offscreen) fanno la stessa cosa: cache → `fetchAmazonDocument` → `parseProductPage` → `cache:put` → `products:put`, con due implementazioni della gestione errori e del rilevamento bot. Ogni fix al parser o al throttling va fatto due volte. Fix: estrarre un modulo `lib/enrich.ts` usato da entrambi, con il content script che passa solo i callback di UI.

5. **Autocomplete via server.** `/api/autocomplete` chiama `completion.amazon.it` **dal server Vercel** (con cache 10 min e 10 req/s per utente). È una chiamata API, non scraping di pagine, ma viola lo spirito del vincolo "niente richieste ad Amazon lato server" e usa IP condivisi Vercel che Amazon potrebbe limitare. Alternativa: fare le chiamate di espansione dall'estensione (ha già `host_permissions` su `completion.amazon.it`) con la web app che le accoda come job `expand_keyword`.

6. **Service worker MV3 e job lunghi.** Lo stato `running`/`currentJobId` vive in memoria del service worker; se Chrome lo termina a metà job, il job resta `running` sul server fino al requeue a 15 minuti. Lo stato locale `jobState:<id>` permette di riprendere senza rifare i chunk, quindi il danno è solo il ritardo. Accettabile per uso personale; da documentare.

7. **Fine riga e formattazione.** Nessun problema: `.gitattributes` forza LF, tutti i 183 file di testo tracciati sono LF, `.editorconfig` e Prettier presenti. Il flag `*.html -diff` tiene i diff puliti sulle fixture.

8. **Dipendenze.** Next 16.4 / React 19.3 / Tailwind 4 / WXT 0.21.4 / Supabase SSR 0.12 / Zod 4: tutte recenti e coerenti tra loro, build pulita. Due punti di attenzione: vitest 3 porta dipendenze dev con CVE critiche (passaggio a vitest 5 da pianificare, cambia poco per 7 file di test); `eslint-config-next` trascina `braces` vulnerabile (solo lint, nessun impatto runtime). `database.types.ts` (1015 righe) è generato: ogni modifica di schema richiede `npm run db:types`.

9. **`claim_jobs` e `requeue_stale_jobs` solo via service role.** Scelta corretta (revoca di `execute` a `anon`/`authenticated` presente nella migrazione): il worker non ha mai la chiave segreta, parla solo con `/api/ext/*` che verifica il token hash SHA-256. Il limite è che `requeue` gira a ogni `claim`, cioè ogni minuto con Chrome aperto: va bene con un utente, non scala, e non parte mai se Chrome è chiuso (ma in quel caso nessun job può essere `running`).

10. **Piccoli bug trovati leggendo il codice e i dati:**
    - progresso `done/total` gonfiato finché la SERP non è completa (vedi §2);
    - Deep View identici non deduplicati;
    - `estMonthlyRevenueTop10Cents` esce 0 quando i top 10 hanno vendite ma prezzo mancante (job "algoritmo che governa": 4,1 vendite/mese, ricavo 0);
    - `apiFetch` nell'estensione non ha timeout: un server che non risponde blocca il chunk finché Chrome non chiude il fetch;
    - `webapp.content.ts` risponde al `ping` con `postMessage('*')` senza controllare l'origine (collegato al punto 1).

## 5. Roadmap proposta (2-3 iterazioni)

Stime in ore di lavoro effettivo con l'assistente, escluse le tue prove manuali in Chrome.

### Iterazione 1 · Mettere in sicurezza e chiudere il giro (6-8 ore)
Obiettivo: ogni funzione dell'MVP provata almeno una volta in produzione, niente buchi noti.
1. Conferma manuale: `SUPABASE_SECRET_KEY` su Vercel, signup disattivato, Redirect URLs, Leaked Password Protection (tu, 15 min).
2. Ponte estensione: host esatto in `matches`/`host_permissions`, conferma prima di salvare il token (1 h).
3. Linter Supabase: `search_path` sulle due funzioni, revoca su `handle_new_user`, `pg_trgm` fuori da `public`; nuova migrazione e allineamento delle versioni (1 h).
4. Fix piccoli: progresso totale, dedupe Deep View (chiave `deep_view:<keyword>:<alias>:<pages>:<giorno>`), timeout su `apiFetch`, ricavo con prezzo mancante (1,5 h).
5. Script `lint` nell'estensione e workflow GitHub Actions con `typecheck`, `lint`, `test`, `build` su ogni push (1 h).
6. Prova end to end guidata di tracking (1 keyword + 1 ASIN, "Esegui ora", grafici il giorno dopo), Reverse ASIN e ricerca keyword con sessione salvata; correzione di ciò che emerge (2-3 h).

### Iterazione 2 · Qualità dei dati e dei numeri (8-10 ore)
Obiettivo: fidarsi delle stime.
1. Fixture ebook Kindle (prodotto + SERP `digital-text`), pagina CAPTCHA, hardcover, URL di ricerca con filtri; test relativi (2 h, serve che tu salvi le pagine con "dev:save-fixture").
2. Verifica costi di stampa KDP EU e fasce royalty sulle pagine ufficiali, aggiornamento di `kdp-print-costs.eu.ts` e implementazione dell'override `profiles.settings.kdp` con UI in Impostazioni (2 h).
3. Calibrazione BSR: form in Impostazioni per inserire coppie (BSR, copie/giorno) dai tuoi report KDP e ricalcolo del fattore IT; stesso per le soglie del punteggio nicchia su 10-20 nicchie note (2-3 h + i tuoi dati).
4. Modulo condiviso `enrich` per Quick View e job runner, eliminando la duplicazione (2 h).
5. Test su `lib/db/jobs.ts` e `ingest.ts` con un branch Supabase o un client finto (2 h).

### Iterazione 3 · Robustezza d'uso quotidiano (6-8 ore)
Obiettivo: lasciarlo girare per settimane senza sorprese.
1. CAPTCHA: notifica Chrome, pulsante "Apri Amazon e risolvi", riconoscimento delle pagine interstiziali non CAPTCHA (2 h).
2. Espansione keyword spostata nell'estensione (job `expand_keyword`) per togliere la chiamata server verso Amazon (2-3 h).
3. Passaggio a vitest 5 e pulizia `npm audit` (1 h).
4. Pagina "Stato" nella web app: ultimo tracking eseguito, job falliti, pause anti-bot, dimensione cache (1,5 h).
5. Backlog post MVP da decidere insieme: category explorer, strumenti AI per titolo/descrizione/keyword backend (riservato in `lib/ai`), eventuale pubblicazione privata su Chrome Web Store.

## Allegato: come ho verificato

- Repo: `git status` pulito, `git log` con 10 commit da `6b0a023` a `110524c`, nessuna PR aperta su GitHub.
- Comandi: `npm install`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm audit`, `git ls-files --eol`.
- Supabase (MCP): `list_tables`, `list_migrations`, `get_advisors security`, query SQL di conteggio su tutte le tabelle, dettaglio dei 3 job e dei token.
- Vercel: `list_projects` ha trovato `rdl-self-publishing` (`prj_8YFi6IA64Ppgd2cWfHVMEmJ4fvNh`); `filter_project_envs` e `list_deployments` rifiutati con 403 sullo scope del team; `curl` verso l'URL di produzione bloccato dal proxy della sessione.
- Lettura integrale di: `background.ts`, `orchestrator.ts`, `job-runner.ts`, `sync.ts`, `cache.ts`, `throttle.ts`, `fetch-amazon.ts`, `webapp.content.ts`, i due content script Amazon, `QuickViewApp.tsx`, `ProductPanel.tsx`, `ext-auth.ts`, `lib/db/{jobs,ingest,tracking}.ts`, `proxy.ts`, `autocomplete-proxy.ts`, `TokensPanel.tsx`, `ExtensionBridge.tsx`, i parser e i test del core, le 5 migrazioni, i 4 file di config del core, gli script.
