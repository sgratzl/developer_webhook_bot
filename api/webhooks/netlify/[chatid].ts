import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ok } from '../../_internal/responses';
import { replier, escape } from '../../_internal/telegram';
import { createSecret } from '../../_internal/secret';

interface INetlifyMessage {
  name: string;
  state: 'ready' | 'building' | 'failed';
  buildid: string;
  sslurl: string;
  adminurl: string;
  deploysslurl: string;

  errormessage: null;

  committer: string;
  branch: string;

  summary: {
    status: 'ready';
    messages: {
      type: 'info';
      title: 'string';
      description: string;
      details: string;
    }[];
  };
  screenshoturl: string;
}
// https://app.netlify.com/sites/upsetjs/deploys/5e849340c9edf700064ebf61

export const NAME = 'Netlify';

export function webhookMessage(server: string, chatId: string): string {
  const url = `${server}/webhooks/netlify/${encodeURIComponent(chatId)}`;
  const secret = createSecret(chatId);

  return `Please use this webhook url:
  [${url}](${url})
  Secret: \`${secret}\`
  `;
}

function link(url: string | null, title: string) {
  if (!url) {
    return escape(title);
  }
  return `[${escape(title)}](${url})`;
}

export default async function handle(req: VercelRequest, res: VercelResponse): Promise<void> {
  const chatid = req.query.chatid! as string;

  //const signature = req.headers["X-Webhook-Signature"];
  const chatId = decodeURIComponent(chatid);
  //const secret = createSecret(chatId);

  //const decoded = JWT.decode(signature, secret, true, { iss: "netlify", verify_iss: true, algorithm: "HS256" })

  const body = req.body as unknown as INetlifyMessage;

  const reply = replier(chatId);

  const deploymentUrl = `${body.adminurl}/deploys/${body.buildid}`;
  const url = link(body.sslurl, `Netlify App ${body.name}`);

  switch (body.state) {
    case 'ready':
      await reply(`☀ ${url} was successfully ${link(deploymentUrl, 'deployed')}`);
      break;
    case 'failed':
      await reply(`🌩 ${url} failed to ${link(deploymentUrl, 'deploy')}`);
      break;
    default:
      await reply(`? ${url} ${body.state} to ${link(deploymentUrl, 'deploy')}`);
      break;

  }

  return ok(res);
}
