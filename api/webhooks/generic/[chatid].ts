import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ok } from '../../_internal/responses';
import { replier } from '../../_internal/telegram';

export const NAME = 'Generic';

export function webhookMessage(server: string, chatId: string): string {
  const url = `${server}/webhooks/generic/${encodeURIComponent(chatId)}`;

  return `Please use this webhook url:
  [${url}](${url})
  `;
}

export default async function handle(req: VercelRequest, res: VercelResponse): Promise<void> {
  const chatid = req.query.chatid! as string;

  const chatId = decodeURIComponent(chatid);

  const reply = replier(chatId);

  await reply('new message received', `
\`\`\`
${JSON.stringify(req.body, null, 1)}
\`\`\`
`);

  return ok(res);
}
