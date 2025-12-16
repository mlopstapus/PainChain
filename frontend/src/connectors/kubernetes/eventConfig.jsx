/**
 * Kubernetes Connector Event Type Configurations
 *
 * Defines how Kubernetes events are rendered in the timeline
 */

export const kubernetesEventConfig = {
  'K8sDeployment': {
    titleMatch: '[Deployment',
    sections: [
      {
        title: 'Deployment Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.description?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'replicas',
            label: 'Replicas',
            value: (event) => event.description?.replicas || null
          },
          {
            key: 'strategy',
            label: 'Strategy',
            value: (event) => event.description?.strategy || null
          }
        ],
        lists: [
          {
            key: 'images',
            title: 'Container Images',
            getValue: (event) => event.description?.images,
            renderItem: (img, idx) => (
              <div key={idx} className="item-entry">
                <span style={{ color: '#00E8A0' }}>{img.name}</span>
                <div style={{ fontSize: '0.9em', color: '#a0a0a0', marginTop: '2px' }}>{img.image}</div>
              </div>
            )
          }
        ]
      }
    ]
  },
  'K8sStatefulSet': {
    titleMatch: '[StatefulSet',
    sections: [
      {
        title: 'StatefulSet Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.metadata?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'replicas',
            label: 'Replicas',
            value: (event) => {
              const replicas = event.metadata?.replicas
              const ready = event.metadata?.ready_replicas || 0
              if (replicas === undefined) return null
              const color = ready === replicas ? '#3fb950' : '#f85149'
              return {
                type: 'html',
                content: <span style={{ color }}>{ready}/{replicas} ready</span>
              }
            }
          },
          {
            key: 'service_name',
            label: 'Service',
            value: (event) => event.metadata?.service_name || null
          }
        ],
        lists: [
          {
            key: 'images',
            title: 'Container Images',
            getValue: (event) => event.description?.images,
            renderItem: (image, idx) => (
              <div key={idx} className="item-entry">
                <span style={{ color: '#00E8A0', fontWeight: 600 }}>{image.name}</span>: {image.image}
              </div>
            )
          }
        ]
      }
    ]
  },
  'K8sDaemonSet': {
    titleMatch: '[DaemonSet',
    sections: [
      {
        title: 'DaemonSet Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.metadata?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'scheduled',
            label: 'Pods',
            value: (event) => {
              const desired = event.metadata?.desired_scheduled || 0
              const ready = event.metadata?.number_ready || 0
              const color = ready === desired ? '#3fb950' : '#f85149'
              return {
                type: 'html',
                content: <span style={{ color }}>{ready}/{desired} ready</span>
              }
            }
          }
        ],
        lists: [
          {
            key: 'images',
            title: 'Container Images',
            getValue: (event) => event.description?.images,
            renderItem: (image, idx) => (
              <div key={idx} className="item-entry">
                <span style={{ color: '#00E8A0', fontWeight: 600 }}>{image.name}</span>: {image.image}
              </div>
            )
          }
        ]
      }
    ]
  },
  'K8sService': {
    titleMatch: '[Service',
    sections: [
      {
        title: 'Service Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.description?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'type',
            label: 'Type',
            value: (event) => event.description?.type || null
          },
          {
            key: 'cluster_ip',
            label: 'Cluster IP',
            value: (event) => event.description?.cluster_ip || null
          }
        ],
        keyValue: {
          key: 'selector',
          title: 'Selector',
          getValue: (event) => event.description?.selector
        },
        lists: [
          {
            key: 'ports',
            title: 'Ports',
            getValue: (event) => event.description?.ports,
            renderItem: (port, idx) => (
              <div key={idx} className="item-entry">
                <span>{port.port} → {port.target_port} ({port.protocol})</span>
              </div>
            )
          }
        ]
      }
    ]
  },
  'K8sConfigMap': {
    titleMatch: '[ConfigMap',
    sections: [
      {
        title: 'ConfigMap Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.description?.namespace || event.metadata?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'num_keys',
            label: 'Data Keys',
            value: (event) => event.metadata?.num_keys || null
          },
          {
            key: 'event_type',
            label: 'Event',
            value: (event) => {
              const eventType = event.description?.event_type
              if (!eventType) return null
              const eventColors = {
                'ADDED': '#3fb950',
                'MODIFIED': '#f0883e',
                'DELETED': '#f85149'
              }
              return {
                type: 'html',
                content: <span style={{ color: eventColors[eventType] || '#808080' }}>{eventType}</span>
              }
            }
          }
        ],
        keyValue: {
          key: 'data',
          title: 'Data',
          getValue: (event) => event.description?.data,
          maxVisible: 10
        },
        lists: [
          {
            key: 'keys',
            title: 'Keys',
            getValue: (event) => event.description?.keys,
            maxVisible: 10
          }
        ]
      }
    ]
  },
  'K8sSecret': {
    titleMatch: '[Secret',
    sections: [
      {
        title: 'Secret Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.metadata?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'type',
            label: 'Type',
            value: (event) => event.metadata?.type || null
          },
          {
            key: 'num_keys',
            label: 'Data Keys',
            value: (event) => event.metadata?.num_keys || null
          }
        ],
        lists: [
          {
            key: 'keys',
            title: 'Keys',
            getValue: (event) => event.description?.keys,
            maxVisible: 10
          }
        ]
      }
    ]
  },
  'K8sIngress': {
    titleMatch: '[Ingress',
    sections: [
      {
        title: 'Ingress Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.description?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'ingress_class',
            label: 'Ingress Class',
            value: (event) => event.metadata?.ingress_class || null
          }
        ],
        lists: [
          {
            key: 'hosts',
            title: 'Hosts',
            getValue: (event) => event.description?.hosts,
            maxVisible: 10
          },
          {
            key: 'rules',
            title: 'Rules',
            getValue: (event) => event.description?.rules,
            renderItem: (rule, idx) => (
              <div key={idx} className="item-entry">
                <div style={{ color: '#00E8A0', fontWeight: 600 }}>{rule.host || '*'}</div>
                {rule.paths && rule.paths.map((path, pidx) => (
                  <div key={pidx} style={{ fontSize: '0.9em', color: '#808080', marginTop: '2px', marginLeft: '12px' }}>
                    {path.path} → {path.backend}
                  </div>
                ))}
              </div>
            )
          }
        ]
      }
    ]
  },
  'K8sPod': {
    titleMatch: '[Pod',
    sections: [
      {
        title: 'Pod Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.description?.namespace || event.metadata?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'node',
            label: 'Node',
            value: (event) => event.description?.node || null
          },
          {
            key: 'phase',
            label: 'Phase',
            value: (event) => {
              const phase = event.description?.phase
              if (!phase) return null
              const phaseColors = {
                'Running': '#3fb950',
                'Pending': '#f0883e',
                'Failed': '#f85149',
                'Succeeded': '#3fb950',
                'Unknown': '#808080'
              }
              return {
                type: 'html',
                content: <span style={{ color: phaseColors[phase] || '#808080', fontWeight: 600 }}>{phase}</span>
              }
            }
          },
          {
            key: 'event_type',
            label: 'Event',
            value: (event) => {
              const eventType = event.description?.event_type
              if (!eventType) return null
              const eventColors = {
                'ADDED': '#3fb950',
                'MODIFIED': '#f0883e',
                'DELETED': '#f85149'
              }
              return {
                type: 'html',
                content: <span style={{ color: eventColors[eventType] || '#808080' }}>{eventType}</span>
              }
            }
          }
        ],
        keyValue: {
          key: 'labels',
          title: 'Labels',
          getValue: (event) => event.description?.labels,
          maxVisible: 5
        },
        lists: [
          {
            key: 'container_specs',
            title: 'Container Specs',
            getValue: (event) => event.description?.container_specs,
            renderItem: (spec, idx) => (
              <div key={idx} className="item-entry">
                <div>
                  <span style={{ color: '#00E8A0', fontWeight: 600 }}>{spec.name}</span>
                </div>
                <div style={{ fontSize: '0.9em', color: '#a0a0a0', marginTop: '2px' }}>{spec.image}</div>
                {spec.requests && (
                  <div style={{ fontSize: '0.85em', color: '#808080', marginTop: '4px' }}>
                    <strong>Requests:</strong> {Object.entries(spec.requests).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </div>
                )}
                {spec.limits && (
                  <div style={{ fontSize: '0.85em', color: '#808080' }}>
                    <strong>Limits:</strong> {Object.entries(spec.limits).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </div>
                )}
                {spec.ports && spec.ports.length > 0 && (
                  <div style={{ fontSize: '0.85em', color: '#808080' }}>
                    <strong>Ports:</strong> {spec.ports.map(p => `${p.container_port}/${p.protocol}`).join(', ')}
                  </div>
                )}
                {spec.env_count > 0 && (
                  <div style={{ fontSize: '0.85em', color: '#808080' }}>
                    <strong>Environment Variables:</strong> {spec.env_count}
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'containers',
            title: 'Container Status',
            getValue: (event) => event.description?.containers,
            renderItem: (container, idx) => {
              const stateColor = {
                'running': '#3fb950',
                'waiting': '#f0883e',
                'terminated': '#f85149'
              }[container.state] || '#808080'

              const restartWarning = container.restart_count > 0
                ? <span style={{ color: '#f85149', marginLeft: '8px' }}>⚠ {container.restart_count} restarts</span>
                : null

              const statusInfo = container.reason
                ? <div style={{ marginTop: '4px', color: '#f85149' }}>
                    {container.reason}
                    {container.exit_code !== undefined && ` (exit code: ${container.exit_code})`}
                    {container.message && <div style={{ fontSize: '0.9em', marginTop: '2px' }}>{container.message}</div>}
                  </div>
                : null

              return (
                <div key={idx} className="item-entry">
                  <div>
                    <span style={{ color: '#00E8A0', fontWeight: 600 }}>{container.name}</span>
                    {' '}
                    <span style={{ color: stateColor }}>●</span>
                    {' '}
                    <span style={{ color: '#808080' }}>{container.state || 'unknown'}</span>
                    {restartWarning}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#a0a0a0', marginTop: '2px' }}>{container.image}</div>
                  {statusInfo}
                </div>
              )
            }
          },
          {
            key: 'volumes',
            title: 'Volumes',
            getValue: (event) => event.description?.volumes,
            renderItem: (volume, idx) => (
              <div key={idx} className="item-entry">
                <span style={{ color: '#00E8A0' }}>{volume.name}</span>
                <span style={{ color: '#808080', marginLeft: '8px' }}>({volume.type})</span>
              </div>
            )
          }
        ]
      }
    ]
  },
  'K8sRole': {
    titleMatch: '[Role',
    sections: [
      {
        title: 'Role Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.description?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          }
        ],
        lists: [
          {
            key: 'rules',
            title: 'Rules',
            getValue: (event) => event.description?.rules,
            renderItem: (rule, idx) => (
              <div key={idx} className="item-entry">
                <div style={{ fontSize: '0.9em' }}>
                  <strong>Resources:</strong> {rule.resources?.join(', ') || 'none'}
                </div>
                <div style={{ fontSize: '0.9em', marginTop: '2px' }}>
                  <strong>Verbs:</strong> {rule.verbs?.join(', ') || 'none'}
                </div>
                {rule.api_groups && rule.api_groups.length > 0 && (
                  <div style={{ fontSize: '0.85em', color: '#808080', marginTop: '2px' }}>
                    <strong>API Groups:</strong> {rule.api_groups.join(', ')}
                  </div>
                )}
              </div>
            )
          }
        ]
      }
    ]
  },
  'K8sRoleBinding': {
    titleMatch: '[RoleBinding',
    sections: [
      {
        title: 'RoleBinding Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.description?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'role_ref',
            label: 'Role',
            value: (event) => {
              const roleRef = event.description?.role_ref
              return roleRef ? `${roleRef.kind}: ${roleRef.name}` : null
            }
          }
        ],
        lists: [
          {
            key: 'subjects',
            title: 'Subjects',
            getValue: (event) => event.description?.subjects,
            renderItem: (subject, idx) => (
              <div key={idx} className="item-entry">
                <span style={{ color: '#00E8A0' }}>{subject.kind}</span>
                <span style={{ marginLeft: '8px' }}>{subject.name}</span>
                {subject.namespace && (
                  <span style={{ color: '#808080', marginLeft: '8px' }}>({subject.namespace})</span>
                )}
              </div>
            )
          }
        ]
      }
    ]
  },
  'K8sHelmRelease': {
    titleMatch: '[Helm',
    sections: [
      {
        title: 'Helm Release Details',
        fields: [
          {
            key: 'namespace',
            label: 'Namespace',
            value: (event) => event.description?.namespace || event.metadata?.namespace || null
          },
          {
            key: 'cluster',
            label: 'Cluster',
            value: (event) => event.metadata?.cluster || null
          },
          {
            key: 'release_name',
            label: 'Release Name',
            value: (event) => event.description?.release_name || event.metadata?.release_name || null
          },
          {
            key: 'revision',
            label: 'Revision',
            value: (event) => {
              const revision = event.description?.revision || event.metadata?.revision
              if (revision === undefined || revision === null) return null
              return `v${revision}`
            }
          },
          {
            key: 'chart',
            label: 'Chart',
            value: (event) => event.description?.chart || event.metadata?.chart || null
          },
          {
            key: 'app_version',
            label: 'App Version',
            value: (event) => event.description?.app_version || null
          },
          {
            key: 'status',
            label: 'Status',
            value: (event) => {
              const status = event.description?.status || event.status
              if (!status) return null
              const statusColors = {
                'deployed': '#3fb950',
                'superseded': '#808080',
                'failed': '#f85149',
                'uninstalled': '#f85149'
              }
              const color = statusColors[status.toLowerCase()] || '#808080'
              return {
                type: 'html',
                content: <span style={{ color, fontWeight: 600 }}>{status}</span>
              }
            }
          },
          {
            key: 'description',
            label: 'Description',
            value: (event) => event.description?.description || null
          }
        ],
        lists: [
          {
            key: 'values_keys',
            title: 'Values (Keys)',
            getValue: (event) => event.description?.values_keys,
            renderItem: (key, idx) => (
              <div key={idx} className="item-entry">
                <span style={{ color: '#00E8A0' }}>{key}</span>
              </div>
            ),
            maxVisible: 10
          }
        ]
      }
    ]
  }
}
