import { useState, useEffect } from 'react';

export interface ProgressItem {
  id: string;
  type: 'upload' | 'model_download' | 'processing' | 'embedding';
  name: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
  timestamp: number;
}

let listeners: Set<(items: ProgressItem[]) => void> = new Set();
let currentItems: ProgressItem[] = [];

function notify() {
  listeners.forEach((l) => l([...currentItems]));
}

export const globalProgress = {
  addItem: (item: ProgressItem) => {
    currentItems = [item, ...currentItems].slice(0, 20);
    notify();
  },
  updateItem: (id: string, updates: Partial<ProgressItem>) => {
    currentItems = currentItems.map((it) =>
      it.id === id ? { ...it, ...updates } : it
    );
    notify();
  },
  removeItem: (id: string) => {
    currentItems = currentItems.filter((it) => it.id !== id);
    notify();
  },
  clearCompleted: () => {
    currentItems = currentItems.filter((it) => it.status === 'running' || it.status === 'pending');
    notify();
  },
  getItems: (): ProgressItem[] => [...currentItems],
  subscribe: (listener: (items: ProgressItem[]) => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export function useGlobalProgress() {
  const [items, setItems] = useState<ProgressItem[]>([]);

  useEffect(() => {
    setItems(globalProgress.getItems());
    return globalProgress.subscribe(setItems);
  }, []);

  return { items, ...globalProgress };
}