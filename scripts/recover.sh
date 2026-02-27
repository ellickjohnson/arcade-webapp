#!/bin/bash
# Arcade Webapp Recovery Script
# Automatically detects and recovers missing containers

set -e

PROJECT_NAME="arcade-webapp"
COMPOSE_FILE="/a0/usr/workdir/arcade-webapp/docker-compose.yml"

RED='[0;31m'
GREEN='[0;32m'
YELLOW='[1;33m'
NC='[0m'

echo "========================================"
echo "  $PROJECT_NAME Recovery"
echo "========================================"
echo ""

# Expected containers
EXPECTED_CONTAINERS=("arcade-webapp" "arcade-webapp-db" "arcade-webapp-redis")
MISSING_CONTAINERS=()

# Check each container
for container in "${EXPECTED_CONTAINERS[@]}"; do
    RUNNING=$(python3 -c "
import sys
sys.path.insert(0, '/a0/usr/skills/portainer-manager/scripts')
from portainer_client import PortainerClient
client = PortainerClient()
containers = client.list_containers(3)
for c in containers:
    if c.get('Names', [''])[0].lstrip('/') == '$container' and c.get('State') == 'running':
        print('yes')
        break
" 2>/dev/null || echo "no")

    if [ "$RUNNING" == "yes" ]; then
        echo -e "${GREEN}✓${NC} $container is running"
    else
        echo -e "${RED}✗${NC} $container is missing or stopped"
        MISSING_CONTAINERS+=("$container")
    fi
done

echo ""

# If all containers are present
if [ ${#MISSING_CONTAINERS[@]} -eq 0 ]; then
    echo -e "${GREEN}All containers are running. No recovery needed.${NC}"

    # Verify health
    echo ""
    echo "Verifying health endpoint..."
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://docker.ellickjohnson.net:3003/health/live 2>/dev/null || echo "000")
    if [ "$HEALTH_STATUS" == "200" ]; then
        echo -e "${GREEN}✓ Health check passing${NC}"
    else
        echo -e "${YELLOW}⚠ Health check failing (status: $HEALTH_STATUS)${NC}"
    fi

    exit 0
fi

# Missing containers found
echo -e "${YELLOW}Found ${#MISSING_CONTAINERS[@]} missing container(s). Starting recovery...${NC}"
echo ""

# Check if stack exists
echo "Checking Portainer stack..."

STACK_EXISTS=$(python3 -c "
import sys
sys.path.insert(0, '/a0/usr/skills/portainer-manager/scripts')
from portainer_client import PortainerClient
client = PortainerClient()
stacks = client.list_stacks(3)
for stack in stacks:
    if stack.get('Name') == 'arcade-webapp-stack':
        print(stack.get('Id'))
        break
" 2>/dev/null || echo "")

if [ -n "$STACK_EXISTS" ]; then
    echo "Stack exists, redeploying..."
    python3 << EOF
import sys
sys.path.insert(0, '/a0/usr/skills/portainer-manager/scripts')
from portainer_client import PortainerClient

with open('$COMPOSE_FILE', 'r') as f:
    compose_content = f.read()

client = PortainerClient()
client.update_stack($STACK_EXISTS, compose_content)
print("Stack redeployed successfully")
EOF
else
    echo "Stack does not exist, creating..."
    python3 << EOF
import sys
sys.path.insert(0, '/a0/usr/skills/portainer-manager/scripts')
from portainer_client import PortainerClient

with open('$COMPOSE_FILE', 'r') as f:
    compose_content = f.read()

client = PortainerClient()
client.create_stack('arcade-webapp-stack', 3, compose_content)
print("Stack created successfully")
EOF
fi

echo -e "${GREEN}✓ Stack deployed${NC}"

# Wait for containers
echo "Waiting for containers to start..."
sleep 15

# Verify all containers are now running
echo ""
echo "Verifying containers after recovery..."

ALL_RUNNING=true
for container in "${EXPECTED_CONTAINERS[@]}"; do
    RUNNING=$(python3 -c "
import sys
sys.path.insert(0, '/a0/usr/skills/portainer-manager/scripts')
from portainer_client import PortainerClient
client = PortainerClient()
containers = client.list_containers(3)
for c in containers:
    if c.get('Names', [''])[0].lstrip('/') == '$container' and c.get('State') == 'running':
        print('yes')
        break
" 2>/dev/null || echo "no")

    if [ "$RUNNING" == "yes" ]; then
        echo -e "${GREEN}✓${NC} $container is running"
    else
        echo -e "${RED}✗${NC} $container is still missing"
        ALL_RUNNING=false
    fi
done

echo ""

if [ "$ALL_RUNNING" = true ]; then
    echo -e "${GREEN}Recovery successful! All containers are now running.${NC}"

    # Send notification
    python3 /a0/usr/projects/media_management/send_slack_notification.py         "Recovery Complete"         "$PROJECT_NAME recovered automatically"         "All containers are now running after recovery"         "arcade-webapp"         "success" 2>/dev/null || true
else
    echo -e "${RED}Recovery incomplete. Some containers are still missing.${NC}"

    # Send alert
    python3 /a0/usr/projects/media_management/send_slack_notification.py         "Recovery Failed"         "$PROJECT_NAME recovery incomplete"         "Some containers are still missing after recovery attempt"         "arcade-webapp"         "error" 2>/dev/null || true

    exit 1
fi
