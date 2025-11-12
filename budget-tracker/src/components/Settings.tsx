import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { generateId } from '../lib/utils';

export function Settings() {
  const { state, actions } = useApp();
  const [activeTab, setActiveTab] = useState<'categories' | 'data'>('categories');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportPreferences = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      actions.importPreferences(file);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>

      {/* Tabs */}
      <div className="border-b mb-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-2 px-1 ${activeTab === 'categories'
              ? 'border-b-2 border-blue-500 font-semibold'
              : 'text-gray-500'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`pb-2 px-1 ${activeTab === 'data'
              ? 'border-b-2 border-blue-500 font-semibold'
              : 'text-gray-500'
            }`}
          >
            Data Management
          </button>
        </div>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <h3 className="font-semibold mb-3">Categories</h3>
          <div className="space-y-2 mb-4">
            {state.categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center">
                  <span
                    className="inline-block w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                  {cat.isDefault && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
                {cat.isCustom && (
                  <button
                    onClick={() => actions.deleteCategory(cat.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>

          <NewCategoryForm onAdd={actions.addCategory} />
        </div>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Export</h3>
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
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Export your categories, rules, and settings to a JSON file.
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
      )}
    </div>
  );
}

function NewCategoryForm({ onAdd }: { onAdd: (category: any) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd({
        id: generateId(),
        name: name.trim(),
        color,
        patterns: [],
        isCustom: true,
        isDefault: false
      });
      setName('');
      setColor('#3b82f6');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="text-blue-600 hover:text-blue-800 text-sm"
      >
        + Add Custom Category
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded p-3 bg-gray-50">
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="flex-1 px-3 py-2 border rounded"
          autoFocus
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setIsAdding(false)}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
