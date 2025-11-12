import React, { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useApp } from '../context/AppContext';
import type { Transaction } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

type SortField = 'date' | 'description' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

export function TransactionList() {
  const { state, actions } = useApp();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const parentRef = React.useRef<HTMLDivElement>(null);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...state.transactions].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = a.date.getTime() - b.date.getTime();
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'category':
          const catA = state.categories.find(c => c.id === a.categoryId)?.name || 'Uncategorized';
          const catB = state.categories.find(c => c.id === b.categoryId)?.name || 'Uncategorized';
          comparison = catA.localeCompare(catB);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [state.transactions, state.categories, sortField, sortDirection]);

  const virtualizer = useVirtualizer({
    count: sortedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (state.transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <p className="text-gray-500">No transactions to display.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        Transactions ({sortedTransactions.length})
      </h2>

      <div
        ref={parentRef}
        className="overflow-auto border rounded"
        style={{ height: '600px' }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {/* Header */}
          <div className="sticky top-0 bg-gray-100 border-b z-10 flex text-sm font-semibold">
            <SortableHeader label="Date" field="date" currentField={sortField} direction={sortDirection} onSort={handleSort} width="120px" />
            <SortableHeader label="Description" field="description" currentField={sortField} direction={sortDirection} onSort={handleSort} width="300px" />
            <SortableHeader label="Amount" field="amount" currentField={sortField} direction={sortDirection} onSort={handleSort} width="120px" />
            <SortableHeader label="Category" field="category" currentField={sortField} direction={sortDirection} onSort={handleSort} width="180px" />
            <div className="p-2 border-r w-24 text-center">Exclude</div>
          </div>

          {/* Rows */}
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const transaction = sortedTransactions[virtualRow.index];
            const category = state.categories.find(c => c.id === transaction.categoryId);

            return (
              <div
                key={transaction.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex text-sm border-b ${transaction.isExcluded ? 'bg-gray-100 opacity-50' : ''}`}
              >
                <div className="p-2 border-r" style={{ width: '120px' }}>
                  {formatDate(transaction.date)}
                </div>
                <div className="p-2 border-r truncate" style={{ width: '300px' }} title={transaction.description}>
                  {transaction.description}
                </div>
                <div className={`p-2 border-r text-right ${transaction.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`} style={{ width: '120px' }}>
                  {formatCurrency(Math.abs(transaction.amount))}
                </div>
                <div className="p-2 border-r" style={{ width: '180px' }}>
                  <select
                    value={transaction.categoryId || ''}
                    onChange={(e) => actions.categorizeTransaction(transaction.id, e.target.value)}
                    className="w-full text-xs border rounded px-1 py-1"
                  >
                    <option value="">Uncategorized</option>
                    {state.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-2 flex items-center justify-center" style={{ width: '96px' }}>
                  <input
                    type="checkbox"
                    checked={transaction.isExcluded}
                    onChange={() => actions.toggleExclusion(transaction.id)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  width
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  width: string;
}) {
  const isActive = currentField === field;

  return (
    <div
      className="p-2 border-r cursor-pointer hover:bg-gray-200 flex items-center justify-between"
      style={{ width }}
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      {isActive && (
        <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>
      )}
    </div>
  );
}
