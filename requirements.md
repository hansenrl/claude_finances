# Product Requirements Document: Financial Budget Tracker

## 1. Overview

### 1.1 Product Description
A single-page web application for personal financial budget tracking that runs entirely in the browser with no backend dependencies. The application operates completely offline and stores all data locally.

### 1.2 Core Value Proposition
- **100% Local**: No server required, all processing happens in the browser
- **Offline-First**: Fully functional without internet connection
- **Privacy-Focused**: All financial data stays on the user's device
- **Single File**: Entire application packaged as a single HTML file for maximum portability

### 1.3 Target User
Expert users comfortable with financial data, expecting full visibility of all features without hand-holding or wizard-style interfaces.

### 1.4 Deployment Format
Single HTML file containing:
- Embedded JavaScript/CSS
- All required libraries bundled inline
- No external dependencies or CDN links

## 2. Functional Requirements

### 2.1 File Upload and Parsing

#### 2.1.1 Supported File Formats
- **QFX/OFX files** (.qfx, .QFX) - Primary format from Chase and Fidelity
- **CSV files** (.csv) - Secondary format, specifically Discover card format

#### 2.1.2 File Upload Behavior
- **Multiple file uploads**: Users can upload multiple files in a single session
- **Drag-and-drop support**: Preferred interaction method for uploading files
- **File picker fallback**: Traditional file input as backup
- **Batch processing**: All uploaded files are processed and merged into unified view

#### 2.1.3 Data Validation
- **Malformed data warnings**: Alert users when files contain:
  - Invalid date formats
  - Missing required fields
  - Unparseable amounts
  - Corrupted XML/SGML structure (for QFX)
  - Inconsistent CSV columns
- **Partial import**: Allow importing valid transactions even if some are malformed
- **Error reporting**: Show specific errors with line/transaction numbers

#### 2.1.4 QFX Format Specifics
See `example_data/format.md` for complete specification. Key points:
- Support standard OFX structure with `CREDITCARDMSGSRSV1` and `BANKTRANLIST`
- Parse dates in both formats: `YYYYMMDDHHMMSS[OFFSET:GMT]` and `YYYYMMDDHHMMSS.mmm`
- Handle HTML entities in merchant names (e.g., `&amp;`)
- Extract: `TRNTYPE`, `DTPOSTED`, `TRNAMT`, `FITID`, `NAME`, `MEMO`
- Amount convention: negative = debit, positive = credit

#### 2.1.5 CSV Format Specifics
See `example_data/format.md` for complete specification. Key points:
- Expected columns: `Trans. Date`, `Post Date`, `Description`, `Amount`, `Category`
- Date format: `MM/DD/YYYY`
- Handle quoted descriptions that may contain commas
- Amount convention: positive = debit, negative = credit (opposite of QFX)
- Pre-existing categories can seed auto-categorization

#### 2.1.6 Amount Normalization
All amounts must be normalized to consistent convention:
- **Standard**: Negative = money spent (debit), Positive = money received (credit)
- QFX amounts require no conversion (already negative for debits)
- CSV amounts must be negated (CSV uses opposite convention)

### 2.2 Transaction Categorization

#### 2.2.1 Default Categories
Pre-defined categories matching common expense types:
- Groceries
- Restaurants & Dining
- Transportation
- Gas & Fuel
- Entertainment
- Shopping & Retail
- Utilities
- Healthcare
- Insurance
- Housing (Rent/Mortgage)
- Subscriptions
- Travel
- Services
- Income/Payments
- Other

#### 2.2.2 Custom Categories
- Users can create new categories
- Users can edit category names
- Users can delete categories (transactions revert to "Uncategorized")
- Categories are saved to localStorage

#### 2.2.3 Auto-Categorization Rules
- **Regex-based matching**: Each category has associated regex patterns
- **Merchant name matching**: Match on transaction description/merchant name
- **Priority order**: First matching rule wins
- **Default rules**: Include common patterns like:
  - `/(starbucks|coffee|cafe)/i` → Restaurants & Dining
  - `/(uber|lyft|taxi)/i` → Transportation
  - `/(netflix|spotify|hulu)/i` → Subscriptions
  - `/(safeway|kroger|whole foods|trader joe)/i` → Groceries
  - etc.

#### 2.2.4 Manual Override
- Users can manually change any transaction's category
- Manual categorization takes precedence over auto-categorization
- Manual changes persist in localStorage
- Option to "learn" from manual changes (create new rule for that merchant)

#### 2.2.5 Uncategorized Handling
- Display count of uncategorized transactions prominently
- Provide quick-categorization UI for uncategorized items
- Allow bulk categorization by merchant name

### 2.3 Transaction Exclusion

#### 2.3.1 Exclusion Behavior
- Users can mark individual transactions as "excluded"
- Excluded transactions:
  - Still visible in transaction list (with visual indicator)
  - Excluded from all totals, charts, and summary statistics
  - Can be toggled back to "included" state
- Exclusions persist in localStorage

#### 2.3.2 Exclusion Use Cases
- One-time large purchases that skew budgets
- Reimbursable expenses
- Transfers between accounts
- Transactions already tracked elsewhere

### 2.4 Repeated Expenses Detection

#### 2.4.1 Detection Algorithm
- **Same merchant**: Exact or fuzzy match on merchant name
- **Similar amount**: Within ±10% tolerance
- **Regular interval**: No strict time requirement, just flag as "repeated"
- **Minimum occurrences**: Must appear at least 2 times

#### 2.4.2 Subscription Identification
- Flag likely subscriptions (repeated monthly charges)
- Typical subscription patterns:
  - Same merchant name
  - Similar amount (within 10%)
  - Approximately monthly frequency (25-35 day intervals)

#### 2.4.3 Display of Repeated Expenses
- Dedicated section showing:
  - Merchant name
  - Average amount
  - Frequency (number of occurrences)
  - Total spent on this repeated expense
  - List of individual transactions
- Sort by frequency or total amount
- Highlight potential subscriptions distinctly

### 2.5 Summary and Analytics

#### 2.5.1 Time Period Grouping
- **Month-by-month breakdown**: Primary view
  - Format: "January 2025", "February 2025"
  - Group transactions by month of transaction date
  - Show totals per month
- **Overall totals**: Grand totals across all uploaded data
  - Total expenses (all debits)
  - Total income (all credits)
  - Net position
  - Date range covered

#### 2.5.2 Category Analysis
- **Per-month category breakdown**:
  - Show spending in each category for each month
  - Percentage of total monthly spending
  - Month-over-month comparison
- **Overall category breakdown**:
  - Total spent per category across all time
  - Average monthly spending per category
  - Percentage of total spending

#### 2.5.3 Summary Statistics
- **Average per month**: Total expenses / number of months
- **Highest expense**: Single largest transaction
- **Most expensive month**: Month with highest total expenses
- **Most frequent category**: Category with most transactions
- **Total transactions**: Count of all transactions (excluding excluded ones)

#### 2.5.4 Charts
Required visualizations:
- **Pie chart**: Spending by category (overall)
- **Bar chart**: Monthly spending comparison
- **Stacked bar chart**: Monthly spending by category
- **Line chart**: Spending trend over time

### 2.6 Data Export

#### 2.6.1 Export Preferences
Export file includes:
- Categorization rules (regex patterns and category assignments)
- Custom categories (user-created categories)
- Exclusion list (transaction IDs or fingerprints of excluded transactions)
- Manual category overrides
- Format: JSON

#### 2.6.2 Export Summarized Data
Export processed data including:
- All transactions with assigned categories
- Monthly summaries
- Category totals
- Repeated expense analysis
- Format: JSON or CSV

#### 2.6.3 Export Behavior
- Download as file (browser download dialog)
- Filename includes timestamp: `budget_preferences_2025-11-12.json`
- Human-readable JSON formatting (indented)

### 2.7 Data Import

#### 2.7.1 Import Preferences
- Upload previously exported preferences JSON
- Merge with existing preferences:
  - Add new categories
  - Add new rules
  - Preserve existing exclusions and manual overrides
- Option to replace vs. merge

#### 2.7.2 Import Behavior
- Validate JSON structure before applying
- Show preview of what will be imported
- Confirm before applying

## 3. Data Persistence

### 3.1 localStorage Strategy
Store separately:
- **transactions**: Parsed transaction data from uploaded files
- **preferences**: User preferences and settings
- **categories**: Custom categories and rules
- **exclusions**: List of excluded transaction identifiers
- **manualOverrides**: Manual category assignments

### 3.2 Transaction Fingerprinting
To track exclusions and manual overrides across sessions:
- Generate fingerprint: `${date}_${amount}_${description}_${accountId}`
- Use fingerprint as key for exclusions and overrides
- Handle duplicates gracefully

### 3.3 Storage Limits
- Monitor localStorage usage
- Warn user if approaching limits (~5-10MB typically)
- Provide option to clear old data

### 3.4 Data Persistence Behavior
- Auto-save on every change (categorization, exclusion, etc.)
- Session state persists across browser refreshes
- Option to "Clear all data" for starting fresh

## 4. User Interface Requirements

### 4.1 Layout Philosophy
- **All-in-one view**: No wizards, all features visible simultaneously
- **Expert-friendly**: Dense information display, no hand-holding
- **Responsive**: Work on desktop (1024px+), acceptable degradation on mobile
- **Desktop-first**: Optimize for desktop experience, mobile is secondary

### 4.2 Main Sections
1. **File Upload Area** (top)
2. **Summary Dashboard** (high-level stats and charts)
3. **Category Breakdown** (tables and charts)
4. **Repeated Expenses** (dedicated section)
5. **Transaction List** (detailed table, scrollable)
6. **Settings/Preferences** (categories, rules, export/import)

### 4.3 File Upload Area
- Drag-and-drop zone (prominent visual feedback)
- File picker button as alternative
- List of uploaded files with status (parsed successfully / errors)
- "Clear all" button to reset session

### 4.4 Summary Dashboard
Display prominently:
- Date range of loaded data
- Total transactions count
- Total expenses (sum of all debits)
- Total income (sum of all credits)
- Net position
- Number of months covered
- Average monthly expenses
- Number of uncategorized transactions (if any)

### 4.5 Category Breakdown Section
- Table showing:
  - Category name
  - Number of transactions
  - Total amount
  - Percentage of total
  - Average per transaction
- Sort by: amount (default), transaction count, name
- Charts:
  - Pie chart of category distribution
  - Bar chart of categories by total amount

### 4.6 Month-by-Month Section
- Table with months as rows, categories as columns
- Shows spending in each category per month
- Totals row and column
- Charts:
  - Stacked bar chart (months on x-axis, stacked by category)
  - Line chart showing monthly total trend

### 4.7 Repeated Expenses Section
- Table showing:
  - Merchant/description pattern
  - Number of occurrences
  - Average amount
  - Total spent
  - Estimated monthly cost (if subscription-like)
- Expandable rows showing individual transactions
- Highlight subscriptions with badge/icon

### 4.8 Transaction List
Detailed table with columns:
- Date
- Description
- Amount
- Category (with edit capability)
- Exclude checkbox
- Account (if multiple)
- Source (QFX/CSV)

Features:
- Sort by any column
- Virtual scrolling for performance (hundreds of transactions)
- Inline category editing
- Highlight excluded transactions (greyed out)

### 4.9 Settings/Preferences Section
Tabs or collapsible sections:
- **Categories Management**:
  - List of categories
  - Add/edit/delete
  - Associated regex patterns
  - Test pattern against sample text
- **Auto-categorization Rules**:
  - Priority-ordered list of rules
  - Add/edit/delete
  - Drag to reorder priority
- **Data Management**:
  - Export preferences button
  - Import preferences button
  - Export data button
  - Clear all data button (with confirmation)

### 4.10 No-Filtering Requirement
- No search/filter UI in transaction list
- All data visible all the time
- Rely on sorting for navigation

## 5. Technical Requirements

### 5.1 Technology Stack
- **HTML5**: Semantic markup
- **CSS3**: Styling (consider Tailwind CSS bundled inline)
- **JavaScript/TypeScript**: Application logic
  - TypeScript preferred for development
  - Transpile to ES6+ JavaScript
- **Build Process**: Bundle everything into single HTML file
  - Tool: Vite or Parcel with inline plugins
  - Inline all JS, CSS, assets

### 5.2 Required Libraries (Bundled)
- **ofx-data-extractor**: QFX/OFX parsing (see format.md)
- **csv-parse** or **papaparse**: CSV parsing
- **Chart.js** or **Recharts**: Data visualization
- **date-fns** or native Date: Date handling

### 5.3 Browser Compatibility
- **Target**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **No IE11 support**
- **ES6+ features**: Allowed
- **Native features**:
  - localStorage
  - File API
  - Drag and drop API

### 5.4 Performance Requirements
- Handle 1000+ transactions without UI lag
- Parsing: <2 seconds for typical file (100-200 transactions)
- Rendering: Virtual scrolling for transaction list
- Chart rendering: <1 second for data set

### 5.5 Build Output
- Single `.html` file
- Target size: <2MB (including all libraries and assets)
- Filename: `budget_tracker.html`
- Can be opened directly in browser (file:// protocol)

## 6. Non-Functional Requirements

### 6.1 Security & Privacy
- **No network requests**: Zero external calls once loaded
- **Local-only data**: All processing in browser
- **No analytics**: No tracking or telemetry
- **No third-party scripts**: No CDN links, everything bundled

### 6.2 Usability
- **Zero configuration**: Works immediately upon opening
- **Intuitive uploads**: Drag-and-drop primary interaction
- **Clear feedback**: Loading states, error messages, success confirmations
- **Accessible**: Basic keyboard navigation support

### 6.3 Reliability
- **Error recovery**: Graceful handling of malformed files
- **Data safety**: No data loss on errors
- **localStorage fallback**: Handle quota exceeded errors

### 6.4 Maintainability
- **Clean code**: Well-structured TypeScript
- **Comments**: Document complex logic (regex patterns, amount normalization)
- **Modular**: Separate concerns (parsing, categorization, UI, storage)

## 7. Out of Scope (For Initial Version)

The following features are explicitly NOT included:
- Filtering/searching transactions
- Editing transaction details (amount, date, description)
- Budget planning or forecasting
- Multi-currency support
- Account reconciliation
- Importing from bank APIs
- Scheduled/recurring transaction predictions
- Mobile app (native)
- Synchronization between devices
- User authentication
- Week/quarter/year time groupings (only months)
- Advanced charts (heatmaps, scatter plots, etc.)

## 8. Success Metrics

### 8.1 Functional Success
- Correctly parse QFX files from Chase and Fidelity
- Correctly parse CSV files from Discover
- 95%+ accuracy in auto-categorization (with default rules)
- Zero data loss across sessions
- Handle 2000+ transactions without performance degradation

### 8.2 User Experience Success
- File upload to visualization: <5 seconds for typical dataset
- No learning curve for file upload (drag-and-drop is obvious)
- All features accessible within 2 clicks

## 9. Future Enhancements (Post-MVP)

Potential features for future versions:
- Week/quarter/year time groupings
- Budget vs. actual comparison
- Transaction filtering and search
- More chart types (trends, heatmaps)
- Import from bank APIs (Plaid, etc.)
- Machine learning for categorization improvement
- Export to other formats (PDF reports, Excel)
- Mobile-optimized layout
- Dark mode
- Multi-currency with conversion rates

## 10. Development Phases

### Phase 1: Core Infrastructure
- Set up build system (single HTML file output)
- Implement file parsing (QFX and CSV)
- Create unified transaction model
- Basic transaction list display

### Phase 2: Categorization
- Implement default categories and rules
- Auto-categorization engine
- Manual category assignment
- Custom category management

### Phase 3: Analytics
- Monthly grouping
- Category summaries
- Basic charts (pie, bar)
- Summary statistics

### Phase 4: Advanced Features
- Repeated expense detection
- Transaction exclusion
- Advanced charts (stacked, line)
- Export/import preferences

### Phase 5: Polish
- UI refinement
- Error handling improvements
- Performance optimization
- Testing with real data

## 11. File Format Reference

See `example_data/format.md` for complete specifications of:
- QFX/OFX format structure
- CSV format structure
- Parsing strategies
- Recommended libraries
- Error handling approaches
- Amount normalization requirements

## Appendix A: Data Models

### Transaction Model
```typescript
interface Transaction {
  id: string;                    // Generated fingerprint
  date: Date;                    // Transaction date
  description: string;           // Merchant/description
  amount: number;                // Normalized: negative = debit
  type: 'DEBIT' | 'CREDIT';
  category?: string;             // Assigned category
  isExcluded: boolean;           // Exclusion flag
  source: 'QFX' | 'CSV';        // Original format
  accountId?: string;            // Account identifier
  transactionId?: string;        // Original ID (FITID)
  memo?: string;                 // Additional notes
  manualCategory?: boolean;      // Manual override flag
}
```

### Category Model
```typescript
interface Category {
  id: string;
  name: string;
  patterns: string[];            // Regex patterns
  color?: string;                // Chart color
  isCustom: boolean;             // User-created flag
}
```

### Rule Model
```typescript
interface CategorizationRule {
  id: string;
  pattern: string;               // Regex pattern
  categoryId: string;
  priority: number;              // Lower = higher priority
}
```

### Preferences Model
```typescript
interface Preferences {
  categories: Category[];
  rules: CategorizationRule[];
  excludedTransactionIds: string[];
  manualOverrides: Record<string, string>; // transactionId -> categoryId
}
```

## Appendix B: localStorage Keys

- `budget_tracker_transactions`: All parsed transactions
- `budget_tracker_preferences`: User preferences and settings
- `budget_tracker_version`: Data schema version (for future migrations)
