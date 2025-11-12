import type { Transaction, Category, CategorizationRule } from '../../types';
import { generateId } from '../utils';

export class CategorizationEngine {
  constructor(
    private categories: Category[],
    private rules: CategorizationRule[]
  ) {}

  /**
   * Categorize a single transaction based on rules
   */
  categorize(transaction: Transaction): string | undefined {
    // Sort rules by priority (lower number = higher priority)
    const sortedRules = this.rules
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Find first matching rule
    for (const rule of sortedRules) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(transaction.description)) {
          return rule.categoryId;
        }
      } catch (error) {
        // Invalid regex pattern, skip this rule
        console.warn(`Invalid regex pattern in rule ${rule.id}: ${rule.pattern}`);
        continue;
      }
    }

    return undefined; // Uncategorized
  }

  /**
   * Batch categorize multiple transactions
   */
  batchCategorize(transactions: Transaction[]): void {
    transactions.forEach(txn => {
      // Only auto-categorize if not manually categorized
      if (!txn.isManuallyCategorized && !txn.categoryId) {
        txn.categoryId = this.categorize(txn);
      }
    });
  }

  /**
   * Learn from manual categorization and create a new rule
   */
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

  /**
   * Extract a merchant pattern from transaction description
   */
  private extractMerchantPattern(description: string): string {
    // Clean up common prefixes/suffixes
    let cleaned = description
      .replace(/SQ \*/gi, '') // Square payment prefix
      .replace(/\d{10,}/g, '') // Remove long numbers (transaction IDs)
      .replace(/[A-Z]{2}\d{4,}/g, '') // Remove location codes like CA94000
      .trim();

    // Take first 30 characters
    cleaned = cleaned.substring(0, 30);

    // Escape regex special characters
    cleaned = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return cleaned;
  }

  /**
   * Get category by ID
   */
  getCategoryById(categoryId: string): Category | undefined {
    return this.categories.find(c => c.id === categoryId);
  }

  /**
   * Get all uncategorized transactions
   */
  getUncategorizedTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.filter(t => !t.categoryId && !t.isExcluded);
  }

  /**
   * Get transaction count by category
   */
  getCategoryCounts(transactions: Transaction[]): Record<string, number> {
    const counts: Record<string, number> = {};

    transactions
      .filter(t => !t.isExcluded)
      .forEach(t => {
        const categoryId = t.categoryId || 'uncategorized';
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      });

    return counts;
  }
}
