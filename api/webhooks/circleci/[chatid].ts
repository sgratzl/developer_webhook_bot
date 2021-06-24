import type { VercelRequest, VercelResponse } from '@vercel/node';
import {ok} from '../../_internal/responses';
import { replier, escape } from '../../_internal/telegram';

interface IMessage {
  fallback: string;
  text: string;
  color: string;
}

interface ICircleCIMessage {
  text: string;
  channel?: string;
  attachments: IMessage[];
}

export const NAME = 'CircleCI';

export function webhookMessage(server: string, chatId: string): string {
  const url = `${server}/webhooks/circleci/${encodeURIComponent(chatId)}`;
  return `Please use this webhook url:
  [${url}](${url})
  `;
}

export default async function handle(req: VercelRequest, res: VercelResponse): Promise<void> {
  const chatid = req.query.chatid! as string;

  const chatId = decodeURIComponent(chatid);

  const body = req.body as unknown as ICircleCIMessage;

  const reply = replier(chatId);

  await reply(escape(body.text));

  return ok(res);
}
