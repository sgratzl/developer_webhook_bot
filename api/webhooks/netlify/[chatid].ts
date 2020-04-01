import {NowRequest, NowResponse} from '@now/node';
import {ok} from '../../_internal/responses';
import {replyer} from '../../_internal/telegram';
import { createSecret } from '../../_internal/secret';

interface INetlifyMessage {
  dummy: string;
}

export const NAME = 'Netlify';

export function webhookMessage(server: string, chatId: string) {
  const url = `${server}/webhooks/netlify/${encodeURIComponent(chatId)}`;
  const secret = createSecret(chatId);

  return `Please use this webhook url:
  [${url}](${url})
  Secret: \`${secret}\`
  `;
}

export default async function handle(req: NowRequest, res: NowResponse) {
  const chatid = req.query.chatid! as string;

  //const signature = req.headers["X-Webhook-Signature"];
  const chatId = decodeURIComponent(chatid);
  //const secret = createSecret(chatId);

  //const decoded = JWT.decode(signature, secret, true, { iss: "netlify", verify_iss: true, algorithm: "HS256" })

  const body: INetlifyMessage = req.body;

  const reply = replyer(chatId);

  await reply(JSON.stringify(body));

  return ok(res);
}
