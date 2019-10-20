import Telegraf, {ContextMessageUpdate, Markup} from 'telegraf';
import {IWebHookHandler} from '../webhooks/interfaces';

const server = process.env.DOMAIN || process.env['developer_webhook_bot.DOMAIN']!;

export function init(bot: Telegraf<ContextMessageUpdate>, webhooks: IWebHookHandler[]) {
  bot.start((ctx) => {
    ctx.reply('This bot forwards webhooks as chat messages');
  });
  bot.command('webhook', (ctx) => {
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
      console.log(msg);
      ctx.replyWithMarkdown(msg);
    });
  }

}
