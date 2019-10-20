import {IWebHookHandler} from "./interfaces";
import {Telegram} from "telegraf";
import {APIGatewayProxyEvent} from "aws-lambda";
import {badRequest, ok, getBody} from "../_internal/responses";
import {replyer} from "../_internal/utils";

interface IMessage {
  fallback: string;
  text: string;
  color: string;
}

interface ICircleCIMessage {
  text: string;
  channel?: string;
  attachments: IMessage[];
}

export default class CircleCIWebHook implements IWebHookHandler {
  name = 'CircleCI';

  constructor(private readonly telegram: Telegram) {

  }

  webhookMessage(server: string, chatId: string) {
    const url = `${server}/circleci?chatid=${encodeURIComponent(chatId)}`;
    return `Please use this webhook url:
    [${url}](${url})
    `;
  }

  async handle(event: APIGatewayProxyEvent) {
    if (!event.queryStringParameters || !event.queryStringParameters.chatid) {
      return badRequest();
    }
    const chatId = decodeURIComponent(event.queryStringParameters.chatid!);

    const body: ICircleCIMessage = getBody(event);

    const reply = replyer(this.telegram, chatId);

    reply(body.text);

    return ok();
  }
}
