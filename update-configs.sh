#!/bin/bash

# Update all config files from cloudConfigs to clouds
find ./__tests__/e2e/fixtures ./examples -name "*.json" -type f -exec sed -i '' 's/"cloudConfigs":/"clouds":/g' {} \;

# Remove provider field from cloud configs
find ./__tests__/e2e/fixtures ./examples -name "*.json" -type f -exec sed -i '' 's/"provider": "[^"]*",//g' {} \;

# Make the script executable
chmod +x update-configs.sh

echo "Updated all configuration files to match the new schema" 