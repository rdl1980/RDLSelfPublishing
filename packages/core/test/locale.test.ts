import { describe, expect, it } from 'vitest';
import { parseLocaleDate, daysSince } from '../src/locale/it-date';
import { formatEuroCents, formatIt, parseLocaleInt, parseLocaleNumber, parsePriceCents, parseRating } from '../src/locale/it-number';
import { detailKeyFor, detectFormat } from '../src/locale/labels';

describe('parseLocaleNumber', () => {
  it.each([
    ['5.432', 5432],
    ['5,432', 5432],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['94', 94],
    ['(94)', 94],
    ['7,99', 7.99],
    ['7.99', 7.99],
    ['1.234.567', 1234567],
    ['12.5', 12.5],
  ])('%s → %s', (input, expected) => {
    expect(parseLocaleNumber(input)).toBe(expected);
  });
  it('ritorna null senza cifre', () => {
    expect(parseLocaleNumber('abc')).toBeNull();
    expect(parseLocaleNumber('')).toBeNull();
  });
});

describe('parsePriceCents', () => {
  it.each([
    ['€7,99', 799],
    ['7,99 €', 799],
    ['€1.234,56', 123456],
    ['$7.99', 799],
    ['Prezzo: 12,00 €', 1200],
  ])('%s → %s', (input, expected) => {
    expect(parsePriceCents(input)).toBe(expected);
  });
});

describe('parseRating / parseLocaleInt', () => {
  it('rating IT ed EN', () => {
    expect(parseRating('4,6 su 5 stelle')).toBe(4.6);
    expect(parseRating('4.6 out of 5 stars')).toBe(4.6);
    expect(parseRating('5 su 5 stelle')).toBe(5);
  });
  it('interi', () => {
    expect(parseLocaleInt('n. 5.432 in Libri')).toBe(5432);
    expect(parseLocaleInt('(417)')).toBe(417);
  });
});

describe('parseLocaleDate', () => {
  it.each([
    ['4 ott 2023', '2023-10-04'],
    ['4 ottobre 2023', '2023-10-04'],
    ['4 Oct. 2023', '2023-10-04'],
    ['Oct 4, 2023', '2023-10-04'],
    ['2 giu 2026', '2026-06-02'],
    ['2023-10-04', '2023-10-04'],
    ['11 Apr 2024', '2024-04-11'],
  ])('%s → %s', (input, expected) => {
    expect(parseLocaleDate(input)).toBe(expected);
  });
  it('daysSince', () => {
    expect(daysSince('2026-10-01', new Date('2026-10-07T12:00:00Z'))).toBe(6);
    expect(daysSince(null)).toBeNull();
  });
});

describe('formatIt / formatEuroCents', () => {
  it('separatori italiani deterministici', () => {
    expect(formatIt(2252)).toBe('2.252');
    expect(formatIt(1234567.891, 1)).toBe('1.234.567,9');
    expect(formatIt(7.99, 2)).toBe('7,99');
    expect(formatIt(0.4, 1)).toBe('0,4');
    expect(formatEuroCents(234915)).toBe('2.349,15 €');
  });
});

describe('labels', () => {
  it('riconosce etichette IT ed EN', () => {
    expect(detailKeyFor('Editore ‏ : ‎')).toBe('publisher');
    expect(detailKeyFor('Publisher')).toBe('publisher');
    expect(detailKeyFor('Lunghezza stampa')).toBe('printLength');
    expect(detailKeyFor('Best Sellers Rank')).toBe('bsr');
    expect(detailKeyFor('Posizione nella classifica Bestseller di Amazon')).toBe('bsr');
    expect(detailKeyFor('Sconosciuto')).toBeNull();
  });
  it('formati', () => {
    expect(detectFormat('Copertina flessibile')).toBe('paperback');
    expect(detectFormat('Hardcover')).toBe('hardcover');
    expect(detectFormat('Formato Kindle')).toBe('kindle');
  });
});
