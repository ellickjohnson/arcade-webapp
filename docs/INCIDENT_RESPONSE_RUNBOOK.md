# Incident Response Runbook

This document outlines standard procedures for handling incidents and outages.

## Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|----------------|----------|
| **P1 - Critical** | Complete system outage, data loss, security breach | 15 minutes | Entire application down, database inaccessible |
| **P2 - High** | Major functionality broken, significant degradation | 1 hour | API endpoints failing, users cannot login |
| **P3 - Medium** | Partial functionality affected, minor degradation | 4 hours | Single feature broken, slow response times |
| **P4 - Low** | Minor issues, no significant impact | 24 hours | Typos in UI, cosmetic issues |

## Incident Response Process

### 1. Detection & Identification (First 5 minutes)
- **Who**: Monitoring system, users, team members
- **Actions**:
  - Confirm incident is real (not false alarm)
  - Determine severity level
  - Identify affected systems/users
  - Estimate impact scope

### 2. Communication (Within 15 minutes)
- **Who**: On-call engineer
- **Actions**:
  - Notify team via Slack #incidents channel
  - Create incident channel: #incident-<YYYY-MM-DD>-<brief-name>
  - Post initial status update
  - Update status page if public-facing

### 3. Investigation (Ongoing)
- **Who**: Assigned incident commander
- **Actions**:
  - Check recent deployments (last 24 hours)
  - Review application logs
  - Check system metrics (CPU, memory, disk, network)
  - Test affected functionality
  - Review external dependencies
  - Document findings in incident channel

### 4. Mitigation (As soon as possible)
- **Who**: Assigned engineers
- **Actions**:
  - Implement temporary fixes if available
  - Rollback last deployment if needed
  - Restart affected services
  - Scale up resources if capacity issue
  - Circuit-breaker failing services

### 5. Resolution
- **Who**: Assigned engineers
- **Actions**:
  - Implement permanent fix
  - Test fix thoroughly
  - Deploy to production
  - Verify system is healthy
  - Monitor for recurrence

### 6. Post-Incident (Within 24 hours)
- **Who**: Incident commander + team
- **Actions**:
  - Conduct post-mortem meeting
  - Document root cause analysis
  - Create action items to prevent recurrence
  - Update documentation and runbooks
  - Close incident channel

## Common Incident Scenarios

### Application Deployment Failure
**Symptoms:**
- New deployment failing to start
- Health checks failing
- Error rate spike after deployment

**Immediate Actions:**
1. Check container logs: `docker logs <container_name>`
2. Rollback to previous image: `docker pull ghcr.io/ellickjohnson/<project>:<previous-tag>`
3. Verify previous version works
4. Investigate deployment logs
5. Fix issue and redeploy

### Database Connection Issues
**Symptoms:**
- Application cannot connect to database
- Connection timeout errors
- Too many connections errors

**Immediate Actions:**
1. Check database container status
2. Verify database is running: `docker ps | grep db`
3. Check database logs for errors
4. Verify connection credentials
5. Restart database container if needed
6. Scale database if resource constrained

### High CPU/Memory Usage
**Symptoms:**
- Container crashes or OOM killed
- Slow response times
- High resource consumption

**Immediate Actions:**
1. Check resource usage: `docker stats`
2. Identify top consuming processes
3. Check for memory leaks in logs
4. Scale horizontally if needed
5. Increase resource limits
6. Restart container if necessary

### Disk Space Full
**Symptoms:**
- Container cannot write files
- Database cannot write transactions
- Logs not being written

**Immediate Actions:**
1. Check disk usage: `df -h`
2. Identify large files/directories
3. Clean up old logs and temp files
4. Clear Docker unused resources: `docker system prune -a`
5. Expand disk if needed
6. Set up log rotation

### SSL Certificate Issues
**Symptoms:**
- HTTPS warnings in browser
- Certificate expired or invalid
- Proxy errors

**Immediate Actions:**
1. Check certificate expiry: Check NPM dashboard
2. Renew certificate via NPM API
3. Verify DNS records are correct
4. Check NPM proxy host configuration
5. Test SSL configuration

## Communication Templates

### Initial Incident Message
```
🚨 **INCIDENT DECLARED**

**Severity:** P1/P2/P3/P4
**Summary:** [Brief description]
**Impact:** [Affected systems/users]
**Started:** [Timestamp]
**Commander:** [@username]

Investigation in progress. Updates to follow.
```

### Status Update Template
```
📊 **STATUS UPDATE**

**Current Status:** [Investigating/Mitigating/Resolved]
**Last Update:** [Timestamp]
**Affected Users:** [Number/Description]

**What we know:**
- [Finding 1]
- [Finding 2]

**Next Steps:**
- [Action 1]
- [Action 2]

ETA for resolution: [Time estimate]
```

### Resolution Template
```
✅ **INCIDENT RESOLVED**

**Duration:** [X hours Y minutes]
**Root Cause:** [Summary of cause]
**Resolution:** [What was fixed]
**Prevention:** [How we'll prevent recurrence]

Post-mortem scheduled for: [Date/Time]
```

## Escalation Procedures

### When to Escalate
- Incident severity changes
- Unable to resolve within SLA
- Multiple systems affected
- Security incident identified
- Data loss or corruption suspected

### Escalation Contacts
| Role | Contact | When to Contact |
|------|---------|-----------------|
| Team Lead | [@lead] | All P1/P2 incidents |
| DevOps Engineer | [@devops] | Infrastructure issues |
| Security Team | [@security] | Security incidents |
| Management | [@manager] | Customer impact > 1 hour |

## Useful Commands

### Container Debugging
```bash
# Check container status
docker ps -a

# View container logs
docker logs -f --tail 100 <container_name>

# Execute command in container
docker exec -it <container_name> sh

# Check resource usage
docker stats

# Restart container
docker restart <container_name>

# View container inspect
docker inspect <container_name>
```

### Portainer Operations
```bash
# Check stack status via API
curl -X GET "https://portainer.ellickjohnson.net/api/stacks" \
  -H "Authorization: Bearer $PORTAINER_API_KEY"

# Redeploy stack
curl -X POST "https://portainer.ellickjohnson.net/api/stacks/<id>/stop" \
  -H "Authorization: Bearer $PORTAINER_API_KEY"
```

### System Health
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -n 1

# Check network connectivity
ping -c 3 google.com
```

## Post-Mortem Template

### 1. Summary
- **Incident Date:** [Date]
- **Incident Duration:** [X hours Y minutes]
- **Severity:** [P1-P4]
- **Impact:** [Description]

### 2. Timeline
| Time | Event |
|------|-------|
| 00:00 | Incident detected |
| 00:05 | Investigation started |
| 00:15 | Root cause identified |
| 00:30 | Mitigation implemented |
| 01:00 | Resolution confirmed |

### 3. Root Cause Analysis
**What happened:**
[Detailed description]

**Why it happened:**
[Root cause explanation]

**How it was detected:**
[Detection method]

### 4. Resolution
**Immediate fix:**
[What was done to resolve]

**Permanent fix:**
[Long-term solution implemented]

### 5. Impact Assessment
- **Users affected:** [Number/description]
- **Data loss:** [Yes/No, details]
- **Revenue impact:** [If applicable]
- **Customer complaints:** [Number]

### 6. Action Items
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| [Action 1] | [@user] | [Date] | Open/Closed |
| [Action 2] | [@user] | [Date] | Open/Closed |

### 7. Lessons Learned
**What went well:**
- [Positive aspect 1]
- [Positive aspect 2]

**What could be improved:**
- [Improvement area 1]
- [Improvement area 2]

### 8. Prevention Measures
**Immediate:**
- [Prevention action 1]
- [Prevention action 2]

**Long-term:**
- [Prevention action 3]
- [Prevention action 4]

---

**Last Updated:** 2026-02-26
**Maintained by:** DevOps Team
