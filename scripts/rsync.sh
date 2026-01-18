#!/bin/bash

# Load .env file and expand variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Check if RSYNC_PATH is set
if [ -z "$RSYNC_PATH" ]; then
  echo "Error: RSYNC_PATH is not set in .env"
  exit 1
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "Error: dist directory not found. Run 'pnpm build' first."
  exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$RSYNC_PATH"

echo "Deploying to $RSYNC_PATH..."

# rsync with options:
# -a: archive mode (preserve permissions, timestamps, etc.)
# -z: compress during transfer
# --delete: delete files in destination that don't exist in source
rsync -az --delete dist/ "$RSYNC_PATH"

if [ $? -eq 0 ]; then
  echo "Deployment successful!"
else
  echo "Deployment failed!"
  exit 1
fi
