import {APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayEventRequestContext} from 'aws-lambda';

export interface IWebHookHandler {
  readonly name: string;

  webhookMessage(server: string, chatId: string): string;

  handle(event: APIGatewayProxyEvent, context: APIGatewayEventRequestContext): Promise<APIGatewayProxyResult>;
}
