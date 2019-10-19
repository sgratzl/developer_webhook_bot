
import {createHmac} from 'crypto';

const baseSecret = process.env.WEBHOOK_SECRET || process.env['developer_webhook_bot.WEBHOOK_SECRET']!;

export function createSecret(chatId: string) {
  return createHmac('sha1', chatId).update(Buffer.from(baseSecret)).digest('hex');
}
