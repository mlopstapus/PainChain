/**
 * GitLab Connector Event Type Configurations
 *
 * Defines how GitLab events (MR, Pipeline, Commit, Release, Image) are rendered in the timeline
 */

export const gitlabEventConfig = {
  'MR': {
    titleMatch: '[MR]',
    sections: [
      {
        title: 'Merge Request Details',
        fields: [
          {
            key: 'branches',
            label: 'Branch',
            value: (event) => event.metadata?.source_branch && event.metadata?.target_branch
              ? `${event.metadata.source_branch} → ${event.metadata.target_branch}`
              : null
          },
          {
            key: 'approved_by',
            label: 'Approved By',
            value: (event) => event.metadata?.approved_by?.length > 0
              ? event.metadata.approved_by.join(', ')
              : null
          },
          {
            key: 'approvals',
            label: 'Approvals',
            value: (event) => event.metadata?.approved_count > 0
              ? { type: 'html', content: <span style={{ color: '#3fb950' }}>✓ {event.metadata.approved_count}</span> }
              : null
          },
          {
            key: 'comments',
            label: 'Comments',
            value: (event) => event.metadata?.user_notes_count > 0
              ? event.metadata.user_notes_count
              : null
          },
          {
            key: 'votes',
            label: 'Votes',
            value: (event) => {
              const upvotes = event.metadata?.upvotes || 0
              const downvotes = event.metadata?.downvotes || 0
              if (upvotes === 0 && downvotes === 0) return null
              return {
                type: 'html',
                content: (
                  <>
                    <span style={{ color: '#3fb950' }}>👍 {upvotes}</span>
                    {' / '}
                    <span style={{ color: '#f85149' }}>👎 {downvotes}</span>
                  </>
                )
              }
            }
          },
          {
            key: 'merged',
            label: 'Status',
            value: (event) => event.metadata?.merged !== undefined
              ? { type: 'html', content: <span style={{ color: event.metadata.merged ? '#a371f7' : '#808080' }}>{event.metadata.merged ? '✓ Merged' : 'Not merged'}</span> }
              : null
          }
        ],
        lists: [
          {
            key: 'files_changed',
            title: 'Files Changed',
            getValue: (event) => event.description?.files_changed,
            maxVisible: 10
          }
        ]
      }
    ]
  },
  'Pipeline': {
    titleMatch: '[Pipeline]',
    sections: [
      {
        title: 'Pipeline Details',
        fields: [
          {
            key: 'status',
            label: 'Status',
            value: (event) => {
              let status = event.metadata?.status

              // If no status but has duration, it's completed (infer from failed jobs)
              if (!status && event.metadata?.duration_seconds !== undefined && event.metadata?.duration_seconds > 0) {
                const hasFailed = event.metadata?.failed_jobs_count > 0
                status = hasFailed ? 'failed' : 'success'
              }

              // Fall back to top-level status field if still no status
              if (!status) {
                status = event.status
              }

              if (!status) return null

              const color = status === 'success' ? '#3fb950' : status === 'failed' ? '#f85149' : '#808080'
              const icon = status === 'success' ? '✓ ' : status === 'failed' ? '✗ ' : ''
              return { type: 'html', content: <span style={{ color }}>{icon}{status}</span> }
            }
          },
          {
            key: 'duration',
            label: 'Duration',
            value: (event) => {
              const seconds = event.metadata?.duration_seconds
              if (seconds === undefined || seconds === null) return null
              const mins = Math.floor(seconds / 60)
              const secs = Math.floor(seconds % 60)
              return `${mins}m ${secs}s`
            }
          },
          {
            key: 'ref',
            label: 'Ref',
            value: (event) => event.metadata?.ref || null
          },
          {
            key: 'commit',
            label: 'Commit',
            value: (event) => event.metadata?.sha || null
          },
          {
            key: 'source',
            label: 'Source',
            value: (event) => event.metadata?.source || null
          },
          {
            key: 'pipeline_id',
            label: 'Pipeline ID',
            value: (event) => event.metadata?.pipeline_id ? `#${event.metadata.pipeline_id}` : null
          },
          {
            key: 'failed_jobs',
            label: 'Failed Jobs',
            value: (event) => event.metadata?.failed_jobs_count > 0
              ? { type: 'html', content: <span style={{ color: '#f85149' }}>{event.metadata.failed_jobs_count}</span> }
              : null
          },
          {
            key: 'logs',
            label: 'Logs',
            value: (event) => event.url
              ? { type: 'html', content: <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ color: '#00E8A0', textDecoration: 'none' }}>View on GitLab →</a> }
              : null
          }
        ],
        lists: [
          {
            key: 'failed_jobs_detail',
            title: 'Failed Jobs',
            getValue: (event) => event.description?.failed_jobs,
            renderItem: (job, idx) => (
              <div key={idx} className="job-item">
                <span className="job-name">{job.name}</span>
                <span className="job-status" style={{ color: '#f85149' }}>{job.status}</span>
              </div>
            )
          }
        ]
      }
    ]
  }
}
