/**
 * This file documents the React import fix.
 * 
 * Problem: Using `import * as React from "react"` creates multiple React instances
 * in the Vite bundle, causing "Cannot read properties of null (reading 'useContext')"
 * 
 * Solution: Use direct imports instead:
 * - `import React from "react"`
 * - `import React, { useState, useEffect, forwardRef } from "react"`
 * 
 * All UI components and pages must use this standard import pattern.
 */

export const REACT_IMPORT_STANDARD = {
  pattern: 'import React, { ... } from "react"',
  avoid: 'import * as React from "react"',
  reason: 'Prevents multiple React instances in Vite bundle'
};
