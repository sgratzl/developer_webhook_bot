import Telegraf, {ContextMessageUpdate} from 'telegraf';
import {IWebHookHandler} from '../webhooks/interfaces';

export function init(bot: Telegraf<ContextMessageUpdate>, webhooks: IWebHookHandler[]) {
  bot.start((ctx) => {
    ctx.reply('Welcome');
  });
  bot.help((ctx) => ctx.reply('Send me a sticker'));
  bot.command('webhook', (ctx) => {
    const chatId = ctx.chat!.id;

  });

  bot.on('sticker', (ctx) => ctx.reply('👍'));


}
