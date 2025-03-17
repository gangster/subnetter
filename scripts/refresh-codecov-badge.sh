#!/bin/bash

# Script to refresh the Codecov badge by making a request to the Codecov API
# This can be useful if the badge is stuck showing incorrect coverage data

# Set your Codecov repository token here or use the CODECOV_TOKEN environment variable
CODECOV_TOKEN=${CODECOV_TOKEN:-"your_codecov_token_here"}

# Repository owner and name
OWNER="gangster"
REPO="subnetter"
BRANCH="main"

echo "Refreshing Codecov badge for $OWNER/$REPO on branch $BRANCH..."

# Make a request to the Codecov API to refresh the badge
curl -s -X POST "https://codecov.io/api/gh/$OWNER/$REPO/branch/$BRANCH/refresh?token=$CODECOV_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json"

echo -e "\nBadge refresh request completed. It may take a few minutes for changes to appear."
echo "You can view your coverage report at: https://codecov.io/gh/$OWNER/$REPO" 