# Deployment Improvement Plan

**Created:** 2026-02-26 20:12
**Priority:** HIGH
**Target Deployment Time:** < 10 minutes

---

## Executive Summary

Based on the post-reboot recovery of the arcade-webapp deployment, we have identified critical gaps in automation, container persistence, and deployment workflows. This plan outlines concrete actions to make coding and deploying easier, faster, and more reliable.

**Key Goals:**
1. Ensure containers survive reboots automatically
2. Automate deployment and recovery processes
3. Standardize API usage with proper documentation
4. Implement monitoring and alerting
5. Reduce deployment time from 30-45 minutes to < 10 minutes

---

## Priority 1: Container Persistence (CRITICAL)

### Problem
Postgres and Redis containers disappeared after reboot because they were created individually, not as part of a Portainer stack.

### Solutions

#### Option A: Convert to Portainer Stack (Recommended)
1. Create proper Portainer stack using docker-compose.yml
2. Deploy stack with restart policy: unless-stopped
3. All containers in stack will auto-restart after reboot

**Implementation:**
```bash
# Use portainer-manager skill or direct API
python portainer_client.py create_stack arcade-webapp-stack 3 docker-compose.yml
```

**Benefits:**
- Automatic recovery after reboots
- Single management point
- Version control of stack config
- Easier updates and rollbacks

**Estimated Time:** 1 hour
**Priority:** CRITICAL

#### Option B: Individual Containers with Restart Policy
1. Update existing containers with restart policy
2. Use Portainer API to set restart: unless-stopped

**Drawbacks:**
- Still manual management
- No unified stack view
- Harder to update all containers

**Recommendation:** Use Option A

---

## Priority 2: Deployment Automation

### Problem
No automated recovery required manual detection and redeployment of missing containers.

### Solutions

#### A. Deployment Script
Create `/a0/usr/workdir/arcade-webapp/scripts/deploy.sh`:
```bash
#!/bin/bash
# Auto-deployment script for arcade-webapp

# Configuration
STACK_NAME="arcade-webapp-stack"
ENDPOINT_ID=3
COMPOSE_FILE="/a0/usr/workdir/arcade-webapp/docker-compose.yml"

# Check if stack exists
if python /a0/usr/skills/portainer-manager/scripts/manage_stacks.py list | grep -q "$STACK_NAME"; then
    echo "Stack exists, updating..."
    python /a0/usr/skills/portainer-manager/scripts/manage_stacks.py update "$STACK_NAME" "$COMPOSE_FILE"
else
    echo "Creating new stack..."
    python /a0/usr/skills/portainer-manager/scripts/manage_stacks.py create "$STACK_NAME" "$ENDPOINT_ID" "$COMPOSE_FILE"
fi

# Wait for health check
sleep 10

# Verify deployment
curl -f http://docker.ellickjohnson.net:3003/health/live || exit 1

echo "Deployment successful!"
```

**Estimated Time:** 2 hours
**Priority:** HIGH

#### B. Recovery Script
Create `/a0/usr/workdir/arcade-webapp/scripts/recover.sh`:
```bash
#!/bin/bash
# Auto-recovery script for missing containers

# Check postgres
if ! docker ps | grep -q arcade-webapp-db; then
    echo "Postgres missing, recreating..."
    # Recreate postgres container
fi

# Check redis
if ! docker ps | grep -q arcade-webapp-redis; then
    echo "Redis missing, recreating..."
    # Recreate redis container
fi

# Verify all containers
python /a0/usr/workdir/arcade-webapp/scripts/verify-deployment.py
```

**Estimated Time:** 1.5 hours
**Priority:** HIGH

---

## Priority 3: Nginx Proxy Manager API Wrapper

### Problem
No documentation for NPM API, required reverse-engineering format.

### Solutions

#### A. Create API Wrapper Skill
Create npm-manager skill at `/a0/usr/skills/npm-manager/`:

**File: SKILL.md**
```
# Nginx Proxy Manager Manager Skill

## Overview
Simplified API wrapper for Nginx Proxy Manager operations.

## Available Functions
- create_proxy_host(domain, forward_host, forward_port, ssl_enabled=False)
- list_proxy_hosts()
- delete_proxy_host(id)
- enable_ssl(host_id)
```

**File: scripts/npm_client.py**
```python
class NPMClient:
    def __init__(self, url, email, password):
        self.url = url
        self.email = email
        self.password = password
        self.token = None

    def authenticate(self):
        # Login to NPM
        pass

    def create_proxy_host(self, domain, forward_host, forward_port, ssl_enabled=False):
        # Create proxy with correct format
        proxy_config = {
            'domain_names': [domain],
            'forward_scheme': 'http',
            'forward_host': forward_host,
            'forward_port': forward_port,
            'certificate_id': 0 if not ssl_enabled else None,
            'ssl_forced': False,
            'caching_enabled': False,
            'block_exploits': False,
            'allow_websocket_upgrade': True,
            'http2_support': False,
            'enabled': True
        }
        # Make API call
        pass
```

**Benefits:**
- Standardized API usage
- Pre-formatted requests
- Error handling built-in
- Easier to use

**Estimated Time:** 3 hours
**Priority:** HIGH

#### B. Document API Formats
Create documentation at `/a0/usr/workdir/nginx-proxy-manager-restapi/docs/API_FORMATS.md`:
```markdown
# Nginx Proxy Manager API Reference

## Proxy Host Creation

### Request Format
```json
{
  "domain_names": ["example.com"],
  "forward_scheme": "http",
  "forward_host": "backend",
  "forward_port": 3000,
  "certificate_id": 0,
  "ssl_forced": false,
  "caching_enabled": false,
  "block_exploits": false,
  "allow_websocket_upgrade": true,
  "http2_support": false,
  "enabled": true,
  "locations": [],
  "hsts_enabled": false,
  "hsts_subdomains": false
}
```

### Required Fields
- domain_names (array)
- forward_scheme (string: http/https)
- forward_host (string)
- forward_port (integer)

### Optional Fields
- certificate_id (integer, 0 = no SSL)
- ssl_forced (boolean)
- caching_enabled (boolean)
- block_exploits (boolean)
- allow_websocket_upgrade (boolean)
- http2_support (boolean)
- enabled (boolean)
```

**Estimated Time:** 1 hour
**Priority:** MEDIUM

---

## Priority 4: Monitoring and Alerting

### Problem
No monitoring for container failures; had to manually detect missing containers.

### Solutions

#### A. Health Check Script
Create `/a0/usr/workdir/arcade-webapp/scripts/health-check.sh`:
```bash
#!/bin/bash
# Continuous health monitoring

# Check all containers
CONTAINERS=("arcade-webapp-db" "arcade-webapp-redis" "arcade-webapp-app")

for container in "${CONTAINERS[@]}"; do
    if ! docker ps | grep -q "$container"; then
        echo "WARNING: $container is not running!"
        # Send alert
        python /a0/usr/projects/media_management/send_slack_notification.py             "Container Alert" "$container is not running" "arcade-webapp" "error"
    fi
done

# Check health endpoint
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://docker.ellickjohnson.net:3003/health/live)
if [ "$HEALTH_STATUS" != "200" ]; then
    echo "WARNING: Health check failed!"
    # Send alert
fi
```

**Estimated Time:** 1.5 hours
**Priority:** HIGH

#### B. Scheduler Task
Create scheduled task to run health checks every 5 minutes:
```python
# Use scheduler:create_scheduled_task
scheduler_task = {
    "name": "arcade-webapp-health-check",
    "schedule": {
        "minute": "*/5",
        "hour": "*",
        "day": "*",
        "month": "*",
        "weekday": "*"
    },
    "prompt": "Run /a0/usr/workdir/arcade-webapp/scripts/health-check.sh and alert if any issues"
}
```

**Benefits:**
- Automated monitoring
- Immediate alerts for failures
- Reduced manual checking

**Estimated Time:** 30 minutes
**Priority:** HIGH

---

## Priority 5: Standardized Deployment Workflow

### Problem
No clear deployment process; switched between methods causing confusion.

### Solutions

#### A. Create Deployment Checklist
Update `/a0/usr/workdir/arcade-webapp/DEPLOYMENT_CHECKLIST.md`:
```markdown
# Arcade Webapp Deployment Checklist

## Pre-Deployment
- [ ] Verify docker-compose.yml is up to date
- [ ] Test Docker image builds locally
- [ ] Check environment variables in .env
- [ ] Review health endpoints are configured

## Deployment
- [ ] Build Docker image (if needed)
- [ ] Push image to GHCR
- [ ] Create/Update Portainer stack
- [ ] Verify all containers running
- [ ] Check container logs for errors

## Post-Deployment
- [ ] Run health checks
- [ ] Configure proxy host (if new domain)
- [ ] Test domain accessibility
- [ ] Verify SSL (if enabled)
- [ ] Send deployment notification
- [ ] Update CHANGELOG.md

## Verification
- [ ] Test main functionality (games load)
- [ ] Test database connectivity
- [ ] Test Redis connectivity
- [ ] Check for errors in logs
```

**Estimated Time:** 30 minutes
**Priority:** MEDIUM

#### B. One-Command Deployment
Create `/a0/usr/workdir/arcade-webapp/scripts/deploy-all.sh`:
```bash
#!/bin/bash
# Complete deployment in one command

set -e  # Exit on error

echo "=== Arcade Webapp Deployment ==="

echo "[1/5] Building Docker image..."
# Build image

echo "[2/5] Pushing to GHCR..."
# Push image

echo "[3/5] Updating Portainer stack..."
# Update stack

echo "[4/5] Verifying deployment..."
# Run health checks

echo "[5/5] Sending notification..."
# Send notification

echo "=== Deployment Complete ==="
```

**Benefits:**
- Consistent deployment process
- Reduced human error
- Faster deployment time
- Easy to execute

**Estimated Time:** 2 hours
**Priority:** HIGH

---

## Priority 6: Memory Validation

### Problem
Referenced npm-restapi skill that didn't exist.

### Solutions

#### A. Memory Cleanup Script
Create script to validate memory references:
```python
#!/usr/bin/env python3
"""Validate memory references to skills/tools"""

import os
from skills_tool import SkillsTool

skills_tool = SkillsTool()

# List all skills
available_skills = skills_tool.list()

# Load memories and check references
# Remove invalid references
# Update with correct information
```

**Estimated Time:** 1 hour
**Priority:** LOW

#### B. Skills Inventory
Create skills inventory at `/a0/usr/skills/SKILLS_INVENTORY.md`:
```markdown
# Available Skills

## Core Skills
- portainer-manager: Docker/Portainer management
- slack-bot: Slack integration

## Project-Specific Skills
- [List all skills with descriptions]

## Deprecated Skills
- npm-restapi: Moved to /a0/usr/workdir/nginx-proxy-manager-restapi/
```

**Estimated Time:** 30 minutes
**Priority:** LOW

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Convert to Portainer stack (Priority 1A)
- [ ] Create deployment script (Priority 2A)
- [ ] Create health check script (Priority 4A)
- [ ] Set up scheduled health monitoring (Priority 4B)

### Phase 2: Automation (Week 2)
- [ ] Create recovery script (Priority 2B)
- [ ] Create npm-manager skill (Priority 3A)
- [ ] Create one-command deployment (Priority 5B)

### Phase 3: Documentation (Week 3)
- [ ] Document NPM API formats (Priority 3B)
- [ ] Update deployment checklist (Priority 5A)
- [ ] Clean up memory references (Priority 6)
- [ ] Create skills inventory (Priority 6B)

---

## Success Metrics

### Current State
- Deployment time: 30-45 minutes
- Manual recovery required: Yes
- Container persistence: No
- Monitoring: None
- API documentation: Minimal

### Target State
- Deployment time: < 10 minutes
- Manual recovery required: No
- Container persistence: Yes
- Monitoring: Automated health checks every 5 minutes
- API documentation: Complete

### Key Performance Indicators
1. **Deployment Time**: From 30-45 min to < 10 min (80% reduction)
2. **Recovery Time**: From 30-45 min to < 5 min (90% reduction)
3. **Manual Interventions**: From weekly to quarterly
4. **Uptime**: From 95% to 99.9%
5. **Alert Response Time**: From hours to minutes

---

## Cost-Benefit Analysis

### Investment Required
- Development Time: ~15 hours
- Testing Time: ~5 hours
- Total: ~20 hours

### Benefits
- Time Saved: 20-30 min per deployment × 4 deployments/month = 2 hours/month
- Reduced Downtime: 30-45 min per reboot × 2 reboots/month = 1.5 hours/month
- Improved Reliability: Priceless

### ROI
- First 2 months: Break even
- After 2 months: 3.5 hours/month savings
- Annual savings: ~42 hours

**Conclusion:** High ROI, should implement immediately.

---

## Conclusion

By implementing these improvements, we will:
1. **Eliminate manual recovery** - Containers auto-restart after reboots
2. **Reduce deployment time** - From 30-45 minutes to < 10 minutes
3. **Improve reliability** - Automated monitoring and alerts
4. **Standardize workflows** - Consistent deployment processes
5. **Reduce errors** - One-command deployment with validation

The investment of ~20 hours will save ~42 hours annually and significantly improve deployment reliability.

**Recommendation:** Start with Phase 1 (Critical Fixes) immediately.
