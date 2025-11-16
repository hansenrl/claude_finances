import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsCalculator } from '../lib/analytics/calculator';
import { formatCurrency, formatDate } from '../lib/utils';

export function ExcludedRepeatedExpenses() {
  const { state, filteredTransactions } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedExcluded, setSelectedExcluded] = useState<Set<string>>(new Set());

  const repeatedExpenses = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    const calculator = new AnalyticsCalculator(filteredTransactions);
    return calculator.detectRepeatedExpenses();
  }, [filteredTransactions]);

  // Only show excluded expenses
  const excludedExpenses = repeatedExpenses.filter(e => state.excludedRepeatedExpenses.has(e.merchantPattern));

  if (excludedExpenses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <span className="mr-2">🚫</span>
          Excluded from Analytics ({excludedExpenses.length})
        </h2>
        <p className="text-sm text-gray-600">
          These repeated expenses are excluded from all analytics and calculations
        </p>
      </div>

      {excludedExpenses.length > 1 && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedExcluded.size === excludedExpenses.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedExcluded(new Set(excludedExpenses.map(e => e.merchantPattern)));
                } else {
                  setSelectedExcluded(new Set());
                }
              }}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">
              {selectedExcluded.size > 0 ? `${selectedExcluded.size} selected` : 'Select all'}
            </span>
          </div>
          {selectedExcluded.size > 0 && (
            <UnexcludeButton
              selectedPatterns={selectedExcluded}
              expenses={excludedExpenses}
              onComplete={() => setSelectedExcluded(new Set())}
            />
          )}
        </div>
      )}

      <div className="space-y-2">
        {excludedExpenses.map((expense, idx) => (
          <ExcludedExpenseRow
            key={idx}
            expense={expense}
            transactions={filteredTransactions}
            isExpanded={expandedId === `excluded-${idx}`}
            onToggle={() => setExpandedId(expandedId === `excluded-${idx}` ? null : `excluded-${idx}`)}
            isSelected={selectedExcluded.has(expense.merchantPattern)}
            onSelectChange={(selected) => {
              const next = new Set(selectedExcluded);
              if (selected) {
                next.add(expense.merchantPattern);
              } else {
                next.delete(expense.merchantPattern);
              }
              setSelectedExcluded(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ExcludedExpenseRow({
  expense,
  transactions,
  isExpanded,
  onToggle,
  isSelected,
  onSelectChange
}: {
  expense: any;
  transactions: any[];
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
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
        <div className="flex items-center gap-3 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectChange(e.target.checked)}
            className="w-4 h-4"
            onClick={(e) => e.stopPropagation()}
          />
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

function UnexcludeButton({
  selectedPatterns,
  expenses,
  onComplete
}: {
  selectedPatterns: Set<string>;
  expenses: any[];
  onComplete: () => void;
}) {
  const { actions } = useApp();

  const handleBulkUnexclude = () => {
    const count = selectedPatterns.size;
    if (confirm(`Unexclude ${count} repeated expense${count > 1 ? 's' : ''}? They will be included in analytics again.`)) {
      // Unexclude all selected patterns
      expenses.forEach(expense => {
        if (selectedPatterns.has(expense.merchantPattern)) {
          actions.toggleRepeatedExpenseExclusion(expense.merchantPattern, expense.transactionIds);
        }
      });
      onComplete();
    }
  };

  return (
    <button
      onClick={handleBulkUnexclude}
      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
    >
      Unexclude Selected ({selectedPatterns.size})
    </button>
  );
}
