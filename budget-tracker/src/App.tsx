import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './components/Dashboard';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { MonthlyAnalysis } from './components/MonthlyAnalysis';
import { RepeatedExpenses } from './components/RepeatedExpenses';
import { ExcludedRepeatedExpenses } from './components/ExcludedRepeatedExpenses';
import { TransactionList } from './components/TransactionList';
import { Settings } from './components/Settings';
import { DataManagement } from './components/DataManagement';
import { TabNavigation, TabPanel } from './components/TabNavigation';
import type { TabId } from './components/TabNavigation';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Budget Tracker</h1>
          <p className="text-sm text-gray-600">Personal Financial Analysis Tool</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        <TabPanel activeTab={activeTab} tabId="overview">
          <div className="space-y-6">
            {/* Dashboard */}
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategoryBreakdown />
              <RepeatedExpenses />
            </div>

            {/* Excluded Repeated Expenses */}
            <ErrorBoundary>
              <ExcludedRepeatedExpenses />
            </ErrorBoundary>

            {/* Monthly Analysis */}
            <ErrorBoundary>
              <MonthlyAnalysis />
            </ErrorBoundary>
          </div>
        </TabPanel>

        {/* Transactions Tab */}
        <TabPanel activeTab={activeTab} tabId="transactions">
          <TransactionList />
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel activeTab={activeTab} tabId="settings">
          <Settings />
        </TabPanel>

        {/* Data Management Tab */}
        <TabPanel activeTab={activeTab} tabId="data-management">
          <DataManagement />
        </TabPanel>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-600">
          <p>Budget Tracker • All data stored locally in your browser</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
