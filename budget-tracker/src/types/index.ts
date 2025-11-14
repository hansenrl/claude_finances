// Core Transaction Model
export interface Transaction {
  id: string; // SHA-256 hash of key fields
  date: Date;
  description: string;
  amount: number; // Negative = debit, positive = credit
  type: 'DEBIT' | 'CREDIT';
  categoryId?: string;
  isExcluded: boolean;
  source: 'QFX' | 'CSV';
  sourceFile?: string; // Truncated filename for display
  accountId?: string;
  transactionId?: string; // Original FITID
  memo?: string;
  isManuallyCategorized: boolean;
}

// Pattern Model
export interface CategoryPattern {
  id: string;
  pattern: string; // Regex pattern
  priority: number; // Lower = higher priority (matches first)
  enabled: boolean;
  isDefault: boolean; // Built-in pattern vs user-added
  description?: string; // Optional label/description
}

// Category Model
export interface Category {
  id: string;
  name: string;
  color: string; // Hex color for charts
  patterns: CategoryPattern[]; // Regex patterns with metadata
  isCustom: boolean;
  isDefault: boolean; // Built-in category
}

// Categorization Rule
export interface CategorizationRule {
  id: string;
  categoryId: string;
  pattern: string; // Regex pattern
  priority: number; // Lower = higher priority
  enabled: boolean;
}

// User Preferences
export interface Preferences {
  categories: Category[];
  rules: CategorizationRule[];
  excludedTransactionSignatures: string[]; // Signatures of excluded transactions (persist across data clearing)
  excludedRepeatedExpensePatterns: string[]; // Merchant patterns of excluded repeated expenses
  version: number; // Schema version
  lastModified: Date;
}

// Monthly Summary
export interface MonthlySummary {
  month: string; // "2025-01" format
  totalDebits: number;
  totalCredits: number;
  net: number;
  categoryTotals: Record<string, number>;
  transactionCount: number;
}

// Repeated Expense
export interface RepeatedExpense {
  merchantPattern: string;
  occurrences: number;
  averageAmount: number;
  totalAmount: number;
  transactionIds: string[];
  isLikelySubscription: boolean;
  estimatedMonthly?: number;
}

// Derived Analytics
export interface DerivedAnalytics {
  monthlySummaries: MonthlySummary[];
  categoryTotals: Record<string, number>;
  repeatedExpenses: RepeatedExpense[];
  overallStats: {
    totalDebits: number;
    totalCredits: number;
    net: number;
    transactionCount: number;
    dateRange: { start: Date; end: Date } | null;
    monthCount: number;
    averageMonthlyExpenses: number;
  };
}

// Parse Error
export interface ParseError {
  line?: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

// Parse Result
export interface ParseResult {
  transactions: Transaction[];
  errors: ParseError[];
}

// App State
export interface AppState {
  transactions: Transaction[];
  categories: Category[];
  rules: CategorizationRule[];
  preferences: Preferences;
  excludedIds: Set<string>;
  excludedRepeatedExpenses: Set<string>; // merchant patterns of excluded repeated expenses
  manualOverrides: Map<string, string>; // transactionId -> categoryId
  descriptionMappings: Map<string, string>; // description -> categoryId
  isLoading: boolean;
  errors: string[];
}

// App Context Value
export interface AppContextValue {
  state: AppState;
  actions: {
    uploadFiles: (files: File[]) => Promise<void>;
    categorizeTransaction: (id: string, categoryId: string) => void;
    toggleExclusion: (id: string) => void;
    toggleRepeatedExpenseExclusion: (merchantPattern: string, transactionIds: string[]) => void;
    addCategory: (category: Category) => void;
    updateCategory: (category: Category) => void;
    addRule: (rule: CategorizationRule) => void;
    deleteCategory: (categoryId: string) => void;
    deleteRule: (ruleId: string) => void;
    updateRule: (rule: CategorizationRule) => void;
    // Pattern management
    addPatternToCategory: (categoryId: string, pattern: CategoryPattern) => void;
    updatePattern: (categoryId: string, pattern: CategoryPattern) => void;
    deletePattern: (categoryId: string, patternId: string) => void;
    reorderPatterns: (categoryId: string, patterns: CategoryPattern[]) => void;
    // Description mapping management
    deleteDescriptionMapping: (description: string) => void;
    exportPreferences: () => void;
    importPreferences: (file: File) => Promise<void>;
    exportData: () => void;
    clearTransactions: () => void;
    clearAllData: () => void;
    loadSampleData: () => Promise<void>;
  };
}
