import React, { useCallback, useState } from 'react';
import { useApp } from '../context/AppContext';

export function FileUploadZone() {
  const { actions, state } = useApp();
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

  return (
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
  );
}
