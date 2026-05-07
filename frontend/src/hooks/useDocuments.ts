import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export interface DocumentRecord {
  id: string;
  filename: string;
  db_name: string;
  status: string;
  created_at: string | null;
  metadata: Record<string, unknown>;
}

export function useDocuments(dbName?: string, pollInterval = 3000) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const params = dbName ? { db_name: dbName } : {};
      const res = await api.get('/documents', { params });
      setDocuments(res.data.documents || []);
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    } finally {
      setLoading(false);
    }
  }, [dbName]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [refresh, pollInterval]);

  return { documents, loading, refresh };
}

export function useDocumentStatus(docId: string | null, pollInterval = 2000) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!docId) return;
    let active = true;
    const fetch = async () => {
      try {
        const res = await api.get(`/documents/${docId}/status`);
        if (active) setStatus(res.data.status);
      } catch {
        if (active) setStatus('error');
      }
    };
    fetch();
    const interval = setInterval(fetch, pollInterval);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [docId, pollInterval]);

  return { status, loading };
}