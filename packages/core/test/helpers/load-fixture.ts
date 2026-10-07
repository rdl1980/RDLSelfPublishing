import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';

const FIXTURES = join(__dirname, '..', 'fixtures');

export function loadFixture(name: string): Document {
  const html = readFileSync(join(FIXTURES, name), 'utf8');
  const { document } = parseHTML(html);
  return document as unknown as Document;
}

export function loadJsonFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')) as T;
}
