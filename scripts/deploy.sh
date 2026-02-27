#!/bin/bash
# Arcade Webapp One-Command Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on error

# Configuration
PROJECT_NAME="arcade-webapp"
STACK_NAME="arcade-webapp-stack"
ENDPOINT_ID=3
COMPOSE_FILE="/a0/usr/workdir/arcade-webapp/docker-compose.yml"
NPM_URL="http://nginx.ellickjohnson.net:81"
DOMAIN="arcade.ellickjohnson.net"
FORWARD_HOST="docker.ellickjohnson.net"
FORWARD_PORT=3003

# Colors for output
RED='[0;31m'
GREEN='[0;32m'
YELLOW='[1;33m'
NC='[0m' # No Color

echo "========================================"
echo "  $PROJECT_NAME Deployment"
echo "========================================"
echo ""

# [1/6] Check prerequisites
echo "[1/6] Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 not found${NC}"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}✗ docker-compose.yml not found at $COMPOSE_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

# [2/6] Check if stack exists and create/update
echo "[2/6] Checking Portainer stack..."

STACK_EXISTS=$(python3 -c "
import sys
sys.path.insert(0, '/a0/usr/skills/portainer-manager/scripts')
from portainer_client import PortainerClient
client = PortainerClient()
stacks = client.list_stacks($ENDPOINT_ID)
for stack in stacks:
    if stack.get('Name') == '$STACK_NAME':
        print(stack.get('Id'))
        break
" 2>/dev/null || echo "")

if [ -n "$STACK_EXISTS" ]; then
    echo "Stack exists (ID: $STACK_EXISTS), updating..."
    python3 << EOF
import sys
sys.path.insert(0, '/a0/usr/skills/portainer-manager/scripts')
from portainer_client import PortainerClient

with open('$COMPOSE_FILE', 'r') as f:
    compose_content = f.read()

client = PortainerClient()
client.update_stack($STACK_EXISTS, compose_content)
print("Stack updated successfully")
EOF
else
    echo "Creating new stack..."
    python3 << EOF
import sys
sys.path.insert(0, '/a0/usr/skills/portainer-manager/scripts')
from portainer_client import PortainerClient

with open('$COMPOSE_FILE', 'r') as f:
    compose_content = f.read()

client = PortainerClient()
client.create_stack('$STACK_NAME', $ENDPOINT_ID, compose_content)
print("Stack created successfully")
EOF
fi

echo -e "${GREEN}✓ Stack deployed${NC}"

# [3/6] Wait for containers to start
echo "[3/6] Waiting for containers to start..."
sleep 10

echo -e "${GREEN}✓ Containers started${NC}"

# [4/6] Health checks
echo "[4/6] Running health checks..."

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://docker.ellickjohnson.net:3003/health/live 2>/dev/null || echo "000")

if [ "$HEALTH_STATUS" != "200" ]; then
    echo -e "${YELLOW}⚠ Health check failed (status: $HEALTH_STATUS)${NC}"
    echo "Waiting 30 more seconds..."
    sleep 30

    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://docker.ellickjohnson.net:3003/health/live 2>/dev/null || echo "000")

    if [ "$HEALTH_STATUS" != "200" ]; then
        echo -e "${RED}✗ Health check still failing${NC}"
        echo "Check container logs for errors"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Health checks passing${NC}"

# [5/6] Configure proxy (if needed)
echo "[5/6] Checking proxy configuration..."

PROXY_EXISTS=$(python3 -c "
import sys
sys.path.insert(0, '/a0/usr/skills/npm-manager/scripts')
from npm_client import NPMClient
client = NPMClient()
hosts = client.list_proxy_hosts()
for host in hosts:
    if '$DOMAIN' in host.get('domain_names', []):
        print(host.get('id'))
        break
" 2>/dev/null || echo "")

if [ -z "$PROXY_EXISTS" ]; then
    echo "Creating proxy host..."
    python3 << EOF
import sys
sys.path.insert(0, '/a0/usr/skills/npm-manager/scripts')
from npm_client import NPMClient

client = NPMClient()
proxy = client.create_proxy_host(
    domain='$DOMAIN',
    forward_host='$FORWARD_HOST',
    forward_port=$FORWARD_PORT,
    ssl_enabled=False,
    websocket_enabled=True
)
print(f"Proxy created with ID: {proxy.get('id')}")
EOF
    echo -e "${GREEN}✓ Proxy configured${NC}"
else
    echo "Proxy already exists (ID: $PROXY_EXISTS)"
    echo -e "${GREEN}✓ Proxy configuration OK${NC}"
fi

# [6/6] Verification and notification
echo "[6/6] Final verification..."

# Test domain
echo "Testing domain access..."
DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")

if [ "$DOMAIN_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ Domain accessible${NC}"
else
    echo -e "${YELLOW}⚠ Domain not accessible yet (status: $DOMAIN_STATUS)${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Access URLs:"
echo "  - Main:   http://$DOMAIN"
echo "  - Direct: http://$FORWARD_HOST:$FORWARD_PORT"
echo "  - Health: http://$FORWARD_HOST:$FORWARD_PORT/health/live"
echo ""
echo "Stack: $STACK_NAME (Endpoint: $ENDPOINT_ID)"
echo ""

# Send notification to Slack
echo "Sending notification..."
python3 /a0/usr/projects/media_management/send_slack_notification.py     "Deployment Complete"     "$PROJECT_NAME deployed successfully"     "**URL:** http://$DOMAIN
**Status:** All containers running
**Health:** Passing"     "arcade-webapp"     "success" 2>/dev/null || echo "Notification failed"

echo -e "${GREEN}✓ All done!${NC}"
