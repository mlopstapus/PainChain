import { PainChainEvent } from './types';

/**
 * Transform GitHub push event to PainChain event format
 */
export function transformPushEvent(
  event: any,
  owner: string,
  repo: string
): PainChainEvent {
  const commits = event.payload?.commits || [];
  const branch = event.payload?.ref?.replace('refs/heads/', '') || 'unknown';

  return {
    title: `Push to ${branch}`,
    connector: 'github',
    project: `${owner}/${repo}`,
    timestamp: new Date(event.created_at),
    data: {
      event_type: 'push',
      branch,
      commits: commits.length,
      author: event.actor?.login || 'unknown',
      url: `https://github.com/${owner}/${repo}/compare/${event.payload?.before?.substring(0, 7)}...${event.payload?.head?.substring(0, 7)}`,
      commit_messages: commits.slice(0, 3).map((c: any) => c.message),
    },
  };
}

/**
 * Transform GitHub pull request event to PainChain event format
 */
export function transformPullRequestEvent(
  event: any,
  owner: string,
  repo: string
): PainChainEvent {
  const pr = event.payload?.pull_request || {};
  const action = event.payload?.action || 'unknown';

  return {
    title: `Pull request ${action}: ${pr.title}`,
    connector: 'github',
    project: `${owner}/${repo}`,
    timestamp: new Date(event.created_at),
    data: {
      event_type: 'pull_request',
      action,
      pr_number: pr.number,
      title: pr.title,
      author: pr.user?.login || 'unknown',
      state: pr.state,
      url: pr.html_url,
      base_branch: pr.base?.ref,
      head_branch: pr.head?.ref,
    },
  };
}

/**
 * Transform GitHub issues event to PainChain event format
 */
export function transformIssuesEvent(
  event: any,
  owner: string,
  repo: string
): PainChainEvent {
  const issue = event.payload?.issue || {};
  const action = event.payload?.action || 'unknown';

  return {
    title: `Issue ${action}: ${issue.title}`,
    connector: 'github',
    project: `${owner}/${repo}`,
    timestamp: new Date(event.created_at),
    data: {
      event_type: 'issues',
      action,
      issue_number: issue.number,
      title: issue.title,
      author: issue.user?.login || 'unknown',
      state: issue.state,
      url: issue.html_url,
      labels: issue.labels?.map((l: any) => l.name) || [],
    },
  };
}

/**
 * Transform GitHub release event to PainChain event format
 */
export function transformReleaseEvent(
  event: any,
  owner: string,
  repo: string
): PainChainEvent {
  const release = event.payload?.release || {};
  const action = event.payload?.action || 'published';

  return {
    title: `Release ${action}: ${release.name || release.tag_name}`,
    connector: 'github',
    project: `${owner}/${repo}`,
    timestamp: new Date(event.created_at),
    data: {
      event_type: 'release',
      action,
      tag: release.tag_name,
      name: release.name,
      author: release.author?.login || 'unknown',
      url: release.html_url,
      prerelease: release.prerelease,
    },
  };
}

/**
 * Transform GitHub Actions workflow run to PainChain event format
 */
export function transformWorkflowRun(
  run: any,
  owner: string,
  repo: string
): PainChainEvent {
  // Calculate duration in seconds
  const duration = run.updated_at && run.run_started_at
    ? (new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()) / 1000
    : 0;

  return {
    title: `[Workflow] ${run.name}`,
    connector: 'github',
    project: `${owner}/${repo}`,
    timestamp: new Date(run.updated_at || run.created_at),
    data: {
      event_type: 'workflow',
      workflow_name: run.name,
      run_number: run.run_number,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      commit_sha: run.head_sha,
      author: run.actor?.login || run.triggering_actor?.login || 'unknown',
      event: run.event,
      duration_seconds: Math.round(duration),
      url: run.html_url,
    },
  };
}

/**
 * Main transformer - routes to appropriate event transformer
 */
export function transformGitHubEvent(
  event: any,
  owner: string,
  repo: string
): PainChainEvent | null {
  try {
    switch (event.type) {
      case 'PushEvent':
        return transformPushEvent(event, owner, repo);
      case 'PullRequestEvent':
        return transformPullRequestEvent(event, owner, repo);
      case 'IssuesEvent':
        return transformIssuesEvent(event, owner, repo);
      case 'ReleaseEvent':
        return transformReleaseEvent(event, owner, repo);
      default:
        // Ignore other event types for now
        return null;
    }
  } catch (error) {
    console.error(`Error transforming ${event.type} event:`, error);
    return null;
  }
}
