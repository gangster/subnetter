#!/bin/bash

# Create merged directory if it doesn't exist
mkdir -p ./coverage/merged

# Remove existing merged lcov file if it exists
rm -f ./coverage/merged/lcov.info

# Start with an empty merged lcov file
touch ./coverage/merged/lcov.info

# Append core package coverage
if [ -f ./packages/core/coverage/lcov.info ]; then
  cat ./packages/core/coverage/lcov.info >> ./coverage/merged/lcov.info
  echo "Added core package coverage"
fi

# Append CLI package coverage
if [ -f ./packages/cli/coverage/lcov.info ]; then
  cat ./packages/cli/coverage/lcov.info >> ./coverage/merged/lcov.info
  echo "Added CLI package coverage"
fi

# Append E2E coverage if it exists and has content
if [ -f ./coverage/e2e/lcov.info ] && [ -s ./coverage/e2e/lcov.info ]; then
  # Check if the file has valid coverage data (not all zeros)
  if grep -q "FNH:[1-9]" ./coverage/e2e/lcov.info || grep -q "LH:[1-9]" ./coverage/e2e/lcov.info; then
    cat ./coverage/e2e/lcov.info >> ./coverage/merged/lcov.info
    echo "Added E2E coverage"
  else
    echo "Skipping E2E coverage as it appears to have no hits"
  fi
fi

echo "Coverage reports merged successfully into ./coverage/merged/lcov.info" 