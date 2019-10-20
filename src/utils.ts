
import {createHmac} from 'crypto';

const baseSecret = process.env.WEBHOOK_SECRET || process.env['developer-webhook-bot.WEBHOOK_SECRET']!;

export function createSecret(chatId: string) {
  return createHmac('sha1', chatId).update(Buffer.from(baseSecret)).digest('hex');
}

const DEFAULT_TRUNCATION_LIMIT = 4096;
const TRUNCATED_MESSAGE = '**Truncated message, open on GitHub to read more**';

export function truncateMessage(header: string, body: string, footer = '') {
  const full = `${header}\n\n${body}\n${footer}`;
  if (full.length < DEFAULT_TRUNCATION_LIMIT) {
    return full;
  }
  const remaining = DEFAULT_TRUNCATION_LIMIT - header.length - footer.length - TRUNCATED_MESSAGE.length - 10;
  return `${header}\n\n${body.slice(0, remaining)}\n${TRUNCATED_MESSAGE}\n${footer}`

}
