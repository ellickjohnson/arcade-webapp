# arcade-webapp Setup Instructions

## Quick Start

### 1. Configure Environment
```bash
cp .env.example .env
nano .env  # Edit with your configuration
```

### 2. Start Development

**For Node.js:**
```bash
npm install
npm run dev
```

**For Python:**
```bash
pip install -r requirements.txt
python main.py
```

### 3. Start with Docker (Recommended)
```bash
docker-compose up -d
```

## Health Checks

- **Liveness:** http://localhost:3000/health/live (Node.js) or http://localhost:8000/health/live (Python)
- **Readiness:** http://localhost:3000/health/ready (Node.js) or http://localhost:8000/health/ready (Python)
- **Detailed:** http://localhost:3000/health (Node.js) or http://localhost:8000/health (Python)

## Deployment

1. **Follow the deployment checklist:**
   ```bash
   cat DEPLOYMENT_CHECKLIST.md
   ```

2. **Build and push Docker image:**
   ```bash
   docker build -t ghcr.io/ellickjohnson/arcade-webapp:latest .
   docker push ghcr.io/ellickjohnson/arcade-webapp:latest
   ```

3. **Deploy to Portainer:**
   - Use Portainer UI to deploy the stack
   - Pull image from: ghcr.io/ellickjohnson/arcade-webapp:latest
   - Use docker-compose.yml for stack configuration

## Rollback

```bash
./scripts/rollback.sh arcade-webapp <previous-tag>
```

## Documentation

- [Full README](README.md) - Complete project documentation
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Pre-deployment requirements
- [Incident Response Runbook](docs/INCIDENT_RESPONSE_RUNBOOK.md) - Incident procedures
- [Changelog](CHANGELOG.md) - Version history

## Project Type

This is a **nodejs** project with full workflow automation.

---

Generated: 2026-02-26
