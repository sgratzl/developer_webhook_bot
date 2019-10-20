# Developer Webhook Telegram Bot
[![Github Actions][github-actions-image]][github-actions-url]

[Developer Webhook Bot](https://t.me/developer_webhook_bot) is a simple Telegram bot that will forward you Webhooks in your chats.

So far, the bot is mainly used to handle Github Webhook events.

## Commands
 * `/webhook` generates a webhook url for the chosen provider that will forward messages to the current chat


## Github Webhooks

The Bot tries to handle as many useful webhook events as possible. To limit the number of events, just configure the webhook in Github to deliver only certain event types.

## Building

```sh
npm install
npm run build
```

[github-actions-image]: https://github.com/sgratzl/developer_webhook_bot/workflows/nodeci/badge.svg
[github-actions-url]: https://github.com/sgratzl/developer_webhook_bot/actions
