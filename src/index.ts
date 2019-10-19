import Telegraf from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN!, {
});


bot.start((ctx) => {
  ctx.reply('Welcome');
});
bot.help((ctx) => ctx.reply('Send me a sticker'));
// bot.command('login', (ctx) => {

// });

bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.hears('hi', (ctx) => ctx.reply('Hey there'));



export async function bothook(event: {body: string}) {
  if (!event.body || event.body.length === 0) {
    return {statusCode: 200, body: ''};
  }
  const body = event.body[0] === '{' ? JSON.parse(event.body) : JSON.parse(Buffer.from(event.body, 'base64').toString());
  await bot.handleUpdate(body);
  return {statusCode: 200, body: ''};
};

export async function webhook(event: {body: string}) {
  return {statusCode: 200, body: ''};
};
