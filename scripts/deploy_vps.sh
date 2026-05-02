#!/usr/bin/env bash
set -euo pipefail

# Deploy EduCore API to a Linux VPS over SSH.
# Required env:
#   VPS_HOST, VPS_USER
# Optional env:
#   VPS_PORT=22
#   REMOTE_DIR=/opt/educore/api
#   SERVICE_NAME=educore-api
#   GOARCH=amd64

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
DIST_DIR="$ROOT_DIR/dist/vps"

: "${VPS_HOST:?VPS_HOST is required}"
: "${VPS_USER:?VPS_USER is required}"
VPS_PORT="${VPS_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/opt/educore/api}"
SERVICE_NAME="${SERVICE_NAME:-educore-api}"
GOARCH="${GOARCH:-amd64}"

mkdir -p "$DIST_DIR"

echo "Building EduCore API for linux/$GOARCH..."
(
  cd "$BACKEND_DIR"
  GOOS=linux GOARCH="$GOARCH" CGO_ENABLED=0 go build -o "$DIST_DIR/educore-api" ./cmd/server
)

echo "Uploading binary to $VPS_USER@$VPS_HOST:$REMOTE_DIR..."
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "sudo mkdir -p '$REMOTE_DIR' && sudo chown '$VPS_USER':'$VPS_USER' '$REMOTE_DIR'"
scp -P "$VPS_PORT" "$DIST_DIR/educore-api" "$VPS_USER@$VPS_HOST:$REMOTE_DIR/educore-api.new"

echo "Activating binary and restarting $SERVICE_NAME..."
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "
  set -euo pipefail
  chmod 0755 '$REMOTE_DIR/educore-api.new'
  mv '$REMOTE_DIR/educore-api.new' '$REMOTE_DIR/educore-api'
  sudo systemctl restart '$SERVICE_NAME'
  sudo systemctl --no-pager --lines=50 status '$SERVICE_NAME'
"

echo "Deploy completed."
