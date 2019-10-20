import Telegraf, {ContextMessageUpdate, Markup} from 'telegraf';
import {IWebHookHandler} from '../webhooks/interfaces';

const server = process.env.DOMAIN || process.env['developer-webhook-bot.DOMAIN']!;

function toArgs(ctx: ContextMessageUpdate) {
  const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]+)?$/i;
  const parts = regex.exec(ctx.message!.text!.trim());
  if (!parts) {
    return [];
  }
  return !parts[3] ? [] : parts[3].split(/\s+/).filter((arg) => arg.length);
}

export function init(bot: Telegraf<ContextMessageUpdate>, webhooks: IWebHookHandler[]) {
  bot.start((ctx) => {
    ctx.reply('This bot forwards webhooks as chat messages');
  });
  bot.command('webhook', (ctx) => {
    const args = toArgs(ctx);
    // console.log(args);
    if (args.length > 0) {
      const webhook = webhooks.find((d) => d.name.toLowerCase() === args[0].toLowerCase());
      if (webhook) {
        const msg = webhook.webhookMessage(server, String(ctx.chat!.id));
        return ctx.replyWithMarkdown(msg);
      }
    }

    const buttons = webhooks.map((webhook) => {
      return Markup.callbackButton(webhook.name, webhook.name);
    });
    return ctx.reply('Available Webhook Providers', {
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  });

  for (const webhook of webhooks) {
    bot.action(webhook.name, (ctx) => {
      const msg = webhook.webhookMessage(server, String(ctx.chat!.id));
      return ctx.replyWithMarkdown(msg);
    });
  }
}
