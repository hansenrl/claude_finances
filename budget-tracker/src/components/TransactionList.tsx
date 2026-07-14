import React, { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';

type SortField = 'date' | 'description' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';
type ColumnKey = 'date' | 'description' | 'amount' | 'category' | 'source';

// Copy text to the clipboard, falling back to a hidden textarea when the
// async Clipboard API is unavailable (e.g. non-secure contexts).
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy approach
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function TransactionList() {
  const { state, filteredTransactions, actions } = useApp();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [copiedField, setCopiedField] = useState<ColumnKey | null>(null);

  const parentRef = React.useRef<HTMLDivElement>(null);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...filteredTransactions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      if (selectedCategory === '__uncategorized__') {
        filtered = filtered.filter(t => !t.categoryId);
      } else {
        filtered = filtered.filter(t => t.categoryId === selectedCategory);
      }
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
  }, [filteredTransactions, state.categories, sortField, sortDirection, searchQuery, selectedCategory]);

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

  // Copy a single column (all filtered/sorted rows, not just the visible page)
  // as newline-separated values, ready to paste into a spreadsheet column.
  const handleCopyColumn = async (key: ColumnKey) => {
    const values = filteredAndSortedTransactions.map(t => {
      switch (key) {
        case 'date':
          return formatDate(t.date);
        case 'description':
          return t.description;
        case 'amount':
          // Signed numeric value (debits negative) so it sums correctly.
          return t.amount.toFixed(2);
        case 'category':
          return state.categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
        case 'source':
          return t.sourceFile || '';
      }
    });

    const ok = await copyToClipboard(values.join('\n'));
    if (ok) {
      setCopiedField(key);
      setTimeout(() => setCopiedField(prev => (prev === key ? null : prev)), 1500);
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
          {(searchQuery || selectedCategory) && filteredTransactions.length !== filteredAndSortedTransactions.length &&
            ` of ${filteredTransactions.length}`})
        </h2>

        <div className="flex items-center space-x-2">
          <label htmlFor="category-filter" className="text-sm text-gray-600">
            Category:
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ width: '200px' }}
          >
            <option value="">All Categories</option>
            <option value="__uncategorized__">Uncategorized</option>
            {[...state.categories]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>

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
          <SortableHeader label="Date" field="date" currentField={sortField} direction={sortDirection} onSort={handleSort} width="120px" onCopy={() => handleCopyColumn('date')} copied={copiedField === 'date'} />
          <SortableHeader label="Description" field="description" currentField={sortField} direction={sortDirection} onSort={handleSort} width="250px" onCopy={() => handleCopyColumn('description')} copied={copiedField === 'description'} />
          <SortableHeader label="Amount" field="amount" currentField={sortField} direction={sortDirection} onSort={handleSort} width="120px" onCopy={() => handleCopyColumn('amount')} copied={copiedField === 'amount'} />
          <SortableHeader label="Category" field="category" currentField={sortField} direction={sortDirection} onSort={handleSort} width="150px" onCopy={() => handleCopyColumn('category')} copied={copiedField === 'category'} />
          <div className="p-2 border-r flex items-center justify-between" style={{ width: '200px' }}>
            <span>Source</span>
            <CopyColumnButton label="Source" count={filteredAndSortedTransactions.length} copied={copiedField === 'source'} onCopy={() => handleCopyColumn('source')} />
          </div>
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
  width,
  onCopy,
  copied
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  width: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const isActive = currentField === field;

  return (
    <div
      className="p-2 border-r cursor-pointer hover:bg-gray-200 flex items-center justify-between"
      style={{ width }}
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      <div className="flex items-center">
        {isActive && (
          <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>
        )}
        <CopyColumnButton label={label} copied={copied} onCopy={onCopy} />
      </div>
    </div>
  );
}

// Small button that copies an entire column's values to the clipboard.
// Lives inside a clickable header, so it stops click propagation to avoid
// also triggering a sort.
function CopyColumnButton({
  label,
  copied,
  onCopy,
  count
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCopy();
      }}
      title={`Copy ${label} column${count !== undefined ? ` (${count} rows)` : ''}`}
      aria-label={`Copy ${label} column`}
      className={`ml-1 px-1 text-xs font-normal ${copied ? 'text-green-600' : 'text-gray-400 hover:text-blue-600'}`}
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}
