import {NowRequest, NowResponse} from '@now/node';
import Telegraf, {Markup} from 'telegraf';
import * as circleci from './webhooks/circleci/[chatid]';
import * as github from './webhooks/github/[chatid]';
import * as gitlab from './webhooks/gitlab/[chatid]';
import * as netlify from './webhooks/netlify/[chatid]';
import * as generic from './webhooks/generic/[chatid]';
import {ok} from './_internal/responses';
import {toArgs} from './_internal/telegram';

const webhooks = [
  github,
  gitlab,
  circleci,
  netlify,
  generic
];

let serverUrl = '';

const bot = new Telegraf(process.env.BOT_TOKEN!, {
  username: 'developer_webhook_bot'
});

bot.start((ctx) => {
  ctx.reply('This bot forwards webhooks as chat messages');
});
bot.command('webhook', (ctx) => {
  const args = toArgs(ctx);
  // console.log(args);
  if (args.length > 0) {
    const webhook = webhooks.find((d) => d.NAME.toLowerCase() === args[0].toLowerCase());
    if (webhook) {
      const msg = webhook.webhookMessage(serverUrl, String(ctx.chat!.id));
      return ctx.replyWithMarkdown(msg);
    }
  }

  const buttons = webhooks.map((webhook) => {
    return Markup.callbackButton(webhook.NAME, webhook.NAME);
  });
  return ctx.reply('Available Webhook Providers', {
    reply_markup: Markup.inlineKeyboard(buttons)
  });
});

for (const webhook of webhooks) {
  bot.action(webhook.NAME, (ctx) => {
    const msg = webhook.webhookMessage(serverUrl, String(ctx.chat!.id));
    return ctx.replyWithMarkdown(msg);
  });
}


export default async function handle(req: NowRequest, res: NowResponse): Promise<void> {
  serverUrl = `https://${req.headers.host!}/api`;

  await bot.handleUpdate(req.body);

  return ok(res);
}
