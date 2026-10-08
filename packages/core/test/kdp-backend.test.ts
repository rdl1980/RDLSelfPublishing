import { describe, expect, it } from 'vitest';
import { suggestKdpKeywords } from '../src/keywords/kdp-backend';

describe('suggestKdpKeywords', () => {
  const candidates = [
    { phrase: 'agenda 2027 settimanale', weight: 10 },
    { phrase: 'planner settimanale', weight: 8 },
    { phrase: 'agenda giornaliera 2027', weight: 7 },
    { phrase: 'regalo per mamma', weight: 5 },
    { phrase: 'organizer famiglia', weight: 4 },
    { phrase: 'calendario annuale', weight: 3 },
  ];

  it('toglie le parole del titolo, non ripete parole, rispetta 7 campi da 50 caratteri', () => {
    const r = suggestKdpKeywords(candidates, {
      title: 'Agenda 2027',
      subtitle: 'La tua agenda settimanale',
    });
    expect(r.fields).toHaveLength(7);
    for (const f of r.fields) expect(f.length).toBeLessThanOrEqual(50);
    const all = r.fields.join(' ').split(' ').filter(Boolean);
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain('agenda');
    expect(all).not.toContain('2027');
    expect(all).not.toContain('settimanale');
    expect(all).toContain('planner');
    expect(all).toContain('giornaliera');
    expect(all).toContain('regalo');
    expect(all).toContain('mamma');
    expect(all).not.toContain('per'); // stopword
    expect(r.skippedTitleWords).toContain('agenda');
    expect(r.coveredWords).toBe(all.length);
    // la frase col peso più alto che ha parole nuove ("planner settimanale" → "planner") apre il primo campo
    expect(r.fields[0]!.startsWith('planner')).toBe(true);
  });

  it('tiene le frasi contigue quando ci stanno e segnala gli avanzi oltre la capienza', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      phrase: `parola${i} termine${i}`,
      weight: 120 - i,
    }));
    const r = suggestKdpKeywords(many, { fields: 2, maxLength: 30 });
    expect(r.fields).toHaveLength(2);
    expect(r.fields.every((f) => f.length <= 30)).toBe(true);
    expect(r.leftover.length).toBeGreaterThan(0);
    expect(r.fields[0]!.startsWith('parola0 termine0')).toBe(true);
  });
});
