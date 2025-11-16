import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsCalculator } from '../lib/analytics/calculator';
import { formatCurrency, formatDate } from '../lib/utils';

export function RepeatedExpenses() {
  const { state, filteredTransactions } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [excludedExpanded, setExcludedExpanded] = useState(true);

  // Detect repeated expenses from ALL transactions (including excluded ones)
  // so we can show excluded repeated expenses in their own section
  const repeatedExpenses = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    // Create a version of transactions with all items marked as not excluded
    // so the calculator will include them in the repeated expense detection
    const allTransactionsUnexcluded = filteredTransactions.map(t => ({
      ...t,
      isExcluded: false
    }));
    const calculator = new AnalyticsCalculator(allTransactionsUnexcluded);
    return calculator.detectRepeatedExpenses();
  }, [filteredTransactions]);

  if (repeatedExpenses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Repeated Expenses</h2>
        <p className="text-gray-500">No repeated expenses detected.</p>
      </div>
    );
  }

  // Separate into active and excluded expenses
  const activeExpenses = repeatedExpenses.filter(e => !state.excludedRepeatedExpenses.has(e.merchantPattern));
  const excludedExpenses = repeatedExpenses.filter(e => state.excludedRepeatedExpenses.has(e.merchantPattern));

  const subscriptions = activeExpenses.filter(e => e.isLikelySubscription);
  const otherRepeated = activeExpenses.filter(e => !e.isLikelySubscription);

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
                transactions={filteredTransactions}
                isExpanded={expandedId === `sub-${idx}`}
                onToggle={() => setExpandedId(expandedId === `sub-${idx}` ? null : `sub-${idx}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Repeated Expenses */}
      {otherRepeated.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <span className="mr-2">🔁</span>
            Other Repeated Charges ({otherRepeated.length})
          </h3>
          <div className="space-y-2">
            {otherRepeated.map((expense, idx) => (
              <ExpenseRow
                key={idx}
                expense={expense}
                transactions={filteredTransactions}
                isExpanded={expandedId === `other-${idx}`}
                onToggle={() => setExpandedId(expandedId === `other-${idx}` ? null : `other-${idx}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Excluded Expenses Section */}
      {excludedExpenses.length > 0 && (
        <div className="mb-6">
          <div
            className="flex items-center justify-between cursor-pointer p-3 bg-gray-100 rounded hover:bg-gray-200"
            onClick={() => setExcludedExpanded(!excludedExpanded)}
          >
            <h3 className="text-lg font-semibold flex items-center">
              <span className="mr-2">🚫</span>
              Excluded from Analytics ({excludedExpenses.length})
            </h3>
            <span className="text-gray-400">
              {excludedExpanded ? '▼' : '▶'}
            </span>
          </div>

          {excludedExpanded && (
            <div className="mt-2 space-y-2">
              {excludedExpenses.map((expense, idx) => (
                <ExcludedExpenseRow
                  key={idx}
                  expense={expense}
                  transactions={filteredTransactions}
                  isExpanded={expandedId === `excluded-${idx}`}
                  onToggle={() => setExpandedId(expandedId === `excluded-${idx}` ? null : `excluded-${idx}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {subscriptions.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <p className="text-sm font-semibold text-blue-900">
            Total Monthly Subscriptions: {formatCurrency(
              subscriptions.reduce((sum, e) => sum + (e.estimatedMonthly || 0), 0)
            )}
          </p>
        </div>
      )}
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
    actions.toggleRepeatedExpenseExclusion(expense.merchantPattern, expense.transactionIds);
  };

  return (
    <div className="border rounded">
      <div
        className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
        onClick={onToggle}
      >
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
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(expense.totalAmount)}</div>
          <div className="text-sm text-gray-500">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t p-3 bg-gray-50 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Category:</label>
            <select
              value={currentCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-white"
            >
              <option value="">Uncategorized</option>
              {[...state.categories]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Exclusion checkbox with clear label */}
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
            <input
              type="checkbox"
              checked={isExcluded}
              onChange={handleExclusionToggle}
              className="w-4 h-4 cursor-pointer"
              id={`exclude-${expense.merchantPattern}`}
            />
            <label
              htmlFor={`exclude-${expense.merchantPattern}`}
              className="text-sm font-medium text-orange-900 cursor-pointer flex-1"
            >
              Exclude from analytics (hides from all charts and calculations)
            </label>
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

function ExcludedExpenseRow({
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
  const { actions } = useApp();
  const expenseTransactions = transactions.filter(t =>
    expense.transactionIds.includes(t.id)
  );

  const handleUnexclude = () => {
    actions.toggleRepeatedExpenseExclusion(expense.merchantPattern, expense.transactionIds);
  };

  return (
    <div className="border rounded bg-gray-50">
      <div className="p-3 flex items-center justify-between">
        <div
          className="flex-1 cursor-pointer"
          onClick={onToggle}
        >
          <div className="font-semibold text-gray-700">{expense.merchantPattern}</div>
          <div className="text-sm text-gray-600">
            {expense.occurrences} occurrences • Avg: {formatCurrency(expense.averageAmount)}
            {expense.estimatedMonthly && (
              <span className="ml-2">
                ~{formatCurrency(expense.estimatedMonthly)}/month
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUnexclude}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Unexclude
          </button>
          <div className="text-right cursor-pointer" onClick={onToggle}>
            <div className="font-semibold">{formatCurrency(expense.totalAmount)}</div>
            <div className="text-sm text-gray-500">
              {isExpanded ? '▼' : '▶'}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t p-3 bg-white">
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
