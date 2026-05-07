import React, { useState } from 'react';
import { DatabasesTab, UploadTab, QueryTab, DashboardTab, SettingsTab, VisualizeTab } from './sections';

type TabKey = 'dashboard' | 'upload' | 'query' | 'databases' | 'visualize' | 'settings';

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '◫' },
  { key: 'upload', label: 'Upload', icon: '⬆' },
  { key: 'query', label: 'Query', icon: '⌕' },
  { key: 'databases', label: 'Databases', icon: '🗄' },
  { key: 'visualize', label: 'Visualize', icon: '◉' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

export default function Layout() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab onNavigate={setActiveTab} />;
      case 'upload': return <UploadTab />;
      case 'query': return <QueryTab />;
      case 'databases': return <DatabasesTab />;
      case 'visualize': return <VisualizeTab />;
      case 'settings': return <SettingsTab />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-primary-950 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-primary-800">
          <h1 className="text-lg font-bold tracking-tight">RAG Agent System</h1>
          <p className="text-xs text-primary-300 mt-1">Vector Database Manager</p>
        </div>
        <nav className="flex-1 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full text-left px-5 py-3 flex items-center gap-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-800 text-white border-l-3 border-primary-400'
                  : 'text-primary-200 hover:bg-primary-900 hover:text-white'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-primary-800 text-xs text-primary-400">
          v1.0.0
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}