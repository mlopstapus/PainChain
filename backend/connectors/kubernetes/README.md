# Kubernetes Connector

The Kubernetes connector monitors activity in a Kubernetes cluster and syncs selected resources and events into PainChain for visibility and analysis. It captures changes to workloads and cluster resources and stores event metadata in PainChain's database for indexing, alerting, and dashboards.

## Overview

The connector can run inside the cluster or externally (using a kubeconfig). It watches configured namespaces (or all namespaces) and ingests events for objects such as Pods, Deployments, Services, ConfigMaps, and more.

## Event Types Tracked

- **Pod** — Creation, updates, restarts, status changes
- **Deployment** — New rollouts, scaling events, revision changes
- **ReplicaSet / StatefulSet / DaemonSet** — Scaling and status events
- **Service** — Changes to service definitions and endpoints
- **ConfigMap / Secret** — Updates that may affect running workloads
- **Node** — Node status changes, conditions, and availability
- **Namespace** — Creation/deletion and status
- **Kubernetes Events** — Warning/info events emitted by controllers and the kubelet

## Key Capabilities

- Selective namespace watching and label filtering
- Optional in-cluster or out-of-cluster operation (kubeconfig)
- Smart deduplication to avoid storing duplicate events
- Configurable poll/watch intervals and resource filters
- Rich metadata capture (labels, annotations, ownerReferences)
- Links to object manifests and related resources

## Prerequisites

- A Kubernetes cluster (v1.20+ recommended)
- kubeconfig with read permissions, or a ServiceAccount with the RBAC shown below
- Network access from the connector to the Kubernetes API server
- PainChain backend reachable for ingesting events

### Recommended RBAC (in-cluster deployment)

Apply the following minimal RBAC to give the connector permissions to list/watch/read resources. Adjust the verbs and resources as needed for your environment.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: painchain-kubernetes-connector
  namespace: painchain
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: painchain-kubernetes-connector
rules:
  - apiGroups: ["", "apps", "batch", "extensions"]
    resources:
      - pods
      - services
      - configmaps
      - secrets
      - events
      - namespaces
      - nodes
      - deployments
      - replicasets
      - statefulsets
      - daemonsets
    verbs:
      - get
      - list
      - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: painchain-kubernetes-connector-binding
subjects:
  - kind: ServiceAccount
    name: painchain-kubernetes-connector
    namespace: painchain
roleRef:
  kind: ClusterRole
  name: painchain-kubernetes-connector
  apiGroup: rbac.authorization.k8s.io
```

## Configuration Guide

The connector accepts configuration via environment variables or a config file. Typical configuration options:

- `CONNECTOR_NAME` — Friendly name for this connection (e.g., `Cluster-A`)
- `KUBECONFIG` — Path to kubeconfig (when running outside cluster)
- `IN_CLUSTER` — `true`/`false`. If `true`, runs using in-cluster ServiceAccount
- `WATCH_NAMESPACES` — Comma-separated namespaces to watch (empty = all)
- `RESOURCE_FILTER` — Label selector to filter resources (e.g., `app=myapp`)
- `POLL_INTERVAL_SECONDS` — Poll interval for non-watch operations (default: `300`)
- `PAINCHAIN_API_URL` — URL for PainChain backend ingestion endpoint
- `LOG_LEVEL` — `debug|info|warn|error`

Example environment block for a deployment manifest:

```yaml
env:
  - name: CONNECTOR_NAME
    value: "prod-cluster"
  - name: IN_CLUSTER
    value: "true"
  - name: WATCH_NAMESPACES
    value: "default,monitoring"
  - name: PAINCHAIN_API_URL
    value: "https://painchain-api.svc.cluster.local:8000"
  - name: LOG_LEVEL
    value: "info"
```

## Running Locally (out-of-cluster)

1. Ensure you have a working `kubeconfig` and `kubectl` context set.
2. Export `KUBECONFIG` or provide the path via `KUBECONFIG` env var.
3. Run the connector (example using Python):

```bash
export KUBECONFIG=~/.kube/config
export PAINCHAIN_API_URL=https://painchain-api.example.com
python3 connector.py
```

(Adapt the command if the connector runs as a different binary or inside a container.)

## Deployment (in-cluster)

- Build or use the provided connector image and deploy using the ServiceAccount and RBAC shown above.
- Use a Kubernetes Deployment with appropriate `resources.requests` and `replicaCount` (typically `1` for a single watcher; scale only if you shard namespaces).

## Example Helm/Deployment values

- `replicaCount`: 1
- `resources.requests.memory`: 256Mi
- `resources.requests.cpu`: 100m
- `env.WATCH_NAMESPACES`: `"default"` (or empty to watch all)

## Security Notes

- Treat kubeconfigs and ServiceAccount tokens like secrets. Do not commit them to source control.
- Limit RBAC permissions to only the resources and verbs the connector needs.
- If running externally, use network policies or private networks to restrict access to the kube-apiserver.

## Troubleshooting

- Connector cannot authenticate: verify ServiceAccount, ClusterRoleBinding, or kubeconfig credentials.
- No events seen: confirm the `WATCH_NAMESPACES` includes namespaces with activity and that the connector has `watch` permission on `events`.
- High event volume: consider label filters or namespace scoping to reduce noise, or increase deduplication window.

## Contributing

- Follow the repository contributing guidelines for code style and tests.
- Add tests for new resource handlers and update the connector `README.md` when adding features.

## Contact

If you need help configuring the Kubernetes connector, open an issue or contact the maintainers listed in the project `CODEOWNERS`.
