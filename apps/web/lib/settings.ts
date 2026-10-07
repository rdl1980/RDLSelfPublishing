import { resolveAnchors, SCORE_WEIGHTS, type BsrOverrides, type ScoreWeights } from '@rdl/core';
import type { Json } from './supabase/database.types';

/** Struttura di profiles.settings (jsonb). Tutti i campi sono opzionali. */
export interface ProfileSettings {
  bsr?: BsrOverrides;
  score?: Partial<ScoreWeights>;
}

export function parseProfileSettings(raw: Json | null | undefined): ProfileSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as ProfileSettings;
}

export function anchorsFromSettings(s: ProfileSettings) {
  return resolveAnchors(s.bsr ?? null);
}

export function weightsFromSettings(s: ProfileSettings): ScoreWeights {
  return { ...SCORE_WEIGHTS, ...(s.score ?? {}) };
}
