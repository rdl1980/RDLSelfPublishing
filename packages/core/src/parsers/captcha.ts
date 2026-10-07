import { BOT_CHALLENGE_RE } from '../locale/labels';
import { q, text } from './dom';

/** True se la pagina è la sfida anti-bot di Amazon ("Inserisci i caratteri", "Robot Check"). */
export function isBotChallenge(doc: Document): boolean {
  if (q(doc, '#captchacharacters, form[action*="validateCaptcha"]')) return true;
  const title = text(q(doc, 'title'));
  if (BOT_CHALLENGE_RE.test(title)) return true;
  // Pagine vere hanno molto contenuto: una sfida è piccola e contiene il testo tipico.
  const body = text(doc.body);
  return body.length < 5000 && BOT_CHALLENGE_RE.test(body);
}

export class BotChallengeError extends Error {
  constructor(public url: string) {
    super(`Amazon ha mostrato una verifica anti-bot per ${url}`);
    this.name = 'BotChallengeError';
  }
}
