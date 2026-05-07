import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

interface DbInfo {
  name: string;
}

export default function Databases() {
  const [databases, setDatabases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDbName, setNewDbName] = useState('');
  const [newDbDesc, setNewDbDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dbs');
      setDatabases(res.data.databases || []);
    } catch {
      setError('Failed to load databases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newDbName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.post('/dbs', { name: newDbName.trim(), description: newDbDesc.trim() || undefined });
      setNewDbName('');
      setNewDbDesc('');
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create database';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete database "${name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/dbs/${encodeURIComponent(name)}`);
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete database';
      setError(msg);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Databases</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Create Database</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="e.g. my_database"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={newDbDesc}
              onChange={(e) => setNewDbDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="Optional description"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!newDbName.trim() || creating}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors whitespace-nowrap ${
              !newDbName.trim() || creating
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : databases.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-gray-400 text-lg mb-2">No databases yet</p>
          <p className="text-gray-400 text-sm">Create one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {databases.map((name) => (
            <div key={name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Vector database</p>
              </div>
              <button
                onClick={() => handleDelete(name)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}