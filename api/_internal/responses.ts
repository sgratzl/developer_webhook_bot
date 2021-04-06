import type { VercelResponse } from '@vercel/node';

export function badRequest(res: VercelResponse, text = 'Bad Request'): void {
  res.status(400).json(text);
}

export function ok(res: VercelResponse, text = 'Ok'): void {
  res.status(200).json(text);
}
