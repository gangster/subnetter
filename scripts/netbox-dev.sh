#!/bin/bash
# NetBox Development Environment Helper
# Usage: ./scripts/netbox-dev.sh [start|stop|status|logs|reset|token]

set -e

NETBOX_DIR="$(dirname "$0")/../netbox"
NETBOX_URL="http://localhost:8000"
NETBOX_TOKEN="0123456789abcdef0123456789abcdef01234567"

cd "$NETBOX_DIR"

case "${1:-status}" in
  start)
    echo "Starting NetBox..."
    docker compose up -d
    echo "Waiting for NetBox to be healthy..."
    sleep 10
    echo "NetBox is available at: $NETBOX_URL"
    echo "Login: admin / admin"
    echo "API Token: $NETBOX_TOKEN"
    ;;
  
  stop)
    echo "Stopping NetBox..."
    docker compose down
    ;;
  
  status)
    docker compose ps
    echo ""
    echo "NetBox URL: $NETBOX_URL"
    echo "API Token: $NETBOX_TOKEN"
    ;;
  
  logs)
    docker compose logs -f netbox
    ;;
  
  reset)
    echo "Resetting NetBox (this will delete all data)..."
    docker compose down -v
    docker compose up -d
    sleep 15
    
    # Create superuser
    docker compose exec netbox /opt/netbox/netbox/manage.py createsuperuser \
      --username admin --email admin@example.com --noinput 2>/dev/null || true
    
    # Set password
    docker compose exec netbox /opt/netbox/netbox/manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
admin = User.objects.get(username='admin')
admin.set_password('admin')
admin.save()
"
    
    # Create API token
    docker compose exec netbox /opt/netbox/netbox/manage.py shell -c "
from django.contrib.auth import get_user_model
from users.models import Token
User = get_user_model()
admin = User.objects.get(username='admin')
Token.objects.filter(user=admin).delete()
Token.objects.create(user=admin, key='$NETBOX_TOKEN', write_enabled=True)
"
    
    echo "NetBox reset complete!"
    echo "URL: $NETBOX_URL"
    echo "Login: admin / admin"
    echo "API Token: $NETBOX_TOKEN"
    ;;
  
  token)
    echo "export NETBOX_URL=$NETBOX_URL"
    echo "export NETBOX_TOKEN=$NETBOX_TOKEN"
    ;;
  
  test-api)
    echo "Testing NetBox API..."
    curl -s -H "Authorization: Token $NETBOX_TOKEN" "$NETBOX_URL/api/ipam/prefixes/" | jq '.count'
    ;;
  
  *)
    echo "Usage: $0 [start|stop|status|logs|reset|token|test-api]"
    echo ""
    echo "Commands:"
    echo "  start    - Start NetBox containers"
    echo "  stop     - Stop NetBox containers"
    echo "  status   - Show container status"
    echo "  logs     - Follow NetBox logs"
    echo "  reset    - Reset NetBox to clean state (deletes all data)"
    echo "  token    - Print environment variables for API access"
    echo "  test-api - Test API connectivity"
    exit 1
    ;;
esac

