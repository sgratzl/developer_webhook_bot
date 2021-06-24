import type { VercelRequest, VercelResponse } from '@vercel/node';
import createHandler from 'node-gitlab-webhook';
import type { GitLabHooks, IssueAttributes, MergeRequestAttributes, NoteEvent, PipelineAttributes, Project, User, WikiPageAttributes } from 'node-gitlab-webhook/interfaces';
import {createSecret} from '../../_internal/secret';
import { replier, escape } from '../../_internal/telegram';

function link(url: string | null, title: string) {
  if (!url) {
    return escape(title);
  }
  return `[${escape(title)}](${url})`;
}

function user(user: User) {
  return link(user.avatar_url, `@${user.username}`);
}

function issueLink(payload: {object_attributes: IssueAttributes; project: Project}) {
  const issue = payload.object_attributes;
  const repo = payload.project;
  return link(issue.url, `${repo.name}#${issue.id} ${issue.title}`);
}

function projectLink(payload: {project: Project}) {
  const repo = payload.project;
  return link(repo.web_url, `${repo.name}`);
}

function wikiLink(payload: {object_attributes: WikiPageAttributes; project: Project}) {
  const wiki = payload.object_attributes;
  const repo = payload.project;
  return link(wiki.url, `${repo.name} ${wiki.title}`);
}

function pipelineLink(payload: {object_attributes: PipelineAttributes; project: Project}) {
  const pipe = payload.object_attributes;
  const repo = payload.project;
  return `${repo.name} ${pipe.id}`;
}

function commentLink(payload: NoteEvent) {
  const base = payload.issue || payload.merge_request!;
  const repo = payload.project;
  return link(payload.object_attributes.url, `${repo.name}#${base.id} ${base.title}`);
}

function commitCommentLink(payload: NoteEvent) {
  const base = payload.commit!;
  const repo = payload.project;
  return link(payload.object_attributes.url, `${repo.name}@${base.id.slice(0, 7)}`);
}

function snippetCommentLink(payload: NoteEvent) {
  const base = payload.snippet!;
  const repo = payload.project;
  return link(payload.object_attributes.url, `${repo.name} - ${base.title}`);
}

function prLink(payload: {object_attributes: MergeRequestAttributes; project: Project}) {
  const pr = payload.object_attributes;
  const repo = payload.project;
  return link(pr.url, `${repo.name}#${pr.id} ${pr.title}`);
}


declare type IReplier = (header: string, body?: string | null | undefined, footer?: string | undefined) => Promise<undefined>;

function handleIssues(api: GitLabHooks, reply: IReplier) {
  api.on('issue', ({payload}) => {
    const issue = payload.object_attributes;
    switch (issue.action) {
      case 'open':
        void reply(`🐛 New issue ${issueLink(payload)}\nby ${user(payload.user)}`, escape(issue.description));
        break;
      case 'closed':
        void reply(`🐛❌ Closed Issue ${issueLink(payload)}\nby ${user(payload.user)}`);
        break;
      case 'reopened':
        void reply(`🐛 Reopened Issue ${issueLink(payload)}\nby ${user(payload.user)}`);
        break;
      default:
        void reply(`🐛 ${issue.action}? Issue ${issueLink(payload)}\nby ${user(payload.user)}`);
        break;
    }
  });
}

function handleComments(api: GitLabHooks, reply: IReplier) {
  api.on('note', ({payload}) => {
    const note = payload.object_attributes;
    switch (note.noteable_type.toLowerCase().replace(/_/, '_')) {
      case 'commit':
        void reply(`💬 New commit comment on ${commitCommentLink(payload)}\nby ${user(payload.user)}`, note.st_diff.diff, escape(note.note));
        break;
      case 'issue':
        void reply(`💬 New comment on ${commentLink(payload)}\nby ${user(payload.user)}`, escape(note.note));
        break;
      case 'merge_request':
        void reply(`💬 New merge request review comment ${commentLink(payload)}\nby ${user(payload.user)}`, escape(note.note));
        break;
      case 'snippet':
        void reply(`💬 New snippet comment ${snippetCommentLink(payload)}\nby ${user(payload.user)}`, escape(note.note));
        break;
    }
  });
}

function handlePullRequests(api: GitLabHooks, reply: IReplier) {
  api.on('merge_request', ({payload}) => {
    const pr = payload.object_attributes;
    switch (pr.action) {
      case 'open':
        void reply(`🔌 New merge request ${prLink(payload)}\nby ${user(payload.user)}`);
        break;
      case 'closed':
        void reply(`🔌❌ Closed Merge request ${prLink(payload)}\nby ${user(payload.user)}`);
        break;
      case 'merged':
        void reply(`🥂 Merged & Closed Merge request ${prLink(payload)}\nby ${user(payload.user)}`);
        break;
      default:
        void reply(`🔌 ${pr.action}? Issue ${prLink(payload)}\nby ${user(payload.user)}`);
        break;
    }
  });
}

function handlePush(api: GitLabHooks, reply: IReplier) {
  api.on('push', ({payload}) => {
    const commits = payload.commits;
    const ref = payload.ref;
    if (commits.length === 0 || !ref.startsWith('refs/heads/')) {
      return;
    }
    const branch = ref.substring('refs/heads/'.length);

    const header = `🔨 ${commits.length} new commit${commits.length > 1 ? 's' : ''} to ${projectLink(payload)} on branch \`${branch}\``;
    const body: string[] = [];
    for (const commit of commits) {
      body.push(`${link(commit.url, commit.id.slice(0, 7))}: ${commit.message} by ${commit.author.name}`);
    }
    void reply(header, body.join('\n'));
  });

  api.on('tag_push', ({payload}) => {
    const ref = payload.ref;
    const tag = ref.substring('refs/tags/'.length);
    void reply(`🔨 tag \`${tag}\` created in ${projectLink(payload)}`);
  });
}

function handleWiki(api: GitLabHooks, reply: IReplier) {
  api.on('wiki_page', ({payload}) => {
    const wiki = payload.object_attributes;
    switch (wiki.action) {
      case 'open':
        void reply(`📘 Wiki page ${wikiLink(payload)} created in ${projectLink(payload)} by ${user(payload.user)}`, escape(wiki.content));
        break;
      case 'delete':
        void reply(`📘❌ Deleted Wiki page ${wikiLink(payload)} in ${projectLink(payload)} by ${user(payload.user)}`, escape(wiki.content));
        break;
      case 'update':
        void reply(`📘 Updated Wiki page ${wikiLink(payload)} in ${projectLink(payload)} by ${user(payload.user)}`, escape(wiki.content));
        break;
      default:
        void reply(`📘 ${wiki.action}? Wiki page ${wikiLink(payload)} in ${projectLink(payload)} by ${user(payload.user)}`, escape(wiki.content));
        break;
    }
  });
}

function handlePipeline(api: GitLabHooks, reply: IReplier) {
  api.on('pipeline', ({payload}) => {
    const pipeline = payload.object_attributes;
    const body = payload.builds.map((build) => `${build.stage}: ${build.name} (${build.status})`);
    switch (pipeline.status) {
      case 'success':
        void reply(`☀ Pipeline ${pipelineLink(payload)} state is successful`, body.join('\n'));
        break;
      default:
        void reply(`🌩 Pipeline ${pipelineLink(payload)} state is ${pipeline.status}`, body.join('\n'));
        break;
    }
  });
}

export const NAME = 'Gitlab';

export function webhookMessage(server: string, chatId: string): string {
  const url = `${server}/webhooks/gitlab/${encodeURIComponent(chatId)}`;
  const secret = createSecret(chatId);

  return `Please use this webhook url:
  [${url}](${url})
    Content-Type: \`application/json\`
    Secret: \`${secret}\`
  `;
}

export default function handle(req: VercelRequest, res: VercelResponse): void {
  const chatid = req.query.chatid! as string;

  const chatId = decodeURIComponent(chatid);

  const api = createHandler({
    path: '/',
    secret: createSecret(chatId)
  });

  const reply = replier(chatId);

  handleIssues(api, reply);
  handleComments(api, reply);
  handleWiki(api, reply);
  handlePullRequests(api, reply);
  handlePush(api, reply);
  handlePipeline(api, reply);

  api(req, res, (err) => {
    console.warn(err);
    res.statusCode = 404;
    res.end('no such location');
  });
}
