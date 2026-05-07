import React, { useState, useCallback, useRef } from 'react';
import api from '../../api';
import { useDocuments } from '../../hooks/useDocuments';
import { globalProgress } from '../../hooks/useGlobalProgress';

interface FileItem {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  docId?: string;
  error?: string;
  size: number;
  type: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileCategory(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'tif'];
  const docExts = ['pdf', 'docx', 'doc'];
  const dataExts = ['csv', 'json'];
  if (imageExts.includes(ext)) return 'image';
  if (docExts.includes(ext)) return 'document';
  if (dataExts.includes(ext)) return 'data';
  return 'text';
}

const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
  image: { label: 'Image', color: 'bg-purple-100 text-purple-700', icon: '\uD83D\uDDBC' },
  document: { label: 'Document', color: 'bg-blue-100 text-blue-700', icon: '\uD83D\uDCC4' },
  data: { label: 'Data', color: 'bg-emerald-100 text-emerald-700', icon: '\uD83D\uDCCA' },
  text: { label: 'Text', color: 'bg-gray-100 text-gray-700', icon: '\uD83D\uDCDD' },
};

export default function Upload() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dbName, setDbName] = useState('default');
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, loading } = useDocuments();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const items: FileItem[] = Array.from(newFiles).map((f) => ({
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      file: f,
      status: 'queued' as const,
      progress: 0,
      size: f.size,
      type: getFileCategory(f.name),
    }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = async (item: FileItem) => {
    const progressId = `upload-${item.id}`;

    setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: 'uploading' as const, progress: 0 } : f));

    // Add to global progress
    globalProgress.addItem({
      id: progressId,
      type: 'upload',
      name: item.file.name,
      progress: 0,
      status: 'running',
      message: 'Uploading...',
      timestamp: Date.now(),
    });

    const form = new FormData();
    form.append('file', item.file);
    form.append('db_name', dbName);
    form.append('chunk_size', String(chunkSize));
    form.append('chunk_overlap', String(chunkOverlap));

    try {
      const res = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress: pct } : f));
            globalProgress.updateItem(progressId, { progress: pct });
          }
        },
      });
      setFiles((prev) => prev.map((f) =>
        f.id === item.id ? { ...f, status: 'processing' as const, progress: 100, docId: res.data.document_id } : f
      ));

      globalProgress.updateItem(progressId, {
        progress: 100,
        message: 'Processing...',
      });

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await api.get(`/documents/${res.data.document_id}/status`);
          if (statusRes.data.status === 'completed') {
            clearInterval(poll);
            setFiles((prev) => prev.map((f) =>
              f.id === item.id ? { ...f, status: 'completed' as const } : f
            ));
            globalProgress.updateItem(progressId, {
              status: 'completed',
              message: 'Done',
            });
          } else if (statusRes.data.status === 'failed') {
            clearInterval(poll);
            const errMsg = statusRes.data.metadata?.error || 'Processing failed';
            setFiles((prev) => prev.map((f) =>
              f.id === item.id ? { ...f, status: 'failed' as const, error: errMsg } : f
            ));
            globalProgress.updateItem(progressId, {
              status: 'failed',
              message: errMsg,
            });
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            const errMsg = 'Timed out waiting for processing';
            setFiles((prev) => prev.map((f) =>
              f.id === item.id ? { ...f, status: 'failed' as const, error: errMsg } : f
            ));
            globalProgress.updateItem(progressId, {
              status: 'failed',
              message: errMsg,
            });
          }
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            const errMsg = 'Status check failed';
            setFiles((prev) => prev.map((f) =>
              f.id === item.id ? { ...f, status: 'failed' as const, error: errMsg } : f
            ));
            globalProgress.updateItem(progressId, {
              status: 'failed',
              message: errMsg,
            });
          }
        }
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setFiles((prev) => prev.map((f) =>
        f.id === item.id ? { ...f, status: 'failed' as const, error: msg } : f
      ));
      globalProgress.updateItem(progressId, {
        status: 'failed',
        message: msg,
      });
    }
  };

  const handleUploadAll = async () => {
    const queued = files.filter((f) => f.status === 'queued');
    if (queued.length === 0) return;
    setUploading(true);
    for (const item of queued) {
      await uploadFile(item);
    }
    setUploading(false);
  };

  // Drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const queuedCount = files.filter((f) => f.status === 'queued').length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Documents</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chunk Size</label>
            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chunk Overlap</label>
            <input
              type="number"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
          }`}
        >
          <p className="text-gray-500 text-sm mb-1">
            Drag & drop files here, or click to browse
          </p>
          <p className="text-gray-400 text-xs">
            Supports .txt, .md, .csv, .json, .pdf, .docx, .png, .jpg, .gif, .webp
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff,.tif"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </h3>
            <span className="text-xs text-gray-400">
              {queuedCount} queued, {files.filter((f) => f.status === 'completed').length} completed
              {files.filter((f) => f.status === 'failed').length > 0 &&
                `, ${files.filter((f) => f.status === 'failed').length} failed`}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {files.map((item) => {
              const cfg = categoryConfig[item.type] || categoryConfig.text;
              return (
                <div key={item.id} className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">{formatSize(item.size)}</span>
                        {item.status === 'queued' && (
                          <span className="text-xs text-gray-400">Waiting to upload</span>
                        )}
                        {item.status === 'uploading' && (
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-primary-600 font-medium">{item.progress}%</span>
                          </div>
                        )}
                        {item.status === 'processing' && (
                          <div className="flex items-center gap-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-300 border-t-primary-600" />
                            <span className="text-xs text-primary-600">Processing</span>
                          </div>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-xs text-emerald-600 font-medium">Completed</span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-xs text-red-500" title={item.error}>
                            Failed: {item.error}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(item.id)}
                      disabled={item.status === 'uploading' || item.status === 'processing'}
                      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30 text-lg leading-none"
                      title="Remove"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleUploadAll}
              disabled={uploading || queuedCount === 0}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                uploading || queuedCount === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  Uploading...
                </span>
              ) : `Upload ${queuedCount} File${queuedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Recent documents */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h3>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Filename</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Database</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No documents yet
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-900">{doc.filename}</td>
                    <td className="px-4 py-3 text-gray-500">{doc.db_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}