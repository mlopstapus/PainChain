import { Injectable, Logger } from '@nestjs/common'
import { ProcessorEvent } from '../../events/events.service'

@Injectable()
export class GitLabWebhookTransformer {
  private readonly logger = new Logger(GitLabWebhookTransformer.name)

  transform(
    payload: any,
    eventType: string,
    connectionId: number
  ): ProcessorEvent | null {
    this.logger.debug(`Transforming GitLab ${eventType} event`)

    switch (eventType) {
      case 'Push Hook':
        return this.transformPush(payload, connectionId)
      case 'Merge Request Hook':
        return this.transformMergeRequest(payload, connectionId)
      case 'Pipeline Hook':
        return this.transformPipeline(payload, connectionId)
      case 'Release Hook':
        return this.transformRelease(payload, connectionId)
      default:
        this.logger.warn(`Unsupported GitLab event type: ${eventType}`)
        return null
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
      source: 'gitlab',
      eventType: 'Commit',
      title: latestCommit.message.split('\n')[0],
      description: latestCommit.message,
      timestamp: new Date(latestCommit.timestamp),
      url: latestCommit.url,
      externalId: `gitlab-commit-${latestCommit.id}`,
      metadata: {
        repository: payload.project.path_with_namespace,
        author: latestCommit.author.name,
        branch: ref,
        commitCount: payload.total_commits_count,
      },
      eventMetadata: {
        sha: latestCommit.id,
        pusher: payload.user_name,
        commits: commits.map((c: any) => ({
          sha: c.id,
          message: c.message,
          author: c.author.name,
          url: c.url,
        })),
      },
    }
  }

  private transformMergeRequest(payload: any, connectionId: number): ProcessorEvent {
    const mr = payload.object_attributes
    const action = mr.action

    return {
      connectionId,
      source: 'gitlab',
      eventType: 'MR',
      title: `MR !${mr.iid}: ${mr.title}`,
      description: mr.description || undefined,
      timestamp: new Date(mr.updated_at || mr.created_at),
      url: mr.url,
      status: this.mapMRStatus(mr.state, mr.merge_status),
      externalId: `gitlab-mr-${mr.id}`,
      metadata: {
        repository: payload.project.path_with_namespace,
        author: payload.user.name,
        number: mr.iid,
        state: mr.state,
        mergeStatus: mr.merge_status,
        draft: mr.work_in_progress,
        labels: payload.labels?.map((l: any) => l.title) || [],
      },
      eventMetadata: {
        action,
        source_branch: mr.source_branch,
        target_branch: mr.target_branch,
        source_project_id: mr.source_project_id,
        target_project_id: mr.target_project_id,
      },
    }
  }

  private transformPipeline(payload: any, connectionId: number): ProcessorEvent {
    const pipeline = payload.object_attributes

    return {
      connectionId,
      source: 'gitlab',
      eventType: 'Pipeline',
      title: `Pipeline #${pipeline.id}: ${pipeline.ref}`,
      timestamp: new Date(pipeline.finished_at || pipeline.created_at),
      url: `${payload.project.web_url}/-/pipelines/${pipeline.id}`,
      status: this.mapPipelineStatus(pipeline.status),
      externalId: `gitlab-pipeline-${pipeline.id}`,
      metadata: {
        repository: payload.project.path_with_namespace,
        branch: pipeline.ref,
        source: pipeline.source,
        duration: pipeline.duration,
      },
      eventMetadata: {
        status: pipeline.status,
        stages: pipeline.stages,
        sha: pipeline.sha,
        before_sha: pipeline.before_sha,
        variables: pipeline.variables,
      },
    }
  }

  private transformRelease(payload: any, connectionId: number): ProcessorEvent {
    const release = payload
    const action = release.action

    return {
      connectionId,
      source: 'gitlab',
      eventType: 'Release',
      title: `Release ${release.tag}: ${release.name}`,
      description: release.description || undefined,
      timestamp: new Date(release.released_at || release.created_at),
      url: release.url,
      externalId: `gitlab-release-${release.id}`,
      metadata: {
        repository: payload.project.path_with_namespace,
        author: release.author?.name,
        tag: release.tag,
      },
      eventMetadata: {
        action,
        commit: release.commit,
        assets: release.assets?.links?.map((a: any) => ({
          name: a.name,
          url: a.url,
          link_type: a.link_type,
        })) || [],
      },
    }
  }

  private mapMRStatus(state: string, mergeStatus: string): string {
    if (state === 'merged') return 'Merged'
    if (state === 'closed') return 'Closed'
    if (state === 'opened') {
      if (mergeStatus === 'can_be_merged') return 'Open'
      if (mergeStatus === 'cannot_be_merged') return 'Conflicts'
      return 'Open'
    }
    return state
  }

  private mapPipelineStatus(status: string): string {
    switch (status) {
      case 'success':
        return 'Success'
      case 'failed':
        return 'Failed'
      case 'canceled':
        return 'Cancelled'
      case 'skipped':
        return 'Skipped'
      case 'running':
        return 'Running'
      case 'pending':
        return 'Pending'
      default:
        return status
    }
  }
}
