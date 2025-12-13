# PainChain

**Unified Change Management & Incident Investigation**

PainChain aggregates changes across your infrastructure—deployments, code commits, CI/CD pipelines, and infrastructure updates—into a single timeline. When production breaks, trace back through the chain of changes to find the root cause fast.

## What is PainChain?

Production incidents rarely have a single cause. A failed deployment might have been caused by a merged PR, which depended on infrastructure changes from a Kubernetes update. PainChain connects these dots by aggregating change events from multiple sources into one searchable, filterable timeline.

**Built for:**
- DevOps teams investigating production incidents
- SREs tracking infrastructure changes
- Engineering teams correlating deployments with issues
- Platform teams managing multi-environment rollouts

## Features

### Multi-Source Aggregation
- **GitHub** - Pull requests, releases, workflow runs, commits
- **GitLab** - Merge requests, pipelines, releases, commits
- **Kubernetes** - Deployments, services, config changes, secrets

### Intelligent Filtering
- Filter by source, time range, author, status
- Tag-based organization for teams and projects
- Multi-select tag filtering for complex queries
- Search across titles, descriptions, and metadata

### Rich Event Details
- Complete change descriptions with diffs
- CI/CD pipeline status and logs
- Failed job details with error context
- Links to source systems for deeper investigation

### Flexible Configuration
- Web-based connector management (no YAML editing)
- Per-connector polling intervals
- Enable/disable connectors on the fly
- Test connections before saving
- GitHub Enterprise support

### Modern Dashboard
- Clean, compact UI inspired by modern tools
- Real-time event updates
- Expandable event cards with full metadata
- Customizable field visibility per connector
- Dark theme optimized for long sessions

---

## Quick Start

### Prerequisites

- Docker & Docker Compose installed
- (Optional) Tokens for GitHub/GitLab if connecting to those services

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/PainChain.git
cd PainChain
```

### 2. Configure Environment (Optional)

```bash
cp .env.example .env
# Edit .env if you want to change the database password
```

Default configuration works out of the box. You can configure connectors through the web UI after startup.

### 3. Start All Services

```bash
docker-compose up --build
```

This starts:
- **PostgreSQL** database (port 5432)
- **Redis** message broker (port 6379)
- **API** service (port 8000)
- **Celery Worker** for background tasks
- **Celery Beat** for scheduled polling
- **Frontend** dashboard (port 5173)

### 4. Access the Dashboard

Open your browser to:
- **Dashboard:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs

### 5. Configure Your First Connector

1. Click **Settings** in the top-right
2. Select **Connections** from sidebar
3. Choose a connector (GitHub, GitLab, or Kubernetes)
4. Click **+ Add Connection**
5. Fill in the configuration:
   - **GitHub:** Enter your personal access token
   - **GitLab:** Enter your personal access token
   - **Kubernetes:** Enter API server URL and service account token
6. Click **Test Connection** to verify
7. Click **Create Connection**
8. Enable the connection with the toggle switch

Events will start appearing in the dashboard within the configured poll interval (default: 5 minutes).

---

## Configuration

### Connector Settings

All connectors are configured through the web UI at **Settings → Connections**.

#### GitHub Connector
- **Token:** GitHub Personal Access Token with `repo` and `workflow` scopes
- **Repositories:** Comma-separated `owner/repo` (leave empty for all accessible repos)
- **Branches:** Track commits from specific branches (optional)
- **Poll Interval:** How often to check for changes (default: 300 seconds)
- **Tags:** Custom labels for filtering
- **Enterprise:** Check if using GitHub Enterprise Server and provide API URL

[See detailed GitHub setup guide](./backend/connectors/github/README.md)

#### GitLab Connector
- **Token:** GitLab Personal Access Token with `read_api` scope
- **Projects:** Comma-separated `group/project` (leave empty for all accessible projects)
- **Branches:** Track commits from specific branches (optional)
- **Poll Interval:** How often to check for changes (default: 300 seconds)
- **Tags:** Custom labels for filtering

#### Kubernetes Connector
- **API Server URL:** Kubernetes API endpoint (leave empty for in-cluster config)
- **Token:** Service account bearer token (leave empty for in-cluster config)
- **Cluster Name:** Identifier for this cluster
- **Namespaces:** Comma-separated namespaces to monitor (leave empty for all)
- **Poll Interval:** How often to check for changes (default: 300 seconds)
- **Tags:** Custom labels for filtering

### Environment Variables

Set in `.env` file:

```bash
# Database password
DB_PASSWORD=changeme
```

All other configuration is done through the web UI.

---

## Architecture

```
┌─────────────┐
│  Frontend   │  React Dashboard (port 5173)
│  (Vite)     │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐     ┌──────────────┐
│  API        │────▶│  PostgreSQL  │
│  (FastAPI)  │     │  Database    │
└──────┬──────┘     └──────────────┘
       │
       │ Celery Tasks
       ▼
┌─────────────┐     ┌──────────────┐
│  Celery     │────▶│    Redis     │
│  Worker     │     │  (Broker)    │
└──────┬──────┘     └──────────────┘
       │
       │ Polls
       ▼
┌─────────────────────────────┐
│  External Services          │
│  • GitHub API               │
│  • GitLab API               │
│  • Kubernetes API           │
└─────────────────────────────┘
```

### Components

**Frontend (React + Vite)**
- Dashboard with event timeline
- Connector configuration UI
- Filtering and search
- Field visibility customization

**API (FastAPI)**
- RESTful endpoints for events and connectors
- Manages connector configurations
- Triggers manual syncs
- Provides statistics

**Celery Worker**
- Executes connector sync tasks
- Runs as background jobs
- Shared database connection pool

**Celery Beat**
- Schedules periodic connector polls
- Respects per-connector poll intervals
- Manages task queuing

**Database (PostgreSQL)**
- Stores all change events
- Connector configurations
- Team/tag associations
- JSONB fields for flexible metadata

---

## Development

### Running Locally Without Docker

**Backend API:**
```bash
cd backend/api
pip install -r requirements.txt
export DATABASE_URL=postgresql://painchain:changeme@localhost:5432/painchain
export REDIS_URL=redis://localhost:6379/0
uvicorn main:app --reload
```

**Celery Worker:**
```bash
cd backend/api
celery -A celery_app worker --loglevel=info
```

**Celery Beat:**
```bash
cd backend/api
celery -A celery_app beat --loglevel=info
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Database:**
```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_DB=painchain \
  -e POSTGRES_USER=painchain \
  -e POSTGRES_PASSWORD=changeme \
  postgres:16-alpine
```

### Running Tests

```bash
# Backend tests
cd backend/api
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build all services
docker-compose build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Contributing

We welcome contributions! Here's how to get started:

### 1. Fork and Clone

```bash
git clone https://github.com/yourusername/PainChain.git
cd PainChain
git checkout -b feature/your-feature-name
```

### 2. Set Up Development Environment

```bash
# Start dependencies
docker-compose up db redis

# Set up backend
cd backend/api
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Set up frontend
cd ../../frontend
npm install
```

### 3. Make Your Changes

- Follow existing code style
- Keep dependencies current (run `npm update`, `pip list --outdated`)
- Write tests for new features
- Update documentation as needed

### 4. Test Your Changes

```bash
# Backend tests
cd backend/api
pytest

# Frontend dev server
cd frontend
npm run dev

# Integration test with Docker
docker-compose up --build
```

### 5. Document New Features

If adding a new feature:
- Add to `features.json` with description and version
- Update relevant README files
- Include examples in documentation

### 6. Commit and Push

```bash
git add .
git commit -m "feat(connectors): add Jira connector"
git push origin feature/your-feature-name
```

### 7. Open a Pull Request

- Use descriptive PR title (e.g., "feat(api): add export endpoint")
- Reference related issues
- Describe what changed and why
- Include screenshots for UI changes

### Contribution Guidelines

**Code Standards:**
- Follow existing patterns and conventions
- Use descriptive variable and function names
- Comment complex logic
- Keep functions focused and small

**Git Commit Messages:**
- Use conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Example: `feat(github): add enterprise support`

**Security:**
- Never commit tokens, passwords, or secrets
- Sanitize all user inputs
- Use environment variables for sensitive config
- Review dependencies for known vulnerabilities

**Testing:**
- Run all tests before committing
- Add tests for new features
- Ensure existing functionality still works
- Test both success and error cases

**Documentation:**
- Update README for major changes
- Add connector-specific docs to `backend/connectors/{name}/README.md`
- Include configuration examples
- Document API changes

### Adding New Connectors

To add a new connector (e.g., Jira, ServiceNow):

1. **Create connector directory:**
   ```bash
   mkdir -p backend/connectors/jira
   cd backend/connectors/jira
   ```

2. **Implement connector logic:**
   - Create `connector.py` with a `sync_jira()` function
   - Follow existing connector patterns (see `github/connector.py`)
   - Use the shared `ChangeEvent` model
   - Include `test_connection()` method

3. **Add configuration:**
   - Add connector definition to `frontend/src/config/connectorConfigs.json`
   - Define fields, types, help text, and validation

4. **Create README:**
   - Copy template from `backend/connectors/github/README.md`
   - Document setup, configuration, and troubleshooting

5. **Test thoroughly:**
   - Test connection validation
   - Test event fetching and storage
   - Test error handling
   - Test with various configurations

6. **Submit PR:**
   - Include examples and screenshots
   - Document any new dependencies
   - Update main README if needed

### Getting Help

- Open an issue for bugs or feature requests
- Tag questions with `question` label
- Check existing issues before creating new ones
- Be respectful and constructive

---

## Troubleshooting

### Services won't start

**Check Docker status:**
```bash
docker-compose ps
docker-compose logs [service-name]
```

**Common issues:**
- Port conflicts: Check if ports 5432, 6379, 8000, 5173 are available
- Database not ready: Wait for PostgreSQL healthcheck to pass
- Permission errors: Ensure Docker has file access

### Events not appearing

1. Check connector is enabled (toggle in Settings)
2. Verify connection test passes
3. Check poll interval hasn't elapsed yet
4. View Celery worker logs: `docker-compose logs celery-worker`
5. Verify API credentials are valid
6. Check rate limits on external APIs

### Connection test fails

**GitHub:**
- Verify token has `repo` and `workflow` scopes
- Check token hasn't expired
- Ensure network can reach api.github.com (or Enterprise URL)

**GitLab:**
- Verify token has `read_api` scope
- Check token hasn't expired
- Ensure network can reach gitlab.com

**Kubernetes:**
- Verify API server URL is correct
- Check service account token is valid
- Ensure network can reach cluster
- Verify RBAC permissions for service account

### Database connection issues

```bash
# Check database is running
docker-compose ps db

# Connect manually
docker-compose exec db psql -U painchain -d painchain

# Reset database
docker-compose down -v
docker-compose up db
```

---

## License

MIT License - see LICENSE file for details

---

## Roadmap

**Current Version:** 1.0

**Planned Features:**
- Export events to CSV/JSON
- Webhook support for real-time updates
- More connectors (Jira, ServiceNow, Terraform Cloud)
- Event correlation and relationship mapping
- Slack/email notifications for critical changes
- Custom alerting rules
- Multi-user authentication
- Role-based access control

---

## Credits

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI framework
- [Celery](https://docs.celeryq.dev/) - Distributed task queue
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Redis](https://redis.io/) - Message broker
- [Docker](https://www.docker.com/) - Containerization

---

**Questions?** Open an issue or reach out to the maintainers.
