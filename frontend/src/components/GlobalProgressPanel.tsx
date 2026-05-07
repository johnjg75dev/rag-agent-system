import React, { useState, useEffect } from 'react';
import { useGlobalProgress, ProgressItem } from '../hooks/useGlobalProgress';

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function GlobalProgressPanel() {
  const { items, removeItem, clearCompleted } = useGlobalProgress();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay to let the panel animate in
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const activeItems = items.filter((it: ProgressItem) => it.status === 'running' || it.status === 'pending');
  const completedItems = items.filter(
    (it: ProgressItem) => it.status === 'completed' || it.status === 'failed'
  );

  // Pulse the panel when there are active items
  const hasRunning = activeItems.length > 0;

  if (items.length === 0) return null;

  return (
    <div
      className={`fixed right-4 z-50 transition-all duration-300 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${collapsed ? 'bottom-4' : 'bottom-4'} mb-24 sm:mb-0`}
      style={{ maxWidth: '340px', width: 'calc(100% - 24px)' }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                hasRunning ? 'bg-primary-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Active Jobs ({activeItems.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {completedItems.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearCompleted();
                }}
                className="text-xs text-gray-500 hover:text-primary-600 transition-colors px-2 py-0.5 rounded hover:bg-gray-100"
              >
                Clear done
              </button>
            )}
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${
                collapsed ? '' : 'rotate-180'
              }`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {!collapsed && (
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {activeItems.length === 0 && completedItems.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                No active jobs
              </div>
            )}

            {/* Running / Pending Items */}
            {activeItems.map((item: ProgressItem) => (
              <div key={item.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">
                    {item.type === 'model_download' && '📥'}
                    {item.type === 'upload' && '📤'}
                    {item.type === 'processing' && '⚙'}
                    {item.type === 'embedding' && '🔢'}
                  </span>
                  <span className="text-xs font-medium text-gray-900 flex-1 truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400">{Math.round(item.progress)}%</span>
                </div>
                <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
                      item.progress < 100 ? 'bg-primary-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                {item.message && (
                  <p className="text-xs text-gray-500 mt-1">{item.message}</p>
                )}
              </div>
            ))}

            {/* Completed Items */}
            {completedItems.map((item: ProgressItem) => (
              <div
                key={item.id}
                className={`px-4 py-2 border-b border-gray-50 last:border-0 flex items-center gap-2 ${
                  item.status === 'failed' ? 'bg-red-50' : ''
                }`}
              >
                <span className="text-sm">
                  {item.status === 'completed' ? '✅' : '❌'}
                </span>
                <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
                <span className="text-xs text-gray-400">{formatTimeAgo(item.timestamp)}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors text-xs"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}