import { format } from 'date-fns';
import type { Transaction, MonthlySummary, RepeatedExpense, DerivedAnalytics } from '../../types';

export class AnalyticsCalculator {
  constructor(private transactions: Transaction[]) {}

  /**
   * Ensure date is a Date object (handles strings from localStorage)
   */
  private ensureDate(date: Date | string): Date {
    return date instanceof Date ? date : new Date(date);
  }

  /**
   * Compute all analytics
   */
  computeAll(): DerivedAnalytics {
    return {
      monthlySummaries: this.computeMonthlySummaries(),
      categoryTotals: this.computeCategoryTotals(),
      repeatedExpenses: this.detectRepeatedExpenses(),
      overallStats: this.computeOverallStats(),
    };
  }

  /**
   * Compute monthly summaries
   */
  computeMonthlySummaries(): MonthlySummary[] {
    const byMonth = this.groupByMonth();

    const summaries = Array.from(byMonth.entries()).map(([month, txns]) => {
      const nonExcluded = txns.filter(t => !t.isExcluded);
      const expenses = nonExcluded.filter(t => t.type === 'DEBIT');

      return {
        month,
        totalDebits: this.sumAmounts(expenses),
        totalCredits: 0, // Not tracking income
        net: 0, // Not tracking income
        categoryTotals: this.computeCategoryTotalsForTransactions(nonExcluded),
        transactionCount: nonExcluded.length
      };
    });

    // Sort by month (chronological)
    return summaries.sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Compute overall category totals
   */
  computeCategoryTotals(): Record<string, number> {
    const nonExcluded = this.transactions.filter(t => !t.isExcluded);
    return this.computeCategoryTotalsForTransactions(nonExcluded);
  }

  /**
   * Detect repeated expenses (potential subscriptions)
   */
  detectRepeatedExpenses(): RepeatedExpense[] {
    const groups = this.groupByMerchant();
    const repeated: RepeatedExpense[] = [];

    groups.forEach((txns, merchant) => {
      if (txns.length < 2) return;

      const amounts = txns.map(t => Math.abs(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Check if amounts are similar (within 10%)
      const isSimilar = amounts.every(amt =>
        Math.abs(amt - avgAmount) / avgAmount <= 0.1
      );

      if (isSimilar) {
        const isLikelySubscription = this.isLikelySubscription(txns);
        const estimatedMonthly = isLikelySubscription ? avgAmount : undefined;

        repeated.push({
          merchantPattern: merchant,
          occurrences: txns.length,
          averageAmount: avgAmount,
          totalAmount: amounts.reduce((a, b) => a + b, 0),
          transactionIds: txns.map(t => t.id),
          isLikelySubscription,
          estimatedMonthly
        });
      }
    });

    // Sort by total amount (descending)
    return repeated.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Compute overall statistics
   */
  computeOverallStats() {
    const nonExcluded = this.transactions.filter(t => !t.isExcluded);
    const expenses = nonExcluded.filter(t => t.type === 'DEBIT');

    const totalDebits = Math.abs(this.sumAmounts(expenses));

    // Calculate date range
    let dateRange: { start: Date; end: Date } | null = null;
    if (nonExcluded.length > 0) {
      const dates = nonExcluded.map(t => this.ensureDate(t.date).getTime());
      dateRange = {
        start: new Date(Math.min(...dates)),
        end: new Date(Math.max(...dates))
      };
    }

    // Calculate number of unique months
    const months = new Set(nonExcluded.map(t => format(this.ensureDate(t.date), 'yyyy-MM')));
    const monthCount = months.size;

    return {
      totalDebits,
      totalCredits: 0, // Not tracking income
      net: 0, // Not tracking income
      transactionCount: nonExcluded.length,
      dateRange,
      monthCount,
      averageMonthlyExpenses: monthCount > 0 ? totalDebits / monthCount : 0
    };
  }

  /**
   * Group transactions by month
   */
  private groupByMonth(): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();

    this.transactions.forEach(txn => {
      const key = format(this.ensureDate(txn.date), 'yyyy-MM');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(txn);
    });

    return groups;
  }

  /**
   * Group transactions by merchant (for repeated expense detection)
   */
  private groupByMerchant(): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();

    this.transactions
      .filter(t => t.type === 'DEBIT' && !t.isExcluded)
      .forEach(txn => {
        const merchant = this.normalizeMerchant(txn.description);
        if (!groups.has(merchant)) {
          groups.set(merchant, []);
        }
        groups.get(merchant)!.push(txn);
      });

    return groups;
  }

  /**
   * Normalize merchant name for grouping
   */
  private normalizeMerchant(description: string): string {
    // Remove common prefixes, numbers, locations
    return description
      .replace(/SQ \*/gi, '')
      .replace(/\d{10,}/g, '')
      .replace(/[A-Z]{2}\d{4,}/g, '') // Location codes
      .trim()
      .substring(0, 30); // First 30 chars
  }

  /**
   * Check if transactions represent a likely subscription
   */
  private isLikelySubscription(transactions: Transaction[]): boolean {
    if (transactions.length < 2) return false;

    // Check if intervals are roughly monthly (25-35 days)
    const dates = transactions.map(t => this.ensureDate(t.date).getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];

    for (let i = 1; i < dates.length; i++) {
      const days = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    if (intervals.length === 0) return false;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return avgInterval >= 25 && avgInterval <= 35;
  }

  /**
   * Sum transaction amounts
   */
  private sumAmounts(transactions: Transaction[]): number {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Compute category totals for a set of transactions
   */
  private computeCategoryTotalsForTransactions(transactions: Transaction[]): Record<string, number> {
    const totals: Record<string, number> = {};

    transactions
      .filter(t => t.type === 'DEBIT') // Only count expenses
      .forEach(t => {
        const categoryId = t.categoryId || 'uncategorized';
        totals[categoryId] = (totals[categoryId] || 0) + Math.abs(t.amount);
      });

    return totals;
  }
}
