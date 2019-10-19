import WebhooksApi from '@octokit/webhooks';
import {Telegram} from 'telegraf';
import {createSecret} from '../utils';
import {APIGatewayProxyEvent} from 'aws-lambda';
import {badRequest, ok, normalizeHeaders} from '../responses';
import {IWebHookHandler} from './interfaces';

function init(api: WebhooksApi, chatId: string, telegram: Telegram) {
  api.on('*', async (event) => {
    await telegram.sendMessage(chatId, JSON.stringify(event.payload).slice(0, 300));
  });
}

export default class GithubWebHook implements IWebHookHandler {
  name = 'Github';

  constructor(private readonly telegram: Telegram) {

  }

  webhookMessage(server: string, chatId: string) {
    const url = `${server}/developer_webhook_bot-github?chatid=${encodeURIComponent(chatId)}`;
    const secret = createSecret(chatId);

    return `Please use this webhook url:
    [${url}](${url})
      Content-Type: \`application/json\`
      Secret: \`${secret}\`
    `;
  }

  async handle(event: APIGatewayProxyEvent) {
    if (!event.queryStringParameters || !event.queryStringParameters.chatid) {
      return badRequest();
    }
    const headers = normalizeHeaders(event.headers);
    const chatId = decodeURIComponent(event.queryStringParameters.chatid!);

    const api = new WebhooksApi({
      secret: createSecret(chatId),
    });

    init(api, chatId, this.telegram);

    await api.verifyAndReceive({
      id: headers['x-request-id'],
      name: headers['x-github-event'],
      signature: headers['x-hub-signature'],
      payload: event.body
    })

    return ok();
  }
}
