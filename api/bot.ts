import Telegraf, {Markup} from 'telegraf';
import {ok} from './_internal/responses';
import * as github from './webhooks/github/[chatid]';
import * as circleci from './webhooks/circleci/[chatid]';
import {NowRequest, NowResponse} from '@now/node';
import {toArgs} from './_internal/telegram';

const webhooks = [
  github,
  circleci
]

export default async function handle(req: NowRequest, res: NowResponse) {
  const server = `${req.headers.host}/api`;

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
        const msg = webhook.webhookMessage(server, String(ctx.chat!.id));
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
      const msg = webhook.webhookMessage(server, String(ctx.chat!.id));
      return ctx.replyWithMarkdown(msg);
    });
  }

  await bot.handleUpdate(req.body);

  return ok(res);
};
