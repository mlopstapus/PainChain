import { Injectable, Logger } from '@nestjs/common'
import { ProcessorEvent } from '../../events/events.service'

@Injectable()
export class GitHubWebhookTransformer {
  private readonly logger = new Logger(GitHubWebhookTransformer.name)

  transform(
    payload: any,
    eventType: string,
    connectionId: number
  ): ProcessorEvent | null {
    this.logger.debug(`Transforming GitHub ${eventType} event`)

    switch (eventType) {
      case 'pull_request':
        return this.transformPullRequest(payload, connectionId)
      case 'push':
        return this.transformPush(payload, connectionId)
      case 'release':
        return this.transformRelease(payload, connectionId)
      case 'workflow_run':
        return this.transformWorkflowRun(payload, connectionId)
      case 'package':
        return this.transformPackage(payload, connectionId)
      default:
        this.logger.warn(`Unsupported GitHub event type: ${eventType}`)
        return null
    }
  }

  private transformPullRequest(payload: any, connectionId: number): ProcessorEvent {
    const pr = payload.pull_request
    const action = payload.action

    return {
      connectionId,
      source: 'github',
      eventType: 'PR',
      title: `PR #${pr.number}: ${pr.title}`,
      description: pr.body || undefined,
      timestamp: new Date(pr.updated_at || pr.created_at),
      url: pr.html_url,
      status: pr.state === 'open' ? 'Open' : pr.merged ? 'Merged' : 'Closed',
      externalId: `github-pr-${pr.id}`,
      metadata: {
        repository: payload.repository.full_name,
        author: pr.user.login,
        number: pr.number,
        state: pr.state,
        merged: pr.merged,
        draft: pr.draft,
        labels: pr.labels.map((l: any) => l.name),
      },
      eventMetadata: {
        action,
        head: pr.head.ref,
        base: pr.base.ref,
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
      },
    }
  }

  private transformPush(payload: any, connectionId: number): ProcessorEvent | null {
    const commits = payload.commits || []
    if (commits.length === 0) {
      return null // Skip empty pushes
    }

    const latestCommit = commits[commits.length - 1]
    const ref = payload.ref.replace('refs/heads/', '')

    return {
      connectionId,
      source: 'github',
      eventType: 'Commit',
      title: latestCommit.message.split('\n')[0],
      description: latestCommit.message,
      timestamp: new Date(payload.head_commit?.timestamp || new Date()),
      url: latestCommit.url,
      externalId: `github-commit-${latestCommit.id}`,
      metadata: {
        repository: payload.repository.full_name,
        author: latestCommit.author.name,
        branch: ref,
        commitCount: commits.length,
      },
      eventMetadata: {
        sha: latestCommit.id,
        pusher: payload.pusher.name,
        commits: commits.map((c: any) => ({
          sha: c.id,
          message: c.message,
          author: c.author.name,
          url: c.url,
        })),
      },
    }
  }

  private transformRelease(payload: any, connectionId: number): ProcessorEvent {
    const release = payload.release
    const action = payload.action

    return {
      connectionId,
      source: 'github',
      eventType: 'Release',
      title: `Release ${release.tag_name}: ${release.name || release.tag_name}`,
      description: release.body || undefined,
      timestamp: new Date(release.published_at || release.created_at),
      url: release.html_url,
      externalId: `github-release-${release.id}`,
      metadata: {
        repository: payload.repository.full_name,
        author: release.author.login,
        tag: release.tag_name,
        prerelease: release.prerelease,
        draft: release.draft,
      },
      eventMetadata: {
        action,
        target_commitish: release.target_commitish,
        assets: release.assets.map((a: any) => ({
          name: a.name,
          size: a.size,
          download_count: a.download_count,
        })),
      },
    }
  }

  private transformWorkflowRun(payload: any, connectionId: number): ProcessorEvent {
    const run = payload.workflow_run
    const action = payload.action

    return {
      connectionId,
      source: 'github',
      eventType: 'Workflow',
      title: `Workflow: ${run.name}`,
      timestamp: new Date(run.updated_at || run.created_at),
      url: run.html_url,
      status: this.mapWorkflowStatus(run.status, run.conclusion),
      externalId: `github-workflow-${run.id}`,
      metadata: {
        repository: payload.repository.full_name,
        actor: run.actor.login,
        workflow: run.name,
        branch: run.head_branch,
        event: run.event,
      },
      eventMetadata: {
        action,
        status: run.status,
        conclusion: run.conclusion,
        run_number: run.run_number,
        attempt: run.run_attempt,
      },
    }
  }

  private transformPackage(payload: any, connectionId: number): ProcessorEvent {
    const pkg = payload.package
    const action = payload.action

    return {
      connectionId,
      source: 'github',
      eventType: 'Image',
      title: `Package ${action}: ${pkg.name}`,
      timestamp: new Date(pkg.updated_at || pkg.created_at),
      url: pkg.html_url,
      externalId: `github-package-${pkg.id}`,
      metadata: {
        repository: payload.repository?.full_name,
        packageType: pkg.package_type,
        packageName: pkg.name,
        version: pkg.package_version?.version,
      },
      eventMetadata: {
        action,
        package_type: pkg.package_type,
        visibility: pkg.package_version?.package_visibility,
      },
    }
  }

  private mapWorkflowStatus(status: string, conclusion: string | null): string {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          return 'Success'
        case 'failure':
          return 'Failed'
        case 'cancelled':
          return 'Cancelled'
        case 'skipped':
          return 'Skipped'
        default:
          return conclusion || 'Completed'
      }
    }
    return status === 'in_progress' ? 'Running' : status
  }
}
