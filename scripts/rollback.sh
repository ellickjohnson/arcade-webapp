#!/bin/bash

# Rollback Script for Docker Containers on Portainer
# Usage: ./rollback.sh <project-name> <previous-tag>

set -e

# Configuration
PORTAINER_URL="https://portainer.ellickjohnson.net"
PORTAINER_API_KEY="ptr_+gaiq9JLZ/IfUYLG4yCe96nFjvaOSnMHcH+GZOzxBS8="
ENDPOINT_ID="3"
GITHUB_USER="ellickjohnson"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <project-name> <previous-tag>"
    log_error "Example: $0 my-app v1.2.3"
    exit 1
fi

PROJECT_NAME="$1"
PREVIOUS_TAG="$2"
IMAGE_NAME="ghcr.io/${GITHUB_USER}/${PROJECT_NAME}:${PREVIOUS_TAG}"
STACK_NAME="${PROJECT_NAME}-stack"

log_info "Starting rollback for ${PROJECT_NAME} to ${PREVIOUS_TAG}"
log_warn "This will replace the current deployment with previous version"

# Confirm rollback
read -p "Are you sure you want to proceed? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    log_info "Rollback cancelled by user"
    exit 0
fi

# Get stack ID
log_info "Finding stack ${STACK_NAME}..."
STACKS=$(curl -s -X GET "${PORTAINER_URL}/api/stacks" \
    -H "Authorization: Bearer ${PORTAINER_API_KEY}")

STACK_ID=$(echo "$STACKS" | jq -r ".[] | select(.Name == \"${STACK_NAME}\") | .Id")

if [ -z "$STACK_ID" ]; then
    log_error "Stack ${STACK_NAME} not found"
    exit 1
fi

log_info "Stack found with ID: ${STACK_ID}"

# Get current stack configuration
log_info "Fetching current stack configuration..."
STACK_CONFIG=$(curl -s -X GET "${PORTAINER_URL}/api/stacks/${STACK_ID}" \
    -H "Authorization: Bearer ${PORTAINER_API_KEY}")

# Get stack file (docker-compose.yml)
log_info "Fetching stack file..."
COMPOSE_FILE=$(echo "$STACK_CONFIG" | jq -r '.StackFileContent')

# Pull the previous image
log_info "Pulling previous image: ${IMAGE_NAME}"
docker pull "${IMAGE_NAME}"

# Update docker-compose.yml with previous image tag
UPDATED_COMPOSE=$(echo "$COMPOSE_FILE" | sed "s|image: ghcr.io/${GITHUB_USER}/${PROJECT_NAME}:.*|image: ${IMAGE_NAME}|g")

# Get environment ID
ENV_ID=$(echo "$STACK_CONFIG" | jq -r '.EnvId')

# Update stack with new configuration
log_info "Updating stack with previous image..."
UPDATE_RESPONSE=$(curl -s -X PUT "${PORTAINER_URL}/api/stacks/${STACK_ID}" \
    -H "Authorization: Bearer ${PORTAINER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"StackFileContent\": $(echo "$UPDATED_COMPOSE" | jq -Rs .), \"EnvId": ${ENV_ID}, \"Prune\": true}")

# Check if update was successful
if [ $? -eq 0 ]; then
    log_info "Stack update initiated successfully"
    log_info "Waiting for stack to redeploy..."
    sleep 10
    
    # Check container status
    log_info "Checking container status..."
    CONTAINER_STATUS=$(docker ps --filter "name=${PROJECT_NAME}" --format "{{.Status}}")
    
    if [ -n "$CONTAINER_STATUS" ]; then
        log_info "Container is running: ${CONTAINER_STATUS}"
        
        # Check health status
        log_info "Checking health status..."
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $(docker ps -q --filter "name=${PROJECT_NAME}") 2>/dev/null || echo "no-health-check")
        
        if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "no-health-check" ]; then
            log_info "✅ Rollback completed successfully!"
            log_info "Application is now running on ${IMAGE_NAME}"
            
            # Show container logs
            log_info "Recent container logs:"
            docker logs --tail 20 $(docker ps -q --filter "name=${PROJECT_NAME}")
        else
            log_warn "Container health status: ${HEALTH_STATUS}"
            log_warn "Please check container logs for errors"
            docker logs --tail 50 $(docker ps -q --filter "name=${PROJECT_NAME}")
        fi
    else
        log_error "Container is not running! Check logs:"
        docker logs --tail 50 $(docker ps -a -q --filter "name=${PROJECT_NAME}")
        exit 1
    fi
else
    log_error "Failed to update stack"
    exit 1
fi

log_info "Rollback process completed"
log_info "Monitor the application for any issues"
