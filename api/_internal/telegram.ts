import { Telegram } from 'telegraf';

const DEFAULT_TRUNCATION_LIMIT = 4096;
const TRUNCATED_MESSAGE = '**Truncated message, open on GitHub to read more**';

export function escape(text?: string | null): string {
  if (!text) {
    return '';
  }
  return text.replace(/([[]`*_])/g, '\\$1');
}

export function truncateMessage(header: string, body: string, footer = ''): string {
  const full = `${header}\n\n${body}\n${footer}`;
  if (full.length < DEFAULT_TRUNCATION_LIMIT) {
    return full;
  }
  const remaining = DEFAULT_TRUNCATION_LIMIT - header.length - footer.length - TRUNCATED_MESSAGE.length - 10;
  return `${header}\n\n${body.slice(0, remaining)}\n${TRUNCATED_MESSAGE}\n${footer}`;

}

export function replyer(chatId: string) {
  const telegram = new Telegram(process.env.BOT_TOKEN!);

  return (header: string, body?: string | null, footer?: string) => {
    const msg = body ? truncateMessage(header, body, footer) : truncateMessage('', header);

    return telegram.sendMessage(chatId, msg, {
      disable_web_page_preview: true,
      parse_mode: 'Markdown'
    }).then(() => undefined);
  };
}
