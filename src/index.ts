import Telegraf from 'telegraf';
import {APIGatewayProxyHandler, APIGatewayProxyEvent} from 'aws-lambda';

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


function getBody(event: APIGatewayProxyEvent): any {
  if (!event.body) {
    return {};
  }
  if (event.isBase64Encoded) {
    return JSON.parse(Buffer.from(event.body, 'base64').toString());
  }
  return JSON.parse(event.body);
}

export const botbook: APIGatewayProxyHandler = async (event, context) => {
  console.log(event, context);
  if (!event.body || event.body.length === 0) {
    return {statusCode: 400, body: 'Bad Request'};
  }
  const body = getBody(event);
  await bot.handleUpdate(body);
  return {statusCode: 200, body: 'Ok'};
};

export const webhook: APIGatewayProxyHandler = async (event, context) => {
  console.log(event, context);
  //const body = getBody(event);
  return {statusCode: 200, body: 'Ok'};
};
