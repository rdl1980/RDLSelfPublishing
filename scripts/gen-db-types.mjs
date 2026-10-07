// Rigenera apps/web/lib/supabase/database.types.ts dal progetto Supabase collegato.
// Richiede: npx supabase login && npx supabase link --project-ref <ref>
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const ref = process.env.SUPABASE_PROJECT_REF ?? 'qxqqlvzrkzxgvkszemme';
const out = execSync(`npx supabase gen types typescript --project-id ${ref} --schema public`, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
writeFileSync(new URL('../apps/web/lib/supabase/database.types.ts', import.meta.url), out);
console.log('Tipi aggiornati in apps/web/lib/supabase/database.types.ts');
