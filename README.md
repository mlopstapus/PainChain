# PainChain

**Unified Change Management & Incident Investigation**

PainChain aggregates changes across your platform—deployments, code commits, CI/CD pipelines, and infrastructure updates—into a single timeline. When production breaks, trace back through the chain of changes to find the root cause fast.

## What is PainChain?

Production incidents rarely have a single cause. A failed deployment might have been caused by a merged PR, which depended on infrastructure changes from a Kubernetes update. PainChain connects these dots by aggregating change events from multiple sources into one searchable, filterable timeline.

**Built for:**
- DevOps teams investigating production incidents
- SREs tracking infrastructure changes
- Engineering teams correlating deployments with issues
- Platform teams managing multi-environment rollouts
- Managers providing deployment tracking and oversite

**Key Features:**
- **Plugin Architecture:** Add new connectors without touching frontend code
- **Auto-Discovery:** Connectors are automatically detected from backend metadata
- **Unified Timeline:** All changes aggregated into a single, filterable view
- **Customizable UI:** Control which fields are visible for each event type
- **Team-Based Filtering:** Tag connectors and filter events by team
- **Flexible Polling:** Configure per-connector poll intervals
- **Connection Testing:** Validate credentials before saving

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
- **API** service (port 8001, mapped from container port 8000)
- **Celery Worker** for background tasks
- **Celery Beat** for scheduled polling
- **Frontend** dashboard (port 5174)

### 4. Access the Dashboard

Open your browser to:
- **Dashboard:** http://localhost:5174
- **API Docs:** http://localhost:8001/docs

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
│  Frontend   │  React Dashboard (port 5174)
│  (Vite)     │  • Auto-discovers connectors from API
└──────┬──────┘  • Loads metadata at runtime
       │ HTTP
       ▼
┌─────────────┐     ┌──────────────┐
│  API        │────▶│  PostgreSQL  │
│  (FastAPI)  │     │  Database    │
│  Port 8001  │     │              │
└──────┬──────┘     └──────────────┘
       │             Serves metadata.json
       │ Celery      for all connectors
       │ Tasks
       ▼
┌─────────────┐     ┌──────────────┐
│  Celery     │────▶│    Redis     │
│  Worker     │     │  (Broker)    │
└──────┬──────┘     └──────────────┘
       │
       │ Polls via connector plugins
       ▼
┌─────────────────────────────┐
│  External Services          │
│  • GitHub API               │
│  • GitLab API               │
│  • Kubernetes API           │
│  • (Add your own!)          │
└─────────────────────────────┘
```

### Components

**Frontend (React + Vite)**
- Dashboard with event timeline
- Auto-discovered connector configuration UI
- Plugin-based event rendering system
- Filtering and search
- Field visibility customization

**API (FastAPI)**
- RESTful endpoints for events and connectors
- Serves connector metadata from backend
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

### Plugin Architecture

PainChain uses a **plugin-based connector system** for true plug-and-play extensibility:

**Backend Metadata (`/backend/connectors/{name}/metadata.json`)**
- Connector identity (id, displayName, logo, description)
- Connection form schema (`connectionForm`)
- Event type definitions with field labels and visibility (`eventTypes`)

**Frontend Event Rendering (`/frontend/src/connectors/{name}/eventConfig.jsx`)**
- Custom JSX rendering logic for event cards
- Field formatters and data extractors
- Optional - defaults to generic rendering

Connectors are **automatically discovered** from backend metadata. The frontend loads connector configurations, form schemas, and field definitions from the API at runtime. No manual frontend code changes are required to add basic connector support!

### Directory Structure

```
PainChain/
├── backend/
│   ├── api/                    # FastAPI application
│   │   ├── main.py            # API routes & endpoints
│   │   ├── celery_app.py      # Celery configuration
│   │   └── tasks.py           # Background tasks
│   ├── connectors/            # Connector plugins (auto-discovered)
│   │   ├── github/
│   │   │   ├── connector.py   # Polling logic
│   │   │   ├── metadata.json  # UI config + event types
│   │   │   ├── logo.png       # Connector icon
│   │   │   └── README.md      # Documentation
│   │   ├── gitlab/
│   │   ├── kubernetes/
│   │   └── painchain/         # Internal system connector
│   └── shared/
│       └── models.py          # Shared data models
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx  # Main timeline view
│   │   │   └── Settings.jsx   # Connector configuration
│   │   ├── connectors/        # Event rendering plugins
│   │   │   ├── github/
│   │   │   │   └── eventConfig.jsx  # Custom rendering
│   │   │   ├── gitlab/
│   │   │   ├── kubernetes/
│   │   │   └── painchain/
│   │   └── utils/
│   │       ├── connectorMetadata.js   # Fetches from API
│   │       ├── eventConfigLoader.js   # Merges event configs
│   │       └── fieldVisibility.js     # Field visibility logic
│   └── public/
└── docker-compose.yml
```

**Key Points:**
- Each connector lives in its own directory under `backend/connectors/`
- Frontend event rendering is optional (in `frontend/src/connectors/`)
- Metadata is served from backend, not hardcoded in frontend
- No central configuration file to update when adding connectors

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

PainChain's plugin architecture makes adding connectors straightforward. Here's how to add a new connector (e.g., Terraform):

#### Step 1: Create Backend Connector

```bash
mkdir -p backend/connectors/terraform
cd backend/connectors/terraform
```

Create three files:

**1. `connector.py` - Polling Logic**

Implement the connector sync function:

```python
from shared.models import ChangeEvent
from datetime import datetime, timezone
import requests

def sync_terraform(connection_id, config):
    """
    Fetch Terraform Cloud runs and store as change events.

    Args:
        connection_id: Database ID of this connection
        config: Dictionary with token, organization, workspace, etc.
    """
    # Fetch data from external API
    headers = {"Authorization": f"Bearer {config['token']}"}
    response = requests.get(
        f"https://app.terraform.io/api/v2/organizations/{config['org']}/runs",
        headers=headers
    )

    # Parse and store events
    for run in response.json()['data']:
        event = ChangeEvent(
            connection_id=connection_id,
            source="terraform",
            event_type="TerraformRun",
            title=f"[Terraform] {run['attributes']['message']}",
            description=run['attributes']['status'],
            timestamp=datetime.fromisoformat(run['attributes']['created-at']),
            event_metadata={
                "run_id": run['id'],
                "status": run['attributes']['status'],
                "workspace": config['workspace']
            }
        )
        event.store()

def test_connection(config):
    """Test if credentials are valid."""
    headers = {"Authorization": f"Bearer {config['token']}"}
    response = requests.get(
        f"https://app.terraform.io/api/v2/organizations/{config['org']}",
        headers=headers
    )
    return response.status_code == 200
```

**2. `metadata.json` - Connector Configuration**

This file defines everything the frontend needs to know:

```json
{
  "id": "terraform",
  "displayName": "Terraform Cloud",
  "color": "#7B42BC",
  "logo": "terraform.png",
  "description": "Track Terraform Cloud runs and infrastructure changes",
  "connectionForm": {
    "fields": [
      {
        "key": "name",
        "label": "Connection Name",
        "type": "text",
        "placeholder": "Production Terraform",
        "required": true
      },
      {
        "key": "token",
        "label": "API Token",
        "type": "password",
        "placeholder": "Enter Terraform Cloud token",
        "required": true
      },
      {
        "key": "org",
        "label": "Organization",
        "type": "text",
        "placeholder": "my-org",
        "required": true
      },
      {
        "key": "workspace",
        "label": "Workspace",
        "type": "text",
        "placeholder": "production",
        "help": "Leave empty to monitor all workspaces",
        "required": false
      },
      {
        "key": "pollInterval",
        "label": "Poll Interval (seconds)",
        "type": "number",
        "default": "300",
        "min": 60,
        "max": 3600,
        "required": true
      }
    ]
  },
  "eventTypes": {
    "TerraformRun": {
      "displayName": "Terraform Runs",
      "fields": {
        "run_id": { "defaultVisibility": true, "fieldLabel": "Run ID" },
        "status": { "defaultVisibility": true, "fieldLabel": "Status" },
        "workspace": { "defaultVisibility": true, "fieldLabel": "Workspace" },
        "changes": { "defaultVisibility": true, "fieldLabel": "Changes" }
      }
    }
  }
}
```

**3. `README.md` - Documentation**

Document setup, configuration, and troubleshooting (copy template from `github/README.md`).

#### Step 2: Add Frontend Event Rendering (Optional)

If you want custom rendering for your events, create:

**`frontend/src/connectors/terraform/eventConfig.jsx`**

```jsx
export const terraformEventConfig = {
  'TerraformRun': {
    titleMatch: '[Terraform]',
    sections: [
      {
        title: 'Run Details',
        fields: [
          {
            key: 'run_id',
            label: 'Run ID',
            value: (event) => event.metadata?.run_id
          },
          {
            key: 'status',
            label: 'Status',
            value: (event) => {
              const status = event.metadata?.status
              const color = status === 'applied' ? '#3fb950' :
                           status === 'errored' ? '#f85149' : '#808080'
              return {
                type: 'html',
                content: <span style={{ color }}>{status}</span>
              }
            }
          },
          {
            key: 'workspace',
            label: 'Workspace',
            value: (event) => event.metadata?.workspace
          }
        ]
      }
    ]
  }
}
```

Then register it in `frontend/src/utils/eventConfigLoader.js`:

```javascript
import { terraformEventConfig } from '../connectors/terraform/eventConfig'

const connectorConfigs = [
  githubEventConfig,
  gitlabEventConfig,
  kubernetesEventConfig,
  painchainEventConfig,
  terraformEventConfig  // Add your new connector here
]
```

**Note:** If you skip this step, events will still appear in the timeline with generic rendering based on the field labels from `metadata.json`.

#### Step 3: Test Your Connector

1. **Start the backend:**
   ```bash
   docker-compose up --build
   ```

2. **Configure in UI:**
   - Navigate to Settings → Connections
   - Your new connector appears automatically
   - Click "Add Connection" and fill in the form
   - Test the connection

3. **Verify events:**
   - Enable the connector
   - Wait for poll interval
   - Check dashboard for events

#### Step 4: Submit PR

Before submitting:
- ✅ Test connection validation
- ✅ Test event fetching and storage
- ✅ Test error handling (invalid credentials, network errors, API changes)
- ✅ Include connector logo as `/backend/connectors/{name}/logo.png`
- ✅ Document required API permissions
- ✅ Add example configurations
- ✅ Update this README if the connector requires special setup

**What you DON'T need to change:**
- ❌ Dashboard.jsx
- ❌ Settings.jsx
- ❌ Any core frontend files (unless adding event rendering)
- ❌ API routes (connectors are auto-discovered)

### Connector Architecture Benefits

**Auto-Discovery:** The backend serves all connector metadata through `/api/connectors/metadata`. The frontend dynamically builds forms, field labels, and visibility settings from this endpoint.

**No Frontend Code Changes:** Adding a connector only requires backend code + metadata.json. The UI updates automatically.

**Plug-and-Play:** Each connector is self-contained in its own directory with all configuration, logic, and documentation in one place.

**Consistent UI:** All connectors use the same form rendering logic, ensuring a consistent user experience.

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
- Port conflicts: Check if ports 5432, 6379, 8001, 5174 are available
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

## Connector Development: Before vs After

### Before Auto-Discovery (Old Architecture)

To add a new connector, you needed to modify **6 different files**:

1. ✏️ `backend/connectors/{name}/connector.py` - Backend logic
2. ✏️ `backend/connectors/{name}/README.md` - Documentation
3. ✏️ `frontend/src/config/connectorConfigs.json` - Form schema
4. ✏️ `frontend/src/utils/fieldVisibility.js` - Field labels & defaults
5. ✏️ `frontend/src/pages/Dashboard.jsx` - Event rendering (1300+ lines!)
6. ✏️ `frontend/src/pages/Settings.jsx` - Often needed tweaks

**Problems:**
- ❌ High coupling between frontend and backend
- ❌ Easy to forget updating a file
- ❌ Dashboard.jsx became massive (1300+ lines)
- ❌ Inconsistent patterns across connectors
- ❌ Difficult to test in isolation

### After Auto-Discovery (New Architecture)

To add a new connector, you only need **2-3 files**:

1. ✏️ `backend/connectors/{name}/connector.py` - Backend logic
2. ✏️ `backend/connectors/{name}/metadata.json` - **All UI config in one place**
3. ✏️ `backend/connectors/{name}/README.md` - Documentation
4. *(Optional)* `frontend/src/connectors/{name}/eventConfig.jsx` - Custom rendering

**Benefits:**
- ✅ True plug-and-play architecture
- ✅ Single source of truth (metadata.json)
- ✅ Frontend auto-discovers connectors from API
- ✅ Each connector is self-contained
- ✅ Easy to test and maintain
- ✅ Dashboard.jsx reduced from 1300+ lines to ~50 lines

### What Changed?

**Backend (`metadata.json`)** now contains everything:
```json
{
  "id": "myconnector",
  "displayName": "My Connector",
  "connectionForm": { /* form fields */ },
  "eventTypes": { /* field visibility & labels */ }
}
```

**Frontend** loads this at runtime via `/api/connectors/metadata` and:
- Dynamically renders connection forms
- Populates field labels and visibility
- *(Optional)* Uses custom event rendering plugins

**Result:** Adding a connector is now a backend-only task!

---

## License

MIT License - see LICENSE file for details

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
