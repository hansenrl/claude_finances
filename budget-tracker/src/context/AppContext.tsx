import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AppState, AppContextValue, Transaction, Category, CategorizationRule, Preferences, CategoryPattern } from '../types';
import { StorageManager } from '../lib/storage/manager';
import { parseFiles } from '../lib/parsers';
import { CategorizationEngine } from '../lib/categorization/engine';
import { getDefaultPreferences } from '../lib/defaults';
import { generateSampleData } from '../lib/sampleData';

// Initial state
const initialState: AppState = {
  transactions: [],
  categories: [],
  rules: [],
  preferences: getDefaultPreferences(),
  excludedIds: new Set(),
  manualOverrides: new Map(),
  isLoading: false,
  errors: [],
};

// Action types
type AppAction =
  | { type: 'LOAD_DATA'; payload: { transactions: Transaction[]; preferences: Preferences; excludedIds: Set<string>; manualOverrides: Map<string, string> } }
  | { type: 'ADD_TRANSACTIONS'; payload: { transactions: Transaction[]; errors: string[] } }
  | { type: 'CATEGORIZE_TRANSACTION'; payload: { id: string; categoryId: string } }
  | { type: 'TOGGLE_EXCLUSION'; payload: string }
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
  | { type: 'IMPORT_PREFERENCES'; payload: Preferences }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'CLEAR_ALL' };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        transactions: action.payload.transactions,
        preferences: action.payload.preferences,
        categories: action.payload.preferences.categories,
        rules: action.payload.preferences.rules,
        excludedIds: action.payload.excludedIds,
        manualOverrides: action.payload.manualOverrides,
        isLoading: false
      };

    case 'ADD_TRANSACTIONS': {
      // Deduplicate transactions by ID
      const existingIds = new Set(state.transactions.map(t => t.id));
      const newTransactions = action.payload.transactions.filter(t => !existingIds.has(t.id));

      return {
        ...state,
        transactions: [...state.transactions, ...newTransactions],
        errors: action.payload.errors
      };
    }

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

    case 'IMPORT_PREFERENCES':
      return {
        ...state,
        preferences: action.payload,
        categories: action.payload.categories,
        rules: action.payload.rules
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_ERROR':
      return { ...state, errors: [...state.errors, action.payload] };

    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };

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

  // Load data on mount
  useEffect(() => {
    const transactions = storage.loadTransactions();
    const preferences = storage.loadPreferences() || getDefaultPreferences();
    const excludedIds = storage.loadExcludedIds();
    const manualOverrides = storage.loadManualOverrides();

    // Apply exclusions and manual overrides to loaded transactions
    const updatedTransactions = transactions.map(t => ({
      ...t,
      isExcluded: excludedIds.has(t.id),
      categoryId: manualOverrides.get(t.id) || t.categoryId,
      isManuallyCategorized: manualOverrides.has(t.id)
    }));

    dispatch({
      type: 'LOAD_DATA',
      payload: { transactions: updatedTransactions, preferences, excludedIds, manualOverrides }
    });
  }, [storage]);

  // Save transactions when they change
  useEffect(() => {
    if (state.transactions.length > 0) {
      storage.saveTransactions(state.transactions);
    }
  }, [state.transactions, storage]);

  // Save preferences when they change
  useEffect(() => {
    storage.savePreferences(state.preferences);
  }, [state.preferences, storage]);

  // Save excluded IDs when they change
  useEffect(() => {
    storage.saveExcludedIds(state.excludedIds);
  }, [state.excludedIds, storage]);

  // Save manual overrides when they change
  useEffect(() => {
    storage.saveManualOverrides(state.manualOverrides);
  }, [state.manualOverrides, storage]);

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
            state.rules
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

    addRule: (rule: CategorizationRule) => {
      dispatch({ type: 'ADD_RULE', payload: rule });
    },

    deleteRule: (ruleId: string) => {
      dispatch({ type: 'DELETE_RULE', payload: ruleId });
    },

    updateRule: (rule: CategorizationRule) => {
      dispatch({ type: 'UPDATE_RULE', payload: rule });
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

    exportData: () => {
      storage.exportAllData(
        state.transactions,
        state.preferences,
        state.excludedIds,
        state.manualOverrides
      );
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
          state.rules
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
  }), [state.categories, state.rules, state.preferences, state.transactions, state.excludedIds, state.manualOverrides, storage]);

  const value: AppContextValue = {
    state,
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
