import Telegraf from 'telegraf';
import {APIGatewayProxyHandler} from 'aws-lambda';
import {config} from 'dotenv';
import {init} from './telegram';
import {badRequest, getBody, ok} from './responses';
import GithubWebHook from './webhooks/github';


const bot = new Telegraf(process.env.BOT_TOKEN!, {
});

const githubHandler = new GithubWebHook(bot.telegram);


init(bot, [
  githubHandler
]);

export const bothook: APIGatewayProxyHandler = async (event, context) => {
  console.log(event, context);
  if (!event.body || event.body.length === 0) {
    return badRequest();
  }
  const body = getBody(event);
  await bot.handleUpdate(body);
  return ok();
};

export const github = githubHandler.handle.bind(githubHandler);

if (require.main === module) {
  config();
  bot.token = process.env['developer_webhook_bot.BOT_TOKEN']!;
  bot.launch();
}
