# GitLab Connector

The GitLab connector fetches and stores Merge Requests, Releases, Pipeline runs, Commits and Container Registry images from GitLab projects into PainChain.

This connector uses the `python-gitlab` client for most operations and `requests` for the Container Registry API. It creates `ChangeEvent` records via the shared DB models so events are indexed and visible in the PainChain UI.

## Overview

- Runs as a periodic poller (default interval 5 minutes) and can target specific projects or all projects accessible to the token (limited to 10 by default in this connector).
- Captures metadata and compact descriptions suitable for display in the dashboard (titles, authors, timestamps, URLs, status and structured metadata).
- Provides a `sync_gitlab(db_session, config, connection_id)` function for integration with the platform's scheduled jobs (uses provided SQLAlchemy session and associates events with a connection ID).

## Event Types Tracked

- Merge Requests (MRs)
  - title, description, author, labels, approvals, changed files, state (merged/open/closed), web URL
- Releases
  - name/tag, description, author, release assets, published timestamp
- Pipelines
  - pipeline status (success/failed/etc.), ref, sha, duration, failed job details, web URL
- Commits (optional, when `branches` configured)
  - commit message, author, additions/deletions, URL
- Container Registry images
  - repository path, tag, digest, size (if available), created timestamp

## Key Capabilities & Behavior

- Uses `GITLAB_TOKEN` and `GITLAB_URL` to authenticate and connect.
- Supports limiting to specific `REPOS` (project path_with_namespace strings) and to specific `branches` when using the `sync_gitlab` integration function.
- Deduplicates events by constructing stable `event_id` values (e.g. `mr-<project>-<iid>`, `pipeline-<project>-<id>`, `registry-<image>-<tag>-<digest>`).
- Fetch limits: most list calls are limited by `per_page`/`limit` parameters (defaults present in code).

## Files of interest

- `connector.py` — main connector implementation and `sync_gitlab(...)` integration helper.
- `main.py` — standalone poller script which uses env vars and calls `fetch_and_store_changes()` in a loop.
- `metadata.json` — connector metadata used by the UI (`id`, `displayName`, `logo`, etc.).

## Configuration (env vars / config keys)

When running the standalone script (`main.py`) the connector reads these environment variables:

- `GITLAB_TOKEN` (required) — Personal Access Token or deploy token with appropriate read permissions
- `GITLAB_URL` (optional) — GitLab instance URL (default: `https://gitlab.com`)
- `POLL_INTERVAL` (optional) — Poll interval in seconds (default: `300`)
- `REPOS` (optional) — Comma-separated list of project identifiers (e.g. `org/project,other/group`)

When used via the platform integration (`sync_gitlab`), the `config` dictionary supports these keys:

- `token` — same as `GITLAB_TOKEN`
- `url` — same as `GITLAB_URL`
- `repos` — comma-separated repo names
- `branches` — comma-separated branch names to limit commits/pipelines
- `poll_interval` — polling frequency (if invoked as a standalone loop)

## Running Locally

Example using the standalone script (from the `gitlab` connector directory):

```bash
export GITLAB_TOKEN="<your-token>"
export GITLAB_URL="https://gitlab.com"
export POLL_INTERVAL=300
export REPOS="yourorg/yourrepo,otherorg/otherrepo"  # optional
python3 main.py
```

## Running In-Platform (Recommended)

The `sync_gitlab(db_session, config, connection_id)` function is intended for the PainChain scheduler:

- It accepts an SQLAlchemy `db_session`, a `config` dict (see keys above), and a `connection_id` to tag produced `ChangeEvent` records.
- It returns a dict with either `error` or `fetched`/`stored` counts.

## Deployment Notes

- The connector uses the `python-gitlab` package (see `requirements.txt`). Ensure the runtime image contains the required packages.
- For in-cluster deployments, provide the token as a Kubernetes Secret and mount it or expose via env var.
- The standalone `main.py` script prints connection status and simple metrics per run.

## Permissions

- Recommended token scopes: `api` (or at least `read_api`/`read_repository`/`read_registry` depending on your GitLab version and what you want to read).
- If using a deploy token limited to a single repository, ensure it has access to pipelines and registry if you expect those events.

## Security

- Treat tokens as secrets — store in secrets manager or Kubernetes Secret, never commit to repository.
- Limit token scope to least-privilege required.

## Troubleshooting

- "ERROR: GITLAB_TOKEN not set" — ensure `GITLAB_TOKEN` is present when running `main.py`.
- Connection failures — verify `GITLAB_TOKEN` and `GITLAB_URL`, and test locally with `python -c "import gitlab; g=gitlab.Gitlab('<url>', private_token='<token>'); g.auth()"`.
- No events are stored — check token permissions, `REPOS` filter, and API rate limits on the GitLab instance.
- Container registry data missing — registry uses the GitLab registry API via `requests`; some GitLab setups restrict registry access and may require additional permissions or different API paths.

## Extending the Connector

- To add new event types, update `connector.py` to fetch the object and create `ChangeEvent` records with appropriate `event_id` and `event_metadata`.
- To change deduplication behavior, adjust the `event_id` construction logic used throughout the file.

## Metadata

This connector exposes `metadata.json` used by the UI; current fields:

- `id`: `gitlab`
- `displayName`: `GitLab`
- `color`: `#fc6d26`
- `logo`: `gitlab.png`
- `description`: short summary of tracked objects

## Contact / Contributing

Open an issue or PR in the repository for bug reports or feature requests. Follow the repository `CONTRIBUTING` guidelines for code style and tests.
