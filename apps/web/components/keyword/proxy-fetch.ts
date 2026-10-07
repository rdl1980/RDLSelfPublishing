'use client';

import type { FetchLike } from '@rdl/core';

/** fetch "compatibile" con core.fetchSuggestions che passa dal proxy /api/autocomplete. */
export const proxyFetch: FetchLike = (input, init) => {
  const u = new URL(input);
  const q = u.searchParams.get('prefix') ?? '';
  const alias = u.searchParams.get('alias') ?? 'stripbooks';
  return fetch(`/api/autocomplete?q=${encodeURIComponent(q)}&alias=${encodeURIComponent(alias)}`, { signal: init?.signal });
};
