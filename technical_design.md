# Technical Design Document: Financial Budget Tracker

## 1. Executive Summary

This document describes the technical architecture for a single-page financial budget tracker web application. The application will be delivered as a single, self-contained HTML file with all dependencies bundled inline, capable of running entirely offline in modern web browsers.

### Key Technical Decisions
- **Framework**: React 18 with TypeScript
- **Build System**: Vite with vite-plugin-singlefile
- **Styling**: Tailwind CSS
- **Charts**: Chart.js
- **Parsing**: ofx-data-extractor (QFX) + papaparse (CSV)
- **State Management**: React Context API + hooks
- **Storage**: localStorage with JSON serialization

## 2. Technology Stack

### 2.1 Core Technologies

| Technology | Version | Purpose | Bundle Impact |
|------------|---------|---------|---------------|
| React | 18.3+ | UI framework | ~130KB |
| TypeScript | 5.x | Type safety, development | 0KB (compiles away) |
| Vite | 5.x | Build tool, dev server | 0KB (dev only) |
| Tailwind CSS | 3.x | Styling framework | ~50KB (purged) |

### 2.2 Key Libraries

| Library | Version | Purpose | Bundle Impact |
|---------|---------|---------|---------------|
| ofx-data-extractor | Latest | Parse QFX/OFX files | ~30KB |
| papaparse | 5.x | Parse CSV files | ~45KB |
| Chart.js | 4.x | Data visualization | ~200KB |
| react-chartjs-2 | 5.x | React wrapper for Chart.js | ~5KB |
| @tanstack/react-virtual | 3.x | Virtual scrolling | ~15KB |
| date-fns | 3.x | Date formatting/manipulation | ~20KB (tree-shaken) |

**Estimated Total Bundle Size**: ~500-600KB (acceptable for single-file deployment)

### 2.3 Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Vite Plugin Singlefile**: Bundle all assets into single HTML

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Single HTML File                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React Application                    │  │
│  │  ┌─────────────┐  ┌──────────────┐              │  │
│  │  │ UI Layer    │  │ State Layer  │              │  │
│  │  │ (Components)│◄─┤ (Context)    │              │  │
│  │  └─────────────┘  └──────────────┘              │  │
│  │         ▲               ▲                         │  │
│  │         │               │                         │  │
│  │  ┌──────┴───────────────┴─────┐                 │  │
│  │  │    Business Logic Layer    │                 │  │
│  │  │  ┌──────────┐ ┌──────────┐ │                 │  │
│  │  │  │ Parsers  │ │Categories│ │                 │  │
│  │  │  └──────────┘ └──────────┘ │                 │  │
│  │  │  ┌──────────┐ ┌──────────┐ │                 │  │
│  │  │  │Analytics │ │ Storage  │ │                 │  │
│  │  │  └──────────┘ └──────────┘ │                 │  │
│  │  └────────────────────────────┘                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Inline CSS (Tailwind)                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
                  localStorage
               (Browser Storage)
```

### 3.2 Application Layers

#### Layer 1: UI Components (React)
- Presentational components
- User interaction handling
- Rendering logic
- Chart visualizations

#### Layer 2: State Management (React Context)
- Global application state
- Transaction data
- User preferences
- UI state (loading, errors)

#### Layer 3: Business Logic
- File parsing (QFX/CSV)
- Categorization engine
- Analytics calculations
- Repeated expense detection

#### Layer 4: Data Persistence
- localStorage abstraction
- Data serialization/deserialization
- Migration handling
- Export/import utilities

## 4. Component Architecture

### 4.1 Component Hierarchy

```
App
├── AppProvider (Context)
│   └── AppContent
│       ├── Header
│       │   └── Logo, Title, Actions
│       ├── FileUploadZone
│       │   ├── DragDropArea
│       │   └── FileList
│       ├── Dashboard
│       │   ├── SummaryStats
│       │   └── QuickActions
│       ├── CategoryBreakdown
│       │   ├── CategoryTable
│       │   └── CategoryCharts
│       │       ├── PieChart
│       │       └── BarChart
│       ├── MonthlyAnalysis
│       │   ├── MonthlyTable
│       │   └── MonthlyCharts
│       │       ├── StackedBarChart
│       │       └── LineChart
│       ├── RepeatedExpenses
│       │   ├── SubscriptionList
│       │   └── RecurringExpenseTable
│       ├── TransactionList
│       │   ├── TransactionTable (Virtual)
│       │   └── TransactionRow
│       └── Settings
│           ├── CategoryManager
│           ├── RuleEditor
│           └── DataManagement
```

### 4.2 Key Components

#### AppProvider
```typescript
interface AppState {
  transactions: Transaction[];
  categories: Category[];
  rules: CategorizationRule[];
  preferences: Preferences;
  excludedIds: Set<string>;
  manualOverrides: Map<string, string>;
  isLoading: boolean;
  errors: string[];
}

interface AppContextValue {
  state: AppState;
  actions: {
    uploadFiles: (files: File[]) => Promise<void>;
    categorizeTransaction: (id: string, categoryId: string) => void;
    toggleExclusion: (id: string) => void;
    addCategory: (category: Category) => void;
    addRule: (rule: CategorizationRule) => void;
    exportPreferences: () => void;
    importPreferences: (data: Preferences) => void;
    clearAllData: () => void;
  };
}
```

#### FileUploadZone
- Handles drag-and-drop events
- File input fallback
- Multiple file selection
- File validation
- Progress indication

#### TransactionList
- Virtual scrolling for performance (1000+ rows)
- Sortable columns
- Inline category editing
- Exclusion toggle
- Visual indicators (excluded, manual category)

#### CategoryCharts
- Pie chart: Category distribution
- Bar chart: Categories by total
- Responsive sizing
- Interactive tooltips
- Color-coded by category

#### MonthlyCharts
- Stacked bar: Monthly spending by category
- Line chart: Trend over time
- Month labels on x-axis
- Responsive layout

## 5. Data Models

### 5.1 Core Interfaces

```typescript
// Transaction Model
interface Transaction {
  id: string;                     // SHA-256 hash of key fields
  date: Date;
  description: string;
  amount: number;                 // Negative = debit
  type: 'DEBIT' | 'CREDIT';
  categoryId?: string;
  isExcluded: boolean;
  source: 'QFX' | 'CSV';
  accountId?: string;
  transactionId?: string;         // Original FITID
  memo?: string;
  isManuallyCategorized: boolean;
}

// Category Model
interface Category {
  id: string;                     // UUID
  name: string;
  color: string;                  // Hex color for charts
  patterns: string[];             // Regex patterns
  isCustom: boolean;
  isDefault: boolean;             // Built-in category
}

// Categorization Rule
interface CategorizationRule {
  id: string;
  categoryId: string;
  pattern: string;                // Regex pattern
  priority: number;               // Lower = higher priority
  enabled: boolean;
}

// User Preferences
interface Preferences {
  categories: Category[];
  rules: CategorizationRule[];
  version: number;                // Schema version
  lastModified: Date;
}

// Monthly Summary
interface MonthlySummary {
  month: string;                  // "2025-01" format
  totalDebits: number;
  totalCredits: number;
  net: number;
  categoryTotals: Map<string, number>;
  transactionCount: number;
}

// Repeated Expense
interface RepeatedExpense {
  merchantPattern: string;
  occurrences: number;
  averageAmount: number;
  totalAmount: number;
  transactionIds: string[];
  isLikelySubscription: boolean;
  estimatedMonthly?: number;
}
```

### 5.2 Derived Data

The application computes derived data on-demand:

```typescript
interface DerivedAnalytics {
  monthlySummaries: MonthlySummary[];
  categoryTotals: Map<string, number>;
  repeatedExpenses: RepeatedExpense[];
  overallStats: {
    totalDebits: number;
    totalCredits: number;
    net: number;
    transactionCount: number;
    dateRange: { start: Date; end: Date };
    monthCount: number;
    averageMonthlyExpenses: number;
  };
}
```

## 6. Business Logic Modules

### 6.1 File Parsing Module

**Location**: `src/lib/parsers/`

```typescript
// QFX Parser
export async function parseQFX(content: string): Promise<Transaction[]> {
  const ofx = new Ofx(content);
  ofx.config({ nativeTypes: true });

  const type = ofx.getType();
  const rawTransactions = type === 'CREDIT_CARD'
    ? ofx.getCreditCardTransferList()
    : ofx.getBankTransferList();

  return rawTransactions.map(normalizeQFXTransaction);
}

// CSV Parser
export async function parseCSV(content: string): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions = results.data.map(normalizeCSVTransaction);
        resolve(transactions);
      },
      error: reject
    });
  });
}

// Format Detection
export function detectFormat(filename: string, content: string): 'QFX' | 'CSV' | 'UNKNOWN' {
  if (filename.toLowerCase().endsWith('.qfx') || content.startsWith('OFXHEADER:')) {
    return 'QFX';
  }
  if (filename.toLowerCase().endsWith('.csv') ||
      content.includes('Trans. Date,Post Date,Description')) {
    return 'CSV';
  }
  return 'UNKNOWN';
}

// Validation
export interface ParseError {
  line?: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParseResult {
  transactions: Transaction[];
  errors: ParseError[];
}
```

### 6.2 Categorization Engine

**Location**: `src/lib/categorization/`

```typescript
export class CategorizationEngine {
  constructor(
    private categories: Category[],
    private rules: CategorizationRule[]
  ) {}

  categorize(transaction: Transaction): string | undefined {
    // Sort rules by priority
    const sortedRules = this.rules
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Find first matching rule
    for (const rule of sortedRules) {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(transaction.description)) {
        return rule.categoryId;
      }
    }

    return undefined; // Uncategorized
  }

  batchCategorize(transactions: Transaction[]): void {
    transactions.forEach(txn => {
      if (!txn.isManuallyCategorized) {
        txn.categoryId = this.categorize(txn);
      }
    });
  }

  learnFromManualCategorization(
    transaction: Transaction,
    categoryId: string
  ): CategorizationRule {
    // Extract merchant name pattern
    const pattern = this.extractMerchantPattern(transaction.description);

    return {
      id: generateId(),
      categoryId,
      pattern,
      priority: 100, // Lower priority than defaults
      enabled: true
    };
  }

  private extractMerchantPattern(description: string): string {
    // Clean up common prefixes/suffixes
    let cleaned = description
      .replace(/SQ \*/gi, '')
      .replace(/\d{10,}/g, '')  // Remove long numbers
      .trim();

    // Escape regex special chars
    cleaned = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return cleaned;
  }
}
```

### 6.3 Analytics Calculator

**Location**: `src/lib/analytics/`

```typescript
export class AnalyticsCalculator {
  constructor(private transactions: Transaction[]) {}

  computeMonthlySummaries(): MonthlySummary[] {
    const byMonth = this.groupByMonth();

    return Array.from(byMonth.entries()).map(([month, txns]) => {
      const debits = txns.filter(t => t.type === 'DEBIT' && !t.isExcluded);
      const credits = txns.filter(t => t.type === 'CREDIT' && !t.isExcluded);

      return {
        month,
        totalDebits: this.sumAmounts(debits),
        totalCredits: this.sumAmounts(credits),
        net: this.sumAmounts(credits) - this.sumAmounts(debits),
        categoryTotals: this.computeCategoryTotals(txns),
        transactionCount: txns.filter(t => !t.isExcluded).length
      };
    });
  }

  detectRepeatedExpenses(): RepeatedExpense[] {
    const groups = this.groupByMerchant();
    const repeated: RepeatedExpense[] = [];

    groups.forEach((txns, merchant) => {
      if (txns.length < 2) return;

      const amounts = txns.map(t => Math.abs(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b) / amounts.length;

      // Check if amounts are similar (within 10%)
      const isSimilar = amounts.every(amt =>
        Math.abs(amt - avgAmount) / avgAmount <= 0.1
      );

      if (isSimilar) {
        repeated.push({
          merchantPattern: merchant,
          occurrences: txns.length,
          averageAmount: avgAmount,
          totalAmount: amounts.reduce((a, b) => a + b),
          transactionIds: txns.map(t => t.id),
          isLikelySubscription: this.isLikelySubscription(txns),
          estimatedMonthly: this.estimateMonthly(txns, avgAmount)
        });
      }
    });

    return repeated.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private isLikelySubscription(transactions: Transaction[]): boolean {
    if (transactions.length < 2) return false;

    // Check if intervals are roughly monthly (25-35 days)
    const dates = transactions.map(t => t.date.getTime()).sort();
    const intervals = [];

    for (let i = 1; i < dates.length; i++) {
      const days = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    return avgInterval >= 25 && avgInterval <= 35;
  }

  private groupByMonth(): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();

    this.transactions.forEach(txn => {
      const key = format(txn.date, 'yyyy-MM');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(txn);
    });

    return groups;
  }

  private groupByMerchant(): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();

    this.transactions
      .filter(t => t.type === 'DEBIT' && !t.isExcluded)
      .forEach(txn => {
        const merchant = this.normalizeMerchant(txn.description);
        if (!groups.has(merchant)) groups.set(merchant, []);
        groups.get(merchant)!.push(txn);
      });

    return groups;
  }

  private normalizeMerchant(description: string): string {
    // Remove common prefixes, numbers, locations
    return description
      .replace(/SQ \*/gi, '')
      .replace(/\d{10,}/g, '')
      .replace(/[A-Z]{2}\d{4,}/g, '') // Location codes
      .trim()
      .substring(0, 30); // First 30 chars
  }
}
```

### 6.4 Storage Module

**Location**: `src/lib/storage/`

```typescript
const STORAGE_KEYS = {
  TRANSACTIONS: 'budget_tracker_transactions',
  PREFERENCES: 'budget_tracker_preferences',
  VERSION: 'budget_tracker_version'
} as const;

const CURRENT_VERSION = 1;

export class StorageManager {
  saveTransactions(transactions: Transaction[]): void {
    try {
      const serialized = JSON.stringify(transactions, this.dateReplacer);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, serialized);
    } catch (e) {
      if (this.isQuotaExceeded(e)) {
        throw new Error('Storage quota exceeded. Please clear old data.');
      }
      throw e;
    }
  }

  loadTransactions(): Transaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) return [];

    const parsed = JSON.parse(data, this.dateReviver);
    return parsed;
  }

  savePreferences(preferences: Preferences): void {
    const data = {
      ...preferences,
      version: CURRENT_VERSION,
      lastModified: new Date()
    };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(data, this.dateReplacer));
  }

  loadPreferences(): Preferences | null {
    const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!data) return null;

    const parsed = JSON.parse(data, this.dateReviver);

    // Handle version migrations
    if (parsed.version !== CURRENT_VERSION) {
      return this.migratePreferences(parsed);
    }

    return parsed;
  }

  exportPreferences(): Blob {
    const prefs = this.loadPreferences();
    const json = JSON.stringify(prefs, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  importPreferences(file: File): Promise<Preferences> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string, this.dateReviver);
          // Validate structure
          if (!this.isValidPreferences(data)) {
            reject(new Error('Invalid preferences file'));
            return;
          }
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  getStorageInfo(): { used: number; available: number; percentUsed: number } {
    let used = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) used += item.length * 2; // UTF-16 = 2 bytes per char
    });

    const available = 5 * 1024 * 1024; // ~5MB typical limit
    return {
      used,
      available,
      percentUsed: (used / available) * 100
    };
  }

  private dateReplacer(key: string, value: any): any {
    return value instanceof Date ? { __type: 'Date', value: value.toISOString() } : value;
  }

  private dateReviver(key: string, value: any): any {
    if (value && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }

  private isQuotaExceeded(e: any): boolean {
    return e instanceof DOMException && (
      e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  private migratePreferences(old: any): Preferences {
    // Future migration logic
    return old;
  }

  private isValidPreferences(data: any): boolean {
    return (
      data &&
      Array.isArray(data.categories) &&
      Array.isArray(data.rules)
    );
  }
}
```

## 7. State Management

### 7.1 Context Structure

```typescript
// src/context/AppContext.tsx
export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const storage = useMemo(() => new StorageManager(), []);

  // Load data on mount
  useEffect(() => {
    const transactions = storage.loadTransactions();
    const preferences = storage.loadPreferences() || getDefaultPreferences();

    dispatch({ type: 'LOAD_DATA', payload: { transactions, preferences } });
  }, []);

  // Save on changes
  useEffect(() => {
    storage.saveTransactions(state.transactions);
    storage.savePreferences(state.preferences);
  }, [state.transactions, state.preferences]);

  const actions = useMemo(() => ({
    uploadFiles: async (files: File[]) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const allTransactions: Transaction[] = [];
        const errors: ParseError[] = [];

        for (const file of files) {
          const content = await file.text();
          const format = detectFormat(file.name, content);

          const result = format === 'QFX'
            ? await parseQFX(content)
            : format === 'CSV'
            ? await parseCSV(content)
            : { transactions: [], errors: [{ message: 'Unknown format', severity: 'error' }] };

          allTransactions.push(...result.transactions);
          errors.push(...result.errors);
        }

        // Auto-categorize
        const engine = new CategorizationEngine(
          state.preferences.categories,
          state.preferences.rules
        );
        engine.batchCategorize(allTransactions);

        dispatch({
          type: 'ADD_TRANSACTIONS',
          payload: { transactions: allTransactions, errors }
        });
      } catch (error) {
        dispatch({
          type: 'ADD_ERROR',
          payload: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    categorizeTransaction: (id: string, categoryId: string) => {
      dispatch({
        type: 'CATEGORIZE_TRANSACTION',
        payload: { id, categoryId }
      });
    },

    toggleExclusion: (id: string) => {
      dispatch({ type: 'TOGGLE_EXCLUSION', payload: id });
    },

    addCategory: (category: Category) => {
      dispatch({ type: 'ADD_CATEGORY', payload: category });
    },

    addRule: (rule: CategorizationRule) => {
      dispatch({ type: 'ADD_RULE', payload: rule });
    },

    exportPreferences: () => {
      const blob = storage.exportPreferences();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget_preferences_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    importPreferences: async (file: File) => {
      const prefs = await storage.importPreferences(file);
      dispatch({ type: 'IMPORT_PREFERENCES', payload: prefs });
    },

    clearAllData: () => {
      if (confirm('Are you sure? This will delete all data.')) {
        storage.clearAll();
        dispatch({ type: 'CLEAR_ALL' });
      }
    }
  }), [state.preferences]);

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
```

### 7.2 Reducer

```typescript
type AppAction =
  | { type: 'LOAD_DATA'; payload: { transactions: Transaction[]; preferences: Preferences } }
  | { type: 'ADD_TRANSACTIONS'; payload: { transactions: Transaction[]; errors: ParseError[] } }
  | { type: 'CATEGORIZE_TRANSACTION'; payload: { id: string; categoryId: string } }
  | { type: 'TOGGLE_EXCLUSION'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'ADD_RULE'; payload: CategorizationRule }
  | { type: 'IMPORT_PREFERENCES'; payload: Preferences }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: string }
  | { type: 'CLEAR_ALL' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        transactions: action.payload.transactions,
        preferences: action.payload.preferences,
        isLoading: false
      };

    case 'ADD_TRANSACTIONS':
      return {
        ...state,
        transactions: [...state.transactions, ...action.payload.transactions],
        errors: action.payload.errors.map(e => e.message)
      };

    case 'CATEGORIZE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id
            ? { ...t, categoryId: action.payload.categoryId, isManuallyCategorized: true }
            : t
        ),
        manualOverrides: new Map(state.manualOverrides).set(
          action.payload.id,
          action.payload.categoryId
        )
      };

    case 'TOGGLE_EXCLUSION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload
            ? { ...t, isExcluded: !t.isExcluded }
            : t
        ),
        excludedIds: (() => {
          const next = new Set(state.excludedIds);
          next.has(action.payload)
            ? next.delete(action.payload)
            : next.add(action.payload);
          return next;
        })()
      };

    case 'ADD_CATEGORY':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          categories: [...state.preferences.categories, action.payload]
        }
      };

    case 'ADD_RULE':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          rules: [...state.preferences.rules, action.payload]
        }
      };

    case 'IMPORT_PREFERENCES':
      return {
        ...state,
        preferences: action.payload
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_ERROR':
      return { ...state, errors: [...state.errors, action.payload] };

    case 'CLEAR_ALL':
      return initialState;

    default:
      return state;
  }
}
```

## 8. Default Categories and Rules

**Location**: `src/lib/defaults.ts`

```typescript
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', color: '#10b981', patterns: [], isCustom: false, isDefault: true },
  { id: 'restaurants', name: 'Restaurants & Dining', color: '#f59e0b', patterns: [], isCustom: false, isDefault: true },
  { id: 'transportation', name: 'Transportation', color: '#3b82f6', patterns: [], isCustom: false, isDefault: true },
  { id: 'gas', name: 'Gas & Fuel', color: '#8b5cf6', patterns: [], isCustom: false, isDefault: true },
  { id: 'entertainment', name: 'Entertainment', color: '#ec4899', patterns: [], isCustom: false, isDefault: true },
  { id: 'shopping', name: 'Shopping & Retail', color: '#ef4444', patterns: [], isCustom: false, isDefault: true },
  { id: 'utilities', name: 'Utilities', color: '#14b8a6', patterns: [], isCustom: false, isDefault: true },
  { id: 'healthcare', name: 'Healthcare', color: '#06b6d4', patterns: [], isCustom: false, isDefault: true },
  { id: 'insurance', name: 'Insurance', color: '#6366f1', patterns: [], isCustom: false, isDefault: true },
  { id: 'housing', name: 'Housing', color: '#84cc16', patterns: [], isCustom: false, isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', color: '#a855f7', patterns: [], isCustom: false, isDefault: true },
  { id: 'travel', name: 'Travel', color: '#0ea5e9', patterns: [], isCustom: false, isDefault: true },
  { id: 'services', name: 'Services', color: '#f97316', patterns: [], isCustom: false, isDefault: true },
  { id: 'income', name: 'Income/Payments', color: '#22c55e', patterns: [], isCustom: false, isDefault: true },
  { id: 'other', name: 'Other', color: '#64748b', patterns: [], isCustom: false, isDefault: true },
];

export const DEFAULT_RULES: CategorizationRule[] = [
  // Groceries
  { id: 'r1', categoryId: 'groceries', pattern: '(safeway|kroger|whole foods|trader joe|albertsons|publix|wegmans)', priority: 10, enabled: true },
  { id: 'r2', categoryId: 'groceries', pattern: '(grocery|supermarket|market)', priority: 15, enabled: true },

  // Restaurants
  { id: 'r3', categoryId: 'restaurants', pattern: '(starbucks|coffee|cafe|restaurant|dining)', priority: 10, enabled: true },
  { id: 'r4', categoryId: 'restaurants', pattern: '(mcdonald|burger king|wendy|subway|chipotle|panera)', priority: 10, enabled: true },

  // Transportation
  { id: 'r5', categoryId: 'transportation', pattern: '(uber|lyft|taxi|transit|metro|bart)', priority: 10, enabled: true },

  // Gas
  { id: 'r6', categoryId: 'gas', pattern: '(shell|chevron|exxon|mobil|bp|arco|gas|fuel)', priority: 10, enabled: true },

  // Subscriptions
  { id: 'r7', categoryId: 'subscriptions', pattern: '(netflix|spotify|hulu|disney|amazon prime|apple music)', priority: 10, enabled: true },

  // Utilities
  { id: 'r8', categoryId: 'utilities', pattern: '(electric|power|water|internet|comcast|at&t|verizon)', priority: 10, enabled: true },

  // Shopping
  { id: 'r9', categoryId: 'shopping', pattern: '(amazon|target|walmart|costco|best buy)', priority: 10, enabled: true },

  // Income/Payments
  { id: 'r10', categoryId: 'income', pattern: '(payment|credit|refund|paypal)', priority: 10, enabled: true },
];
```

## 9. Build Configuration

### 9.1 Project Structure

```
budget-tracker/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component
│   ├── context/
│   │   └── AppContext.tsx    # Global state
│   ├── components/
│   │   ├── FileUploadZone.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   ├── MonthlyAnalysis.tsx
│   │   ├── RepeatedExpenses.tsx
│   │   ├── TransactionList.tsx
│   │   └── Settings.tsx
│   ├── lib/
│   │   ├── parsers/
│   │   │   ├── qfx.ts
│   │   │   ├── csv.ts
│   │   │   └── detect.ts
│   │   ├── categorization/
│   │   │   └── engine.ts
│   │   ├── analytics/
│   │   │   └── calculator.ts
│   │   ├── storage/
│   │   │   └── manager.ts
│   │   ├── defaults.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts          # All TypeScript interfaces
│   └── styles/
│       └── index.css         # Tailwind imports
├── index.html                # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

### 9.2 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile()
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // Inline everything
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      }
    }
  }
});
```

### 9.3 Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette for charts
      }
    },
  },
  plugins: [],
}
```

### 9.4 Package.json Scripts

```json
{
  "name": "budget-tracker",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write src/**/*.{ts,tsx}"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "ofx-data-extractor": "^1.0.0",
    "papaparse": "^5.4.1",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "@tanstack/react-virtual": "^3.0.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/papaparse": "^5.3.14",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "vite-plugin-singlefile": "^2.0.0",
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.0"
  }
}
```

## 10. Performance Optimization Strategies

### 10.1 Virtual Scrolling
- Use `@tanstack/react-virtual` for transaction list
- Render only visible rows (~20-30 at a time)
- Handle 1000+ transactions smoothly

### 10.2 Memoization
```typescript
// Memoize expensive calculations
const analytics = useMemo(() => {
  return new AnalyticsCalculator(state.transactions);
}, [state.transactions]);

const monthlySummaries = useMemo(() =>
  analytics.computeMonthlySummaries(),
  [analytics]
);

const repeatedExpenses = useMemo(() =>
  analytics.detectRepeatedExpenses(),
  [analytics]
);
```

### 10.3 Debounced Saves
```typescript
// Debounce localStorage writes
const debouncedSave = useDebouncedCallback(
  (transactions: Transaction[]) => {
    storage.saveTransactions(transactions);
  },
  500
);
```

### 10.4 Code Splitting (for Development)
- During development, use dynamic imports
- In production build, inline everything
- Vite handles this automatically

## 11. Error Handling Strategy

### 11.1 Parse Errors
- Show warning banner with error count
- Display errors in collapsible section
- Allow importing partial data

### 11.2 Storage Errors
- Catch quota exceeded errors
- Prompt user to clear old data
- Provide export before clearing

### 11.3 User Feedback
- Toast notifications for actions
- Loading spinners for async operations
- Error boundaries for component crashes

```typescript
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 12. Testing Strategy

### 12.1 Unit Tests
- Test parsers with sample QFX/CSV files
- Test categorization engine rules
- Test analytics calculations
- Test storage serialization/deserialization

### 12.2 Integration Tests
- Test file upload flow
- Test categorization workflow
- Test exclusion persistence

### 12.3 Manual Testing Checklist
- [ ] Upload Chase QFX file
- [ ] Upload Fidelity QFX file
- [ ] Upload Discover CSV file
- [ ] Upload multiple files at once
- [ ] Verify amount normalization (debits negative, credits positive)
- [ ] Test auto-categorization accuracy
- [ ] Test manual categorization
- [ ] Test transaction exclusion
- [ ] Test repeated expense detection
- [ ] Verify charts render correctly
- [ ] Test localStorage persistence across sessions
- [ ] Test export/import preferences
- [ ] Test with 1000+ transactions (performance)
- [ ] Test offline functionality
- [ ] Test on mobile (basic responsiveness)

## 13. Security Considerations

### 13.1 Data Privacy
- No network requests after initial load
- All data stays in browser localStorage
- No analytics or tracking
- No external script dependencies (all bundled)

### 13.2 Input Validation
- Validate file formats before parsing
- Sanitize user input in category names/patterns
- Escape regex special characters
- Validate JSON structure on import

### 13.3 XSS Prevention
- React escapes output by default
- Don't use `dangerouslySetInnerHTML`
- Sanitize merchant names (may contain special chars)

## 14. Future Extensibility

### 14.1 Plugin Architecture (Future)
- Could support custom parsers for other banks
- Custom categorization algorithms
- Custom chart types

### 14.2 Schema Versioning
- Version field in preferences
- Migration functions for breaking changes
- Backward compatibility handling

### 14.3 Advanced Features (Post-MVP)
- Budget planning
- Forecasting
- Machine learning categorization
- Export to PDF/Excel
- Import from bank APIs (Plaid)

## 15. Development Workflow

### 15.1 Setup
```bash
npm install
npm run dev
```

### 15.2 Development
- Use hot reload during development
- Test with example files in `example_data/`
- Use React DevTools for debugging

### 15.3 Build
```bash
npm run build
```
Output: `dist/index.html` (single file, ready to use)

### 15.4 Deployment
- Upload `dist/index.html` to any static hosting
- Or distribute file directly to users
- Can be opened locally via `file://` protocol

## 16. Success Criteria

The technical implementation will be considered successful when:

1. ✅ Single HTML file under 2MB
2. ✅ Correctly parses QFX and CSV files
3. ✅ Handles 1000+ transactions without lag
4. ✅ Auto-categorization accuracy >90% with default rules
5. ✅ All data persists across browser sessions
6. ✅ Works completely offline
7. ✅ Responsive layout (acceptable on mobile, optimized for desktop)
8. ✅ Zero network requests after initial load
9. ✅ File upload to visualization in <5 seconds
10. ✅ Clean, maintainable TypeScript codebase

## 17. Open Questions / Decisions Needed

1. **Toast notification library**: Use react-hot-toast or build custom?
2. **Chart.js themes**: Use default or create custom theme matching Tailwind colors?
3. **Transaction ID generation**: SHA-256 hash or simpler UUID?
4. **Date formatting**: Consistent format throughout (e.g., "Jan 15, 2025" vs "2025-01-15")?
5. **Category colors**: Predefined palette or allow user customization?

These can be decided during implementation.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-12
**Status**: Ready for Implementation
