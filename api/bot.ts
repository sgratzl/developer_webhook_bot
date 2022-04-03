import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Markup, Telegraf, } from 'telegraf';
import * as circleci from './webhooks/circleci/[chatid]';
import * as github from './webhooks/github/[chatid]';
import * as gitlab from './webhooks/gitlab/[chatid]';
import * as netlify from './webhooks/netlify/[chatid]';
import * as generic from './webhooks/generic/[chatid]';
import { ok } from './_internal/responses';
import type { Update } from 'telegraf/typings/core/types/typegram';

const webhooks = [
  github,
  gitlab,
  circleci,
  netlify,
  generic
];

let serverUrl = '';

const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.start((ctx) => {
  void ctx.reply('This bot forwards webhooks as chat messages');
});
bot.command('webhook', (ctx) => {
  const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]+)?$/i;
  const parts = regex.exec(ctx.message.text.trim());
  const args = !parts || !parts[3] ? [] : parts[3].split(/\s+/).filter((arg) => arg.length);

  // console.log(args);
  if (args.length > 0) {
    const webhook = webhooks.find((d) => d.NAME.toLowerCase() === args[0].toLowerCase());
    if (webhook) {
      const msg = webhook.webhookMessage(serverUrl, String(ctx.chat.id));
      return ctx.replyWithMarkdown(msg);
    }
  }

  const buttons = webhooks.map((webhook) => {
    return Markup.button.callback(webhook.NAME, webhook.NAME);
  });
  return ctx.reply('Available Webhook Providers', Markup.inlineKeyboard(buttons));
});

for (const webhook of webhooks) {
  bot.action(webhook.NAME, (ctx) => {
    const msg = webhook.webhookMessage(serverUrl, String(ctx.chat!.id));
    return ctx.replyWithMarkdown(msg);
  });
}


export default async function handle(req: VercelRequest, res: VercelResponse): Promise<void> {
  serverUrl = `https://${req.headers.host!}/api`;

  await bot.handleUpdate(req.body as Update);

  return ok(res);
}


async function _main() {
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
  const lastArg = process.argv[process.argv.length - 1];
  if (lastArg.startsWith('https')) {
    await bot.telegram.setWebhook(lastArg);
    console.log('set webhook', lastArg);
    return;
  }

  console.log('start bot');
  await bot.telegram.deleteWebhook();
  await bot.launch();
}

if (require.main === module) {
  void _main();
}
