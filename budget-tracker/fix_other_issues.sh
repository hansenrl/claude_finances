#!/bin/bash

# Remove unused React imports
sed -i '/^import React from/d' src/App.tsx
sed -i '/^import React, /d' src/components/Dashboard.tsx
sed -i '/^import React, /d' src/components/CategoryBreakdown.tsx
sed -i '/^import React, /d' src/components/MonthlyAnalysis.tsx
sed -i '/^import React, /d' src/components/RepeatedExpenses.tsx

# Fix unused parameters (prefix with _)
sed -i 's/filename?: string/\_filename?: string/g' src/lib/parsers/qfx.ts
sed -i 's/filename?: string/\_filename?: string/g' src/lib/parsers/csv.ts

# Fix unused variables in storage manager
sed -i 's/dateReplacer(key: string,/dateReplacer(\_key: string,/g' src/lib/storage/manager.ts
sed -i 's/dateReviver(key: string,/dateReviver(\_key: string,/g' src/lib/storage/manager.ts

echo "Fixed other issues"
