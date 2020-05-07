import { NowRequest, NowResponse } from '@now/node';
import { ok } from '../../_internal/responses';
import { replyer } from '../../_internal/telegram';

export const NAME = 'Generic';

export function webhookMessage(server: string, chatId: string) {
  const url = `${server}/webhooks/generic/${encodeURIComponent(chatId)}`;

  return `Please use this webhook url:
  [${url}](${url})
  `;
}

export default async function handle(req: NowRequest, res: NowResponse) {
  const chatid = req.query.chatid! as string;

  const chatId = decodeURIComponent(chatid);

  const reply = replyer(chatId);

  await reply(`new message received`, `
\`\`\`
${JSON.stringify(req.body, null, 1)}
\`\`\`
`);

  return ok(res);
}
