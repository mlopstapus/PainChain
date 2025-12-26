/**
 * GitHub Connector Event Type Configurations
 *
 * Defines how GitHub events (PR, Workflow, Commit, Release, Image) are rendered in the timeline
 */

export const githubEventConfig = {
  'PR': {
    titleMatch: '[PR]',
    sections: [
      {
        title: 'Pull Request Details',
        fields: [
          {
            key: 'branches',
            label: 'Branch',
            value: (event) => event.metadata?.head_branch && event.metadata?.base_branch
              ? `${event.metadata.head_branch} → ${event.metadata.base_branch}`
              : null
          },
          {
            key: 'changes',
            label: 'Changes',
            value: (event) => {
              const { additions, deletions, changed_files } = event.metadata || {}
              if (additions === undefined) return null
              return {
                type: 'html',
                content: (
                  <>
                    <span style={{ color: '#3fb950' }}>+{additions}</span>
                    {' / '}
                    <span style={{ color: '#f85149' }}>-{deletions}</span>
                    {' in '}{changed_files} {changed_files === 1 ? 'file' : 'files'}
                  </>
                )
              }
            }
          },
          {
            key: 'reviewers',
            label: 'Reviewers',
            value: (event) => event.metadata?.reviewers?.length > 0
              ? event.metadata.reviewers.join(', ')
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
            key: 'changes_requested',
            label: 'Changes Requested',
            value: (event) => event.metadata?.changes_requested_count > 0
              ? { type: 'html', content: <span style={{ color: '#f85149' }}>{event.metadata.changes_requested_count}</span> }
              : null
          },
          {
            key: 'comments',
            label: 'Comments',
            value: (event) => (event.metadata?.comments > 0 || event.metadata?.review_comments > 0)
              ? `${event.metadata.comments} general, ${event.metadata.review_comments} review`
              : null
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
  'Workflow': {
    titleMatch: '[Workflow]',
    sections: [
      {
        title: 'Workflow Details',
        fields: [
          {
            key: 'status',
            label: 'Status',
            value: (event) => {
              let conclusion = event.metadata?.conclusion

              // If no conclusion but has duration, it's completed (successful)
              if (!conclusion && event.metadata?.duration_seconds !== undefined && event.metadata?.duration_seconds > 0) {
                const hasFailed = event.metadata?.failed_jobs_count > 0
                conclusion = hasFailed ? 'failure' : 'success'
              }

              // Fall back to status field if still no conclusion
              if (!conclusion) {
                conclusion = event.status || event.metadata?.status
              }

              if (!conclusion) return null

              const color = conclusion === 'success' ? '#3fb950' : conclusion === 'failure' ? '#f85149' : '#808080'
              const icon = conclusion === 'success' ? '✓ ' : conclusion === 'failure' ? '✗ ' : ''
              return { type: 'html', content: <span style={{ color }}>{icon}{conclusion}</span> }
            }
          },
          {
            key: 'duration',
            label: 'Duration',
            value: (event) => {
              const seconds = event.metadata?.duration_seconds
              if (seconds === undefined) return null
              const mins = Math.floor(seconds / 60)
              const secs = Math.floor(seconds % 60)
              return `${mins}m ${secs}s`
            }
          },
          {
            key: 'branch',
            label: 'Branch',
            value: (event) => event.metadata?.branch || null
          },
          {
            key: 'commit',
            label: 'Commit',
            value: (event) => event.metadata?.commit_sha || null
          },
          {
            key: 'trigger',
            label: 'Triggered by',
            value: (event) => event.metadata?.event || null
          },
          {
            key: 'run_number',
            label: 'Run',
            value: (event) => event.metadata?.run_number ? `#${event.metadata.run_number}` : null
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
              ? { type: 'html', content: <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ color: '#00E8A0', textDecoration: 'none' }}>View on GitHub →</a> }
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
                <span className="job-status" style={{ color: '#f85149' }}>{job.conclusion}</span>
              </div>
            )
          }
        ]
      }
    ]
  },
  'Commit': {
    titleMatch: '[Commit]',
    sections: [
      {
        title: 'Commit Details',
        fields: [
          {
            key: 'branch',
            label: 'Branch',
            value: (event) => event.metadata?.branch || null
          },
          {
            key: 'sha',
            label: 'SHA',
            value: (event) => event.metadata?.sha?.substring(0, 7) || null
          },
          {
            key: 'changes',
            label: 'Changes',
            value: (event) => {
              const { additions, deletions } = event.metadata || {}
              if (additions === undefined) return null
              return {
                type: 'html',
                content: (
                  <>
                    <span style={{ color: '#3fb950' }}>+{additions}</span>
                    {' / '}
                    <span style={{ color: '#f85149' }}>-{deletions}</span>
                  </>
                )
              }
            }
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
  'Release': {
    titleMatch: '[Release]',
    sections: [
      {
        title: 'Release Details',
        fields: [
          {
            key: 'tag',
            label: 'Tag',
            value: (event) => event.metadata?.tag_name || null
          },
          {
            key: 'prerelease',
            label: 'Pre-release',
            value: (event) => event.metadata?.prerelease !== undefined
              ? (event.metadata.prerelease ? 'Yes' : 'No')
              : null
          },
          {
            key: 'draft',
            label: 'Draft',
            value: (event) => event.metadata?.draft !== undefined
              ? (event.metadata.draft ? 'Yes' : 'No')
              : null
          }
        ],
        lists: [
          {
            key: 'assets',
            title: 'Assets',
            getValue: (event) => event.description?.assets,
            maxVisible: 10
          }
        ]
      }
    ]
  },
  'Image': {
    titleMatch: '[Image]',
    sections: [
      {
        title: 'Container Image Details',
        fields: [
          {
            key: 'registry',
            label: 'Registry',
            value: (event) => event.metadata?.registry || null
          },
          {
            key: 'image',
            label: 'Image',
            value: (event) => event.metadata?.image || null
          },
          {
            key: 'size',
            label: 'Size',
            value: (event) => event.description?.metadata?.size || null
          },
          {
            key: 'digest',
            label: 'Digest',
            value: (event) => event.description?.metadata?.digest_short || event.metadata?.digest?.substring(0, 12) || null
          },
          {
            key: 'package',
            label: 'Package',
            value: (event) => event.metadata?.package || null
          },
          {
            key: 'repository',
            label: 'Repository',
            value: (event) => event.metadata?.repository || null
          },
          {
            key: 'view',
            label: 'View',
            value: (event) => event.url
              ? { type: 'html', content: <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ color: '#00E8A0', textDecoration: 'none' }}>View Package →</a> }
              : null
          }
        ],
        lists: [
          {
            key: 'tags',
            title: 'Tags',
            getValue: (event) => event.description?.labels || event.metadata?.tags,
            maxVisible: 10
          }
        ]
      }
    ]
  }
}
