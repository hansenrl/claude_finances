import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { generateId } from '../lib/utils';
import type { CategoryPattern } from '../types';

export function Settings() {
  const { state, actions } = useApp();
  const [activeTab, setActiveTab] = useState<'categories' | 'mappings' | 'data'>('categories');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

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
            Categories & Patterns
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`pb-2 px-1 ${activeTab === 'mappings'
              ? 'border-b-2 border-blue-500 font-semibold'
              : 'text-gray-500'
            }`}
          >
            Description Mappings
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
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Manage Categories & Categorization Patterns</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click on a category to view and edit its regex patterns. Patterns with lower priority numbers are matched first.
            </p>
          </div>

          <div className="space-y-2">
            {state.categories.map(category => (
              <CategoryCard
                key={category.id}
                category={category}
                isExpanded={expandedCategories.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
                onAddPattern={(pattern) => actions.addPatternToCategory(category.id, pattern)}
                onUpdatePattern={(pattern) => actions.updatePattern(category.id, pattern)}
                onDeletePattern={(patternId) => actions.deletePattern(category.id, patternId)}
                onDeleteCategory={() => actions.deleteCategory(category.id)}
              />
            ))}
          </div>

          <div className="mt-6">
            <NewCategoryForm onAdd={actions.addCategory} />
          </div>
        </div>
      )}

      {/* Description Mappings Tab */}
      {activeTab === 'mappings' && (
        <div>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Description-Based Categorization</h3>
            <p className="text-sm text-gray-600 mb-4">
              When you categorize a transaction, all transactions with the same description are automatically categorized the same way.
              Below are your current description mappings.
            </p>
          </div>

          {state.descriptionMappings.size === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No description mappings yet.</p>
              <p className="text-sm mt-2">Categorize a transaction to create your first mapping.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3 text-sm font-medium text-gray-600">
                <span>Description</span>
                <span>Category</span>
              </div>
              {Array.from(state.descriptionMappings.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([description, categoryId]) => {
                  const category = state.categories.find(c => c.id === categoryId);
                  const matchingTransactions = state.transactions.filter(t => t.description === description);

                  return (
                    <div key={description} className="border rounded p-3 bg-white flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="font-mono text-sm text-gray-800 truncate">
                          {description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {matchingTransactions.length} transaction{matchingTransactions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        {category && (
                          <div className="flex items-center">
                            <span
                              className="inline-block w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Delete mapping for "${description}"?\n\nThis will not affect existing categorizations, but future imports won't auto-categorize.`)) {
                              actions.deleteDescriptionMapping(description);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
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
              Export your categories, patterns, rules, and settings to a JSON file.
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

interface CategoryCardProps {
  category: any;
  isExpanded: boolean;
  onToggle: () => void;
  onAddPattern: (pattern: CategoryPattern) => void;
  onUpdatePattern: (pattern: CategoryPattern) => void;
  onDeletePattern: (patternId: string) => void;
  onDeleteCategory: () => void;
}

function CategoryCard({
  category,
  isExpanded,
  onToggle,
  onAddPattern,
  onUpdatePattern,
  onDeletePattern,
  onDeleteCategory
}: CategoryCardProps) {
  const patternCount = category.patterns.length;

  return (
    <div className="border rounded overflow-hidden">
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
      >
        <div className="flex items-center flex-1">
          <span
            className="inline-block w-4 h-4 rounded-full mr-3"
            style={{ backgroundColor: category.color }}
          />
          <span className="font-medium">{category.name}</span>
          {category.isDefault && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Default
            </span>
          )}
          <span className="ml-3 text-sm text-gray-600">
            {patternCount} {patternCount === 1 ? 'pattern' : 'patterns'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {category.isCustom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete category "${category.name}"?`)) {
                  onDeleteCategory();
                }
              }}
              className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
            >
              Delete
            </button>
          )}
          <span className="text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t bg-white">
          {patternCount === 0 ? (
            <p className="text-sm text-gray-500 mb-3">
              No patterns defined. Add a pattern to automatically categorize transactions.
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {category.patterns
                .sort((a: CategoryPattern, b: CategoryPattern) => a.priority - b.priority)
                .map((pattern: CategoryPattern) => (
                  <PatternRow
                    key={pattern.id}
                    pattern={pattern}
                    onUpdate={onUpdatePattern}
                    onDelete={onDeletePattern}
                  />
                ))}
            </div>
          )}

          <NewPatternForm
            categoryId={category.id}
            onAdd={onAddPattern}
          />
        </div>
      )}
    </div>
  );
}

interface PatternRowProps {
  pattern: CategoryPattern;
  onUpdate: (pattern: CategoryPattern) => void;
  onDelete: (patternId: string) => void;
}

function PatternRow({ pattern, onUpdate, onDelete }: PatternRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPattern, setEditedPattern] = useState(pattern.pattern);
  const [editedPriority, setEditedPriority] = useState(pattern.priority.toString());
  const [editedDescription, setEditedDescription] = useState(pattern.description || '');
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const handleSave = () => {
    const priority = parseInt(editedPriority) || 10;
    onUpdate({
      ...pattern,
      pattern: editedPattern,
      priority,
      description: editedDescription || undefined
    });
    setIsEditing(false);
  };

  const handleTest = () => {
    try {
      const regex = new RegExp(editedPattern, 'i');
      setTestResult(regex.test(testText));
    } catch (error) {
      setTestResult(null);
      alert('Invalid regex pattern');
    }
  };

  const toggleEnabled = () => {
    onUpdate({ ...pattern, enabled: !pattern.enabled });
  };

  if (isEditing) {
    return (
      <div className="border rounded p-3 bg-gray-50 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Regex Pattern
          </label>
          <input
            type="text"
            value={editedPattern}
            onChange={(e) => setEditedPattern(e.target.value)}
            className="w-full px-2 py-1 border rounded font-mono text-sm"
            placeholder="(example|pattern|here)"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Priority
            </label>
            <input
              type="number"
              value={editedPriority}
              onChange={(e) => setEditedPriority(e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="e.g., Coffee shops"
            />
          </div>
        </div>

        {/* Pattern Tester */}
        <div className="border-t pt-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Test Pattern
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm"
              placeholder="Enter test text (e.g., 'STARBUCKS STORE #1234')"
            />
            <button
              onClick={handleTest}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Test
            </button>
          </div>
          {testResult !== null && (
            <p className={`text-xs mt-1 ${testResult ? 'text-green-600' : 'text-red-600'}`}>
              {testResult ? '✓ Match!' : '✗ No match'}
            </p>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded p-2 ${!pattern.enabled ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <code className="text-sm font-mono text-blue-600 truncate">
              {pattern.pattern}
            </code>
            {pattern.isDefault && (
              <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">
                Default
              </span>
            )}
            <span className="text-xs text-gray-500 flex-shrink-0">
              Priority: {pattern.priority}
            </span>
          </div>
          {pattern.description && (
            <p className="text-xs text-gray-600 mt-1">{pattern.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
          <button
            onClick={toggleEnabled}
            className={`text-xs px-2 py-1 rounded ${
              pattern.enabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {pattern.enabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this pattern?')) {
                onDelete(pattern.id);
              }
            }}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface NewPatternFormProps {
  categoryId: string;
  onAdd: (pattern: CategoryPattern) => void;
}

function NewPatternForm({ categoryId, onAdd }: NewPatternFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [pattern, setPattern] = useState('');
  const [priority, setPriority] = useState('50');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pattern.trim()) {
      onAdd({
        id: generateId(),
        pattern: pattern.trim(),
        priority: parseInt(priority) || 50,
        enabled: true,
        isDefault: false,
        description: description.trim() || undefined
      });
      setPattern('');
      setPriority('50');
      setDescription('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="text-blue-600 hover:text-blue-800 text-sm"
      >
        + Add Pattern
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded p-3 bg-gray-50 space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Regex Pattern
        </label>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="(example|pattern|here)"
          className="w-full px-2 py-1 border rounded font-mono text-sm"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Priority (0-100)
          </label>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
            min="0"
            max="100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          type="submit"
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setIsAdding(false)}
          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
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
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
