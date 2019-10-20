import Telegraf from 'telegraf';
import {init} from './telegram';
import {ok} from './_internal/responses';
import GithubWebHook from './webhooks/github';
import CircleCIWebHook from './webhooks/circleci';
import {NowRequest, NowResponse} from '@now/node';


const telegraf = new Telegraf(process.env.BOT_TOKEN!, {
  username: 'developer_webhook_bot'
});

const githubHandler = new GithubWebHook(telegraf.telegram);
const circleciHandler = new CircleCIWebHook(telegraf.telegram);


init(telegraf, [
  githubHandler,
  circleciHandler
]);

export default async function handle(req: NowRequest, res: NowResponse) {
  await telegraf.handleUpdate(req.body);
  
  return ok(res);
};

export const github = githubHandler.handle.bind(githubHandler);
export const circleci = circleciHandler.handle.bind(circleciHandler);
