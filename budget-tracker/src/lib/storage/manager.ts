import type { Transaction, Preferences } from '../../types';
import { format } from 'date-fns';
import { downloadBlob } from '../utils';

const STORAGE_KEYS = {
  TRANSACTIONS: 'budget_tracker_transactions',
  PREFERENCES: 'budget_tracker_preferences',
  EXCLUDED_IDS: 'budget_tracker_excluded_ids',
  EXCLUDED_REPEATED_EXPENSES: 'budget_tracker_excluded_repeated_expenses',
  MANUAL_OVERRIDES: 'budget_tracker_manual_overrides',
  DESCRIPTION_MAPPINGS: 'budget_tracker_description_mappings',
  VERSION: 'budget_tracker_version'
} as const;

const CURRENT_VERSION = 1;

export class StorageManager {
  /**
   * Save transactions to localStorage
   */
  saveTransactions(transactions: Transaction[]): void {
    try {
      const serialized = JSON.stringify(transactions, this.dateReplacer);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, serialized);
    } catch (e) {
      if (this.isQuotaExceeded(e)) {
        throw new Error('Storage quota exceeded. Please clear old data or export to file.');
      }
      throw e;
    }
  }

  /**
   * Load transactions from localStorage
   */
  loadTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) return [];

      const parsed = JSON.parse(data, this.dateReviver);
      return parsed;
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences(preferences: Preferences): void {
    try {
      const data = {
        ...preferences,
        version: CURRENT_VERSION,
        lastModified: new Date()
      };
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(data, this.dateReplacer));
    } catch (e) {
      if (this.isQuotaExceeded(e)) {
        throw new Error('Storage quota exceeded. Unable to save preferences.');
      }
      console.error('Error saving preferences:', e);
      throw new Error('Failed to save preferences. Please try again.');
    }
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences(): Preferences | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (!data) return null;

      const parsed = JSON.parse(data, this.dateReviver);

      // Ensure new fields exist with default values (for backwards compatibility)
      if (!parsed.excludedTransactionSignatures) {
        parsed.excludedTransactionSignatures = [];
      }
      if (!parsed.excludedRepeatedExpensePatterns) {
        parsed.excludedRepeatedExpensePatterns = [];
      }

      // Handle version migrations
      if (parsed.version !== CURRENT_VERSION) {
        return this.migratePreferences(parsed);
      }

      return parsed;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return null;
    }
  }

  /**
   * Save excluded transaction IDs
   */
  saveExcludedIds(ids: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EXCLUDED_IDS, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.error('Error saving excluded IDs:', e);
      if (this.isQuotaExceeded(e)) {
        throw new Error('Storage quota exceeded. Unable to save excluded IDs.');
      }
      throw new Error('Failed to save excluded IDs. Please try again.');
    }
  }

  /**
   * Load excluded transaction IDs
   */
  loadExcludedIds(): Set<string> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXCLUDED_IDS);
      if (!data) return new Set();

      const parsed = JSON.parse(data);
      return new Set(parsed);
    } catch (error) {
      console.error('Error loading excluded IDs:', error);
      return new Set();
    }
  }

  /**
   * Save excluded repeated expense patterns
   */
  saveExcludedRepeatedExpenses(patterns: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EXCLUDED_REPEATED_EXPENSES, JSON.stringify(Array.from(patterns)));
    } catch (e) {
      console.error('Error saving excluded repeated expenses:', e);
      if (this.isQuotaExceeded(e)) {
        throw new Error('Storage quota exceeded. Unable to save excluded repeated expenses.');
      }
      throw new Error('Failed to save excluded repeated expenses. Please try again.');
    }
  }

  /**
   * Load excluded repeated expense patterns
   */
  loadExcludedRepeatedExpenses(): Set<string> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXCLUDED_REPEATED_EXPENSES);
      if (!data) return new Set();

      const parsed = JSON.parse(data);
      return new Set(parsed);
    } catch (error) {
      console.error('Error loading excluded repeated expenses:', error);
      return new Set();
    }
  }

  /**
   * Save manual category overrides
   */
  saveManualOverrides(overrides: Map<string, string>): void {
    try {
      const obj = Object.fromEntries(overrides);
      localStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDES, JSON.stringify(obj));
    } catch (e) {
      console.error('Error saving manual overrides:', e);
      if (this.isQuotaExceeded(e)) {
        throw new Error('Storage quota exceeded. Unable to save manual overrides.');
      }
      throw new Error('Failed to save manual overrides. Please try again.');
    }
  }

  /**
   * Load manual category overrides
   */
  loadManualOverrides(): Map<string, string> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MANUAL_OVERRIDES);
      if (!data) return new Map();

      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error) {
      console.error('Error loading manual overrides:', error);
      return new Map();
    }
  }

  /**
   * Save description mappings
   */
  saveDescriptionMappings(mappings: Map<string, string>): void {
    try {
      const obj = Object.fromEntries(mappings);
      localStorage.setItem(STORAGE_KEYS.DESCRIPTION_MAPPINGS, JSON.stringify(obj));
    } catch (e) {
      console.error('Error saving description mappings:', e);
      if (this.isQuotaExceeded(e)) {
        throw new Error('Storage quota exceeded. Unable to save description mappings.');
      }
      throw new Error('Failed to save description mappings. Please try again.');
    }
  }

  /**
   * Load description mappings
   */
  loadDescriptionMappings(): Map<string, string> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DESCRIPTION_MAPPINGS);
      if (!data) return new Map();

      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error) {
      console.error('Error loading description mappings:', error);
      return new Map();
    }
  }

  /**
   * Export preferences as JSON blob
   */
  exportPreferences(preferences: Preferences): void {
    const json = JSON.stringify(preferences, this.dateReplacer, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `budget_preferences_${format(new Date(), 'yyyy-MM-dd')}.json`;
    downloadBlob(blob, filename);
  }

  /**
   * Export all data (transactions + preferences + state) as JSON blob
   */
  exportAllData(
    transactions: Transaction[],
    preferences: Preferences,
    excludedIds: Set<string>,
    excludedRepeatedExpenses: Set<string>,
    manualOverrides: Map<string, string>,
    descriptionMappings: Map<string, string>
  ): void {
    const data = {
      transactions,
      preferences,
      excludedIds: Array.from(excludedIds),
      excludedRepeatedExpenses: Array.from(excludedRepeatedExpenses),
      manualOverrides: Object.fromEntries(manualOverrides),
      descriptionMappings: Object.fromEntries(descriptionMappings),
      exportedAt: new Date(),
      version: CURRENT_VERSION
    };

    const json = JSON.stringify(data, this.dateReplacer, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `budget_tracker_data_${format(new Date(), 'yyyy-MM-dd')}.json`;
    downloadBlob(blob, filename);
  }

  /**
   * Import preferences from file
   */
  async importPreferences(file: File): Promise<Preferences> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string, this.dateReviver);

          // Validate structure
          if (!this.isValidPreferences(data)) {
            reject(new Error('Invalid preferences file structure'));
            return;
          }

          resolve(data);
        } catch (err) {
          reject(new Error(`Error parsing preferences file: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  }

  /**
   * Clear only transaction data from localStorage
   * Note: Exclusion signatures are now stored in preferences, so they persist across transaction clearing
   */
  clearTransactions(): void {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.MANUAL_OVERRIDES);
    // Note: EXCLUDED_IDS and EXCLUDED_REPEATED_EXPENSES are now stored in preferences
    // We keep the old keys for backwards compatibility but don't clear them here
  }

  /**
   * Clear all data from localStorage
   */
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number; percentUsed: number } {
    let used = 0;

    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        used += item.length * 2; // UTF-16 = 2 bytes per char
      }
    });

    const available = 5 * 1024 * 1024; // ~5MB typical limit

    return {
      used,
      available,
      percentUsed: (used / available) * 100
    };
  }

  /**
   * JSON replacer for Date serialization
   */
  private dateReplacer(_key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  /**
   * JSON reviver for Date deserialization
   */
  private dateReviver(_key: string, value: any): any {
    if (value && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }

  /**
   * Check if error is quota exceeded
   */
  private isQuotaExceeded(e: any): boolean {
    return e instanceof DOMException && (
      e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  /**
   * Migrate preferences from old version to current
   */
  private migratePreferences(old: any): Preferences {
    // Future migration logic
    return old;
  }

  /**
   * Validate preferences structure
   */
  private isValidPreferences(data: any): boolean {
    return (
      data &&
      Array.isArray(data.categories) &&
      Array.isArray(data.rules) &&
      data.categories.every((c: any) => c.id && c.name && c.color) &&
      data.rules.every((r: any) => r.id && r.categoryId && r.pattern !== undefined)
      // excludedTransactionSignatures and excludedRepeatedExpensePatterns are optional for backwards compatibility
    );
  }
}
