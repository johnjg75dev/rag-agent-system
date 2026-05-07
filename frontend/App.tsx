import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

// --- API client ---
const api = axios.create({ baseURL: 'http://localhost:8000' });

// --- Components ---

const DbTab = () => {
  const [dbs, setDbs] = useState<string[]>([]);
  const [newDb, setNewDb] = useState('');

  const refresh = async () => {
    try {
      const res = await api.get('/dbs');
      setDbs(res.data.databases || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/dbs', { name: newDb });
      setNewDb('');
      refresh();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error creating DB');
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/dbs/${name}`);
      refresh();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error deleting DB');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Databases</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={newDb} onChange={(e) => setNewDb(e.target.value)} placeholder="New DB name" />
        <button onClick={handleCreate}>Create</button>
        <button onClick={refresh}>Refresh</button>
      </div>
      <ul>
        {dbs.map((db) => (
          <li key={db} style={{ marginBottom: '0.5rem' }}>
            {db}
            <button onClick={() => handleDelete(db)} style={{ marginLeft: '0.5rem' }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const UploadTab = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dbName, setDbName] = useState('default');
  const [status, setStatus] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('db_name', dbName);
    try {
      setStatus('Uploading...');
      const res = await api.post('/upload', form);
      setStatus(`Uploaded: doc id ${res.data.document_id}`);
      setFile(null);
    } catch (e: any) {
      setStatus(`Error: ${e.response?.data?.detail || e.message}`);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Upload Document</h2>
      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', maxWidth: '400px' }}>
        <input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="DB Name" />
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button onClick={handleUpload} disabled={!file}>Upload</button>
        {status && <p>{status}</p>}
      </div>
    </div>
  );
};

const QueryTab = () => {
  const [query, setQuery] = useState('');
  const [dbName, setDbName] = useState('default');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    try {
      const res = await api.post('/query', { query, db_name: dbName });
      setResults(res.data.results || []);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Query error');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Query</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="DB Name" style={{ width: '150px' }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search query..." style={{ flex: 1 }} />
        <button onClick={handleSearch}>Search</button>
      </div>
      <div>
        {results.map((r, i) => (
          <div key={i} style={{ border: '1px solid #ccc', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px' }}>
            <div><strong>Score:</strong> {r.score.toFixed(4)}</div>
            <div><strong>Content:</strong> {r.content}</div>
            <div><small>{JSON.stringify(r.meta)}</small></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const VisualizeTab = () => {
  const [dbName, setDbName] = useState('default');
  const [method, setMethod] = useState('umap');
  const [plotData, setPlotData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  const handleViz = async () => {
    try {
      const res = await api.post('/visualize', { db_name: dbName, method });
      const pts = res.data.plot_data || [];
      setPlotData(pts);
      setStats(res.data.stats || {});
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Viz error');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Visualization</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="DB Name" />
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="umap">UMAP</option>
          <option value="tsne">t-SNE</option>
          <option value="pca">PCA</option>
        </select>
        <button onClick={handleViz}>Generate</button>
      </div>
      {plotData.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Plot
              data={[
                {
                  x: plotData.map((p) => p.x),
                  y: plotData.map((p) => p.y),
                  text: plotData.map((p) => p.label),
                  mode: 'markers',
                  type: 'scatter',
                  marker: { size: 8, color: '#4f46e5' },
                },
              ]}
              layout={{
                width: 600,
                height: 400,
                title: `${method.toUpperCase()} projection`,
              }}
            />
          </div>
          <div style={{ minWidth: '200px' }}>
            <h3>Stats</h3>
            <pre>{JSON.stringify(stats, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsTab = () => {
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    api.get('/settings').then((res) => setInfo(res.data)).catch(console.error);
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Settings</h2>
      <pre>{JSON.stringify(info, null, 2)}</pre>
    </div>
  );
};

// --- Main App ---

const tabs = [
  { key: 'dbs', label: 'Databases', component: DbTab },
  { key: 'upload', label: 'Upload', component: UploadTab },
  { key: 'query', label: 'Query', component: QueryTab },
  { key: 'visualize', label: 'Visualize', component: VisualizeTab },
  { key: 'settings', label: 'Settings', component: SettingsTab },
];

function App() {
  const [activeTab, setActiveTab] = useState('dbs');

  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.component || DbTab;

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <header style={{ background: '#1e1b4b', color: '#fff', padding: '1rem' }}>
        <h1 style={{ margin: 0 }}>RAG Agent System</h1>
      </header>
      <nav style={{ display: 'flex', background: '#312e81', color: '#fff' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === t.key ? '#4f46e5' : 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        <ActiveComponent />
      </main>
    </div>
  );
}

export default App;
