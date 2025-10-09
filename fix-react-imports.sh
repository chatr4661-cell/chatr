#!/bin/bash

# Fix all React imports from "import * as React" to "import React"
# This resolves the "Cannot read properties of null (reading 'useContext')" error

echo "Fixing React imports..."

# Find all .tsx and .ts files and replace the import pattern
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak 's/import \* as React from "react";/import React from "react";/g' {} +
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak "s/import \* as React from 'react';/import React from 'react';/g" {} +

# Clean up backup files
find src -type f -name "*.bak" -delete

echo "✅ React imports fixed!"
echo "Note: You may need to manually add specific imports like { useState, useEffect } where needed"
