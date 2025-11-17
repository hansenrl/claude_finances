import React, { useRef, useCallback, useState } from 'react';
import { useApp } from '../context/AppContext';

export function DataManagement() {
  const { state, actions } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      actions.uploadFiles(files);
    }
  }, [actions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      actions.uploadFiles(files);
    }
  }, [actions]);

  const handleImportPreferences = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      actions.importPreferences(file);
    }
  };

  const formatDateForInput = (date: string | null): string => {
    if (!date) return '';
    // Ensure the date is in YYYY-MM-DD format
    return date.split('T')[0];
  };

  const handleToggleFilter = () => {
    actions.updateTimeWindowFilter({
      ...state.timeWindowFilter,
      enabled: !state.timeWindowFilter.enabled
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.updateTimeWindowFilter({
      ...state.timeWindowFilter,
      startDate: e.target.value || null
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.updateTimeWindowFilter({
      ...state.timeWindowFilter,
      endDate: e.target.value || null
    });
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Upload Transactions</h2>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center
            transition-colors cursor-pointer
            ${isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".qfx,.csv"
            multiple
            onChange={handleFileInput}
            disabled={state.isLoading}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer"
          >
            <div className="text-4xl mb-2">📁</div>
            <p className="text-lg font-medium text-gray-700">
              {state.isLoading ? 'Processing files...' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to select files
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports .qfx and .csv files
            </p>
          </label>
        </div>

        {state.errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-semibold text-red-800 mb-2">Errors:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              {state.errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {state.transactions.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <p>Loaded {state.transactions.length} transactions</p>
          </div>
        )}
      </div>

      {/* Time Window Filter Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Time Window Filter</h2>

        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={state.timeWindowFilter.enabled}
                onChange={handleToggleFilter}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="font-medium text-gray-700">
              {state.timeWindowFilter.enabled ? 'Filter Enabled' : 'Filter Disabled'}
            </span>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date (included)
              </label>
              <input
                type="date"
                value={formatDateForInput(state.timeWindowFilter.startDate)}
                onChange={handleStartDateChange}
                disabled={!state.timeWindowFilter.enabled}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !state.timeWindowFilter.enabled ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (excluded)
              </label>
              <input
                type="date"
                value={formatDateForInput(state.timeWindowFilter.endDate)}
                onChange={handleEndDateChange}
                disabled={!state.timeWindowFilter.enabled}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !state.timeWindowFilter.enabled ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          <p className="text-sm text-gray-600">
            When enabled, only transactions within the specified date range will be included in charts and analytics.
            The start date is inclusive and the end date is exclusive.
          </p>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Data Management</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Export & Share</h3>
            <div className="space-y-2">
              <button
                onClick={actions.exportPreferences}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export Preferences
              </button>
              <button
                onClick={actions.exportData}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-0 md:ml-2"
              >
                Export All Data
              </button>
              <button
                onClick={actions.generateShareableURL}
                className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 ml-0 md:ml-2"
              >
                🔗 Generate Shareable URL
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Export your categories, patterns, rules, and settings to a JSON file, or generate a shareable URL that includes all your preferences (but not your transactions).
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Import</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportPreferences}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Import Preferences
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Import previously exported preferences.
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Sample Data</h3>
            <button
              onClick={actions.loadSampleData}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Load Sample Data
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Load ~200 sample transactions throughout 2025 for testing. Includes monthly subscriptions and various expense categories.
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 text-red-600">Danger Zone</h3>
            <div className="space-y-4">
              <div>
                <button
                  onClick={actions.clearTransactions}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Clear Transactions Only
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Delete all transactions but keep your categories, patterns, and description mappings.
                </p>
              </div>
              <div>
                <button
                  onClick={actions.clearAllData}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Clear All Data
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  This will delete all transactions, preferences, and settings. This cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
