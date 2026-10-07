import { normalizeKeyword } from '@rdl/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/database.types';

type Client = SupabaseClient<Database>;

/** Trova o crea la riga in `keywords` per il testo dato e ritorna l'id. */
export async function ensureKeyword(supabase: Client, userId: string, text: string): Promise<string> {
  const normalized = normalizeKeyword(text);
  if (!normalized) throw new Error('Keyword vuota');
  const { data: existing } = await supabase
    .from('keywords')
    .select('id')
    .eq('user_id', userId)
    .eq('marketplace', 'it')
    .eq('normalized', normalized)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('keywords')
    .insert({ user_id: userId, marketplace: 'it', text: text.trim(), normalized })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Aggiunge una keyword al tracking (idempotente). */
export async function trackKeyword(supabase: Client, userId: string, text: string, alias = 'stripbooks'): Promise<void> {
  const keywordId = await ensureKeyword(supabase, userId, text);
  const { error } = await supabase
    .from('tracked_keywords')
    .upsert({ user_id: userId, keyword_id: keywordId, alias, active: true }, { onConflict: 'user_id,keyword_id,alias' });
  if (error) throw error;
}

export async function addKeywordToNiche(supabase: Client, userId: string, nicheId: string, text: string): Promise<void> {
  const keywordId = await ensureKeyword(supabase, userId, text);
  const { data: dup } = await supabase.from('niche_items').select('id').eq('niche_id', nicheId).eq('keyword_id', keywordId).maybeSingle();
  if (dup) return;
  const { error } = await supabase.from('niche_items').insert({ user_id: userId, niche_id: nicheId, kind: 'keyword', keyword_id: keywordId });
  if (error) throw error;
}

export async function addAsinToNiche(supabase: Client, userId: string, nicheId: string, asin: string, note?: string): Promise<void> {
  const { data: dup } = await supabase.from('niche_items').select('id').eq('niche_id', nicheId).eq('asin', asin).maybeSingle();
  if (dup) return;
  const { error } = await supabase.from('niche_items').insert({ user_id: userId, niche_id: nicheId, kind: 'asin', asin, note: note ?? null });
  if (error) throw error;
}
