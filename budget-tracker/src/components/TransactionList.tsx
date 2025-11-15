import React, { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useApp } from '../context/AppContext';
import type { Transaction } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

type SortField = 'date' | 'description' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

export function TransactionList() {
  const { state, filteredTransactions, actions } = useApp();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const parentRef = React.useRef<HTMLDivElement>(null);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    // Always filter to expenses only (DEBIT transactions)
    let filtered = filteredTransactions.filter(t => t.type === 'DEBIT');

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(query)
      );
    }

    // Then, sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          const dateA = a.date instanceof Date ? a.date : new Date(a.date);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date);
          comparison = dateA.getTime() - dateB.getTime();
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
  }, [filteredTransactions, state.categories, sortField, sortDirection, searchQuery]);

  const virtualizer = useVirtualizer({
    count: filteredAndSortedTransactions.length,
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

  if (filteredTransactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <p className="text-gray-500">No transactions to display.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Transactions ({filteredAndSortedTransactions.length}
          {searchQuery && filteredTransactions.filter(t => t.type === 'DEBIT').length !== filteredAndSortedTransactions.length &&
            ` of ${filteredTransactions.filter(t => t.type === 'DEBIT').length}`})
        </h2>

        <div className="flex items-center space-x-2">
          <label htmlFor="search-transactions" className="text-sm text-gray-600">
            Search:
          </label>
          <input
            id="search-transactions"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by description..."
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ width: '300px' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="border rounded overflow-hidden">
        {/* Header - Fixed outside of scroll container */}
        <div className="bg-gray-100 border-b flex text-sm font-semibold">
          <SortableHeader label="Date" field="date" currentField={sortField} direction={sortDirection} onSort={handleSort} width="120px" />
          <SortableHeader label="Description" field="description" currentField={sortField} direction={sortDirection} onSort={handleSort} width="250px" />
          <SortableHeader label="Amount" field="amount" currentField={sortField} direction={sortDirection} onSort={handleSort} width="120px" />
          <SortableHeader label="Category" field="category" currentField={sortField} direction={sortDirection} onSort={handleSort} width="150px" />
          <div className="p-2 border-r" style={{ width: '200px' }}>Source</div>
          <div className="p-2 border-r w-24 text-center">Exclude</div>
        </div>

        {/* Scrollable content area */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: '560px' }}
        >
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {/* Rows */}
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const transaction = filteredAndSortedTransactions[virtualRow.index];
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
                <div className="p-2 border-r truncate" style={{ width: '250px' }} title={transaction.description}>
                  {transaction.description}
                </div>
                <div className={`p-2 border-r text-right ${transaction.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`} style={{ width: '120px' }}>
                  {formatCurrency(Math.abs(transaction.amount))}
                </div>
                <div className="p-2 border-r" style={{ width: '150px' }}>
                  <select
                    value={transaction.categoryId || ''}
                    onChange={(e) => actions.categorizeTransaction(transaction.id, e.target.value)}
                    className="w-full text-xs border rounded px-1 py-1"
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
                <div className="p-2 border-r truncate text-xs text-gray-600" style={{ width: '200px' }} title={transaction.sourceFile}>
                  {transaction.sourceFile || '-'}
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
