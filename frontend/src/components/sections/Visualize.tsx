import React, { useState, useEffect, useCallback } from 'react';
import Plot from 'react-plotly.js';
import api from '../../api';

interface PlotPoint {
  x: number;
  y: number;
  label: string;
}

interface VisStats {
  total_points: number;
  method: string;
  dimensions?: number;
}

export default function Visualize() {
  const [dbName, setDbName] = useState('default');
  const [method, setMethod] = useState('umap');
  const [nNeighbors, setNNeighbors] = useState(15);
  const [minDist, setMinDist] = useState(0.1);
  const [plotData, setPlotData] = useState<PlotPoint[]>([]);
  const [stats, setStats] = useState<VisStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVisualize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/visualize', {
        db_name: dbName,
        method,
        n_neighbors: nNeighbors,
        min_dist: minDist,
      });
      setPlotData(res.data.plot_data || []);
      setStats(res.data.stats || null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Visualization failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [dbName, method, nNeighbors, minDist]);

  useEffect(() => {
    handleVisualize();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Visualize</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
            <input
              type="text"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="umap">UMAP</option>
              <option value="tsne">t-SNE</option>
              <option value="pca">PCA</option>
            </select>
          </div>
          {method === 'umap' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N Neighbors</label>
                <input
                  type="number"
                  value={nNeighbors}
                  onChange={(e) => setNNeighbors(Number(e.target.value))}
                  min={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Dist</label>
                <input
                  type="number"
                  value={minDist}
                  onChange={(e) => setMinDist(Number(e.target.value))}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleVisualize}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
            loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {loading ? 'Generating...' : 'Visualize'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {stats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400">Points</p>
            <p className="text-lg font-bold text-gray-900">{stats.total_points}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Method</p>
            <p className="text-lg font-bold text-gray-900">{stats.method?.toUpperCase()}</p>
          </div>
          {stats.dimensions != null && (
            <div>
              <p className="text-xs text-gray-400">Embedding Dimensions</p>
              <p className="text-lg font-bold text-gray-900">{stats.dimensions}</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : plotData.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Plot
            data={[
              {
                x: plotData.map((p) => p.x),
                y: plotData.map((p) => p.y),
                text: plotData.map((p) => p.label),
                type: 'scatter',
                mode: 'markers',
                marker: {
                  size: 7,
                  color: plotData.map((_, i) => i),
                  colorscale: 'Viridis',
                  line: { width: 0.5, color: '#fff' },
                },
                hovertemplate: '%{text}<extra></extra>',
              },
            ]}
            layout={{
              autosize: true,
              margin: { l: 30, r: 20, t: 20, b: 40 },
              paper_bgcolor: '#fff',
              plot_bgcolor: '#f9fafb',
              xaxis: { showgrid: false, zeroline: false, showticklabels: false },
              yaxis: { showgrid: false, zeroline: false, showticklabels: false },
              coloraxis: { showscale: false },
            }}
            useResizeHandler
            style={{ width: '100%', height: '520px' }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-gray-400 text-lg">No data to visualize</p>
          <p className="text-gray-400 text-sm mt-1">Upload documents first.</p>
        </div>
      )}
    </div>
  );
}