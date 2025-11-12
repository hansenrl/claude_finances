import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsCalculator } from '../lib/analytics/calculator';
import { formatCurrency, formatDate } from '../lib/utils';

export function Dashboard() {
  const { state } = useApp();

  const analytics = useMemo(() => {
    if (state.transactions.length === 0) return null;
    const calculator = new AnalyticsCalculator(state.transactions);
    return calculator.computeAll();
  }, [state.transactions]);

  if (!analytics || state.transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
        <p className="text-gray-500">No transactions loaded. Upload files to get started.</p>
      </div>
    );
  }

  const { overallStats } = analytics;
  const uncategorized = state.transactions.filter(t => !t.categoryId && !t.isExcluded).length;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Expenses"
          value={formatCurrency(overallStats.totalDebits)}
          color="text-red-600"
        />
        <StatCard
          label="Total Income"
          value={formatCurrency(overallStats.totalCredits)}
          color="text-green-600"
        />
        <StatCard
          label="Net"
          value={formatCurrency(overallStats.net)}
          color={overallStats.net >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          label="Avg Monthly"
          value={formatCurrency(overallStats.averageMonthlyExpenses)}
          color="text-blue-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <StatCard
          label="Transactions"
          value={overallStats.transactionCount.toString()}
        />
        <StatCard
          label="Months"
          value={overallStats.monthCount.toString()}
        />
        {overallStats.dateRange && (
          <>
            <StatCard
              label="From"
              value={formatDate(overallStats.dateRange.start)}
            />
            <StatCard
              label="To"
              value={formatDate(overallStats.dateRange.end)}
            />
          </>
        )}
      </div>

      {uncategorized > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ {uncategorized} transactions are uncategorized
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-900' }: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-50 p-4 rounded">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold ${color} mt-1`}>{value}</p>
    </div>
  );
}
