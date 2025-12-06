# GitHub Connector

The GitHub connector integrates with GitHub's API to track and monitor changes across your repositories. It automatically syncs pull requests, releases, workflow runs, and commits to provide a unified view of your development activity.

## Overview

The GitHub connector continuously polls GitHub repositories at configurable intervals and captures:

- **Pull Requests** - Track PR status, reviews, merges, and code changes
- **Releases** - Monitor version releases and deployments
- **GitHub Actions Workflows** - Monitor CI/CD pipeline runs and failures
- **Commits** - Track commit activity on specific branches

All events are stored in PainChain's database and displayed in the unified dashboard with rich metadata, filtering, and search capabilities.

---

## Features

### Event Types Tracked

| Event Type | Description | Metadata Captured |
|------------|-------------|-------------------|
| **Pull Request** | Monitors all PRs (open, merged, closed) | Status, reviewers, approvals, file changes, additions/deletions, comments |
| **Release** | Tracks published releases and tags | Tag name, assets, prerelease flag, draft status |
| **Workflow Run** | GitHub Actions CI/CD pipeline executions | Status, duration, failed jobs, branch, commit, run number |
| **Commit** | Individual commits on tracked branches | Author, message, file changes, additions/deletions, SHA |

### Key Capabilities

- **Selective Repository Monitoring** - Choose specific repos or monitor all accessible repos
- **Branch Filtering** - Track commits from specific branches only
- **Team-based Tagging** - Apply custom tags for team/project organization
- **Automatic Polling** - Configurable sync intervals (default: 5 minutes)
- **Smart Deduplication** - Only stores new events, skips duplicates
- **Rich Metadata** - Captures detailed information for filtering and analysis
- **Workflow Logs** - Direct links to GitHub Actions logs for failed runs

---

## Prerequisites

Before configuring the GitHub connector, you'll need:

1. **GitHub Account** with access to the repositories you want to monitor
2. **Personal Access Token** with appropriate permissions
3. **Repository Access** - at minimum, read access to target repos

### Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → [Tokens (classic)](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Configure the token:
   - **Note**: `PainChain Connector` (or any descriptive name)
   - **Expiration**: Choose based on security policy (90 days, 1 year, or no expiration)
   - **Scopes**: Select the following permissions:
     - `repo` - Full control of private repositories (includes all sub-scopes)
       - If you only need public repos: `public_repo`
     - `workflow` - Update GitHub Action workflows (for workflow run access)
     - `read:org` - Read organization data (if monitoring org repos)

4. Click **Generate token** and copy it immediately (you won't see it again)
5. Store the token securely - you'll enter it in PainChain's configuration

**Security Notes:**
- Treat tokens like passwords - never commit them to code
- Use tokens with minimal required permissions
- Rotate tokens periodically
- Revoke tokens if compromised

---

## Configuration Guide

### Step 1: Access Settings

1. Navigate to the PainChain dashboard
2. Click the **Settings** button in the top-right header
3. Select **Integrations** from the left sidebar

### Step 2: Select GitHub Connector

1. Find the **GitHub** card in the integrations list
2. Click on the card to open the configuration panel
3. The detail panel will slide in from the right

### Step 3: Configure Connection

Fill out the configuration form with the following fields:

#### Required Fields

**Connection Name**
- **Purpose**: Friendly identifier for this connection
- **Example**: `Personal GitHub`, `Work Repositories`, `OpenSource Projects`
- **Usage**: Helps distinguish between multiple GitHub connections

**GitHub Enterprise** (Optional Checkbox)
- **Purpose**: Check this box if connecting to GitHub Enterprise Server
- **Default**: Unchecked (standard GitHub.com)
- **When checked**: Reveals the Enterprise API URL field below
- **When to use**: Only for GitHub Enterprise Server (not GitHub.com)

**Enterprise API URL** (Conditional - shown when GitHub Enterprise is checked)
- **Purpose**: Your GitHub Enterprise Server API endpoint
- **Format**: `https://github.enterprise.com/api/v3`
- **Example**: `https://github.mycompany.com/api/v3`
- **Note**: Must end with `/api/v3` for proper API access

**Token**
- **Purpose**: GitHub Personal Access Token for API authentication
- **Format**: Starts with `ghp_` (classic tokens) or `github_pat_` (fine-grained tokens)
- **Security**: Stored encrypted, never displayed in UI after saving
- **Example**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Poll Interval (seconds)**
- **Purpose**: How frequently to check GitHub for new events
- **Default**: `300` (5 minutes)
- **Range**: Minimum 60 seconds (1 minute), recommended 300-900 seconds
- **Considerations**:
  - Lower intervals provide fresher data but use more API quota
  - GitHub has rate limits (5,000 requests/hour for authenticated users)
  - Consider your repository count and activity level

#### Optional Fields

**Repositories**
- **Purpose**: Limit monitoring to specific repositories
- **Format**: Comma-separated list of `owner/repo` names
- **Example**: `facebook/react,vercel/next.js,microsoft/typescript`
- **Default Behavior**: If empty, monitors up to 10 of your most recent repositories
- **Use Cases**:
  - Focus on specific projects
  - Exclude low-activity repos
  - Separate different teams/projects into different connections

**Branches**
- **Purpose**: Track commits from specific branches only
- **Format**: Comma-separated branch names
- **Example**: `main,develop,staging`
- **Default Behavior**: If empty, no commit tracking (only PRs, releases, workflows)
- **Use Cases**:
  - Monitor production deployments (`main`, `production`)
  - Track release branches (`release/*`)
  - Follow development activity (`develop`, `staging`)

**Tags**
- **Purpose**: Apply custom labels for filtering and organization
- **Format**: Comma-separated tag names
- **Example**: `frontend,backend-team,critical`
- **Usage**: Filter events in the dashboard by selecting specific tags
- **Use Cases**:
  - Team-based filtering (`platform-team`, `mobile-team`)
  - Priority levels (`critical`, `monitoring`)
  - Project phases (`mvp`, `beta`, `production`)

### Step 4: Test and Save

1. Click **Test Connection** to verify your token and permissions
   - Success: "Connected successfully!"
   - Failure: Check token validity and permissions
2. Click **Save** to create the connection
3. The connector will appear in your integrations list with a green "Enabled" status

### Step 5: View Field Visibility (After Creation)

After creating a connection, click on it again to access **Field Visibility** settings:

1. Expand the connector card in the integrations list
2. Toggle which event metadata fields appear in the dashboard
3. Customize what information is most relevant for your team
4. Changes apply immediately to the dashboard view

---

## Configuration Examples

### Example 1: Monitor All Personal Repos

**Use Case**: Track all your personal GitHub activity

```
Connection Name: My GitHub Activity
Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Poll Interval: 300
Repositories: (leave empty)
Branches: main
Tags: personal
```

**Result**: Monitors up to 10 of your repositories, shows all PRs, releases, workflows, and commits to `main` branch. If additional repos need monitored, create an additional connection for GitHub.

---

### Example 2: Production Monitoring

**Use Case**: Track production deployments and releases only

```
Connection Name: Production Monitoring
Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Poll Interval: 180
Repositories: acme-corp/api,acme-corp/web-app,acme-corp/mobile
Branches: main,production
Tags: production,critical
```

**Result**: Monitors 3 specific repos, tracks production branch activity, ideal for incident correlation.

---

### Example 3: Multi-Team Organization

**Use Case**: Separate monitoring for different teams

**Frontend Team Connection:**
```
Connection Name: Frontend Team
Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Poll Interval: 300
Repositories: company/web-ui,company/mobile-app,company/design-system
Branches: main,develop
Tags: frontend,ui-team
```

**Backend Team Connection:**
```
Connection Name: Backend Team
Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Poll Interval: 300
Repositories: company/api,company/auth-service,company/data-pipeline
Branches: main,develop
Tags: backend,platform-team
```

**Result**: Each team can filter to their specific events using tags.

---

## Event Data Structure

### Pull Request Events

**Title Format**: `[PR] {pr.title}`

**Metadata Captured**:
```json
{
  "repository": "owner/repo",
  "pr_number": 123,
  "merged": true,
  "mergeable": true,
  "additions": 245,
  "deletions": 89,
  "changed_files": 12,
  "base_branch": "main",
  "head_branch": "feature/new-auth",
  "reviewers": ["user1", "user2"],
  "approved_count": 2,
  "changes_requested_count": 0,
  "comments": 5,
  "review_comments": 12
}
```

**Description Contains**:
- Full PR description/body text
- List of GitHub labels
- Changed files (up to 20)
- Review status and approvals

**Dashboard Fields**:
- Status (open, merged, closed)
- Reviewers
- File changes count
- Code additions/deletions
- Approval status
- Direct link to GitHub PR

---

### Release Events

**Title Format**: `[Release] {release.title or tag_name}`

**Metadata Captured**:
```json
{
  "repository": "owner/repo",
  "tag_name": "v1.2.3",
  "prerelease": false,
  "draft": false
}
```

**Description Contains**:
- Release notes/body text
- Asset names (binaries, packages)

**Dashboard Fields**:
- Tag name
- Release status (published/draft)
- Prerelease flag
- Assets list
- Direct link to GitHub release

---

### Workflow Run Events

**Title Format**: `[Workflow] {emoji} {workflow_name} - {branch}`

**Status Emojis**:
- ✓ Success
- ✗ Failure
- ⊗ Cancelled
- ⊘ Skipped
- ⏱ Timed out

**Metadata Captured**:
```json
{
  "repository": "owner/repo",
  "workflow_id": 12345,
  "run_number": 456,
  "run_attempt": 1,
  "event": "push",
  "branch": "main",
  "commit_sha": "abc1234",
  "conclusion": "success",
  "duration_seconds": 182,
  "failed_jobs_count": 0
}
```

**Failed Jobs Details** (when applicable):
```json
{
  "failed_jobs": [
    {
      "name": "test-unit",
      "conclusion": "failure",
      "started_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:35:00Z"
    }
  ]
}
```

**Dashboard Fields**:
- Status with visual indicator
- Duration
- Branch name
- Commit SHA (short)
- Trigger event (push, pull_request, schedule)
- Run number
- Failed jobs list with details
- **View Logs** - Direct link to GitHub Actions logs

---

### Commit Events

**Title Format**: `[Commit] {first line of commit message}`

**Metadata Captured**:
```json
{
  "repository": "owner/repo",
  "branch": "main",
  "sha": "abc1234567890def",
  "additions": 45,
  "deletions": 12,
  "total_changes": 57
}
```

**Description Contains**:
- Full commit message
- Changed files (up to 20)

**Dashboard Fields**:
- Author name
- Commit SHA
- Branch
- Code changes (additions/deletions)
- Files changed list
- Direct link to GitHub commit

---

## Troubleshooting

### Connection Test Fails

**Symptom**: "Failed to connect to GitHub" error when testing connection

**Possible Causes**:
1. **Invalid Token** - Token may be expired or revoked
   - Solution: Generate a new token and update configuration
2. **Insufficient Permissions** - Token lacks required scopes
   - Solution: Regenerate token with `repo` and `workflow` scopes
3. **Network Issues** - PainChain cannot reach GitHub API
   - Solution: Check firewall rules, proxy settings, internet connectivity
4. **Rate Limit** - Too many requests to GitHub API
   - Solution: Wait for rate limit to reset (check headers for reset time)

### No Events Appearing

**Symptom**: Connector shows "Enabled" but dashboard has no events

**Troubleshooting Steps**:
1. **Check Repository Access**
   - Ensure token has access to specified repositories
   - Verify repository names are correct (`owner/repo` format)
   - Test: Try with empty repos field to see all accessible repos

2. **Check Activity Timeframe**
   - Connector only fetches recent activity (last 50 events per type)
   - Ensure repositories have recent PRs, releases, or workflow runs
   - Check dashboard date filters aren't excluding events

3. **Check Polling Status**
   - Verify connector is running (check Docker container logs)
   - Confirm poll interval has elapsed at least once
   - Look for errors in connector logs

4. **Check Tag Filters**
   - Ensure dashboard tag filters aren't hiding events
   - Try clearing all filters to see all events

### Workflow Runs Not Showing

**Symptom**: PRs and releases work, but workflow runs don't appear

**Solution**: Ensure token has `workflow` scope:
- Go to token settings on GitHub
- Check that `workflow` scope is enabled
- If not, create a new token with this scope

### Commits Not Tracking

**Symptom**: No commit events in dashboard

**Expected Behavior**: Commits only appear when **Branches** field is configured
- Solution: Add branch names to the Branches field (e.g., `main,develop`)
- Leave empty if you don't want commit tracking

### High API Rate Limit Usage

**Symptom**: GitHub rate limit warnings or errors

**Causes**:
- Too many repositories configured
- Poll interval too frequent
- High repository activity

**Solutions**:
1. **Increase Poll Interval** - Change from 300s to 600s or higher
2. **Reduce Repository Count** - Only monitor essential repos
3. **Use Multiple Tokens** - Create separate connections with different tokens
4. **Monitor Rate Limits** - Check `X-RateLimit-Remaining` in GitHub API responses

### Missing Metadata Fields

**Symptom**: Some fields show "N/A" or are missing

**Causes**:
- **Permissions** - Token lacks read access to certain data
- **Repository Settings** - Features disabled (e.g., GitHub Actions)
- **API Limitations** - GitHub API doesn't provide all data for all event types

**Solution**:
- Verify token has full `repo` scope
- Check that repository has features enabled (Actions, Releases, etc.)
- Some fields are legitimately optional (e.g., PR review comments)

---

## Performance Considerations

### API Rate Limits

GitHub enforces rate limits on API requests:
- **Authenticated**: 5,000 requests per hour
- **Resets**: Every hour from first request

**Estimation**:
- Each repository sync makes ~4-10 API calls (depends on activity)
- Polling 5 repos every 5 minutes = ~600 requests/hour (well within limits)
- Polling 20 repos every 5 minutes = ~2,400 requests/hour (safe)
- Polling 50 repos every 3 minutes = ~4,000+ requests/hour (approaching limit)

**Recommendations**:
- For 1-10 repos: Poll every 3-5 minutes
- For 10-20 repos: Poll every 5-10 minutes
- For 20+ repos: Poll every 10-15 minutes or use multiple connections

### Database Storage

**Event Storage**:
- Each event: ~2-5KB (depending on description length)
- 1,000 events ≈ 2-5MB
- Deduplication prevents duplicate storage

**Cleanup**: PainChain automatically manages old events based on retention policy (configurable in main settings).

---

## Advanced Configuration

### Using Fine-Grained Tokens

GitHub now supports fine-grained personal access tokens with more granular permissions:

**Benefits**:
- Repository-specific access (more secure)
- Shorter expiration times
- More detailed permission control

**Setup**:
1. Go to Settings → Developer settings → Personal access tokens → [Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Configure:
   - **Token name**: `PainChain Connector`
   - **Expiration**: 90 days (recommended)
   - **Repository access**: Select specific repositories
   - **Permissions**:
     - Repository permissions → Actions: Read-only
     - Repository permissions → Contents: Read-only
     - Repository permissions → Metadata: Read-only
     - Repository permissions → Pull requests: Read-only
4. Generate and copy token (starts with `github_pat_`)

### Multiple Connections for Different Projects

You can create multiple GitHub connections for organizational clarity:

**Use Cases**:
- Separate teams/departments
- Different GitHub organizations
- Production vs. development monitoring
- Public vs. private repositories

**Example Setup**:
```
Connection 1: "Production Services"
- Repos: prod-api, prod-web
- Tags: production, critical
- Poll: 180s (3 min)

Connection 2: "Development"
- Repos: dev-api, dev-web, experimental
- Tags: development, testing
- Poll: 600s (10 min)

Connection 3: "Open Source"
- Repos: (empty - all public repos)
- Tags: opensource, community
- Poll: 900s (15 min)
```

Each connection runs independently and can have different configurations.

### Filtering by Tags in Dashboard

After configuring tags, use them in the dashboard:

1. Click the **Tags** filter in the dashboard header
2. Select one or multiple tags (AND filter - shows events with ALL selected tags)
3. Events matching selected tags are displayed
4. Clear filters to see all events

**Pro Tip**: Use hierarchical tags like `team-frontend`, `team-backend`, `priority-high`, `priority-low` for flexible filtering.

---

## Technical Architecture

### Connector Components

**Main Polling Loop** (`main.py`):
- Reads configuration from environment variables
- Tests GitHub connection on startup
- Continuously polls at configured intervals
- Handles errors and retries gracefully

**Connector Logic** (`connector.py`):
- Implements `GitHubConnector` class
- Uses PyGithub library for API interaction
- Fetches PRs, releases, workflows, commits
- Deduplicates events using unique event IDs
- Stores events in PainChain database

**Celery Task Execution**:
- Connections run as Celery background tasks
- Scheduled polling based on poll_interval
- Shared database connection pool
- Logs accessible via Celery worker output

### Event ID Format

Events use predictable IDs for deduplication:

- Pull Request: `pr-{owner/repo}-{pr_number}`
- Release: `release-{owner/repo}-{release_id}`
- Workflow: `workflow-{owner/repo}-{run_id}`
- Commit: `commit-{owner/repo}-{commit_sha}`

These ensure the same event is never stored twice, even across multiple sync runs.

### Data Freshness

**First Sync**: Fetches last 50 events of each type per repository
**Subsequent Syncs**: Only stores new events since last sync
**Update Strategy**: Events are immutable - updates create new records

---

## Security Best Practices

1. **Token Management**:
   - Use tokens with minimal required permissions
   - Set expiration dates (rotate every 90 days)
   - Store tokens in secure password manager
   - Revoke immediately if compromised

2. **Network Security**:
   - Run PainChain in private network if possible
   - Use HTTPS for all GitHub API communication (automatic)
   - Consider IP allowlisting for fine-grained tokens

3. **Access Control**:
   - Limit token to specific repositories when possible
   - Use organization tokens for org repos (not personal)
   - Regularly audit token permissions

4. **Monitoring**:
   - Monitor for unauthorized API usage
   - Check GitHub security log for token usage
   - Set up alerts for rate limit warnings

---

## Support and Resources

### Helpful Links

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [PyGithub Library Docs](https://pygithub.readthedocs.io/)
- [GitHub Token Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [GitHub Rate Limits](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)

### Common Questions

**Q: Can I monitor GitHub Enterprise?**
A: Yes! Check the "GitHub Enterprise" checkbox when configuring the connection, then enter your Enterprise API URL (e.g., `https://github.mycompany.com/api/v3`). No code changes required.

**Q: How far back does it fetch history?**
A: Initial sync fetches the last 50 events per type. Historical data before that isn't retrieved.

**Q: Can I track issues?**
A: Not currently. The connector focuses on code changes (PRs, commits, releases, workflows). Issue tracking may be added in future versions.

**Q: Does it support webhooks?**
A: Not yet. Current implementation uses polling. Webhook support would provide real-time updates and reduce API usage.

**Q: Can I export events?**
A: Not yet. Export functionality is planned for a future release. Currently, you can query events via the API at `/api/changes` for custom exports.

---

## Changelog

### Version 1.0 (Current)
- Pull request monitoring with review status
- Release tracking with assets
- GitHub Actions workflow run monitoring
- Commit tracking on specific branches
- Multi-repository support
- Tag-based organization
- Field visibility customization
- Direct links to GitHub logs

---

## Contributing

To improve the GitHub connector:

1. Fork the PainChain repository
2. Make changes in `/backend/connectors/github/`
3. Test thoroughly with various repository types
4. Submit PR with clear description of changes
5. Update this README with new features

---

**Last Updated**: 2024-01-15
**Connector Version**: 1.0
**Supported GitHub API Version**: v3 (REST API)
