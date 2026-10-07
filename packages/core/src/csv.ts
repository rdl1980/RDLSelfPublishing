export interface CsvColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number | null | undefined;
}

export interface CsvOptions {
  separator?: string;
  bom?: boolean;
  decimalComma?: boolean;
}

function escapeCell(v: unknown, sep: string, decimalComma: boolean): string {
  if (v == null) return '';
  let s: string;
  if (typeof v === 'number') s = decimalComma ? String(v).replace('.', ',') : String(v);
  else if (typeof v === 'boolean') s = v ? 'sì' : 'no';
  else if (v instanceof Date) s = v.toISOString().slice(0, 10);
  else s = String(v);
  if (s.includes(sep) || s.includes('"') || /[\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** CSV pronto per Excel italiano: separatore ";", virgola decimale, BOM UTF-8. */
export function toCsv<T extends object>(rows: T[], columns: CsvColumn<T>[], opts: CsvOptions = {}): string {
  const sep = opts.separator ?? ';';
  const decimalComma = opts.decimalComma ?? sep === ';';
  const header = columns.map((c) => escapeCell(c.label, sep, decimalComma)).join(sep);
  const lines = rows.map((r) =>
    columns
      .map((c) => escapeCell(c.format ? c.format(r) : (r as Record<string, unknown>)[c.key as string], sep, decimalComma))
      .join(sep),
  );
  return (opts.bom === false ? '' : '﻿') + [header, ...lines].join('\r\n') + '\r\n';
}
