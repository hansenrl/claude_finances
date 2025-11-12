#!/bin/bash

# Fix qfx.ts - handle TRNAMT that might already be a number
sed -i 's/const amount = parseFloat(txn.TRNAMT);/const amount = typeof txn.TRNAMT === "number" ? txn.TRNAMT : parseFloat(txn.TRNAMT);/g' src/lib/parsers/qfx.ts
sed -i 's/message: `Invalid amount: \${txn.TRNAMT}`/message: `Invalid amount: ${String(txn.TRNAMT)}`/g' src/lib/parsers/qfx.ts

# Fix csv.ts error handler type
sed -i 's/error: (error) =>/error: (error: Error) =>/g' src/lib/parsers/csv.ts

echo "Applied final fixes"
