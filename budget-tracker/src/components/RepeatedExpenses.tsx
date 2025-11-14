import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsCalculator } from '../lib/analytics/calculator';
import { formatCurrency, formatDate } from '../lib/utils';

export function RepeatedExpenses() {
  const { state } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const repeatedExpenses = useMemo(() => {
    if (state.transactions.length === 0) return [];
    const calculator = new AnalyticsCalculator(state.transactions);
    return calculator.detectRepeatedExpenses();
  }, [state.transactions]);

  if (repeatedExpenses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Repeated Expenses</h2>
        <p className="text-gray-500">No repeated expenses detected.</p>
      </div>
    );
  }

  const subscriptions = repeatedExpenses.filter(e => e.isLikelySubscription);
  const otherRepeated = repeatedExpenses.filter(e => !e.isLikelySubscription);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Repeated Expenses</h2>

      {/* Subscriptions Section */}
      {subscriptions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <span className="mr-2">💳</span>
            Likely Subscriptions ({subscriptions.length})
          </h3>
          <div className="space-y-2">
            {subscriptions.map((expense, idx) => (
              <ExpenseRow
                key={idx}
                expense={expense}
                transactions={state.transactions}
                isExpanded={expandedId === `sub-${idx}`}
                onToggle={() => setExpandedId(expandedId === `sub-${idx}` ? null : `sub-${idx}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Repeated Expenses */}
      {otherRepeated.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <span className="mr-2">🔁</span>
            Other Repeated Charges ({otherRepeated.length})
          </h3>
          <div className="space-y-2">
            {otherRepeated.map((expense, idx) => (
              <ExpenseRow
                key={idx}
                expense={expense}
                transactions={state.transactions}
                isExpanded={expandedId === `other-${idx}`}
                onToggle={() => setExpandedId(expandedId === `other-${idx}` ? null : `other-${idx}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <p className="text-sm font-semibold text-blue-900">
          Total Monthly Subscriptions: {formatCurrency(
            subscriptions.reduce((sum, e) => sum + (e.estimatedMonthly || 0), 0)
          )}
        </p>
      </div>
    </div>
  );
}

function ExpenseRow({
  expense,
  transactions,
  isExpanded,
  onToggle
}: {
  expense: any;
  transactions: any[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { state, actions } = useApp();
  const expenseTransactions = transactions.filter(t =>
    expense.transactionIds.includes(t.id)
  );

  // Check if this repeated expense is excluded
  const isExcluded = state.excludedRepeatedExpenses.has(expense.merchantPattern);

  // Determine the current category (if all transactions have the same category)
  const currentCategory = useMemo(() => {
    if (expenseTransactions.length === 0) return '';
    const firstCategory = expenseTransactions[0].categoryId || '';
    const allSame = expenseTransactions.every(txn => (txn.categoryId || '') === firstCategory);
    return allSame ? firstCategory : '';
  }, [expenseTransactions]);

  const handleCategoryChange = (categoryId: string) => {
    // Apply category to all transactions in this repeated expense group
    expenseTransactions.forEach(txn => {
      actions.categorizeTransaction(txn.id, categoryId);
    });
  };

  const handleExclusionToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent row expansion
    actions.toggleRepeatedExpenseExclusion(expense.merchantPattern, expense.transactionIds);
  };

  return (
    <div className={`border rounded ${isExcluded ? 'opacity-50 bg-gray-100' : ''}`}>
      <div
        className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          <input
            type="checkbox"
            checked={isExcluded}
            onChange={handleExclusionToggle}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 cursor-pointer"
            title={isExcluded ? "Include in analytics" : "Exclude from analytics"}
          />
          <div className="flex-1">
            <div className="font-semibold">{expense.merchantPattern}</div>
            <div className="text-sm text-gray-600">
              {expense.occurrences} occurrences • Avg: {formatCurrency(expense.averageAmount)}
              {expense.estimatedMonthly && (
                <span className="ml-2 text-blue-600">
                  ~{formatCurrency(expense.estimatedMonthly)}/month
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(expense.totalAmount)}</div>
          <div className="text-sm text-gray-500">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t p-3 bg-gray-50">
          <div className="mb-3 flex items-center gap-2">
            <label className="text-sm font-semibold">Category:</label>
            <select
              value={currentCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-white"
            >
              <option value="">Uncategorized</option>
              {state.categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm font-semibold mb-2">Transactions:</div>
          <div className="space-y-1">
            {expenseTransactions.map(txn => (
              <div key={txn.id} className="flex justify-between text-sm">
                <span>{formatDate(txn.date)}</span>
                <span>{txn.description.substring(0, 40)}...</span>
                <span className="font-semibold">{formatCurrency(Math.abs(txn.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
