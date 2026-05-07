import React, { useEffect, useState } from 'react';
import api from '../../api';

interface Stats {
  total_documents: number;
  total_vectors: number;
  databases: string[];
  status_counts: Record<string, number>;
}

interface DashboardProps {
  onNavigate: (tab: 'upload' | 'query' | 'databases' | 'visualize') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats')
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!stats) return <p className="text-gray-500">Unable to load stats.</p>;

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  const quickActions: { label: string; tab: 'upload' | 'query' | 'databases' | 'visualize'; color: string; icon: string }[] = [
    { label: 'Upload Documents', tab: 'upload', color: 'from-emerald-500 to-teal-500', icon: '⬆' },
    { label: 'Query Documents', tab: 'query', color: 'from-indigo-500 to-purple-500', icon: '⌕' },
    { label: 'Manage Databases', tab: 'databases', color: 'from-orange-500 to-rose-500', icon: '🗄' },
    { label: 'Visualize Data', tab: 'visualize', color: 'from-cyan-500 to-blue-500', icon: '◉' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Documents</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total_documents}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Vectors</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total_vectors}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Databases</p>
          <p className="text-3xl font-bold text-gray-900">{stats.databases.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Object.entries(stats.status_counts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
              {status}
            </span>
            <p className="text-2xl font-bold text-gray-900">{count}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.tab}
            onClick={() => onNavigate(action.tab)}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${action.color} p-5 text-white shadow-md transition-transform hover:scale-105 text-left`}
          >
            <span className="text-2xl">{action.icon}</span>
            <p className="mt-3 font-semibold text-lg">{action.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}