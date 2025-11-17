import { createContext, useContext, useReducer, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { AppState, AppContextValue, Transaction, Category, CategorizationRule, Preferences, CategoryPattern } from '../types';
import { StorageManager } from '../lib/storage/manager';
import { parseFiles } from '../lib/parsers';
import { CategorizationEngine } from '../lib/categorization/engine';
import { getDefaultPreferences } from '../lib/defaults';
import { generateSampleData } from '../lib/sampleData';
import { generateTransactionSignatureSync } from '../lib/utils';
import { extractSettingsFromURL, clearSettingsFromURL, generateShareableURL, type ExportableSettings } from '../lib/urlEncoder';

// Initial state
const initialState: AppState = {
  transactions: [],
  categories: [],
  rules: [],
  preferences: getDefaultPreferences(),
  excludedIds: new Set(),
  excludedRepeatedExpenses: new Set(),
  manualOverrides: new Map(),
  descriptionMappings: new Map(),
  isLoading: false,
  errors: [],
  timeWindowFilter: {
    enabled: false,
    startDate: null,
    endDate: null,
  },
  selectedCategories: new Set(),
};

// Action types
type AppAction =
  | { type: 'LOAD_DATA'; payload: { transactions: Transaction[]; preferences: Preferences; manualOverrides: Map<string, string>; descriptionMappings: Map<string, string> } }
  | { type: 'ADD_TRANSACTIONS'; payload: { transactions: Transaction[]; errors: string[] } }
  | { type: 'CATEGORIZE_TRANSACTION'; payload: { id: string; categoryId: string; description: string } }
  | { type: 'RECATEGORIZE_TRANSACTIONS'; payload: { preserveManual: boolean } }
  | { type: 'TOGGLE_EXCLUSION'; payload: string }
  | { type: 'TOGGLE_REPEATED_EXPENSE_EXCLUSION'; payload: { merchantPattern: string; transactionIds: string[] } }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_RULE'; payload: CategorizationRule }
  | { type: 'DELETE_RULE'; payload: string }
  | { type: 'UPDATE_RULE'; payload: CategorizationRule }
  | { type: 'ADD_PATTERN'; payload: { categoryId: string; pattern: CategoryPattern } }
  | { type: 'UPDATE_PATTERN'; payload: { categoryId: string; pattern: CategoryPattern } }
  | { type: 'DELETE_PATTERN'; payload: { categoryId: string; patternId: string } }
  | { type: 'REORDER_PATTERNS'; payload: { categoryId: string; patterns: CategoryPattern[] } }
  | { type: 'DELETE_DESCRIPTION_MAPPING'; payload: string }
  | { type: 'UPDATE_TIME_WINDOW_FILTER'; payload: { enabled: boolean; startDate: string | null; endDate: string | null } }
  | { type: 'TOGGLE_CATEGORY_FILTER'; payload: string }
  | { type: 'CLEAR_CATEGORY_FILTER' }
  | { type: 'IMPORT_PREFERENCES'; payload: Preferences }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'CLEAR_TRANSACTIONS' }
  | { type: 'CLEAR_ALL' };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_DATA': {
      // Build sets from signature-based exclusions
      const signatureSet = new Set(action.payload.preferences.excludedTransactionSignatures || []);
      const patternSet = new Set(action.payload.preferences.excludedRepeatedExpensePatterns || []);

      // Apply exclusions to transactions based on signatures
      const excludedIdsFromSignatures = new Set<string>();
      const transactionsWithExclusions = action.payload.transactions.map(t => {
        const signature = generateTransactionSignatureSync(t.date, t.amount, t.description);
        const isExcluded = signatureSet.has(signature);

        if (isExcluded) {
          excludedIdsFromSignatures.add(t.id);
        }

        return {
          ...t,
          isExcluded
        };
      });

      return {
        ...state,
        transactions: transactionsWithExclusions,
        preferences: action.payload.preferences,
        categories: action.payload.preferences.categories,
        rules: action.payload.preferences.rules,
        excludedIds: excludedIdsFromSignatures,
        excludedRepeatedExpenses: patternSet,
        manualOverrides: action.payload.manualOverrides,
        descriptionMappings: action.payload.descriptionMappings,
        timeWindowFilter: action.payload.preferences.timeWindowFilter || {
          enabled: false,
          startDate: null,
          endDate: null
        },
        isLoading: false
      };
    }

    case 'ADD_TRANSACTIONS': {
      // Deduplicate transactions by ID
      const existingIds = new Set(state.transactions.map(t => t.id));
      const newTransactions = action.payload.transactions.filter(t => !existingIds.has(t.id));

      // Apply exclusions based on signatures
      const signatureSet = new Set(state.preferences.excludedTransactionSignatures || []);
      const nextExcludedIds = new Set(state.excludedIds);

      const transactionsWithExclusions = newTransactions.map(t => {
        const signature = generateTransactionSignatureSync(t.date, t.amount, t.description);
        const isExcluded = signatureSet.has(signature);

        if (isExcluded) {
          nextExcludedIds.add(t.id);
        }

        return {
          ...t,
          isExcluded
        };
      });

      return {
        ...state,
        transactions: [...state.transactions, ...transactionsWithExclusions],
        excludedIds: nextExcludedIds,
        errors: action.payload.errors
      };
    }

    case 'CATEGORIZE_TRANSACTION': {
      // Update description mapping for all transactions with same description
      const nextDescriptionMappings = new Map(state.descriptionMappings);
      nextDescriptionMappings.set(action.payload.description, action.payload.categoryId);

      // Update all transactions with the same description
      const updatedTransactions = state.transactions.map(t => {
        if (t.description === action.payload.description) {
          return { ...t, categoryId: action.payload.categoryId, isManuallyCategorized: true };
        }
        return t;
      });

      // Also set manual override for the specific transaction
      const nextManualOverrides = new Map(state.manualOverrides);
      nextManualOverrides.set(action.payload.id, action.payload.categoryId);

      return {
        ...state,
        transactions: updatedTransactions,
        manualOverrides: nextManualOverrides,
        descriptionMappings: nextDescriptionMappings
      };
    }

    case 'RECATEGORIZE_TRANSACTIONS': {
      const engine = new CategorizationEngine(
        state.categories,
        state.rules,
        state.descriptionMappings
      );

      const recategorizedTransactions = state.transactions.map(t => {
        // Skip excluded transactions
        if (t.isExcluded) {
          return t;
        }

        // Skip manually categorized transactions if preserveManual is true
        if (action.payload.preserveManual && t.isManuallyCategorized) {
          return t;
        }

        // Recategorize the transaction
        const newCategoryId = engine.categorize(t);
        return {
          ...t,
          categoryId: newCategoryId,
          // If we're recategorizing, clear the manual flag unless preserveManual is true and it was already manual
          isManuallyCategorized: action.payload.preserveManual && t.isManuallyCategorized
        };
      });

      return {
        ...state,
        transactions: recategorizedTransactions
      };
    }

    case 'TOGGLE_EXCLUSION': {
      const transaction = state.transactions.find(t => t.id === action.payload);
      if (!transaction) return state;

      // Generate signature for this transaction
      const signature = generateTransactionSignatureSync(
        transaction.date,
        transaction.amount,
        transaction.description
      );

      // Update exclusion signatures in preferences
      const nextSignatures = [...state.preferences.excludedTransactionSignatures];
      const signatureIndex = nextSignatures.indexOf(signature);

      if (signatureIndex >= 0) {
        nextSignatures.splice(signatureIndex, 1);
      } else {
        nextSignatures.push(signature);
      }

      // Update runtime excludedIds set
      const nextExcludedIds = new Set(state.excludedIds);
      if (nextExcludedIds.has(action.payload)) {
        nextExcludedIds.delete(action.payload);
      } else {
        nextExcludedIds.add(action.payload);
      }

      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload
            ? { ...t, isExcluded: !t.isExcluded }
            : t
        ),
        excludedIds: nextExcludedIds,
        preferences: {
          ...state.preferences,
          excludedTransactionSignatures: nextSignatures
        }
      };
    }

    case 'TOGGLE_REPEATED_EXPENSE_EXCLUSION': {
      const { merchantPattern, transactionIds } = action.payload;
      const nextExcludedRepeated = new Set(state.excludedRepeatedExpenses);
      const isCurrentlyExcluded = nextExcludedRepeated.has(merchantPattern);

      // Toggle the merchant pattern exclusion
      if (isCurrentlyExcluded) {
        nextExcludedRepeated.delete(merchantPattern);
      } else {
        nextExcludedRepeated.add(merchantPattern);
      }

      // Update exclusion patterns in preferences
      const nextPatterns = [...state.preferences.excludedRepeatedExpensePatterns];
      const patternIndex = nextPatterns.indexOf(merchantPattern);

      if (isCurrentlyExcluded) {
        if (patternIndex >= 0) {
          nextPatterns.splice(patternIndex, 1);
        }
      } else {
        if (patternIndex < 0) {
          nextPatterns.push(merchantPattern);
        }
      }

      // Toggle all transactions in this repeated expense group
      const nextExcludedIds = new Set(state.excludedIds);
      const affectedTransactions = state.transactions.filter(t => transactionIds.includes(t.id));

      // Update signatures for all affected transactions
      const nextSignatures = [...state.preferences.excludedTransactionSignatures];

      affectedTransactions.forEach(transaction => {
        const signature = generateTransactionSignatureSync(
          transaction.date,
          transaction.amount,
          transaction.description
        );
        const sigIndex = nextSignatures.indexOf(signature);

        if (isCurrentlyExcluded) {
          // Remove signature and ID
          if (sigIndex >= 0) {
            nextSignatures.splice(sigIndex, 1);
          }
          nextExcludedIds.delete(transaction.id);
        } else {
          // Add signature and ID
          if (sigIndex < 0) {
            nextSignatures.push(signature);
          }
          nextExcludedIds.add(transaction.id);
        }
      });

      // Update all transactions
      const updatedTransactions = state.transactions.map(t =>
        transactionIds.includes(t.id)
          ? { ...t, isExcluded: !isCurrentlyExcluded }
          : t
      );

      return {
        ...state,
        transactions: updatedTransactions,
        excludedIds: nextExcludedIds,
        excludedRepeatedExpenses: nextExcludedRepeated,
        preferences: {
          ...state.preferences,
          excludedTransactionSignatures: nextSignatures,
          excludedRepeatedExpensePatterns: nextPatterns
        }
      };
    }

    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, action.payload],
        preferences: {
          ...state.preferences,
          categories: [...state.preferences.categories, action.payload]
        }
      };

    case 'UPDATE_CATEGORY': {
      const updatedCategories = state.categories.map(c =>
        c.id === action.payload.id ? action.payload : c
      );
      return {
        ...state,
        categories: updatedCategories,
        preferences: {
          ...state.preferences,
          categories: updatedCategories
        }
      };
    }

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload),
        preferences: {
          ...state.preferences,
          categories: state.preferences.categories.filter(c => c.id !== action.payload)
        }
      };

    case 'ADD_PATTERN': {
      const updatedCategoriesAdd = state.categories.map(c =>
        c.id === action.payload.categoryId
          ? { ...c, patterns: [...c.patterns, action.payload.pattern] }
          : c
      );
      return {
        ...state,
        categories: updatedCategoriesAdd,
        preferences: {
          ...state.preferences,
          categories: updatedCategoriesAdd
        }
      };
    }

    case 'UPDATE_PATTERN': {
      const updatedCategoriesUpdate = state.categories.map(c =>
        c.id === action.payload.categoryId
          ? {
              ...c,
              patterns: c.patterns.map(p =>
                p.id === action.payload.pattern.id ? action.payload.pattern : p
              )
            }
          : c
      );
      return {
        ...state,
        categories: updatedCategoriesUpdate,
        preferences: {
          ...state.preferences,
          categories: updatedCategoriesUpdate
        }
      };
    }

    case 'DELETE_PATTERN': {
      const updatedCategoriesDelete = state.categories.map(c =>
        c.id === action.payload.categoryId
          ? { ...c, patterns: c.patterns.filter(p => p.id !== action.payload.patternId) }
          : c
      );
      return {
        ...state,
        categories: updatedCategoriesDelete,
        preferences: {
          ...state.preferences,
          categories: updatedCategoriesDelete
        }
      };
    }

    case 'REORDER_PATTERNS': {
      const updatedCategoriesReorder = state.categories.map(c =>
        c.id === action.payload.categoryId
          ? { ...c, patterns: action.payload.patterns }
          : c
      );
      return {
        ...state,
        categories: updatedCategoriesReorder,
        preferences: {
          ...state.preferences,
          categories: updatedCategoriesReorder
        }
      };
    }

    case 'DELETE_DESCRIPTION_MAPPING': {
      const nextMappings = new Map(state.descriptionMappings);
      nextMappings.delete(action.payload);
      return {
        ...state,
        descriptionMappings: nextMappings
      };
    }

    case 'ADD_RULE':
      return {
        ...state,
        rules: [...state.rules, action.payload],
        preferences: {
          ...state.preferences,
          rules: [...state.preferences.rules, action.payload]
        }
      };

    case 'DELETE_RULE':
      return {
        ...state,
        rules: state.rules.filter(r => r.id !== action.payload),
        preferences: {
          ...state.preferences,
          rules: state.preferences.rules.filter(r => r.id !== action.payload)
        }
      };

    case 'UPDATE_RULE':
      return {
        ...state,
        rules: state.rules.map(r => r.id === action.payload.id ? action.payload : r),
        preferences: {
          ...state.preferences,
          rules: state.preferences.rules.map(r => r.id === action.payload.id ? action.payload : r)
        }
      };

    case 'UPDATE_TIME_WINDOW_FILTER':
      return {
        ...state,
        timeWindowFilter: action.payload,
        preferences: {
          ...state.preferences,
          timeWindowFilter: action.payload
        }
      };

    case 'TOGGLE_CATEGORY_FILTER': {
      const nextSelectedCategories = new Set(state.selectedCategories);
      if (nextSelectedCategories.has(action.payload)) {
        nextSelectedCategories.delete(action.payload);
      } else {
        nextSelectedCategories.add(action.payload);
      }
      return {
        ...state,
        selectedCategories: nextSelectedCategories
      };
    }

    case 'CLEAR_CATEGORY_FILTER':
      return {
        ...state,
        selectedCategories: new Set()
      };

    case 'IMPORT_PREFERENCES':
      return {
        ...state,
        preferences: action.payload,
        categories: action.payload.categories,
        rules: action.payload.rules,
        timeWindowFilter: action.payload.timeWindowFilter || {
          enabled: false,
          startDate: null,
          endDate: null
        }
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_ERROR':
      return { ...state, errors: [...state.errors, action.payload] };

    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };

    case 'CLEAR_TRANSACTIONS':
      // Clear transactions and runtime state, but preserve exclusion signatures in preferences
      return {
        ...state,
        transactions: [],
        excludedIds: new Set(),
        excludedRepeatedExpenses: new Set(),
        manualOverrides: new Map()
        // Note: preferences.excludedTransactionSignatures and excludedRepeatedExpensePatterns are preserved
      };

    case 'CLEAR_ALL':
      return initialState;

    default:
      return state;
  }
}

// Create context
const AppContext = createContext<AppContextValue | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const storage = useMemo(() => new StorageManager(), []);
  const isInitialLoadRef = useRef(true);

  // Load data on mount
  useEffect(() => {
    // First, check if there are settings in the URL
    const urlSettings = extractSettingsFromURL();

    let preferences: Preferences;
    let descriptionMappings: Map<string, string>;
    let manualOverrides: Map<string, string>;

    if (urlSettings) {
      // Import settings from URL
      preferences = urlSettings.preferences;
      descriptionMappings = new Map(Object.entries(urlSettings.descriptionMappings));
      manualOverrides = urlSettings.manualOverrides
        ? new Map(Object.entries(urlSettings.manualOverrides))
        : new Map();

      // Save the imported settings to localStorage
      storage.savePreferences(preferences);
      storage.saveDescriptionMappings(descriptionMappings);
      if (manualOverrides.size > 0) {
        storage.saveManualOverrides(manualOverrides);
      }

      // Clear the URL
      clearSettingsFromURL();
    } else {
      // Load from localStorage as usual
      preferences = storage.loadPreferences() || getDefaultPreferences();
      manualOverrides = storage.loadManualOverrides();
      descriptionMappings = storage.loadDescriptionMappings();
    }

    const transactions = storage.loadTransactions();

    // Apply manual overrides to loaded transactions (exclusions are handled by LOAD_DATA based on signatures)
    const updatedTransactions = transactions.map(t => ({
      ...t,
      categoryId: manualOverrides.get(t.id) || t.categoryId,
      isManuallyCategorized: manualOverrides.has(t.id)
    }));

    dispatch({
      type: 'LOAD_DATA',
      payload: { transactions: updatedTransactions, preferences, manualOverrides, descriptionMappings }
    });

    // Mark initial load as complete after state update
    // Use setTimeout to ensure this runs after all save effects have checked the ref
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 0);
  }, [storage]);

  // Save transactions when they change
  useEffect(() => {
    if (state.transactions.length > 0) {
      try {
        storage.saveTransactions(state.transactions);
      } catch (error) {
        dispatch({
          type: 'ADD_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to save transactions'
        });
      }
    }
  }, [state.transactions, storage]);

  // Save preferences when they change (but skip initial load)
  useEffect(() => {
    if (isInitialLoadRef.current) return;

    try {
      storage.savePreferences(state.preferences);
    } catch (error) {
      dispatch({
        type: 'ADD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to save preferences'
      });
    }
  }, [state.preferences, storage]);

  // Note: Exclusion state (excludedIds and excludedRepeatedExpenses) is now stored in preferences
  // as signature-based exclusions, so we don't need separate save hooks for them.
  // They are automatically saved when preferences are saved.

  // Save manual overrides when they change (but skip initial load)
  useEffect(() => {
    if (isInitialLoadRef.current) return;

    try {
      storage.saveManualOverrides(state.manualOverrides);
    } catch (error) {
      dispatch({
        type: 'ADD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to save manual overrides'
      });
    }
  }, [state.manualOverrides, storage]);

  // Save description mappings when they change (but skip initial load)
  useEffect(() => {
    if (isInitialLoadRef.current) return;

    try {
      storage.saveDescriptionMappings(state.descriptionMappings);
    } catch (error) {
      dispatch({
        type: 'ADD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to save description mappings'
      });
    }
  }, [state.descriptionMappings, storage]);

  // Actions
  const actions = useMemo(() => ({
    uploadFiles: async (files: File[]) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });

      try {
        const result = await parseFiles(files);

        if (result.errors.length > 0) {
          result.errors.forEach(err => {
            dispatch({ type: 'ADD_ERROR', payload: err.message });
          });
        }

        if (result.transactions.length > 0) {
          // Auto-categorize new transactions
          const engine = new CategorizationEngine(
            state.categories,
            state.rules,
            state.descriptionMappings
          );
          engine.batchCategorize(result.transactions);

          dispatch({
            type: 'ADD_TRANSACTIONS',
            payload: {
              transactions: result.transactions,
              errors: result.errors.map(e => e.message)
            }
          });
        }
      } catch (error) {
        dispatch({
          type: 'ADD_ERROR',
          payload: error instanceof Error ? error.message : 'Unknown error during file upload'
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    categorizeTransaction: (id: string, categoryId: string) => {
      const transaction = state.transactions.find(t => t.id === id);
      if (transaction) {
        dispatch({
          type: 'CATEGORIZE_TRANSACTION',
          payload: { id, categoryId, description: transaction.description }
        });
      }
    },

    recategorizeTransactions: (preserveManual: boolean = true) => {
      dispatch({ type: 'RECATEGORIZE_TRANSACTIONS', payload: { preserveManual } });
    },

    toggleExclusion: (id: string) => {
      dispatch({ type: 'TOGGLE_EXCLUSION', payload: id });
    },

    toggleRepeatedExpenseExclusion: (merchantPattern: string, transactionIds: string[]) => {
      dispatch({ type: 'TOGGLE_REPEATED_EXPENSE_EXCLUSION', payload: { merchantPattern, transactionIds } });
    },

    addCategory: (category: Category) => {
      dispatch({ type: 'ADD_CATEGORY', payload: category });
    },

    updateCategory: (category: Category) => {
      dispatch({ type: 'UPDATE_CATEGORY', payload: category });
    },

    deleteCategory: (categoryId: string) => {
      dispatch({ type: 'DELETE_CATEGORY', payload: categoryId });
    },

    addPatternToCategory: (categoryId: string, pattern: CategoryPattern) => {
      dispatch({ type: 'ADD_PATTERN', payload: { categoryId, pattern } });
    },

    updatePattern: (categoryId: string, pattern: CategoryPattern) => {
      dispatch({ type: 'UPDATE_PATTERN', payload: { categoryId, pattern } });
    },

    deletePattern: (categoryId: string, patternId: string) => {
      dispatch({ type: 'DELETE_PATTERN', payload: { categoryId, patternId } });
    },

    reorderPatterns: (categoryId: string, patterns: CategoryPattern[]) => {
      dispatch({ type: 'REORDER_PATTERNS', payload: { categoryId, patterns } });
    },

    deleteDescriptionMapping: (description: string) => {
      dispatch({ type: 'DELETE_DESCRIPTION_MAPPING', payload: description });
    },

    addRule: (rule: CategorizationRule) => {
      dispatch({ type: 'ADD_RULE', payload: rule });
    },

    deleteRule: (ruleId: string) => {
      dispatch({ type: 'DELETE_RULE', payload: ruleId });
    },

    updateRule: (rule: CategorizationRule) => {
      dispatch({ type: 'UPDATE_RULE', payload: rule });
    },

    updateTimeWindowFilter: (filter: { enabled: boolean; startDate: string | null; endDate: string | null }) => {
      dispatch({ type: 'UPDATE_TIME_WINDOW_FILTER', payload: filter });
    },

    toggleCategoryFilter: (categoryId: string) => {
      dispatch({ type: 'TOGGLE_CATEGORY_FILTER', payload: categoryId });
    },

    clearCategoryFilter: () => {
      dispatch({ type: 'CLEAR_CATEGORY_FILTER' });
    },

    exportPreferences: () => {
      storage.exportPreferences(state.preferences);
    },

    importPreferences: async (file: File) => {
      try {
        const prefs = await storage.importPreferences(file);
        dispatch({ type: 'IMPORT_PREFERENCES', payload: prefs });
      } catch (error) {
        dispatch({
          type: 'ADD_ERROR',
          payload: error instanceof Error ? error.message : 'Error importing preferences'
        });
      }
    },

    generateShareableURL: () => {
      try {
        const settings: ExportableSettings = {
          preferences: state.preferences,
          descriptionMappings: Object.fromEntries(state.descriptionMappings),
          manualOverrides: state.manualOverrides.size > 0
            ? Object.fromEntries(state.manualOverrides)
            : undefined
        };

        const url = generateShareableURL(settings);

        // Copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
          alert('Shareable URL copied to clipboard!\n\nAnyone who visits this URL will get your settings and preferences (but not your transactions).');
        }).catch(() => {
          // Fallback: show the URL in a prompt
          prompt('Copy this shareable URL:', url);
        });
      } catch (error) {
        dispatch({
          type: 'ADD_ERROR',
          payload: error instanceof Error ? error.message : 'Error generating shareable URL'
        });
      }
    },

    exportData: () => {
      storage.exportAllData(
        state.transactions,
        state.preferences,
        state.excludedIds,
        state.excludedRepeatedExpenses,
        state.manualOverrides,
        state.descriptionMappings
      );
    },

    clearTransactions: () => {
      if (confirm('Are you sure you want to clear all transactions? Your categories, patterns, and mappings will be preserved.')) {
        storage.clearTransactions();
        dispatch({ type: 'CLEAR_TRANSACTIONS' });
      }
    },

    clearAllData: () => {
      if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        storage.clearAll();
        dispatch({ type: 'CLEAR_ALL' });
      }
    },

    loadSampleData: async () => {
      try {
        const sampleTransactions = await generateSampleData();

        // Auto-categorize sample transactions
        const engine = new CategorizationEngine(
          state.categories,
          state.rules,
          state.descriptionMappings
        );
        engine.batchCategorize(sampleTransactions);

        dispatch({
          type: 'ADD_TRANSACTIONS',
          payload: {
            transactions: sampleTransactions,
            errors: []
          }
        });
      } catch (error) {
        dispatch({
          type: 'ADD_ERROR',
          payload: error instanceof Error ? error.message : 'Error loading sample data'
        });
      }
    }
  }), [state.categories, state.rules, state.preferences, state.transactions, state.excludedIds, state.manualOverrides, state.descriptionMappings, storage]);

  // Compute filtered transactions based on time window filter and category filter
  const filteredTransactions = useMemo(() => {
    let filtered = state.transactions;

    // Apply time window filter
    if (state.timeWindowFilter.enabled && state.timeWindowFilter.startDate && state.timeWindowFilter.endDate) {
      // Parse dates as local dates (not UTC) by extracting year, month, day
      const parseLocalDate = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
      };

      const startDate = parseLocalDate(state.timeWindowFilter.startDate);
      const endDate = parseLocalDate(state.timeWindowFilter.endDate);

      filtered = filtered.filter(t => {
        const txDate = t.date instanceof Date ? t.date : new Date(t.date);
        // Start date is included, end date is excluded
        return txDate >= startDate && txDate < endDate;
      });
    }

    // Apply category filter
    if (state.selectedCategories.size > 0) {
      filtered = filtered.filter(t => {
        const categoryId = t.categoryId || 'uncategorized';
        return state.selectedCategories.has(categoryId);
      });
    }

    return filtered;
  }, [state.transactions, state.timeWindowFilter, state.selectedCategories]);

  const value: AppContextValue = {
    state,
    filteredTransactions,
    actions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
