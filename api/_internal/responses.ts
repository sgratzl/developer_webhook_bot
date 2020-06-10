import {NowResponse} from '@now/node';

export function badRequest(res: NowResponse, text = 'Bad Request'): void {
  res.status(400).json(text);
}

export function ok(res: NowResponse, text = 'Ok'): void {
  res.status(200).json(text);
}
