# PainChain Helm Chart

Officially supported Helm chart for PainChain - a change tracking and visualization platform.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- PersistentVolume provisioner support in the underlying infrastructure (for PostgreSQL data persistence)

## Installation

### Quick Start

Install PainChain with default configuration:

```bash
helm install painchain .
```

### Install in a dedicated namespace

Install in a dedicated `painchain` namespace:

```bash
# Using Helm's built-in namespace creation (recommended)
helm install painchain . --namespace painchain --create-namespace

# Or enable namespace creation via values
helm install painchain . --set namespace.create=true --namespace painchain
```

### Custom Installation

Install with custom values:

```bash
helm install painchain . -f custom-values.yaml
```

### Install with custom database password:

```bash
helm install painchain . --set postgresql.auth.password=your-secure-password
```

## Configuration

The following table lists the configurable parameters of the PainChain chart and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imagePullPolicy` | Image pull policy | `IfNotPresent` |

### Namespace Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `namespace.create` | Create dedicated namespace | `false` |
| `namespace.name` | Namespace name | `painchain` |

### PostgreSQL Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL | `true` |
| `postgresql.image.repository` | PostgreSQL image repository | `postgres` |
| `postgresql.image.tag` | PostgreSQL image tag | `16-alpine` |
| `postgresql.auth.database` | PostgreSQL database name | `painchain` |
| `postgresql.auth.username` | PostgreSQL username | `painchain` |
| `postgresql.auth.password` | PostgreSQL password | `changeme` |
| `postgresql.primary.persistence.enabled` | Enable persistence | `true` |
| `postgresql.primary.persistence.size` | PVC size | `8Gi` |

### Redis Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis | `true` |
| `redis.image.repository` | Redis image repository | `redis` |
| `redis.image.tag` | Redis image tag | `7-alpine` |

### Application Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `app.enabled` | Enable application service | `true` |
| `app.replicaCount` | Number of application replicas | `1` |
| `app.image.repository` | Application image repository | `ghcr.io/painchain/painchain-app` |
| `app.image.tag` | Application image tag | `main` |
| `app.service.type` | Kubernetes service type | `ClusterIP` |
| `app.service.port` | Service port | `8000` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable Ingress resource | `false` |
| `ingress.className` | Ingress class name (e.g., "traefik", "nginx") | `""` |
| `ingress.hosts[0].host` | Hostname for ingress | `painchain.local` |
| `ingress.tls` | TLS configuration | `[]` |

## Accessing PainChain

After installation, follow the notes printed by Helm to access your PainChain instance.

### Local Development with Port Forwarding

The default configuration is suitable for local development with port-forwarding.

```bash
# Forward the application (serves both frontend and API)
kubectl --namespace painchain port-forward svc/painchain-app 8000:8000

# Open in browser
open http://localhost:8000
```

**Note**:
- The application serves both the React frontend and the NestJS API on port 8000
- The frontend is a **production-built React app** served as static files by the backend
- API endpoints are available at `/api/*` paths

#### How the Application Works

```
Browser → http://localhost:8000 (your local machine)
  ↓
  Port-forward maps 8000 → 8000 → App pod (NestJS serving React app + API)
  ↓
  Static requests (/, /assets/*) → Served from frontend/dist directory
  ↓
  API requests (/api/*) → Handled by NestJS controllers
```

The application is a **single container** that serves both the production-built React app and the NestJS API. This eliminates CORS issues and simplifies deployment.

### Production with Ingress

For production deployments, configure an ingress to expose the application:

```bash
helm install painchain . \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.hosts[0].host=painchain.example.com \
  --namespace painchain --create-namespace
```

The ingress will route all traffic to the application service, which serves both the frontend UI and API endpoints.

## Upgrading

```bash
helm upgrade painchain . -f custom-values.yaml
```

## Uninstalling

```bash
helm uninstall painchain
```

This will remove all resources associated with the chart, except for PersistentVolumeClaims (to prevent data loss).

To also remove PVCs:

```bash
kubectl delete pvc -l app.kubernetes.io/instance=painchain
```

## Architecture

This chart deploys the following components:

### Core Services

- **PostgreSQL**: Database for storing change events and configuration
- **Redis**: Cache and queue storage for BullMQ
- **Application**: Single NestJS container that serves both the React frontend and API (port 8000)
  - Production-built React app served as static files
  - NestJS API endpoints at `/api/*`
  - BullMQ queue processing for background jobs

### Supporting Resources

- **ServiceAccount**: Kubernetes identity for the application pod
- **ClusterRole**: Read-only permissions for Kubernetes resources (pods, deployments, configmaps, etc.)
- **ClusterRoleBinding**: Binds the ClusterRole to the ServiceAccount
- **DB Init Job**: Helm hook that automatically initializes the database schema on install/upgrade

**Note**: The application uses BullMQ (built into the NestJS service) for background job processing. There are no separate worker or beat containers needed.

### RBAC for Kubernetes Monitoring

The chart creates RBAC resources to enable **in-cluster Kubernetes monitoring**:

**ServiceAccount** (`painchain`)
- Provides an identity for the application pod to authenticate with the Kubernetes API

**ClusterRole** (`painchain`)
- Grants **read-only** permissions to:
  - Core resources: namespaces, services, configmaps, secrets, PVs, PVCs, events
  - Workloads: deployments, statefulsets, daemonsets, replicasets
  - Networking: ingresses, network policies
  - Batch: jobs, cronjobs

**ClusterRoleBinding** (`painchain`)
- Binds the ClusterRole to the ServiceAccount

#### Why RBAC is Required

These RBAC resources are **essential** if you want to:
- ✅ Monitor the cluster PainChain is running in (in-cluster monitoring)
- ✅ Use the Kubernetes connector without manually providing tokens
- ✅ Automatically detect pod changes, deployments, config map updates, etc.

The ServiceAccount token is **automatically mounted** into the application pod at `/var/run/secrets/kubernetes.io/serviceaccount/token` and used by the Kubernetes connector for authentication.

#### When You Can Skip RBAC

You can disable RBAC if:
- ❌ You never plan to use the Kubernetes connector
- ❌ You only monitor external clusters (by providing explicit API URLs and tokens)

To disable RBAC resources, you would need to remove the template files and update the application deployment to not use the ServiceAccount.

## Production Recommendations

1. **Use a strong database password**:
   ```bash
   --set postgresql.auth.password=your-secure-password
   ```

2. **Configure resource limits**:
   Edit `values.yaml` to set appropriate resource requests and limits for your workload.

3. **Enable ingress**:
   Configure ingress in `values.yaml` to expose the application externally.

4. **Use external database** (optional):
   For production, consider using a managed database service and disable the built-in PostgreSQL.

5. **Configure persistent storage**:
   Ensure your cluster has a storage class that supports ReadWriteOnce access mode.

6. **Monitor disk usage**:
   Kubernetes nodes can experience disk pressure from Docker images and build cache. Regularly clean up unused resources:
   ```bash
   docker system prune -f
   docker volume prune -f
   ```

## Troubleshooting

### Application Shows "Old Version"

If the application shows outdated code after upgrading:

1. Rebuild and reimport the application image:
   ```bash
   cd /path/to/PainChain
   docker build -t ghcr.io/painchain/painchain-app:main .
   # If using k3d:
   k3d image import ghcr.io/painchain/painchain-app:main -c painchain-dev
   ```

2. Delete the application pod to force recreation:
   ```bash
   kubectl delete pod -n painchain -l app.kubernetes.io/component=app
   ```

### Port Forward Connection Refused

If you get "connection refused" when port-forwarding:

1. Check the service is using the correct port (8000 for the application):
   ```bash
   kubectl get svc -n painchain
   ```

2. Check the pod is actually listening on the expected port:
   ```bash
   kubectl get pod -n painchain -l app.kubernetes.io/component=app -o yaml | grep containerPort
   ```

3. If upgrading from an older version, the old images may use different ports. Rebuild with the latest Dockerfile.

### Pods Stuck in Pending (Disk Pressure)

If pods are stuck in pending due to disk pressure:

1. Clean up Docker resources on the host:
   ```bash
   docker system prune -f && docker volume prune -f
   ```

2. Remove the disk pressure taint:
   ```bash
   kubectl taint nodes <node-name> node.kubernetes.io/disk-pressure:NoSchedule-
   ```

### Database Connection Issues

Check that the database is running and accessible:

```bash
kubectl get pods -n painchain -l app.kubernetes.io/component=postgresql
kubectl logs -n painchain -l app.kubernetes.io/component=postgresql
```

### Kubernetes Connector Not Working

Verify RBAC resources are created:

```bash
kubectl get serviceaccount,clusterrole,clusterrolebinding -n painchain
```

Check that the application pod is using the ServiceAccount:

```bash
kubectl get pod -n painchain -l app.kubernetes.io/component=app -o yaml | grep serviceAccountName
```

## License

Apache License 2.0
