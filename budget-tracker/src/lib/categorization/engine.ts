import type { Transaction, Category, CategorizationRule, CategoryPattern } from '../../types';
import { generateId } from '../utils';

interface PatternMatch {
  categoryId: string;
  priority: number;
}

export class CategorizationEngine {
  constructor(
    private categories: Category[],
    private rules: CategorizationRule[],
    private descriptionMappings: Map<string, string> = new Map()
  ) {}

  /**
   * Categorize a single transaction based on description mappings and patterns
   * Priority: 1) Description mapping, 2) Pattern matching, 3) Uncategorized
   */
  categorize(transaction: Transaction): string | undefined {
    // Check description mapping first (exact match)
    const mappedCategoryId = this.descriptionMappings.get(transaction.description);
    if (mappedCategoryId) {
      return mappedCategoryId;
    }

    // Collect all enabled patterns from all categories
    const allPatterns: Array<PatternMatch & { pattern: CategoryPattern }> = [];

    for (const category of this.categories) {
      for (const pattern of category.patterns) {
        if (pattern.enabled) {
          allPatterns.push({
            categoryId: category.id,
            priority: pattern.priority,
            pattern
          });
        }
      }
    }

    // Also include legacy rules for backward compatibility
    const legacyMatches: Array<PatternMatch & { pattern: string }> = this.rules
      .filter(r => r.enabled)
      .map(r => ({
        categoryId: r.categoryId,
        priority: r.priority,
        pattern: r.pattern
      }));

    // Sort all patterns by priority (lower number = higher priority)
    allPatterns.sort((a, b) => a.priority - b.priority);

    // Find first matching pattern
    for (const item of allPatterns) {
      try {
        const regex = new RegExp(item.pattern.pattern, 'i');
        if (regex.test(transaction.description)) {
          return item.categoryId;
        }
      } catch (error) {
        // Invalid regex pattern, skip this pattern
        console.warn(`Invalid regex pattern in category ${item.categoryId}: ${item.pattern.pattern}`);
        continue;
      }
    }

    // Check legacy rules if no category pattern matched
    for (const item of legacyMatches) {
      try {
        const regex = new RegExp(item.pattern, 'i');
        if (regex.test(transaction.description)) {
          return item.categoryId;
        }
      } catch (error) {
        console.warn(`Invalid regex pattern in legacy rule: ${item.pattern}`);
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
