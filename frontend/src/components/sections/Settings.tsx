import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

interface EmbedModelConfig {
  model_name: string;
  enabled: boolean;
  model_type: string;
}

interface SettingsState {
  current_db: string;
  databases: string[];
  model_settings: {
    text_embedding: EmbedModelConfig;
    vision_embedding: EmbedModelConfig;
    multimodal_embedding: EmbedModelConfig;
    use_multimodal_for_both: boolean;
    embedding_prefix: string;
    query_llm: { model_name: string; enabled: boolean; base_url: string; api_key: string };
    rerank: { model_name: string; enabled: boolean };
  };
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/settings')
      .then((r) => setSettings(r.data))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const updateModel = (
    key: 'text_embedding' | 'vision_embedding' | 'multimodal_embedding',
    patch: Partial<EmbedModelConfig>,
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      model_settings: {
        ...settings.model_settings,
        [key]: { ...settings.model_settings[key], ...patch },
      },
    });
    setSaved(false);
  };

  const updateQueryLlm = (patch: Partial<SettingsState['model_settings']['query_llm']>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      model_settings: {
        ...settings.model_settings,
        query_llm: { ...settings.model_settings.query_llm, ...patch },
      },
    });
    setSaved(false);
  };

  const updateRerank = (patch: Partial<SettingsState['model_settings']['rerank']>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      model_settings: {
        ...settings.model_settings,
        rerank: { ...settings.model_settings.rerank, ...patch },
      },
    });
    setSaved(false);
  };

  const toggleMultimodal = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      model_settings: {
        ...settings.model_settings,
        use_multimodal_for_both: !settings.model_settings.use_multimodal_for_both,
      },
    });
    setSaved(false);
  };

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await api.put('/settings', {
        current_db: settings.current_db,
        model_settings: settings.model_settings,
        chunk_size: settings.chunk_size,
        chunk_overlap: settings.chunk_overlap,
        top_k: settings.top_k,
      });
      setSaved(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!settings) return <p className="text-gray-500">Unable to load settings.</p>;

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionClass = 'bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6';
  const sectionTitle = 'text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
            saved ? 'bg-emerald-500' : saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className={sectionClass}>
        <h3 className={sectionTitle}>Active Database</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Current Database</label>
            <select
              value={settings.current_db}
              onChange={(e) => {
                setSettings({ ...settings, current_db: e.target.value });
                setSaved(false);
              }}
              className={inputClass}
            >
              {settings.databases.map((db) => (
                <option key={db} value={db}>{db}</option>
              ))}
              {settings.databases.length === 0 && <option value="default">default</option>}
            </select>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitle}>Text Embedding Model</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Model Name</label>
            <input
              type="text"
              value={settings.model_settings.text_embedding.model_name}
              onChange={(e) => updateModel('text_embedding', { model_name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.model_settings.text_embedding.enabled}
                onChange={(e) => updateModel('text_embedding', { enabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enabled</span>
            </label>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitle}>Vision Embedding Model</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Model Name</label>
            <input
              type="text"
              value={settings.model_settings.vision_embedding.model_name}
              onChange={(e) => updateModel('vision_embedding', { model_name: e.target.value })}
              className={inputClass}
              placeholder="Leave empty to disable"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.model_settings.vision_embedding.enabled}
                onChange={(e) => updateModel('vision_embedding', { enabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enabled</span>
            </label>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitle}>Multimodal Embedding Model</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <div>
            <label className={labelClass}>Model Name</label>
            <input
              type="text"
              value={settings.model_settings.multimodal_embedding.model_name}
              onChange={(e) => updateModel('multimodal_embedding', { model_name: e.target.value })}
              className={inputClass}
              placeholder="e.g. clip-ViT-B-32"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.model_settings.multimodal_embedding.enabled}
                onChange={(e) => updateModel('multimodal_embedding', { enabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enabled</span>
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.model_settings.use_multimodal_for_both}
            onChange={toggleMultimodal}
            className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Use multimodal for both text and vision</span>
        </label>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitle}>Query LLM</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <div>
            <label className={labelClass}>Model Name</label>
            <input
              type="text"
              value={settings.model_settings.query_llm.model_name}
              onChange={(e) => updateQueryLlm({ model_name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.model_settings.query_llm.enabled}
                onChange={(e) => updateQueryLlm({ enabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enabled</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Base URL</label>
            <input
              type="text"
              value={settings.model_settings.query_llm.base_url}
              onChange={(e) => updateQueryLlm({ base_url: e.target.value })}
              className={inputClass}
              placeholder="e.g. https://api.openai.com/v1"
            />
          </div>
          <div>
            <label className={labelClass}>API Key</label>
            <input
              type="password"
              value={settings.model_settings.query_llm.api_key}
              onChange={(e) => updateQueryLlm({ api_key: e.target.value })}
              className={inputClass}
              placeholder="sk-..."
            />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitle}>Rerank Model</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Model Name (CrossEncoder)</label>
            <input
              type="text"
              value={settings.model_settings.rerank.model_name}
              onChange={(e) => updateRerank({ model_name: e.target.value })}
              className={inputClass}
              placeholder="e.g. cross-encoder/ms-marco-MiniLM-L-6-v2"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.model_settings.rerank.enabled}
                onChange={(e) => updateRerank({ enabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enabled</span>
            </label>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitle}>Defaults</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Chunk Size</label>
            <input
              type="number"
              value={settings.chunk_size}
              onChange={(e) => {
                setSettings({ ...settings, chunk_size: Number(e.target.value) });
                setSaved(false);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Chunk Overlap</label>
            <input
              type="number"
              value={settings.chunk_overlap}
              onChange={(e) => {
                setSettings({ ...settings, chunk_overlap: Number(e.target.value) });
                setSaved(false);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Default Top K</label>
            <input
              type="number"
              value={settings.top_k}
              onChange={(e) => {
                setSettings({ ...settings, top_k: Number(e.target.value) });
                setSaved(false);
              }}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}