# Financial Data File Format Documentation

This document describes the formats of financial transaction data files that the application needs to parse. The application should support both QFX (OFX) and CSV formats.

## File Types

### 1. QFX/OFX Format (Quicken Financial Exchange / Open Financial Exchange)

QFX files are used by financial institutions like Chase and other banks/credit card companies to export transaction data. These are text-based files with an SGML/XML-like structure.

#### File Extension
- `.QFX` or `.qfx`

#### Structure

**Header Section** (Plain text key:value pairs):
```
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE
```

**Body Section** (XML-like SGML structure):

The body contains hierarchical tags. Note that:
- Opening tags use `<TAG>` format
- Closing tags also use `</TAG>` format
- Some implementations may have whitespace/indentation, others may not
- Tags are NOT case-sensitive but typically uppercase

#### Key Structure Elements

```xml
<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS>
        <CODE>0
        <SEVERITY>INFO
      </STATUS>
      <DTSERVER>YYYYMMDDHHMMSS[OFFSET:GMT] or YYYYMMDDHHMMSS.mmm
      <LANGUAGE>ENG
      <FI>
        <ORG>Organization name
        <FID>Financial institution ID
      </FI>
    </SONRS>
  </SIGNONMSGSRSV1>

  <CREDITCARDMSGSRSV1>
    <CCSTMTTRNRS>
      <TRNUID>Transaction unique ID
      <STATUS>
        <CODE>0
        <SEVERITY>INFO
        <MESSAGE>Optional status message
      </STATUS>
      <CCSTMTRS>
        <CURDEF>USD (or other currency)
        <CCACCTFROM>
          <ACCTID>Account number (may be masked like XXXXXX8466)
        </CCACCTFROM>

        <BANKTRANLIST>
          <DTSTART>Start date YYYYMMDDHHMMSS
          <DTEND>End date YYYYMMDDHHMMSS

          <!-- Individual transactions -->
          <STMTTRN>
            <TRNTYPE>DEBIT or CREDIT
            <DTPOSTED>Date posted YYYYMMDDHHMMSS
            <TRNAMT>Amount (negative for debits, positive for credits)
            <FITID>Unique transaction ID
            <NAME>Merchant/transaction name
            <MEMO>Optional memo field with additional details
          </STMTTRN>

          <!-- More STMTTRN entries... -->
        </BANKTRANLIST>

        <LEDGERBAL>
          <BALAMT>Current balance
          <DTASOF>Date of balance
        </LEDGERBAL>

        <AVAILBAL>
          <BALAMT>Available balance
          <DTASOF>Date of balance
        </AVAILBAL>
      </CCSTMTRS>
    </CCSTMTTRNRS>
  </CREDITCARDMSGSRSV1>
</OFX>
```

#### Important Notes for QFX/OFX Parsing

1. **Date Formats**: Two common formats
   - `YYYYMMDDHHMMSS[OFFSET:GMT]` - e.g., `20251109120000[0:GMT]`
   - `YYYYMMDDHHMMSS.mmm` - e.g., `20251109165449.617`

2. **Whitespace**: Files may or may not have indentation. Parser should handle both:
   - Formatted (with spaces/tabs for indentation)
   - Unformatted (no extra whitespace)

3. **Transaction Amounts**:
   - Negative values indicate debits (money out)
   - Positive values indicate credits (money in/refunds/payments)
   - Format: decimal number with 2 decimal places typically (e.g., `-35.00`, `44.60`)

4. **Transaction Types**:
   - `DEBIT` - Purchases, fees, charges
   - `CREDIT` - Payments, refunds, credits

5. **MEMO Field**: Optional field that may contain:
   - Merchant category codes (MCC)
   - Additional transaction identifiers
   - Processing codes
   - Format varies by institution

6. **Account Information**:
   - Account numbers may be partially masked (e.g., `417903XXXXXX8466`)
   - Different institutions use different formats

7. **Special Characters**: Some merchant names may contain HTML entities:
   - `&amp;` for `&`
   - Other entities may appear depending on source

8. **File Organization**:
   - Header is plain text (lines 1-10 approximately)
   - Body starts with `<OFX>` tag
   - Everything before `<OFX>` should be treated as header metadata

#### TypeScript Parsing Strategy for QFX

```typescript
interface Transaction {
  type: 'DEBIT' | 'CREDIT';
  date: Date;
  amount: number;
  id: string;
  description: string;
  memo?: string;
}

interface AccountStatement {
  accountId: string;
  currency: string;
  transactions: Transaction[];
  ledgerBalance?: number;
  availableBalance?: number;
  statementStart?: Date;
  statementEnd?: Date;
}
```

**Recommended parsing approach**:
1. Split file into header and body at the `<OFX>` tag
2. Use an XML/SGML parser for the body (libraries like `fast-xml-parser` or `node-ofx-parser`)
3. Navigate the nested structure to find `BANKTRANLIST`
4. Extract each `STMTTRN` element and map to Transaction interface
5. Parse dates carefully (multiple formats exist)
6. Convert amounts to numbers (handle negative signs)
7. Decode HTML entities in merchant names if present

### 2. CSV Format (Discover and other card companies)

CSV files are comma-separated value files commonly exported by credit card companies.

#### File Extension
- `.csv`

#### Structure

**Header Row**:
```
Trans. Date,Post Date,Description,Amount,Category
```

**Data Rows**:
```
01/11/2025,01/11/2025,"SQ *THEE UPPER CRUST P SACRAMENTO CA0001152921515006800956",19.01,"Restaurants"
```

#### Field Descriptions

1. **Trans. Date** - Transaction date in `MM/DD/YYYY` format
2. **Post Date** - Posted date in `MM/DD/YYYY` format
3. **Description** - Merchant name and location (may contain commas, so typically quoted)
4. **Amount** - Transaction amount
   - Positive values = charges/debits
   - Negative values = payments/credits
   - Format: decimal number (e.g., `19.01`, `-204.54`)
5. **Category** - Transaction category (e.g., "Restaurants", "Services", "Payments and Credits")

#### Important Notes for CSV Parsing

1. **Quoted Fields**: Description field is typically quoted because it may contain commas
   ```
   "SQ *THEE UPPER CRUST P SACRAMENTO CA0001152921515006800956"
   ```

2. **Date Format**: `MM/DD/YYYY` (different from QFX format)

3. **Amount Sign Convention**:
   - OPPOSITE of QFX format!
   - Positive = money spent (debit)
   - Negative = money received/payments (credit)

4. **Categories**: Pre-categorized by the card issuer
   - Common categories: "Restaurants", "Services", "Merchandise", "Payments and Credits"
   - Can be used for automatic categorization

5. **Multi-line Descriptions**: Some descriptions may span multiple lines if they contain newline characters
   - Parser should handle RFC 4180 CSV standard (quoted fields can contain newlines)

#### TypeScript Parsing Strategy for CSV

```typescript
interface CSVTransaction {
  transactionDate: Date;
  postDate: Date;
  description: string;
  amount: number;
  category: string;
}
```

**Recommended parsing approach**:
1. Use a CSV parsing library that supports RFC 4180 (e.g., `csv-parse`, `papaparse`)
2. Configure parser to handle quoted fields with commas
3. Parse dates using `MM/DD/YYYY` format
4. Convert amounts to numbers
5. Note that positive amounts are debits (opposite of QFX convention)
6. Normalize to common transaction format by negating amounts if needed

## Unified Transaction Model

To handle both formats, create a unified transaction model:

```typescript
interface UnifiedTransaction {
  date: Date;              // Transaction or post date
  description: string;     // Merchant name
  amount: number;          // Normalized: negative = debit, positive = credit
  type: 'DEBIT' | 'CREDIT';
  category?: string;       // From CSV or derived
  transactionId?: string;  // From QFX FITID
  memo?: string;          // From QFX MEMO
  source: 'QFX' | 'CSV';  // Track source format
  accountId?: string;      // Account identifier
}
```

## File Detection Strategy

To detect which parser to use:

```typescript
function detectFileFormat(filename: string, content: string): 'QFX' | 'CSV' | 'UNKNOWN' {
  // Check extension
  if (filename.toLowerCase().endsWith('.qfx')) {
    return 'QFX';
  }
  if (filename.toLowerCase().endsWith('.csv')) {
    return 'CSV';
  }

  // Check content
  if (content.startsWith('OFXHEADER:')) {
    return 'QFX';
  }
  if (content.includes('Trans. Date,Post Date,Description,Amount,Category')) {
    return 'CSV';
  }

  return 'UNKNOWN';
}
```

## Recommended Libraries

### For QFX/OFX Parsing

#### Primary Recommendation: ofx-data-extractor

**Best option for TypeScript projects** - Actively maintained (last updated May 2025)

**Installation:**
```bash
npm install ofx-data-extractor
```

**Features:**
- Written in TypeScript with full type definitions
- Works in both Node.js and browser environments
- Convenient methods for bank and credit card transactions
- Configuration options for date formatting and data types
- Simple, intuitive API

**Basic Usage:**
```typescript
import { Ofx } from 'ofx-data-extractor';
import fs from 'fs';

// Read OFX file
const ofxContent = fs.readFileSync('statement.qfx', 'utf-8');

// Parse OFX
const ofx = new Ofx(ofxContent);

// Get transaction type (BANK or CREDIT_CARD)
const type = ofx.getType();

// Get transactions based on type
const transactions = type === 'CREDIT_CARD'
  ? ofx.getCreditCardTransferList()
  : ofx.getBankTransferList();

// Get summary information
const summary = ofx.getTransactionsSummary();

// Get headers/metadata
const headers = ofx.getHeaders();

// Convert entire document to JSON
const fullJson = ofx.toJson();
```

**Advanced Configuration:**
```typescript
import { Ofx } from 'ofx-data-extractor';

const ofx = new Ofx(ofxContent);

// Configure custom date formatting
ofx.config({
  formatDate: (dateString: string) => {
    // Custom date parsing logic
    return new Date(dateString);
  },
  nativeTypes: true, // Return numeric fields as numbers
  fitId: 'separated' // or 'included' - controls transaction ID handling
});

const transactions = ofx.getCreditCardTransferList();
```

**Complete Implementation Example:**
```typescript
import { Ofx } from 'ofx-data-extractor';
import fs from 'fs/promises';

interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  transactionId: string;
  memo?: string;
}

async function parseQFXFile(filePath: string): Promise<ParsedTransaction[]> {
  try {
    // Read file
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse with ofx-data-extractor
    const ofx = new Ofx(content);

    // Configure for native types
    ofx.config({ nativeTypes: true });

    // Determine account type and get transactions
    const type = ofx.getType();
    const rawTransactions = type === 'CREDIT_CARD'
      ? ofx.getCreditCardTransferList()
      : ofx.getBankTransferList();

    // Map to unified format
    const transactions: ParsedTransaction[] = rawTransactions.map((txn: any) => ({
      date: new Date(txn.DTPOSTED),
      description: txn.NAME,
      amount: parseFloat(txn.TRNAMT),
      type: txn.TRNTYPE as 'DEBIT' | 'CREDIT',
      transactionId: txn.FITID,
      memo: txn.MEMO
    }));

    return transactions;
  } catch (error) {
    console.error('Error parsing QFX file:', error);
    throw error;
  }
}

// Usage
const transactions = await parseQFXFile('./Chase3404_Activity.QFX');
console.log(`Parsed ${transactions.length} transactions`);
```

#### Alternative: ofx-js

**Good for projects that need browser compatibility**

**Installation:**
```bash
npm install ofx-js
```

**Usage:**
```typescript
import { parse as parseOFX } from 'ofx-js';

const ofxString = fs.readFileSync('statement.qfx', 'utf-8');

parseOFX(ofxString).then(ofxData => {
  // For credit card statements
  const statementResponse = ofxData.OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS;
  const accountId = statementResponse.CCACCTFROM.ACCTID;
  const currencyCode = statementResponse.CURDEF;
  const transactions = statementResponse.BANKTRANLIST.STMTTRN;

  // Process transactions
  transactions.forEach(txn => {
    console.log({
      date: txn.DTPOSTED,
      name: txn.NAME,
      amount: txn.TRNAMT,
      type: txn.TRNTYPE
    });
  });
});
```

**Note:** ofx-js returns the raw OFX structure, requiring more manual navigation compared to ofx-data-extractor.

### For CSV Parsing

#### Recommended: csv-parse

**Industrial-strength CSV parser** (part of node-csv project)

**Installation:**
```bash
npm install csv-parse
```

**Usage:**
```typescript
import { parse } from 'csv-parse';
import fs from 'fs';

interface DiscoverTransaction {
  transDate: Date;
  postDate: Date;
  description: string;
  amount: number;
  category: string;
}

async function parseDiscoverCSV(filePath: string): Promise<DiscoverTransaction[]> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  return new Promise((resolve, reject) => {
    parse(fileContent, {
      columns: true, // Use first row as headers
      skip_empty_lines: true,
      trim: true
    }, (err, records) => {
      if (err) {
        reject(err);
        return;
      }

      const transactions: DiscoverTransaction[] = records.map((record: any) => ({
        transDate: new Date(record['Trans. Date']),
        postDate: new Date(record['Post Date']),
        description: record['Description'],
        amount: parseFloat(record['Amount']),
        category: record['Category']
      }));

      resolve(transactions);
    });
  });
}

// Usage
const csvTransactions = await parseDiscoverCSV('./Discover-2025-YearToDateSummary.csv');
```

#### Alternative: papaparse

**Great for browser-based applications**

**Installation:**
```bash
npm install papaparse
npm install --save-dev @types/papaparse
```

**Usage:**
```typescript
import Papa from 'papaparse';

const result = Papa.parse(csvContent, {
  header: true,
  dynamicTyping: true, // Automatically convert numbers
  skipEmptyLines: true
});

const transactions = result.data.map((row: any) => ({
  transDate: new Date(row['Trans. Date']),
  postDate: new Date(row['Post Date']),
  description: row['Description'],
  amount: row['Amount'],
  category: row['Category']
}));
```

## Complete Unified Parser Example

Here's a complete implementation that handles both QFX and CSV formats with a unified interface:

```typescript
import { Ofx } from 'ofx-data-extractor';
import { parse } from 'csv-parse';
import fs from 'fs/promises';

// Unified transaction interface
interface UnifiedTransaction {
  date: Date;
  description: string;
  amount: number; // Normalized: negative = debit, positive = credit
  type: 'DEBIT' | 'CREDIT';
  category?: string;
  transactionId?: string;
  memo?: string;
  source: 'QFX' | 'CSV';
  accountId?: string;
}

// File format detection
function detectFileFormat(filename: string, content: string): 'QFX' | 'CSV' | 'UNKNOWN' {
  if (filename.toLowerCase().endsWith('.qfx') || content.startsWith('OFXHEADER:')) {
    return 'QFX';
  }
  if (filename.toLowerCase().endsWith('.csv') ||
      content.includes('Trans. Date,Post Date,Description,Amount,Category')) {
    return 'CSV';
  }
  return 'UNKNOWN';
}

// Parse QFX files
async function parseQFX(content: string, accountId?: string): Promise<UnifiedTransaction[]> {
  const ofx = new Ofx(content);
  ofx.config({ nativeTypes: true });

  const type = ofx.getType();
  const rawTransactions = type === 'CREDIT_CARD'
    ? ofx.getCreditCardTransferList()
    : ofx.getBankTransferList();

  return rawTransactions.map((txn: any) => ({
    date: new Date(txn.DTPOSTED),
    description: txn.NAME,
    amount: parseFloat(txn.TRNAMT),
    type: txn.TRNTYPE as 'DEBIT' | 'CREDIT',
    transactionId: txn.FITID,
    memo: txn.MEMO,
    source: 'QFX' as const,
    accountId
  }));
}

// Parse CSV files (Discover format)
async function parseCSV(content: string, accountId?: string): Promise<UnifiedTransaction[]> {
  return new Promise((resolve, reject) => {
    parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, records) => {
      if (err) {
        reject(err);
        return;
      }

      const transactions: UnifiedTransaction[] = records.map((record: any) => {
        const amount = parseFloat(record['Amount']);
        // CSV uses opposite convention: positive = debit, negative = credit
        // Normalize to: negative = debit, positive = credit
        const normalizedAmount = -amount;

        return {
          date: new Date(record['Trans. Date']),
          description: record['Description'],
          amount: normalizedAmount,
          type: normalizedAmount < 0 ? 'DEBIT' : 'CREDIT',
          category: record['Category'],
          source: 'CSV' as const,
          accountId
        };
      });

      resolve(transactions);
    });
  });
}

// Main parser function
export async function parseFinancialFile(
  filePath: string,
  accountId?: string
): Promise<UnifiedTransaction[]> {
  try {
    // Read file
    const content = await fs.readFile(filePath, 'utf-8');
    const filename = filePath.split('/').pop() || '';

    // Detect format
    const format = detectFileFormat(filename, content);

    // Parse based on format
    switch (format) {
      case 'QFX':
        return await parseQFX(content, accountId);
      case 'CSV':
        return await parseCSV(content, accountId);
      default:
        throw new Error(`Unknown file format: ${filename}`);
    }
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    throw error;
  }
}

// Example usage
async function main() {
  // Parse multiple files
  const files = [
    './example_data/Chase3404_Activity20250101_20251109_20251109.QFX',
    './example_data/Chase6191_Activity20250101_20251109_20251109.QFX',
    './example_data/Credit Card - 8466_01-01-2025_11-13-2025.qfx',
    './example_data/Discover-2025-YearToDateSummary.csv'
  ];

  const allTransactions: UnifiedTransaction[] = [];

  for (const file of files) {
    const transactions = await parseFinancialFile(file);
    allTransactions.push(...transactions);
    console.log(`Parsed ${transactions.length} transactions from ${file}`);
  }

  // Sort by date
  allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate totals
  const totalDebits = allTransactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalCredits = allTransactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  console.log(`Total transactions: ${allTransactions.length}`);
  console.log(`Total debits: $${totalDebits.toFixed(2)}`);
  console.log(`Total credits: $${totalCredits.toFixed(2)}`);
  console.log(`Net: $${(totalCredits - totalDebits).toFixed(2)}`);
}
```

## Error Handling Considerations

1. **Malformed Files**: Handle cases where:
   - XML/SGML tags are not properly closed
   - CSV has inconsistent number of columns
   - Dates are in unexpected formats
   - Required fields are missing

2. **Encoding Issues**: Files may use different character encodings
   - OFX header specifies `CHARSET:1252` (Windows-1252)
   - Ensure proper encoding conversion in TypeScript

3. **Large Files**: Credit card statements can contain hundreds of transactions
   - Consider streaming parsers for large files
   - Implement pagination if displaying in UI

4. **Duplicate Detection**: Use transaction IDs (FITID in QFX) to detect duplicates when importing multiple files

5. **Amount Normalization**: Be careful with amount sign conventions:
   - QFX: negative = debit, positive = credit
   - CSV: positive = debit, negative = credit
   - Always normalize to a consistent convention in your unified model

## Example File Patterns

The application will encounter files named like:
- `Chase3404_Activity20250101_20251109_20251109.QFX`
- `Chase6191_Activity20250101_20251109_20251109.QFX`
- `Credit Card - 8466_01-01-2025_11-13-2025.qfx`
- `Discover-2025-YearToDateSummary.csv`

Pattern observations:
- QFX files may include account identifier, date ranges in filename
- CSV files may include year and description in filename
- Date formats in filenames vary by institution
- Extensions may be uppercase or lowercase
