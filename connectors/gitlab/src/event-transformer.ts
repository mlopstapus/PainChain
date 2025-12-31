import { PainChainEvent } from './types';

/**
 * Transform GitLab push event to PainChain event format
 */
export function transformPushEvent(
  event: any,
  project: string
): PainChainEvent {
  const commits = event.total_commits_count || 0;
  const branch = event.push_data?.ref || 'unknown';

  return {
    title: `Push to ${branch}`,
    connector: 'gitlab',
    project,
    timestamp: new Date(event.created_at),
    data: {
      event_type: 'push',
      branch,
      commits,
      author: event.author?.username || 'unknown',
      url: `${event.project_id}`, // GitLab event URLs vary
      commit_sha: event.push_data?.commit_to,
    },
  };
}

/**
 * Transform GitLab merge request event to PainChain event format
 */
export function transformMergeRequestEvent(
  event: any,
  project: string
): PainChainEvent {
  const action = event.action_name || 'unknown';
  const mr = event.target || {};

  return {
    title: `Merge request ${action}: ${mr.title || 'Untitled'}`,
    connector: 'gitlab',
    project,
    timestamp: new Date(event.created_at),
    data: {
      event_type: 'merge_request',
      action,
      mr_iid: mr.iid,
      title: mr.title,
      author: event.author?.username || 'unknown',
      state: mr.state,
      url: mr.web_url,
      source_branch: mr.source_branch,
      target_branch: mr.target_branch,
    },
  };
}

/**
 * Transform GitLab issue event to PainChain event format
 */
export function transformIssueEvent(
  event: any,
  project: string
): PainChainEvent {
  const action = event.action_name || 'unknown';
  const issue = event.target || {};

  return {
    title: `Issue ${action}: ${issue.title || 'Untitled'}`,
    connector: 'gitlab',
    project,
    timestamp: new Date(event.created_at),
    data: {
      event_type: 'issue',
      action,
      issue_iid: issue.iid,
      title: issue.title,
      author: event.author?.username || 'unknown',
      state: issue.state,
      url: issue.web_url,
      labels: issue.labels?.map((l: any) => l.name) || [],
    },
  };
}

/**
 * Transform GitLab pipeline event to PainChain event format
 */
export function transformPipelineEvent(
  pipeline: any,
  project: string
): PainChainEvent {
  const duration = pipeline.duration || 0;

  return {
    title: `[Pipeline] ${pipeline.ref}`,
    connector: 'gitlab',
    project,
    timestamp: new Date(pipeline.updated_at || pipeline.created_at),
    data: {
      event_type: 'pipeline',
      pipeline_id: pipeline.id,
      status: pipeline.status,
      ref: pipeline.ref,
      sha: pipeline.sha,
      author: pipeline.user?.username || 'unknown',
      duration_seconds: duration,
      url: pipeline.web_url,
    },
  };
}

/**
 * Main transformer - routes to appropriate event transformer
 */
export function transformGitLabEvent(
  event: any,
  project: string
): PainChainEvent | null {
  try {
    switch (event.action_name) {
      case 'pushed to':
      case 'pushed new':
        return transformPushEvent(event, project);
      case 'opened':
      case 'closed':
      case 'merged':
      case 'updated':
        if (event.target_type === 'MergeRequest') {
          return transformMergeRequestEvent(event, project);
        } else if (event.target_type === 'Issue') {
          return transformIssueEvent(event, project);
        }
        return null;
      default:
        // Ignore other event types for now
        return null;
    }
  } catch (error) {
    console.error(`Error transforming GitLab event:`, error);
    return null;
  }
}
