import {NowRequest, NowResponse} from '@now/node';
import WebhooksApi, {WebhookPayloadIssueComment, WebhookPayloadIssues, WebhookPayloadIssuesIssueUser, WebhookPayloadPullRequest, WebhookPayloadPullRequestReview, WebhookPayloadPullRequestReviewComment} from '@octokit/webhooks';
import {createSecret} from '../../_internal/secret';
import {replyer} from '../../_internal/telegram';
import {ok} from '../../_internal/responses';

function link(url: string, title: string) {
  return `[${title}](${url})`;
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

function init(api: WebhooksApi, chatId: string) {
  const reply = replyer(chatId);

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


export const NAME = 'Github';

export function webhookMessage(server: string, chatId: string) {
  const url = `${server}/webhooks/github/${encodeURIComponent(chatId)}`;
  const secret = createSecret(chatId);

  return `Please use this webhook url:
  [${url}](${url})
    Content-Type: \`application/json\`
    Secret: \`${secret}\`
  `;
}

export default async function handle(req: NowRequest, res: NowResponse) {
  const chatid = req.query.chatid! as string;

  const chatId = decodeURIComponent(chatid);

  const api = new WebhooksApi({
      secret: createSecret(chatId),
  });

  init(api, chatId);

  await api.verifyAndReceive({
    id: req.headers['x-request-id'] as string,
    name: req.headers['x-github-event'] as string,
    signature: req.headers['x-hub-signature'] as string,
    payload: req.body
  })

  return ok(res);
}
