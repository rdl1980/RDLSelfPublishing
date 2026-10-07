import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from '../src/index';

describe('core', () => {
  it('esporta la versione', () => {
    expect(CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
