import {NowRequest, NowResponse} from '@now/node';
import WebhooksApi, {PayloadRepository, WebhookPayloadCommitComment, WebhookPayloadIssueComment, WebhookPayloadIssues, WebhookPayloadIssuesIssueUser, WebhookPayloadMeta, WebhookPayloadProject, WebhookPayloadPullRequest, WebhookPayloadPullRequestReview, WebhookPayloadPullRequestReviewComment, WebhookPayloadRelease, WebhookPayloadStatus} from '@octokit/webhooks';
import {ok} from '../../_internal/responses';
import {createSecret} from '../../_internal/secret';
import {replyer} from '../../_internal/telegram';

function link(url: string | null, title: string) {
  if (!url) {
    return title;
  }
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

function releaseLink(payload: WebhookPayloadRelease) {
  const release = payload.release;
  const repo = payload.repository;
  return link(release.html_url, `${repo.full_name} ${release.name}`);
}

function repoLink(payload: {repository?: PayloadRepository, organization?: {login: string}}) {
  const repo = payload.repository;
  if (repo) {
    return link(repo.html_url, repo.full_name);
  }
  const org = payload.organization;
  if (org) {
    return link(`https://github.com/${org.login}`, org.login);
  }
  return `???`;
}

function projectLink(payload: WebhookPayloadProject) {
  const project = payload.project;
  return link(project.html_url, project.name);
}

function commentLink(payload: WebhookPayloadIssueComment | WebhookPayloadPullRequestReviewComment) {
  const base = (payload as WebhookPayloadIssueComment).issue || (payload as WebhookPayloadPullRequestReviewComment).pull_request;
  const repo = payload.repository;
  return link(payload.comment.html_url, `${repo.full_name}#${base.number} ${base.title}`);
}

function commitCommentLink(payload: WebhookPayloadCommitComment) {
  const base = payload.comment;
  const repo = payload.repository;
  return link(payload.comment.html_url, `${repo.full_name}@${base.commit_id.slice(0, 7)}`);
}

function commitLink(payload: WebhookPayloadStatus) {
  const base = payload.commit;
  const repo = payload.repository;
  return link(base.html_url, `${repo.full_name}@${base.sha.slice(0, 7)}`);
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

declare type IReplyer = (header: string, body?: string | null | undefined, footer?: string | undefined) => Promise<undefined>;

function handleIssues(api: WebhooksApi, reply: IReplyer) {
  api.on('issues.opened', async ({payload}) => {
    return reply(`🐛 New issue ${issueLink(payload)}\nby ${user(payload.issue.user)}`, payload.issue.body);
  });
  api.on('issues.closed', async ({payload}) => {
    return reply(`🐛❌ Closed Issue ${issueLink(payload)}\nby ${user(payload.issue.user)}`);
  });
  api.on('issues.reopened', async ({payload}) => {
    return reply(`🐛 Reopened Issue ${issueLink(payload)}\nby ${user(payload.issue.user)}`);
  });
}

function handleComments(api: WebhooksApi, reply: IReplyer) {
  api.on('issue_comment.created', ({payload}) => {
    return reply(`💬 New comment on ${commentLink(payload)}\nby ${user(payload.comment.user)}`, payload.comment.body);
  });
  api.on('issue_comment.edited', ({payload}) => {
    return reply(`💬📝 Comment on ${commentLink(payload)} Edited\nby ${user(payload.comment.user)}`, payload.comment.body);
  });
  api.on('issue_comment.deleted', ({payload}) => {
    return reply(`💬❌ Comment on ${commentLink(payload)} Deleted\nby ${user(payload.comment.user)}`);
  });
}

function handlePullRequests(api: WebhooksApi, reply: IReplyer) {
  api.on('pull_request.opened', ({payload}) => {
    return reply(`🔌 New pull request ${prLink(payload)}\nby ${user(payload.pull_request.user)}`);
  });
  api.on('pull_request.closed', ({payload}) => {
    if (payload.pull_request.merged) {
      return reply(`🔌🥂 Merged & Closed Pull request ${prLink(payload)}\nby ${user(payload.pull_request.user)}`);
    } else {
      return reply(`🔌❌ Closed Pull request ${prLink(payload)}\nby ${user(payload.pull_request.user)}`);
    }
  });
  api.on('pull_request.ready_for_review', ({payload}) => {
    return reply(`🔌⏳ Pull request ${prLink(payload)} Ready for Review`);
  });

  api.on('pull_request_review.submitted', ({payload}) => {
    const review = payload.review;
    switch (review.state) {
      case 'commented':
        return reply(`💬 New pull request review ${reviewLink(payload)}\nCommented by ${user(review.user)}`, review.body);
      case 'approved':
        return reply(`✅ New pull request review ${reviewLink(payload)}\nApproved by ${user(review.user)}`, review.body);
      case 'request_changes':
        return reply(`‼ New pull request review ${reviewLink(payload)}\nRequest Changes by ${user(review.user)}`, review.body);
      default:
        return reply(`❓ New pull request review ${reviewLink(payload)}\nCommented by ${user(review.user)}`, review.body);
    }
  });

  api.on('pull_request_review_comment.created', ({payload}) => {
    const diff = `\`${payload.comment.path}\n${payload.comment.diff_hunk}\``;
    return reply(`💬 New pull request review comment ${commentLink(payload)}\nby ${user(payload.comment.user)}`, diff, payload.comment.body);
  });
}

function handlePush(api: WebhooksApi, reply: IReplyer) {
  api.on('push', ({payload}) => {
    const commits = payload.commits;
    const ref = payload.ref;
    if (commits.length === 0 || !ref.startsWith('refs/heads/')) {
      return;
    }
    const branch = ref.substring('refs/heads/'.length);

    const header = `🔨 ${link(payload.compare, `${commits.length} new commit${commits.length > 1 ? 's' : ''}`)} to ${repoLink(payload)} on branch \`${branch}\``;
    const body: string[] = [];
    for (const commit of commits) {
      body.push(`${link(commit.url, commit.id.slice(0, 7))}: ${commit.message} by ${commit.author.name}`);
    }
    return reply(header, body.join('\n'));
  });

  api.on('commit_comment.created', ({payload}) => {
    const diff = `\`${payload.comment.path}\n${payload.comment.line}\``;
    return reply(`💬 New commit comment on ${commitCommentLink(payload)}\nby ${user(payload.comment.user)}`, diff, payload.comment.body);
  });
}

function handleRelease(api: WebhooksApi, reply: IReplyer) {
  api.on('release.created', ({payload}) => {
    let sub = '';
    if (payload.release.draft) {
      sub = 'draft ';
    } else if (payload.release.prerelease) {
      sub = 'pre';
    }
    return reply(`🎉 New ${sub}release ${releaseLink(payload)}\nby ${user(payload.release.author)}`, payload.release.body);
  });
}

function handleExtras(api: WebhooksApi, reply: IReplyer) {
  api.on('public', ({payload}) => {
    return reply(`🥂 ${repoLink(payload)} was made public`);
  });

  api.on('repository_vulnerability_alert.create', ({payload}) => {
    const alert = payload.alert;
    return reply(`☢ Vulnerability Alert for ${repoLink(payload)} in \`${alert.affected_package_name}\``);
  });

  api.on('star.created', ({payload}) => {
    return reply(`⭐ ${repoLink(payload)} was starred by ${user(payload.sender)}`);
  });

  api.on('fork', ({payload}) => {
    return reply(`⭐ ${repoLink(payload)} was forked by ${user(payload.sender)}`);
  });
}

function handleProjects(api: WebhooksApi, reply: IReplyer) {
  api.on('project.created', ({payload}) => {
    return reply(`📘 Project ${projectLink(payload)} created in ${repoLink(payload)} by ${user(payload.project.creator)}`, payload.project.body);
  });
  api.on('project_card.created', ({ payload }) => {
    return reply(`📘 Project Card created in ${repoLink(payload)} by ${user(payload.project_card.creator)}`, payload.project_card.note);
  });
}

function handleStatus(api: WebhooksApi, reply: IReplyer) {
  api.on('deployment_status', ({payload}) => {
    const status = payload.deployment_status;
    switch (status.state) {
      case 'success':
        return reply(`☀ ${repoLink(payload)} was successfully ${link(status.deployment_url, 'deployed')}`);
      case 'failure':
        return reply(`🌩 ${repoLink(payload)} failed to ${link(status.deployment_url, 'deploy')}`, status.description);
      case 'error':
        return reply(`🌩 ${repoLink(payload)} errored while ${link(status.deployment_url, 'deploying')}`, status.description);
    }
    return undefined;
  });

  api.on('status', ({payload}) => {
    switch (payload.state) {
      case 'success':
        return reply(`☀ Commit ${commitLink(payload)} state is ${link(payload.target_url, 'successful')}`, payload.description);
      case 'failure':
        return reply(`🌩 Commit ${commitLink(payload)} state is ${link(payload.target_url, 'failure')}`, payload.description);
      case 'error':
        return reply(`🌩 Commit ${commitLink(payload)} state is ${link(payload.target_url, 'error')}`, payload.description);
    }
    return undefined;
  });

  api.on('check_run.completed', ({payload}) => {
    switch (payload.check_run.conclusion as unknown as string) {
      case 'success':
        return reply(`☀ Check Run \`${payload.check_run.name}\` in ${repoLink(payload)} was a ${link(payload.check_run.html_url, 'success')}`, payload.check_run.output.summary);
      case 'failure':
        return reply(`🌩 Check Run \`${payload.check_run.name}\` in ${repoLink(payload)} ${link(payload.check_run.html_url, 'failed')}`, payload.check_run.output.summary);
      case 'action_required':
        return reply(`🌩 Check Run \`${payload.check_run.name}\` in ${repoLink(payload)} ${link(payload.check_run.html_url, 'requires action')}`, payload.check_run.output.summary);
    }
    return undefined;
  });
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

  const reply = replyer(chatId);

  handleIssues(api, reply);
  handleComments(api, reply);
  handleExtras(api, reply);
  handlePullRequests(api, reply);
  handlePush(api, reply);
  handleRelease(api, reply);
  handleStatus(api, reply);
  handleProjects(api, reply);

  api.on('*', (event) => {
    if (event.name === 'ping') {
      const payload = event.payload as WebhookPayloadMeta;
      return reply(`🚀 Webhook activated for ${repoLink(payload)}`);
    }
    return undefined;
  });

  await api.verifyAndReceive({
    id: req.headers['x-request-id'] as string,
    name: req.headers['x-github-event'] as string,
    signature: req.headers['x-hub-signature'] as string,
    payload: req.body
  });

  return ok(res);
}
