import { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { AnalyticsCalculator } from '../lib/analytics/calculator';
import { formatCurrency } from '../lib/utils';
import { format, parse } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export function MonthlyAnalysis() {
  const { state } = useApp();

  const analytics = useMemo(() => {
    if (state.transactions.length === 0) return null;
    const calculator = new AnalyticsCalculator(state.transactions);
    return calculator.computeAll();
  }, [state.transactions]);

  const monthlyData = useMemo(() => {
    if (!analytics) return [];
    return analytics.monthlySummaries.map(summary => ({
      ...summary,
      monthLabel: format(parse(summary.month, 'yyyy-MM', new Date()), 'MMM yyyy')
    }));
  }, [analytics]);

  if (!analytics || monthlyData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Monthly Analysis</h2>
        <p className="text-gray-500">No monthly data available.</p>
      </div>
    );
  }

  // Trend line data
  const lineData = {
    labels: monthlyData.map(m => m.monthLabel),
    datasets: [{
      label: 'Monthly Expenses',
      data: monthlyData.map(m => Math.abs(m.totalDebits)),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.3
    }]
  };

  // Stacked bar data by category
  const categoryIds = Array.from(
    new Set(
      monthlyData.flatMap(m => Object.keys(m.categoryTotals))
    )
  );

  const stackedBarData = {
    labels: monthlyData.map(m => m.monthLabel),
    datasets: categoryIds.map(categoryId => {
      const category = state.categories.find(c => c.id === categoryId);
      return {
        label: category?.name || 'Uncategorized',
        data: monthlyData.map(m => m.categoryTotals[categoryId] || 0),
        backgroundColor: category?.color || '#64748b',
      };
    })
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
            const value = context.parsed?.y ?? context.parsed ?? 0;
            return `${context.dataset.label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatCurrency(value)
        }
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Monthly Analysis</h2>

      {/* Table */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Month</th>
              <th className="p-2 text-right">Expenses</th>
              <th className="p-2 text-right">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map(month => (
              <tr key={month.month} className="border-b">
                <td className="p-2">{month.monthLabel}</td>
                <td className="p-2 text-right text-red-600">{formatCurrency(Math.abs(month.totalDebits))}</td>
                <td className="p-2 text-right">{month.transactionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Spending Trend</h3>
          <div style={{ height: '300px' }}>
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Spending by Category</h3>
          <div style={{ height: '400px' }}>
            <Bar
              data={stackedBarData}
              options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  x: {
                    stacked: true,
                  },
                  y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                      callback: (value: any) => formatCurrency(value)
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
