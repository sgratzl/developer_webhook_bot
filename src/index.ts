import Telegraf from 'telegraf';
import {APIGatewayProxyHandler, APIGatewayProxyEvent} from 'aws-lambda';
import {config} from 'dotenv';

const bot = new Telegraf(process.env.BOT_TOKEN!, {
});


bot.start((ctx) => {
  ctx.reply('Welcome');
});
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.command('webhook', (ctx) => {
  const chatId = ctx.chat!.id;
  ctx.replyWithMarkdown(`Please use this webhook url:
${5}/developer_webhook_bot-hook?chatid=${encodeURIComponent(chatId)}
  Content-Type: application/json
  Secret: \`\`
`);
});

bot.on('sticker', (ctx) => ctx.reply('👍'));


function getBody(event: APIGatewayProxyEvent): any {
  if (!event.body) {
    return {};
  }
  if (event.isBase64Encoded) {
    return JSON.parse(Buffer.from(event.body, 'base64').toString());
  }
  return JSON.parse(event.body);
}

function badRequest() {
  return {statusCode: 400, body: JSON.stringify('Bad Request')};
}

function ok() {
  return {statusCode: 200, body: JSON.stringify('Ok')};
}

export const bothook: APIGatewayProxyHandler = async (event, context) => {
  console.log(event, context);
  if (!event.body || event.body.length === 0) {
    return badRequest();
  }
  const body = getBody(event);
  await bot.handleUpdate(body);
  return ok();
};

export const webhook: APIGatewayProxyHandler = async (event, context) => {
  console.log(event, context);
  if (!event.body || event.body.length === 0) {
    return badRequest();
  }
  if (!event.queryStringParameters || !event.queryStringParameters.chatid) {
    return badRequest();
  }
  const body = getBody(event);
  const chatId = decodeURIComponent(event.queryStringParameters.chatid!);
  await bot.telegram.sendMessage(chatId, JSON.stringify(body));
  return ok();
};

if (require.main === module) {
  config();
  bot.token = process.env['developer_webhook_bot.BOT_TOKEN']!;
  bot.launch();
}
