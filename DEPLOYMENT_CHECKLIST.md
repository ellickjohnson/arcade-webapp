# Pre-Deployment Checklist

Use this checklist before deploying to production to ensure nothing is missed.

## Code Quality
- [ ] All tests passing locally (`pytest` or `npm test`)
- [ ] Code review completed and approved
- [ ] Linting passed (`black`, `eslint`, `prettier`)
- [ ] Type checking passed (mypy, tsc)
- [ ] No console.log or debug statements in production code

## Docker & Containers
- [ ] Dockerfile uses multi-stage build
- [ ] Docker image builds successfully
- [ ] Image size is optimized (alpine-based when possible)
- [ ] Health check endpoint implemented (`/health`)
- [ ] Readiness probe configured (`/health/ready`)
- [ ] Liveness probe configured (`/health/live`)
- [ ] Container runs as non-root user
- [ ] Resource limits defined (memory, CPU)
- [ ] Security scan passed (no CRITICAL/HIGH vulnerabilities)

## Configuration
- [ ] Environment variables documented in `.env.example`
- [ ] All secrets removed from code and configs
- [ ] Config files for staging reviewed
- [ ] Config files for production reviewed
- [ ] Database migration scripts prepared
- [ ] Backup strategy verified (if applicable)

## Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Manual testing completed on staging
- [ ] Load testing performed (if applicable)
- [ ] Edge cases tested
- [ ] Error handling tested

## Documentation
- [ ] README.md updated with setup instructions
- [ ] API documentation updated (OpenAPI/Swagger)
- [ ] CHANGELOG.md updated with version notes
- [ ] Architecture diagrams updated (if applicable)
- [ ] Deployment instructions documented

## Monitoring & Observability
- [ ] Logging configured and tested
- [ ] Metrics export configured
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Uptime monitor configured
- [ ] Alerts configured (container restarts, high CPU/memory)

## Security
- [ ] Dependencies updated (no known vulnerabilities)
- [ ] Secrets management configured
- [ ] HTTPS/SSL configured (if external access)
- [ ] Rate limiting configured (if applicable)
- [ ] CORS configured properly
- [ ] Input validation implemented

## Deployment Readiness
- [ ] Previous backup created (database, configs)
- [ ] Rollback plan documented (previous image tag)
- [ ] Team notified of upcoming deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback procedure tested

## Post-Deployment (After Deploy)
- [ ] Container started successfully
- [ ] Health check returns "healthy"
- [ ] Application logs show no errors
- [ ] Key endpoints responding correctly
- [ ] Database connections working
- [ ] External services accessible
- [ ] Performance metrics normal
- [ ] Users verified (can login, use features)
- [ ] Monitor for 30 minutes after deployment

## Rollback Criteria
**Immediately rollback if:**
- Critical errors in logs
- Health check failing for > 5 minutes
- Error rate > 5%
- Users unable to access critical features
- Database connection failures
- Security vulnerabilities detected

---

**Deployer:** ____________________  **Date:** ___________
**Reviewer:** ____________________  **Approved:** ___________

**Version:** ___________  **Previous Version:** ___________
**Image Tag:** ___________  **Rollback Tag:** ___________
