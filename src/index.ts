import Telegraf from 'telegraf';
import {APIGatewayProxyHandler} from 'aws-lambda';
import {config} from 'dotenv';
import {init} from './telegram';
import {badRequest, getBody, ok} from './responses';
import GithubWebHook from './webhooks/github';
import CircleCIWebHook from './webhooks/circleci';


const telegraf = new Telegraf(process.env.BOT_TOKEN!, {
  username: 'developer_webhook_bot'
});

const githubHandler = new GithubWebHook(telegraf.telegram);
const circleciHandler = new CircleCIWebHook(telegraf.telegram);


init(telegraf, [
  githubHandler,
  circleciHandler
]);

export const bot: APIGatewayProxyHandler = async (event) => {
  if (!event.body || event.body.length === 0) {
    return badRequest();
  }
  const body = getBody(event);
  await telegraf.handleUpdate(body);
  return ok();
};

export const github = githubHandler.handle.bind(githubHandler);
export const circleci = circleciHandler.handle.bind(circleciHandler);

if (require.main === module) {
  config();
  telegraf.token = process.env['developer-webhook-bot.BOT_TOKEN']!;
  telegraf.launch();
}
