import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { supabaseSecretKey, supabaseUrl } from './env';

/** True se la chiave segreta è configurata (necessaria per job, ingest e API estensione). */
export function adminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}

export const ADMIN_MISSING_MESSAGE =
  'Server non configurato: manca SUPABASE_SECRET_KEY (in locale apps/web/.env.local, su Vercel in Settings → Environment Variables, poi redeploy)';

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Client con chiave segreta: bypassa la RLS. Solo per route /api/ext/* e server actions
 * che hanno già verificato l'identità dell'utente; filtrare SEMPRE per user_id.
 */
export function adminClient() {
  if (!cached) {
    cached = createClient<Database>(supabaseUrl(), supabaseSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
