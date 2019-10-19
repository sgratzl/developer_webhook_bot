import {APIGatewayProxyEvent} from "aws-lambda";


export function badRequest(text = 'Bad Request') {
  return {statusCode: 400, body: JSON.stringify(text)};
}

export function ok(text = 'Ok') {
  return {statusCode: 200, body: JSON.stringify(text)};
}

export function getBody(event: APIGatewayProxyEvent): any {
  if (!event.body) {
    return {};
  }
  if (event.isBase64Encoded) {
    return JSON.parse(Buffer.from(event.body, 'base64').toString());
  }
  return JSON.parse(event.body);
}

export function normalizeHeaders(headers: {[key: string]: string}) {
  const r: {[key: string]: string} = {};
  Object.keys(headers).forEach((key) => {
    r[key.toLowerCase()] = headers[key];
  });
  return r;
}
