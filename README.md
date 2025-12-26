# PainChain

**Unified Change Management & Incident Investigation**

PainChain aggregates changes across your platform—deployments, code commits, CI/CD pipelines, and infrastructure updates—into a single timeline. When production breaks, trace back through the chain of changes to find the root cause fast.

---

## 🚧 Architecture Redesign in Progress

**PainChain v2 is currently under development with a new architecture.**

The previous implementation has been moved to `deprecated/` and is available for reference. We are rebuilding PainChain from the ground up with:

- **Connectors as independent containers** (not embedded code)
- **Self-registration and auto-discovery**
- **Standardized event contract**
- **Generic frontend** (no connector-specific UI code)
- **Configuration as code** (YAML/JSON, not UI forms)
- **Free tier** (localhost) and **SaaS tier** (managed with webhooks)

### Documentation

📖 **[Read the full Architecture Plan →](./ARCHITECTURE.md)**

This document contains:
- Complete system design
- Repository structure
- Event contract specification
- API design
- Connector development guide
- Implementation phases
- Migration strategy

---

## What is PainChain?

Production incidents rarely have a single cause. A failed deployment might have been caused by a merged PR, which depended on infrastructure changes from a Kubernetes update. PainChain connects these dots by aggregating change events from multiple sources into one searchable, filterable timeline.

**Built for:**
- DevOps teams investigating production incidents
- SREs tracking infrastructure changes
- Engineering teams correlating deployments with issues
- Platform teams managing multi-environment rollouts
- Managers providing deployment tracking and oversight

**Key Principles:**
- **Connector Independence**: Each connector runs as its own container
- **Standard Contract**: All events follow the same structure
- **Generic UI**: Frontend renders JSON intelligently without connector-specific code
- **Config as Code**: All configuration in YAML/JSON files
- **Self-Hosted First**: Free tier runs on localhost with polling, SaaS tier adds webhooks

---

## Current Status

**Phase:** Planning and Architecture Design

**Completed:**
- ✅ Architecture document written
- ✅ Repository structure defined
- ✅ Event contract specification
- ✅ API design
- ✅ Connector lifecycle design
- ✅ Database schema design

**Next Steps:**
1. Set up core backend (NestJS + Prisma)
2. Implement event ingestion API
3. Build first connector (GitHub) as proof of concept
4. Create generic frontend with JSON renderer
5. Add additional connectors

**Previous Implementation:**
The v1 implementation is available in `deprecated/` for reference. It includes:
- FastAPI backend with embedded connectors
- React frontend with connector-specific UI
- Celery-based polling system
- Full GitHub, GitLab, and Kubernetes connector implementations

See `deprecated/README.md` for documentation on the previous architecture.

---

## Quick Start (Coming Soon)

Once the new architecture is implemented, you'll be able to run PainChain with:

```bash
# Clone the repository
git clone https://github.com/yourusername/PainChain.git
cd PainChain

# Start core services
docker-compose up -d

# Access the UI
open http://localhost:8000/home
```

---

## Contributing

We welcome contributions! If you're interested in helping with the v2 rewrite:

1. Read the **[Architecture Plan](./ARCHITECTURE.md)**
2. Check the implementation phases for current priorities
3. Open an issue to discuss your contribution
4. Submit a pull request

**Areas where we need help:**
- Core backend implementation (NestJS)
- Connector development (starting with GitHub)
- Frontend JSON renderer logic
- Helm chart creation
- Documentation

---

## Repository Structure (Planned)

```
PainChain/
├── charts/                    # Helm charts for Kubernetes
├── connectors/                # Independent connector containers
│   ├── github/
│   ├── gitlab/
│   └── kubernetes/
├── painchain/                 # Core application
│   ├── backend/              # NestJS API
│   └── frontend/             # React UI
├── deprecated/                # Previous implementation (for reference)
├── ARCHITECTURE.md           # Complete architecture specification
└── README.md                 # This file
```

---

## License

MIT License - see LICENSE file for details

---

## Questions?

- Read the [Architecture Plan](./ARCHITECTURE.md) for detailed design
- Check `deprecated/README.md` for v1 documentation
- Open an issue for bugs or feature requests
- Tag questions with `question` label

---

**Built for teams who want to understand what changed, when it changed, and why production broke.**
