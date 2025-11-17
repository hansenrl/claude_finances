import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { AnalyticsCalculator } from '../lib/analytics/calculator';
import { formatCurrency } from '../lib/utils';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function CategoryBreakdown() {
  const { state, filteredTransactions, actions } = useApp();

  // Compute time-window-only filtered transactions (no category filter) for the table
  const timeFilteredTransactions = useMemo(() => {
    let filtered = state.transactions;

    // Apply time window filter only
    if (state.timeWindowFilter.enabled && state.timeWindowFilter.startDate && state.timeWindowFilter.endDate) {
      const parseLocalDate = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const startDate = parseLocalDate(state.timeWindowFilter.startDate);
      const endDate = parseLocalDate(state.timeWindowFilter.endDate);

      filtered = filtered.filter(t => {
        const txDate = t.date instanceof Date ? t.date : new Date(t.date);
        return txDate >= startDate && txDate < endDate;
      });
    }

    return filtered;
  }, [state.transactions, state.timeWindowFilter]);

  // Analytics for the table (based on time-filtered only)
  const tableAnalytics = useMemo(() => {
    if (timeFilteredTransactions.length === 0) return null;
    const calculator = new AnalyticsCalculator(timeFilteredTransactions);
    return calculator.computeAll();
  }, [timeFilteredTransactions]);

  // Analytics for the charts (based on full filtering including category filter)
  const chartAnalytics = useMemo(() => {
    if (filteredTransactions.length === 0) return null;
    const calculator = new AnalyticsCalculator(filteredTransactions);
    return calculator.computeAll();
  }, [filteredTransactions]);

  // Category data for the table (shows all categories)
  const categoryData = useMemo(() => {
    if (!tableAnalytics) return [];

    const monthCount = tableAnalytics.overallStats.monthCount || 1;

    const data = Object.entries(tableAnalytics.categoryTotals).map(([categoryId, total]) => {
      const category = state.categories.find(c => c.id === categoryId);
      const transactions = timeFilteredTransactions.filter(t => {
        const txCategoryId = t.categoryId || 'uncategorized';
        return txCategoryId === categoryId && !t.isExcluded && t.type === 'DEBIT';
      });

      return {
        id: categoryId,
        name: category?.name || 'Uncategorized',
        color: category?.color || '#64748b',
        total,
        count: transactions.length,
        avgMonthly: total / monthCount,
        percentage: (total / tableAnalytics.overallStats.totalDebits) * 100
      };
    });

    return data.sort((a, b) => b.total - a.total);
  }, [tableAnalytics, state.categories, timeFilteredTransactions]);

  // Category data for the charts (filtered by selected categories)
  const chartCategoryData = useMemo(() => {
    if (!chartAnalytics) return [];

    const data = Object.entries(chartAnalytics.categoryTotals).map(([categoryId, total]) => {
      const category = state.categories.find(c => c.id === categoryId);
      const transactions = filteredTransactions.filter(t => {
        const txCategoryId = t.categoryId || 'uncategorized';
        return txCategoryId === categoryId && !t.isExcluded && t.type === 'DEBIT';
      });

      return {
        id: categoryId,
        name: category?.name || 'Uncategorized',
        color: category?.color || '#64748b',
        total,
        count: transactions.length,
        percentage: (total / chartAnalytics.overallStats.totalDebits) * 100
      };
    });

    return data.sort((a, b) => b.total - a.total);
  }, [chartAnalytics, state.categories, filteredTransactions]);

  if (!tableAnalytics || categoryData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
        <p className="text-gray-500">No category data available.</p>
      </div>
    );
  }

  // Use chartCategoryData for the charts (filtered data)
  const pieData = {
    labels: chartCategoryData.map(c => c.name),
    datasets: [{
      data: chartCategoryData.map(c => c.total),
      backgroundColor: chartCategoryData.map(c => c.color),
      borderWidth: 1,
      borderColor: '#fff'
    }]
  };

  const barData = {
    labels: chartCategoryData.map(c => c.name),
    datasets: [{
      label: 'Total Spending',
      data: chartCategoryData.map(c => c.total),
      backgroundColor: chartCategoryData.map(c => c.color),
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            // For pie charts, context.parsed is a number
            // For bar charts, context.parsed is an object with x and y properties
            const value = typeof context.parsed === 'number' ? context.parsed : context.parsed?.y ?? 0;
            return `${context.label}: ${formatCurrency(value)}`;
          }
        }
      }
    }
  };

  const hasActiveFilter = state.selectedCategories.size > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Category Breakdown</h2>
        {hasActiveFilter && (
          <button
            onClick={() => actions.clearCategoryFilter()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Clear Filter ({state.selectedCategories.size})
          </button>
        )}
      </div>

      {hasActiveFilter && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            Filtering by {state.selectedCategories.size} categor{state.selectedCategories.size === 1 ? 'y' : 'ies'}. Click categories below to add/remove from filter.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-right">Transactions</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">Avg Monthly</th>
              <th className="p-2 text-right">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map(cat => {
              const isSelected = state.selectedCategories.has(cat.id);
              return (
                <tr
                  key={cat.id}
                  onClick={() => actions.toggleCategoryFilter(cat.id)}
                  className={`border-b cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-100 hover:bg-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="p-2 flex items-center">
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className={isSelected ? 'font-semibold' : ''}>
                      {cat.name}
                    </span>
                    {isSelected && (
                      <span className="ml-2 text-blue-600">✓</span>
                    )}
                  </td>
                  <td className="p-2 text-right">{cat.count}</td>
                  <td className="p-2 text-right font-semibold">{formatCurrency(cat.total)}</td>
                  <td className="p-2 text-right text-blue-600">{formatCurrency(cat.avgMonthly)}</td>
                  <td className="p-2 text-right">{cat.percentage.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Distribution</h3>
          <div style={{ height: '300px' }}>
            <Pie data={pieData} options={chartOptions} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">By Total Amount</h3>
          <div style={{ height: '300px' }}>
            <Bar data={barData} options={{
              ...chartOptions,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => formatCurrency(value as number)
                  }
                }
              }
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
