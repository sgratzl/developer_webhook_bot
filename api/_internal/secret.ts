
import {createHmac} from 'crypto';

const baseSecret = process.env.WEBHOOK_SECRET!;

export function createSecret(chatId: string) {
  return createHmac('sha1', chatId).update(Buffer.from(baseSecret)).digest('hex');
}
