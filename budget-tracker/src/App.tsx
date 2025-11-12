import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FileUploadZone } from './components/FileUploadZone';
import { Dashboard } from './components/Dashboard';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { MonthlyAnalysis } from './components/MonthlyAnalysis';
import { RepeatedExpenses } from './components/RepeatedExpenses';
import { TransactionList } from './components/TransactionList';
import { Settings } from './components/Settings';

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Budget Tracker</h1>
          <p className="text-sm text-gray-600">Personal Financial Analysis Tool</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* File Upload */}
          <FileUploadZone />

          {/* Dashboard */}
          <ErrorBoundary>
            <Dashboard />
          </ErrorBoundary>

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryBreakdown />
            <RepeatedExpenses />
          </div>

          {/* Monthly Analysis */}
          <ErrorBoundary>
            <MonthlyAnalysis />
          </ErrorBoundary>

          {/* Transaction List */}
          <TransactionList />

          {/* Settings */}
          <Settings />
        </div>
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
