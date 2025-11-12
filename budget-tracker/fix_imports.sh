#!/bin/bash

# Fix type imports in all TypeScript files
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  # Add type keyword before type imports
  sed -i 's/^import { \(Transaction\|ParseError\|Category\|CategorizationRule\|Preferences\|MonthlySummary\|RepeatedExpense\|DerivedAnalytics\|AppState\|AppContextValue\|ParseResult\)/import type { \1/g' "$file"
done

echo "Fixed type imports"
