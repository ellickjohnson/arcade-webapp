# Arcade Webapp Deployment Checklist

**Last Updated:** 2026-02-26
**Version:** 2.0

---

## Pre-Deployment

### Code Preparation
- [ ] Verify docker-compose.yml is up to date
- [ ] Test Docker image builds locally
- [ ] Review health endpoints are configured
- [ ] Check for breaking changes in dependencies

### Configuration
- [ ] Check environment variables in .env
- [ ] Verify database connection strings
- [ ] Check Redis connection strings
- [ ] Review resource limits and reservations
- [ ] Verify network configurations

### Testing
- [ ] Run local tests (npm test or pytest)
- [ ] Test health endpoints locally
- [ ] Verify database migrations
- [ ] Check for security vulnerabilities

---

## Deployment

### Build & Push
- [ ] Build Docker image
- [ ] Tag image with version (e.g., :v1.0.0 or :latest)
- [ ] Push image to GHCR (ghcr.io/ellickjohnson/arcade-webapp:tag)
- [ ] Verify image is accessible

### Portainer Stack Deployment
- [ ] Check if stack exists: arcade-webapp-stack
- [ ] If exists: Update stack with new docker-compose.yml
- [ ] If not exists: Create new stack with docker-compose.yml
- [ ] Verify all containers start successfully

**Note:** If Portainer stack creation fails (HTTP 405), use the recovery script:
```bash
./scripts/recover.sh
```

### Container Verification
- [ ] Verify app container is running (arcade-webapp)
- [ ] Verify db container is running (arcade-webapp-db)
- [ ] Verify redis container is running (arcade-webapp-redis)
- [ ] Check container logs for errors
- [ ] Verify restart policy is set to `unless-stopped`

---

## Post-Deployment

### Health Checks
- [ ] Run health check: http://docker.ellickjohnson.net:3003/health/live
- [ ] Verify status is 200 OK
- [ ] Check /health/ready endpoint (if configured)
- [ ] Monitor container resource usage

### Proxy Configuration (if needed)
- [ ] Check if proxy host exists for arcade.ellickjohnson.net
- [ ] If not exists: Create proxy host with NPM
  - Domain: arcade.ellickjohnson.net
  - Forward: docker.ellickjohnson.net:3003
  - SSL: Disabled (unless required)
  - WebSocket: Enabled
- [ ] If exists: Verify configuration is correct
- [ ] Test domain accessibility: http://arcade.ellickjohnson.net
- [ ] Verify SSL (if enabled)

### Functionality Testing
- [ ] Test main functionality (games load and play)
- [ ] Test database connectivity
- [ ] Test Redis connectivity
- [ ] Test health endpoints
- [ ] Check for errors in logs

---

## Documentation

- [ ] Update CHANGELOG.md with changes
- [ ] Update version numbers
- [ ] Document any configuration changes
- [ ] Update README.md if needed

---

## Notifications

- [ ] Send deployment notification to Slack #general
  - Include deployment details
  - Include access URLs
  - Include status and any issues

---

## Rollback (if needed)

### Manual Rollback
1. Update docker-compose.yml with previous image version
2. Redeploy stack: `./scripts/deploy.sh`
3. Verify deployment with health checks

### Using Rollback Script
```bash
./scripts/rollback.sh <previous-version>
```

---

## One-Command Deployment

Use the provided deployment script for automated deployment:

```bash
./scripts/deploy.sh
```

This script will:
1. Check prerequisites
2. Create/update Portainer stack
3. Wait for containers to start
4. Run health checks
5. Configure proxy (if needed)
6. Verify deployment
7. Send notification to Slack

---

## Automated Recovery

Use the recovery script to automatically detect and fix missing containers:

```bash
./scripts/recover.sh
```

This script will:
1. Check all expected containers
2. Identify missing or stopped containers
3. Create/update Portainer stack
4. Verify all containers are running
5. Send notification

---

## Known Issues

### Portainer Stack Creation Fails with HTTP 405
**Problem:** Portainer API returns 405 Method Not Allowed when creating stacks.

**Workaround:** Use the recovery script or individual container management.

**Alternative:** Ensure existing containers have `restart: unless-stopped` policy.

### Proxy Host Creation Errors
**Problem:** NPM API returns "data must NOT have additional properties".

**Solution:** Use npm-manager skill which has correct API formats.

**Documentation:** See /a0/usr/skills/npm-manager/docs/API_REFERENCE.md

---

## Quick Reference

### Access URLs
- **Main:** http://arcade.ellickjohnson.net
- **Direct:** http://docker.ellickjohnson.net:3003
- **Health:** http://docker.ellickjohnson.net:3003/health/live

### Stack Details
- **Name:** arcade-webapp-stack
- **Endpoint:** docker.ellickjohnson.net (ID: 3)
- **Compose:** /a0/usr/workdir/arcade-webapp/docker-compose.yml

### Services
- **app:** arcade-webapp (port 3000)
- **db:** arcade-webapp-db (postgres:16-alpine)
- **redis:** arcade-webapp-redis (redis:7-alpine)

### Scripts
- **deploy.sh:** Full deployment automation
- **recover.sh:** Automated recovery
- **rollback.sh:** Version rollback

---

## Success Criteria

Deployment is considered successful when:
1. All three containers are running
2. Health check returns 200 OK
3. Domain is accessible (http://arcade.ellickjohnson.net)
4. Games load and play correctly
5. No errors in container logs
6. Slack notification sent successfully
