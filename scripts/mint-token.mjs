// Genera un token per l'estensione e stampa l'hash sha256 da inserire in api_tokens.
// Uso: node scripts/mint-token.mjs [etichetta]
import { createHash, randomBytes } from 'node:crypto';

const label = process.argv[2] ?? 'estensione';
const token = 'rdl_' + randomBytes(32).toString('base64url');
const hash = createHash('sha256').update(token).digest('hex');

console.log('Token (da incollare nelle Opzioni dell\'estensione, mostrato una sola volta):');
console.log(token);
console.log('\nSQL da eseguire su Supabase (sostituisci <user_id> con l\'uuid del tuo utente):');
console.log(`insert into public.api_tokens (user_id, token_hash, label) values ('<user_id>', '${hash}', '${label.replace(/'/g, "''")}');`);
