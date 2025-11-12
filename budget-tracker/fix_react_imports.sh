#!/bin/bash

# Add back React imports where hooks are used
sed -i "1s/^/import { useMemo } from 'react';\n/" src/components/Dashboard.tsx
sed -i "1s/^/import { useMemo } from 'react';\n/" src/components/CategoryBreakdown.tsx
sed -i "1s/^/import { useMemo } from 'react';\n/" src/components/MonthlyAnalysis.tsx
sed -i "1s/^/import { useMemo, useState } from 'react';\n/" src/components/RepeatedExpenses.tsx

echo "Fixed React imports"
