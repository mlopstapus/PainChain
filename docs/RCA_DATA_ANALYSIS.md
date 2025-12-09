# PainChain RCA Data Analysis & Optimization Strategy

**Date**: 2024-12-08
**Purpose**: Evaluate data collection for AI-driven Root Cause Analysis and identify optimization opportunities

## Executive Summary

**Current State**: ✅ Strong foundation with good temporal data and event tracking
**RCA Readiness**: 🟡 70% ready - missing key diagnostic links and correlation data
**Storage Efficiency**: 🔴 Suboptimal - storing large text blobs in PostgreSQL

### Key Findings
1. ✅ **Good**: Temporal tracking, status tracking, author tracking, basic metadata
2. ⚠️ **Missing**: Direct log links, error messages, deployment targets, correlation IDs
3. 🔴 **Problem**: Large JSON/text in PostgreSQL instead of object storage
4. 💡 **Opportunity**: 60-80% storage reduction possible with strategic refactoring

---

## Current Data Model Analysis

### Database Schema

```python
class ChangeEvent(Base):
    id                  # Primary key
    connection_id       # FK to connections
    source             # "github", "gitlab", "kubernetes", "painchain"
    event_id           # Unique event identifier
    title              # Human-readable title
    description        # JSON - large blob (FILES, FULL TEXT)
    author             # Author/triggering user
    timestamp          # When event occurred
    url                # Link to event source
    status             # Event status (success, failure, merged, etc.)
    event_metadata     # JSON - structured metadata
    created_at         # When stored in PainChain
```

### What We're Currently Storing

#### GitHub Connector
**Pull Requests**:
- ✅ Title, author, timestamps, URL
- ✅ Merge status, reviewers, approvals
- ✅ Code changes (additions/deletions/files)
- ⚠️ **STORAGE ISSUE**: Full PR body text in `description.text`
- ⚠️ **STORAGE ISSUE**: All changed file paths in `description.files_changed` array
- ✅ Metadata: repo, PR number, branches, review counts

**Releases**:
- ✅ Title, author, timestamps, URL
- ✅ Tag name, prerelease flag, draft status
- ⚠️ **STORAGE ISSUE**: Full release notes in `description.text`
- ⚠️ **STORAGE ISSUE**: Asset names array
- ✅ Metadata: repository, tag

**Workflows** (GitHub Actions):
- ✅ Title with status emoji, author, timestamps
- ✅ Status, conclusion, duration
- ✅ Branch, commit SHA (short), run number
- ✅ Failed job details (name, conclusion, timestamps)
- ✅ **GOOD**: Direct URL to workflow run
- ❌ **MISSING**: Direct link to logs
- ❌ **MISSING**: Error messages from failed jobs
- ❌ **MISSING**: Deployment target (which service/environment)

#### GitLab Connector
**Merge Requests**:
- ✅ Title, author, timestamps, URL
- ✅ Merge status, approvals, votes
- ✅ Code changes (additions/deletions)
- ⚠️ **STORAGE ISSUE**: Full MR description in `description.text`
- ⚠️ **STORAGE ISSUE**: All changed file paths

**Pipelines** (GitLab CI):
- ✅ Title with status emoji, author, timestamps
- ✅ Status, duration, ref, source
- ✅ Failed job details
- ✅ **GOOD**: Direct URL to pipeline
- ❌ **MISSING**: Direct link to job logs
- ❌ **MISSING**: Error messages from failed jobs
- ❌ **MISSING**: Deployment target (environment, namespace)
- ❌ **MISSING**: Artifact/image information

#### Kubernetes Connector
**Deployments/StatefulSets/DaemonSets**:
- ✅ Resource name, namespace, cluster
- ✅ Image versions
- ✅ Replica counts (desired/available/ready)
- ✅ Strategy (RollingUpdate, Recreate)
- ⚠️ Timestamp is creation time, not last update time
- ❌ **MISSING**: Previous image version (what changed)
- ❌ **MISSING**: Pod failure reasons
- ❌ **MISSING**: Link to kubectl logs
- ❌ **MISSING**: Health check status
- ❌ **MISSING**: Resource limits/requests

**Services/ConfigMaps/Secrets/Ingresses**:
- ✅ Basic resource information
- ❌ **MISSING**: What actually changed (diff)
- ❌ **MISSING**: Impact analysis (which deployments use this)

---

## What an AI RCA Agent Needs

### Critical Data for RCA

#### 1. Temporal Correlation ✅ (We have this)
- When did events happen relative to error?
- Sequence of changes leading to failure
- **Current**: timestamp field + chronological queries

#### 2. Change Impact Scope ⚠️ (Partial)
**What we have**:
- Repository/project name
- Branch names
- File paths (but too verbose)
- Namespace/cluster for K8s

**What we're missing**:
- **Service/Application name** - which service was deployed?
- **Environment** - prod, staging, dev?
- **Deployment target** - which region, which cluster?
- **Component/team ownership** - who owns this service?

#### 3. Traceability Links 🔴 (Major gap)
**What we have**:
- URL to GitHub PR/Workflow
- URL to GitLab Pipeline
- K8s resource URL (not clickable)

**What we need**:
```json
{
  "logs_url": "https://github.com/owner/repo/actions/runs/123/logs",
  "trace_id": "abc123",  // Distributed tracing ID
  "incident_id": "INC-456",  // PagerDuty/Opsgenie
  "commit_url": "https://github.com/owner/repo/commit/abc123",
  "diff_url": "https://github.com/owner/repo/pull/123/files",
  "deployment_url": "https://argocd.example.com/applications/my-app"
}
```

#### 4. Error Context ❌ (Missing)
**Critical for AI diagnosis**:
- Error messages from failed jobs
- Exit codes
- Stack traces (summarized)
- Health check failure reasons
- Pod crash loop reasons

**Example of what we should store**:
```json
{
  "error_summary": "Container failed: exit code 1",
  "error_snippet": "Error: ECONNREFUSED redis:6379",
  "failure_reason": "CrashLoopBackOff",
  "logs_snippet": "Last 10 lines of stderr"
}
```

#### 5. Relationship Data ⚠️ (Partial)
**What we have**:
- `connection_id` links events to source
- Commit SHA in workflows/pipelines

**What we're missing**:
- **PR → Workflow → Deployment chain**
- **Code change → Image build → K8s deployment**
- **ConfigMap change → Pod restart cascade**

**Ideal structure**:
```json
{
  "relationships": {
    "triggered_by": "pr-123",
    "deployed_to": ["k8s-deployment-456", "k8s-deployment-789"],
    "built_image": "myapp:v1.2.3",
    "uses_config": ["configmap-app-config", "secret-db-creds"]
  }
}
```

#### 6. Deployment-Specific Data ❌ (Missing)
**Critical for production RCA**:
- Which service/application was deployed
- Which environment (prod/staging/dev)
- Which region/datacenter
- Canary vs full rollout
- Previous version (rollback information)

---

## Storage Optimization Analysis

### Current Storage Problems

#### Problem 1: Large Text Blobs in PostgreSQL
**Examples**:
- `description.text`: Full PR descriptions, release notes (can be 10KB+)
- `description.files_changed`: Arrays of 100+ file paths
- `description.failed_jobs`: Detailed job information

**Impact**:
- Slow queries when scanning events
- High index size
- Expensive backups
- Vacuum overhead

#### Problem 2: Duplicate Data
- Storing full file paths when we only need file count
- Storing full asset names when we only display count
- Storing full release notes when we could link to source

#### Problem 3: No Retention Strategy
- Keeping all events forever
- No archival for old events
- No summarization for historical data

### Storage Optimization Strategy

#### Phase 1: Separate Hot & Cold Storage (60% reduction)

**HOT (PostgreSQL) - Keep for AI RCA:**
```json
{
  "title": "✓ Deploy API v1.2.3",
  "author": "john@example.com",
  "timestamp": "2024-12-08T10:30:00Z",
  "status": "success",
  "url": "https://...",

  "event_metadata": {
    // Keep: Essential for correlation
    "service": "payment-api",
    "environment": "production",
    "version": "v1.2.3",
    "previous_version": "v1.2.2",
    "commit_sha": "abc1234",
    "duration_seconds": 145,

    // Keep: Direct diagnostic links
    "logs_url": "https://github.com/.../logs",
    "diff_url": "https://github.com/.../files",

    // Keep: Error context (if failed)
    "error_summary": "Exit code 1",
    "error_type": "ContainerCrash",

    // Keep: Relationships
    "triggered_by_pr": 456,
    "deployed_to_k8s": ["deploy-123"]
  },

  // Reference to full details
  "details_ref": "s3://painchain-events/2024/12/08/evt-12345.json"
}
```

**COLD (S3/Object Storage) - Archive full details:**
```json
{
  "full_description": "Here is the complete 10KB PR description...",
  "all_files_changed": ["src/api/...", "src/lib/...", /* 150 files */],
  "full_release_notes": "Complete markdown release notes...",
  "complete_logs": "Full 50KB of logs...",
  "all_comments": [/* Array of all PR comments */]
}
```

**Benefits**:
- 60-80% reduction in PostgreSQL storage
- Faster queries (smaller tables, better indexes)
- Can still access full details via reference
- Much cheaper storage for cold data

#### Phase 2: Intelligent Summarization (Additional 20% reduction)

For old events (>90 days), compress using AI:
```json
{
  "summary": "Deployed payment-api v1.2.3 to production. No issues. Changed authentication flow in 12 files.",
  "key_files": ["src/auth/login.py", "src/auth/session.py"],  // Top 5 only
  "details_archived": "s3://painchain-archive/2024/09/..."
}
```

#### Phase 3: Retention Policies

**Hot PostgreSQL retention**:
- Last 30 days: Full metadata
- 30-90 days: Essential metadata only
- 90+ days: Summarized + S3 reference

**Cold S3 retention**:
- 90 days - 1 year: Full details in S3
- 1+ year: Compressed archives (tar.gz)
- 2+ years: Archive to Glacier

---

## Recommended Schema Changes

### Enhanced event_metadata Structure

```json
{
  // Deployment Information (NEW)
  "service_name": "payment-api",
  "application": "ecommerce-platform",
  "environment": "production",
  "region": "us-east-1",
  "deployment_type": "rolling_update",  // or "blue_green", "canary"

  // Version Information
  "version": "v1.2.3",
  "previous_version": "v1.2.2",  // NEW - for rollback
  "image": "myregistry/payment-api:v1.2.3",  // NEW
  "commit_sha": "abc1234",
  "commit_url": "https://github.com/owner/repo/commit/abc1234",  // NEW

  // Direct Diagnostic Links (NEW)
  "logs_url": "https://github.com/owner/repo/actions/runs/123/logs",
  "trace_url": "https://jaeger.example.com/trace/abc123",
  "metrics_url": "https://grafana.example.com/d/xyz?from=...",

  // Error Information (NEW - only if failed)
  "error": {
    "type": "ContainerCrash",
    "exit_code": 1,
    "summary": "ECONNREFUSED redis:6379",
    "first_seen": "2024-12-08T10:35:00Z",
    "occurrence_count": 5
  },

  // Relationships (NEW)
  "relationships": {
    "triggered_by": "pr-456",
    "follows": "workflow-123",
    "affects": ["k8s-deploy-789", "k8s-service-101"],
    "depends_on": ["configmap-app-v2", "secret-db-prod"]
  },

  // Impact Metrics (NEW)
  "impact": {
    "pods_affected": 12,
    "downtime_seconds": 0,
    "error_rate_increase": 0.02  // 2% increase
  },

  // Keep existing essential metadata
  "repository": "owner/repo",
  "branch": "main",
  "duration_seconds": 145,
  "author_team": "payments-team",  // NEW

  // Reference to full details
  "details_ref": "s3://painchain-events/2024/12/08/evt-12345.json"
}
```

### Simplified description Field

```json
{
  // Minimal, human-readable summary only
  "text": "Deployed payment-api v1.2.3 to production",

  // Key highlights (not full arrays)
  "key_changes": [
    "Updated authentication flow",
    "Fixed Redis connection pool",
    "Added request timeout"
  ],

  // Counts instead of full lists
  "files_changed_count": 23,
  "comments_count": 8,
  "reviewers_count": 3,

  // Reference to full content
  "full_content_ref": "s3://..."
}
```

---

## AI RCA Query Patterns

### Example: "What caused the payment-api outage at 10:35 AM?"

**AI Agent Workflow**:

1. **Find the error event** (from monitoring/alerting)
   ```sql
   SELECT * FROM change_events
   WHERE event_metadata->>'service_name' = 'payment-api'
     AND event_metadata->>'environment' = 'production'
     AND status IN ('failure', 'error')
     AND timestamp BETWEEN '2024-12-08 10:30' AND '2024-12-08 10:40'
   ORDER BY timestamp DESC;
   ```

2. **Find recent changes before error** (temporal correlation)
   ```sql
   SELECT * FROM change_events
   WHERE event_metadata->>'service_name' = 'payment-api'
     AND timestamp BETWEEN '2024-12-08 09:00' AND '2024-12-08 10:35'
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

3. **Find related events** (relationship traversal)
   ```sql
   -- Find the deployment that triggered this
   SELECT * FROM change_events
   WHERE event_id = (
     SELECT event_metadata->'relationships'->>'follows'
     FROM change_events
     WHERE id = 12345
   );
   ```

4. **Trace back to code change**
   ```sql
   -- Find the PR that caused this deployment
   SELECT * FROM change_events
   WHERE source = 'github'
     AND event_id = (
       SELECT event_metadata->'relationships'->>'triggered_by'
       FROM change_events
       WHERE id = 12345
     );
   ```

5. **Get diagnostic links** (for human follow-up)
   ```
   - Logs: event_metadata->>'logs_url'
   - Code diff: event_metadata->>'diff_url'
   - Traces: event_metadata->>'trace_url'
   - Metrics: event_metadata->>'metrics_url'
   ```

**AI generates RCA report**:
```
Root Cause Analysis: payment-api outage at 10:35 AM

Timeline:
- 09:45 AM: PR #456 merged - "Fix Redis connection pool"
- 10:15 AM: GitHub Actions workflow completed - built image v1.2.3
- 10:30 AM: Kubernetes deployment started - rolling update
- 10:35 AM: 5 pods crashed - ECONNREFUSED redis:6379

Root Cause:
PR #456 changed Redis connection from single connection to pooling,
but forgot to update REDIS_URL environment variable format.
Old: redis://redis:6379
New (required): redis://redis:6379?poolSize=10

Evidence:
- Error logs: [link to logs_url]
- Code change: [link to diff_url] - see config/redis.py:45
- Related: ConfigMap 'redis-config' was NOT updated

Recommendation:
1. Rollback to v1.2.2 immediately
2. Update ConfigMap with correct REDIS_URL format
3. Redeploy v1.2.3 with fix
```

---

## Implementation Roadmap

### Phase 1: Critical Gaps (Week 1-2)
**Priority: Enable basic AI RCA**

1. **Add error capture** to connectors
   - GitHub: Capture error messages from failed workflow steps
   - GitLab: Capture error messages from failed jobs
   - Kubernetes: Capture pod failure reasons

2. **Add direct log links**
   - GitHub: `logs_url` for each workflow job
   - GitLab: `logs_url` for each pipeline job
   - Kubernetes: `kubectl logs` command or dashboard link

3. **Add deployment context**
   - Service name extraction (from repo name, K8s labels, or tags)
   - Environment detection (from branch, namespace, or tags)
   - Version tracking (image tags, release versions)

**Impact**: AI can now find errors and trace to logs

### Phase 2: Relationships (Week 3-4)
**Priority: Enable change correlation**

1. **PR → Workflow → Deployment chain**
   - Link GitHub PR to workflow run (via commit SHA)
   - Link workflow to K8s deployment (via image tag)
   - Store in `relationships` object

2. **ConfigMap/Secret → Pod dependencies**
   - Track which deployments use which configs
   - Alert on config changes without deployment

3. **Add `previous_version` tracking**
   - Enable "what changed" comparisons
   - Support rollback recommendations

**Impact**: AI can trace deployment chains and suggest rollbacks

### Phase 3: Storage Optimization (Week 5-6)
**Priority: Reduce costs & improve performance**

1. **Implement S3/object storage layer**
   - Move large text fields to S3
   - Store `details_ref` URLs in PostgreSQL
   - Lazy-load full details only when needed

2. **Compress old events**
   - Summarize events >90 days old
   - Archive to compressed storage

3. **Add retention policies**
   - Hot: 30 days full
   - Warm: 90 days essential
   - Cold: 1 year archived

**Impact**: 60-80% storage reduction, faster queries

### Phase 4: Advanced Features (Week 7-8)
**Priority: Enhanced diagnostics**

1. **Add distributed tracing integration**
   - Capture trace IDs from deployments
   - Link to Jaeger/Zipkin/Datadog

2. **Add metrics links**
   - Grafana dashboard URLs
   - SLO/SLI tracking

3. **Add impact metrics**
   - Error rate changes
   - Latency changes
   - Resource usage changes

**Impact**: AI can quantify impact and validate fixes

---

## Storage Savings Projection

### Current State (estimated)
```
Assumptions:
- 1000 events/day
- Average event size: 5 KB (with large text fields)
- PostgreSQL storage: 1000 × 5 KB × 365 = 1.8 GB/year
```

### After Optimization
```
PostgreSQL (hot storage):
- Essential metadata only: 1 KB/event
- 30 days hot: 30 KB × 1000 events = 30 MB
- 60 days warm (summarized): 0.5 KB × 60K events = 30 MB
- Total PG: ~60 MB (vs 150 MB for 90 days currently)
- Savings: 60% reduction

S3 (cold storage):
- Full details for 30 days: 30 days × 1000 × 4 KB = 120 MB
- Compressed for 90+ days: ~500 MB/year
- Total S3: ~620 MB/year
- S3 cost: $0.015/GB/month = $0.01/month
```

**Total Annual Savings**:
- PostgreSQL: From 1.8 GB to 0.3 GB (83% reduction)
- Cost: From ~$50/year (RDS) to ~$8/year (RDS) + $0.12/year (S3)
- Query performance: 2-3x faster (smaller tables, better indexes)

---

## Recommendations Summary

### Immediate Actions (This Week)
1. ✅ **Add error capture** - Critical for RCA
2. ✅ **Add direct log URLs** - Essential for human diagnosis
3. ✅ **Add service/environment metadata** - Core for correlation

### Next Sprint
4. ✅ **Implement relationship tracking** - Enable change chains
5. ✅ **Add previous version tracking** - Support rollbacks
6. ⚠️ **Design S3 migration** - Plan storage optimization

### Future Enhancements
7. 📅 **S3 implementation** - Reduce storage costs
8. 📅 **Distributed tracing** - Advanced diagnostics
9. 📅 **Impact metrics** - Quantify changes
10. 📅 **AI summarization** - Compress old events

### Quick Wins (Can do today)
- Add `service_name` tag to all connections (use existing tags field)
- Add `environment` tag (prod/staging/dev)
- Update GitHub connector to include `logs_url`
- Update GitLab connector to include `logs_url`

---

## Conclusion

**Current RCA Readiness: 70%**
- ✅ Strong temporal tracking
- ✅ Good status/author tracking
- ⚠️ Missing error details and diagnostic links
- ❌ Weak relationship tracking
- ❌ No deployment context

**With Recommended Changes: 95%+ RCA Readiness**
- Direct links to logs, errors, code changes
- Full deployment chain visibility
- Service/environment context
- Rollback information
- Cost-optimized storage

**Next Steps**:
1. Review this analysis with team
2. Prioritize Phase 1 implementation
3. Start with GitHub/GitLab error capture
4. Add service_name/environment tags to existing connections
5. Design relationship schema for Phase 2
