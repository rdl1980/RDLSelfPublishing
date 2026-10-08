import { describe, expect, it } from 'vitest';
import { sharedCandidatePool } from '../src/keywords/pool';

describe('sharedCandidatePool', () => {
  const titles = [
    { title: 'Agenda 2027 Settimanale: Planner 12 Mesi con Calendario', subtitle: null },
    { title: 'Agenda 2027 settimanale grande formato', subtitle: 'organizer per la famiglia' },
    { title: 'Agenda Settimanale 2027 A5 | Planner giornaliero', subtitle: null },
  ];

  it('mette prima le frasi extra, poi quelle condivise da più titoli', () => {
    const pool = sharedCandidatePool(titles, ['Agenda 2027'], { max: 10 });
    expect(pool[0]).toBe('agenda 2027');
    expect(pool).toContain('agenda 2027 settimanale');
    expect(pool.length).toBeLessThanOrEqual(10);
    expect(new Set(pool).size).toBe(pool.length);
  });

  it('rispetta il massimo e ignora titoli vuoti', () => {
    const pool = sharedCandidatePool([{ title: null }, ...titles], [], { max: 3 });
    expect(pool).toHaveLength(3);
  });
});
