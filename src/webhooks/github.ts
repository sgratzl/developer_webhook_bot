import WebhooksApi, {WebhookPayloadIssues, WebhookPayloadIssuesIssueUser, WebhookPayloadIssueComment, WebhookPayloadPullRequest, WebhookPayloadPullRequestReview, WebhookPayloadPullRequestReviewComment} from '@octokit/webhooks';
import {Telegram} from 'telegraf';
import {createSecret, truncateMessage} from '../utils';
import {badRequest, ok, normalizeHeaders, getBody} from '../responses';
import {IWebHookHandler} from './interfaces';
import {APIGatewayProxyEvent} from 'aws-lambda';

function link(url: string, title: string) {
  return `[${title}](${url})`;
}

function replyer(telegram: Telegram, chatId: string) {
  return (header: string, body?: string | null, footer?: string) => {

    const msg = body ? truncateMessage(header, body, footer) : truncateMessage('', header);

    return telegram.sendMessage(chatId, msg, {
      disable_web_page_preview: true,
      parse_mode: 'Markdown'
    }).then(() => undefined);
  };
}

function user(user: WebhookPayloadIssuesIssueUser) {
  return link(user.html_url, `@${user.login}`);
}

function issueLink(payload: WebhookPayloadIssues) {
  const issue = payload.issue;
  const repo = payload.repository;
  return link(issue.html_url, `${repo.full_name}#${issue.number} ${issue.title}`);
}
function commentLink(payload: WebhookPayloadIssueComment | WebhookPayloadPullRequestReviewComment) {
  const base = (payload as WebhookPayloadIssueComment).issue || (payload as WebhookPayloadPullRequestReviewComment).pull_request;
  const repo = payload.repository;
  return link(payload.comment.html_url, `${repo.full_name}#${base.number} ${base.title}`);
}

function prLink(payload: WebhookPayloadPullRequest) {
  const pr = payload.pull_request;
  const repo = payload.repository;
  return link(pr.html_url, `${repo.full_name}#${pr.number} ${pr.title}`);
}

function reviewLink(payload: WebhookPayloadPullRequestReview) {
  const review = payload.review;
  const pr = payload.pull_request;
  const repo = payload.repository;
  return link(review.html_url, `${repo.full_name}#${pr.number} ${pr.title}`);
}

function init(api: WebhooksApi, chatId: string, telegram: Telegram) {
  const reply = replyer(telegram, chatId);

  api.on('issues.opened', async ({payload}) => {
    return reply(`🐛 New issue ${issueLink(payload)}\nby ${user(payload.issue.user)}`, payload.issue.body);
  });
  api.on('issues.closed', async ({payload}) => {
    return reply(`🐛 Issue ${issueLink(payload)} Closed\nby ${user(payload.issue.user)}`);
  });
  api.on('issues.reopened', async ({payload}) => {
    return reply(`🐛 Issue ${issueLink(payload)} Reopened\nby ${user(payload.issue.user)}`);
  });

  api.on('issue_comment.created', ({payload}) => {
    return reply(`💬 New comment on ${commentLink(payload)}\nby ${user(payload.comment.user)}`, payload.comment.body);
  });
  api.on('issue_comment.edited', ({payload}) => {
    return reply(`💬 Comment on ${commentLink(payload)} Edited\nby ${user(payload.comment.user)}`, payload.comment.body);
  });
  api.on('issue_comment.deleted', ({payload}) => {
    return reply(`💬 Comment on ${commentLink(payload)} Deleted\nby ${user(payload.comment.user)}`);
  });

  api.on('pull_request.opened', ({payload}) => {
    return reply(`🔌 New pull request ${prLink(payload)}\nby ${user(payload.pull_request.user)}`);
  });
  api.on('pull_request.closed', ({payload}) => {
    return reply(`🔌 Pull request ${prLink(payload)} Closed\nby ${user(payload.pull_request.user)}`);
  });
  api.on('pull_request.closed', ({payload}) => {
    return reply(`🔌 Pull request ${prLink(payload)} Closed\nby ${user(payload.pull_request.user)}`);
  });

  api.on('pull_request_review.submitted', ({payload}) => {
    const review = payload.review;
    switch (review.state) {
      case 'commented':
        return reply(`💬 New pull request review ${reviewLink(payload)}\nCommented by ${user(review.user)}`, review.body);
      case 'approved':
        return reply(`✅ New pull request review ${reviewLink(payload)}\nApproved by ${user(review.user)}`, review.body);
      case 'request_changes':
        return reply(`!! New pull request review ${reviewLink(payload)}\nRequest Changes by ${user(review.user)}`, review.body);
      default:
        return reply(`New pull request review ${reviewLink(payload)}\nCommented by ${user(review.user)}`, review.body);
    }
  });

  api.on('pull_request_review_comment.created', ({payload}) => {
    const diff = `\`${payload.comment.path}\n${payload.comment.diff_hunk}\``;
    return reply(`💬 New pull request review comment ${commentLink(payload)}\nby ${user(payload.comment.user)}`, diff, payload.comment.body);
  });

  api.on('push', ({payload}) => {
    const commits = payload.commits;
    const ref = payload.ref;
    if (commits.length === 0 || !ref.startsWith('refs/heads/')) {
      return;
    }
    const branch = ref.substring('refs/heads/'.length);

    const header = `🔨 ${link(payload.compare, `${commits.length} new commits`)} to \`${payload.repository.full_name}\`:${branch}`;
    const body: string[] = [];
    for (const commit of commits) {
      body.push(`${link(commit.url, commit.id.slice(0, 7))}: ${commit.message} by ${commit.author.name}`);
    }
    return reply(header, body.join('\n'));
  });

  // api.on('gollum', ({payload}) => {
  //   //  Wiki page is created or updated.

  // });
  // api.on('*', async (event) => {
  //   console.log(event.name, event.payload.action);
  //   await telegram.sendMessage(chatId, JSON.stringify(event.payload).slice(0, 300));
  // });
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
      payload: getBody(event)
    })

    return ok();
  }
}
