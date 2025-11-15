import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { AnalyticsCalculator } from '../lib/analytics/calculator';
import { formatCurrency } from '../lib/utils';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function CategoryBreakdown() {
  const { state } = useApp();

  const analytics = useMemo(() => {
    if (state.transactions.length === 0) return null;
    const calculator = new AnalyticsCalculator(state.transactions);
    return calculator.computeAll();
  }, [state.transactions]);

  const categoryData = useMemo(() => {
    if (!analytics) return [];

    const data = Object.entries(analytics.categoryTotals).map(([categoryId, total]) => {
      const category = state.categories.find(c => c.id === categoryId);
      const transactions = state.transactions.filter(t => {
        const txCategoryId = t.categoryId || 'uncategorized';
        return txCategoryId === categoryId && !t.isExcluded && t.type === 'DEBIT';
      });

      return {
        id: categoryId,
        name: category?.name || 'Uncategorized',
        color: category?.color || '#64748b',
        total,
        count: transactions.length,
        percentage: (total / analytics.overallStats.totalDebits) * 100
      };
    });

    return data.sort((a, b) => b.total - a.total);
  }, [analytics, state.categories, state.transactions]);

  if (!analytics || categoryData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
        <p className="text-gray-500">No category data available.</p>
      </div>
    );
  }

  const pieData = {
    labels: categoryData.map(c => c.name),
    datasets: [{
      data: categoryData.map(c => c.total),
      backgroundColor: categoryData.map(c => c.color),
      borderWidth: 1,
      borderColor: '#fff'
    }]
  };

  const barData = {
    labels: categoryData.map(c => c.name),
    datasets: [{
      label: 'Total Spending',
      data: categoryData.map(c => c.total),
      backgroundColor: categoryData.map(c => c.color),
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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>

      {/* Table */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-right">Transactions</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map(cat => (
              <tr key={cat.id} className="border-b">
                <td className="p-2 flex items-center">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </td>
                <td className="p-2 text-right">{cat.count}</td>
                <td className="p-2 text-right font-semibold">{formatCurrency(cat.total)}</td>
                <td className="p-2 text-right">{cat.percentage.toFixed(1)}%</td>
              </tr>
            ))}
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
