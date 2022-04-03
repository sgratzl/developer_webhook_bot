import { Webhooks } from '@octokit/webhooks';
import type { CommitCommentEvent, DiscussionAnsweredEvent, DiscussionCommentEvent, DiscussionEvent, IssueCommentEvent, IssuesEvent, ProjectEvent, PullRequestEvent, PullRequestReviewCommentEvent, PullRequestReviewEvent, ReleaseEvent, Repository, StatusEvent, User } from '@octokit/webhooks-types';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ok } from '../../_internal/responses';
import { createSecret } from '../../_internal/secret';
import { escape, replier } from '../../_internal/telegram';

function link(url: string | null, title: string) {
  if (!url) {
    return escape(title);
  }
  return `[${escape(title)}](${url})`;
}

function user(user: User) {
  return link(user.html_url, `@${user.login}`);
}

function issueLink(payload: IssuesEvent) {
  const issue = payload.issue;
  const repo = payload.repository;
  return link(issue.html_url, `${repo.full_name}#${issue.number} ${issue.title}`);
}

function releaseLink(payload: ReleaseEvent) {
  const release = payload.release;
  const repo = payload.repository;
  return link(release.html_url, `${repo.full_name} ${release.name || ''}`);
}

function repoLink(payload: { repository?: Repository, organization?: { login: string } }) {
  const repo = payload.repository;
  if (repo) {
    return link(repo.html_url, repo.full_name);
  }
  const org = payload.organization;
  if (org) {
    return link(`https://github.com/${org.login}`, org.login);
  }
  return '||?';
}

function projectLink(payload: ProjectEvent) {
  const project = payload.project;
  return link(project.html_url, project.name);
}

function commentLink(payload: IssueCommentEvent | PullRequestReviewCommentEvent) {
  const base = (payload as IssueCommentEvent).issue || (payload as PullRequestReviewCommentEvent).pull_request;
  const repo = payload.repository;
  return link(payload.comment.html_url, `${repo.full_name}#${base.number} ${base.title}`);
}

function discussionLink(payload: DiscussionEvent) {
  const discussion = payload.discussion;
  const repo = payload.repository;
  return link(payload.discussion.html_url, `${repo.full_name}#${discussion.id} ${discussion.title}`);
}
function discussionCommentLink(payload: DiscussionCommentEvent) {
  const discussion = payload.discussion;
  const repo = payload.repository;
  return link(payload.comment.html_url, `${repo.full_name}#${discussion.id} ${discussion.title}`);
}
function discussionAnswerLink(payload: DiscussionAnsweredEvent) {
  const discussion = payload.discussion;
  const repo = payload.repository;
  return link(payload.answer.html_url, `${repo.full_name}#${discussion.id} ${discussion.title}`);
}

function commitCommentLink(payload: CommitCommentEvent) {
  const base = payload.comment;
  const repo = payload.repository;
  return link(payload.comment.html_url, `${repo.full_name}@${base.commit_id.slice(0, 7)}`);
}

function commitLink(payload: StatusEvent) {
  const base = payload.commit;
  const repo = payload.repository;
  return link(base.html_url, `${repo.full_name}@${base.sha.slice(0, 7)}`);
}

function prLink(payload: PullRequestEvent) {
  const pr = payload.pull_request;
  const repo = payload.repository;
  return link(pr.html_url, `${repo.full_name}#${pr.number} ${pr.title}`);
}

function reviewLink(payload: PullRequestReviewEvent) {
  const review = payload.review;
  const pr = payload.pull_request;
  const repo = payload.repository;
  return link(review.html_url, `${repo.full_name}#${pr.number} ${pr.title}`);
}

declare type IReplier = (header: string, body?: string | null | undefined, footer?: string | undefined) => Promise<undefined>;

function handleIssues(api: Webhooks, reply: IReplier) {
  api.on('issues.opened', async ({payload}) => {
    return reply(`🐛 New issue ${issueLink(payload)}\nby ${user(payload.issue.user)}`, escape(payload.issue.body));
  });
  api.on('issues.closed', async ({payload}) => {
    return reply(`🐛❌ Closed Issue ${issueLink(payload)}\nby ${user(payload.issue.user)}`);
  });
  api.on('issues.reopened', async ({payload}) => {
    return reply(`🐛 Reopened Issue ${issueLink(payload)}\nby ${user(payload.issue.user)}`);
  });
}

function handleComments(api: Webhooks, reply: IReplier) {
  api.on('issue_comment.created', ({payload}) => {
    return reply(`💬 New comment on ${commentLink(payload)}\nby ${user(payload.comment.user)}`, escape(payload.comment.body));
  });
  api.on('issue_comment.edited', ({payload}) => {
    return reply(`💬📝 Comment on ${commentLink(payload)} Edited\nby ${user(payload.comment.user)}`, escape(payload.comment.body));
  });
  api.on('issue_comment.deleted', ({payload}) => {
    return reply(`💬❌ Comment on ${commentLink(payload)} Deleted\nby ${user(payload.comment.user)}`);
  });
}

function handleDiscussions(api: Webhooks, reply: IReplier) {
  api.on('discussion.created', ({ payload }) => {
    return reply(`🧑‍🤝‍🧑 New discussion on ${discussionLink(payload)}\nby ${user(payload.discussion.user)}`, escape(payload.discussion.body));
  });
  api.on('discussion.edited', ({ payload }) => {
    return reply(`🧑‍🤝‍🧑📝 Discussion on ${discussionLink(payload)}\nby ${user(payload.discussion.user)}`, escape(payload.discussion.body));
  });
  api.on('discussion.deleted', ({ payload }) => {
    return reply(`🧑‍🤝‍🧑❌ Discussion on ${discussionLink(payload)}\nby ${user(payload.discussion.user)}`, escape(payload.discussion.body));
  });
  api.on('discussion.answered', ({ payload }) => {
    return reply(`🧑‍🤝‍🧑✔️ Discussion Answered ${discussionAnswerLink(payload)}\nby ${user(payload.discussion.user)}`, escape(payload.answer.body));
  });
  api.on('discussion_comment.created', ({ payload }) => {
    return reply(`🧑‍🤝‍🧑💬 New Comment on ${discussionCommentLink(payload)}\nby ${user(payload.comment.user)}`, escape(payload.comment.body));
  });
  api.on('discussion_comment.edited', ({ payload }) => {
    return reply(`🧑‍🤝‍🧑💬📝 Comment on ${discussionCommentLink(payload)} Edited\nby ${user(payload.comment.user)}`, escape(payload.comment.body));
  });
  api.on('discussion_comment.deleted', ({ payload }) => {
    return reply(`🧑‍🤝‍🧑💬❌ Comment on ${discussionCommentLink(payload)} Deleted\nby ${user(payload.comment.user)}`);
  });
}

function handlePullRequests(api: Webhooks, reply: IReplier) {
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
        return reply(`💬 New pull request review ${reviewLink(payload)}\nCommented by ${user(review.user)}`, escape(review.body));
      case 'approved':
        return reply(`✅ New pull request review ${reviewLink(payload)}\nApproved by ${user(review.user)}`, escape(review.body));
      case 'request_changes':
        return reply(`‼ New pull request review ${reviewLink(payload)}\nRequest Changes by ${user(review.user)}`, escape(review.body));
      default:
        return reply(`❓ New pull request review ${reviewLink(payload)}\nCommented by ${user(review.user)}`, escape(review.body));
    }
  });

  api.on('pull_request_review_comment.created', ({payload}) => {
    const diff = `\`${payload.comment.path}\n${payload.comment.diff_hunk}\``;
    return reply(`💬 New pull request review comment ${commentLink(payload)}\nby ${user(payload.comment.user)}`, diff, escape(payload.comment.body));
  });
}

function handlePush(api: Webhooks, reply: IReplier) {
  api.on('push', ({payload}) => {
    const commits = payload.commits as {url: string, id: string, message: string, author: {name: string}}[];
    const ref = payload.ref;
    if (commits.length === 0 || !ref.startsWith('refs/heads/')) {
      return;
    }
    const branch = ref.substring('refs/heads/'.length);

    const header = `🔨 ${link(payload.compare, `${commits.length} new commit${commits.length > 1 ? 's' : ''}`)} to ${repoLink(payload)} on branch \`${branch}\``;
    const body: string[] = [];
    for (const commit of commits) {
      body.push(`${link(commit.url, commit.id.slice(0, 7))}: ${escape(commit.message)} by ${escape(commit.author.name)}`);
    }
    return reply(header, body.join('\n'));
  });

  api.on('commit_comment.created', ({payload}) => {
    const diff = `\`${payload.comment.path || ''}\n${payload.comment.line || '?'}\``;
    return reply(`💬 New commit comment on ${commitCommentLink(payload)}\nby ${user(payload.comment.user)}`, diff, escape(payload.comment.body));
  });
}

function handleRelease(api: Webhooks, reply: IReplier) {
  api.on('release.created', ({payload}) => {
    let sub = '';
    if (payload.release.draft) {
      sub = 'draft ';
    } else if (payload.release.prerelease) {
      sub = 'pre';
    }
    return reply(`🎉 New ${sub}release ${releaseLink(payload)}\nby ${user(payload.release.author)}`, escape(payload.release.body));
  });
}

function handleExtras(api: Webhooks, reply: IReplier) {
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

function handleProjects(api: Webhooks, reply: IReplier) {
  api.on('project.created', ({payload}) => {
    return reply(`📘 Project ${projectLink(payload)} created in ${repoLink(payload)} by ${user(payload.project.creator)}`, escape(payload.project.body));
  });
  api.on('project_card.created', ({ payload }) => {
    return reply(`📘 Project Card created in ${repoLink(payload)} by ${user(payload.project_card.creator)}`, escape(payload.project_card.note));
  });
}

function handleStatus(api: Webhooks, reply: IReplier) {
  api.on('deployment_status', ({payload}) => {
    const status = payload.deployment_status;
    switch (status.state) {
      case 'success':
        return reply(`☀ ${repoLink(payload)} was successfully ${link(status.deployment_url, 'deployed')}`);
      case 'failure':
        return reply(`🌩 ${repoLink(payload)} failed to ${link(status.deployment_url, 'deploy')}`, escape(status.description));
      case 'error':
        return reply(`🌩 ${repoLink(payload)} errored while ${link(status.deployment_url, 'deploying')}`, escape(status.description));
    }
    return undefined;
  });

  api.on('status', ({payload}) => {
    switch (payload.state) {
      case 'success':
        return reply(`☀ Commit ${commitLink(payload)} state is ${link(payload.target_url, 'successful')}`, escape(payload.description));
      case 'failure':
        return reply(`🌩 Commit ${commitLink(payload)} state is ${link(payload.target_url, 'failure')}`, escape(payload.description));
      case 'error':
        return reply(`🌩 Commit ${commitLink(payload)} state is ${link(payload.target_url, 'error')}`, escape(payload.description));
    }
    return undefined;
  });

  api.on('check_run.completed', ({payload}) => {
    switch (payload.check_run.conclusion as unknown as string) {
      case 'success':
        return reply(`☀ Check Run \`${payload.check_run.name}\` in ${repoLink(payload)} was a ${link(payload.check_run.html_url, 'success')}`, escape(payload.check_run.output.summary));
      case 'failure':
        return reply(`🌩 Check Run \`${payload.check_run.name}\` in ${repoLink(payload)} ${link(payload.check_run.html_url, 'failed')}`, escape(payload.check_run.output.summary));
      case 'action_required':
        return reply(`🌩 Check Run \`${payload.check_run.name}\` in ${repoLink(payload)} ${link(payload.check_run.html_url, 'requires action')}`, escape(payload.check_run.output.summary));
    }
    return undefined;
  });
}

export const NAME = 'Github';

export function webhookMessage(server: string, chatId: string): string {
  const url = `${server}/webhooks/github/${encodeURIComponent(chatId)}`;
  const secret = createSecret(chatId);

  return `Please use this webhook url:
  [${url}](${url})
    Content-Type: \`application/json\`
    Secret: \`${secret}\`
  `;
}

export default async function handle(req: VercelRequest, res: VercelResponse): Promise<void> {
  const chatid = req.query.chatid! as string;
  console.error(chatid);

  const chatId = decodeURIComponent(chatid);

  const api = new Webhooks({
      secret: createSecret(chatId),
  });

  const reply = replier(chatId);

  handleIssues(api, reply);
  handleComments(api, reply);
  handleExtras(api, reply);
  handlePullRequests(api, reply);
  handlePush(api, reply);
  handleRelease(api, reply);
  handleStatus(api, reply);
  handleProjects(api, reply);
  handleDiscussions(api, reply);

  api.on('ping', ({ payload }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return reply(`🚀 Webhook activated for ${repoLink(payload)}`);
  });
  api.onError((error) => {
    console.error(error);
  });
  console.error('verifyAndReceiver');
  await api.verifyAndReceive({
    id: req.headers['x-request-id'] as string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    name: req.headers['x-github-event'] as any,
    signature: req.headers['x-hub-signature'] as string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    payload: req.body
  });
  console.error('done');
  return ok(res);
}
