import React, { useState } from 'react';
import api from '../../api';

interface QueryResultItem {
  content: string;
  score: number;
  meta: Record<string, unknown>;
}

export default function Query() {
  const [query, setQuery] = useState('');
  const [dbName, setDbName] = useState('default');
  const [topK, setTopK] = useState(5);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<QueryResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults(null);
    try {
      const res = await api.post('/query', {
        query: query.trim(),
        db_name: dbName,
        top_k: topK,
      });
      setResults(res.data.results || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Query failed';
      setError(msg);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Query Documents</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="Enter your query..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
            <input
              type="text"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="default"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Top K:</label>
            <input
              type="number"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              min={1}
              max={50}
              className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || searching}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              !query.trim() || searching
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {results !== null && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </h3>
          {results.length === 0 ? (
            <p className="text-gray-500 bg-white rounded-xl p-6 border border-gray-100">
              No results found. Try a different query or database.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                      Result #{i + 1}
                    </span>
                    <span className="text-xs text-gray-400">
                      Score: {r.score.toFixed(4)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {r.content}
                  </p>
                  {r.meta && Object.keys(r.meta).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <p className="text-xs text-gray-400 mb-1">Metadata</p>
                      <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto">
                        {JSON.stringify(r.meta, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}