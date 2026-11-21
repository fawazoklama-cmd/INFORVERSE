import React, { useState } from 'react';
import { CheckCircle2, Play, Plus, RefreshCw, Sparkles, Trash2, XCircle } from 'lucide-react';
import type {
  AutomationLog,
  AutomationSettings,
  Category,
  ContinentName,
  Country,
  Source,
  SourceType,
  WebsiteSettings,
} from '../../types/inforverse';

interface AdminPanelsProps {
  tab: 'automation' | 'sources' | 'categories' | 'countries' | 'ai' | 'settings' | 'logs';
  token: string;
  sources: Source[];
  categories: Category[];
  countries: Country[];
  automationSettings: AutomationSettings;
  websiteSettings: WebsiteSettings;
  logs: AutomationLog[];
  geminiConfigured: boolean;
  newsApiConfigured: boolean;
  onRefresh: () => Promise<void>;
}

export function AdminPanels({
  tab,
  token,
  sources,
  categories,
  countries,
  automationSettings,
  websiteSettings,
  logs,
  geminiConfigured,
  newsApiConfigured,
  onRefresh,
}: AdminPanelsProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Automation state
  const [autoForm, setAutoForm] = useState<AutomationSettings>(automationSettings);

  // Source form state
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('rss');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceCountry, setSourceCountry] = useState('ID');
  const [sourceCat, setSourceCat] = useState('world');
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Category form state
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameId, setCatNameId] = useState('');
  const [catDescEn, setCatDescEn] = useState('');

  // Country form state
  const [coCode, setCoCode] = useState('');
  const [coNameEn, setCoNameEn] = useState('');
  const [coNameId, setCoNameId] = useState('');
  const [coContinent, setCoContinent] = useState<ContinentName>('Asia');

  // AI Workbench state
  const [aiTitle, setAiTitle] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiOutput, setAiOutput] = useState<Record<string, unknown> | null>(null);

  // Website settings state
  const [siteForm, setSiteForm] = useState<WebsiteSettings>(websiteSettings);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    return res;
  };

  if (tab === 'automation') {
    const saveAutomation = async () => {
      setBusy(true);
      setNotice(null);
      try {
        const res = await authFetch('/api/admin/automation/settings', {
          method: 'POST',
          body: JSON.stringify(autoForm),
        });
        if (res.ok) {
          setNotice('Automation configuration saved.');
          await onRefresh();
        }
      } finally {
        setBusy(false);
      }
    };

    const runNow = async () => {
      setBusy(true);
      setNotice(null);
      try {
        const res = await authFetch('/api/admin/automation/run', { method: 'POST' });
        const data = await res.json();
        setNotice(
          `Collection complete: ${data.importedCount} imported, ${data.skippedDuplicates} duplicates skipped, ${data.errors?.length || 0} errors.`
        );
        await onRefresh();
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10233F]/55">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-[#071426] dark:text-white">Automatic Information Pipeline</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fetches active RSS feeds & News APIs on schedule, deduplicates, and summarizes via Gemini.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={runNow}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2878FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f63d6] disabled:opacity-60"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{busy ? 'Running...' : 'Run Collection Now'}</span>
            </button>
          </div>

          {notice && (
            <p className="mt-4 rounded-lg bg-[#F3F5F8] px-4 py-2.5 text-xs font-medium text-[#071426] dark:bg-[#071426] dark:text-slate-200">
              {notice}
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2.5 text-sm text-[#071426] dark:text-slate-200">
              <input
                type="checkbox"
                checked={autoForm.scheduler_enabled}
                onChange={(e) => setAutoForm({ ...autoForm, scheduler_enabled: e.target.checked })}
                className="h-4 w-4 accent-[#2878FF]"
              />
              <span>Enable Background Scheduler</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm text-[#071426] dark:text-slate-200">
              <input
                type="checkbox"
                checked={autoForm.auto_publish}
                onChange={(e) => setAutoForm({ ...autoForm, auto_publish: e.target.checked })}
                className="h-4 w-4 accent-[#2878FF]"
              />
              <span>Auto-Publish Non-Sensitive Items</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm text-[#071426] dark:text-slate-200">
              <input
                type="checkbox"
                checked={autoForm.ai_summary_enabled}
                onChange={(e) => setAutoForm({ ...autoForm, ai_summary_enabled: e.target.checked })}
                className="h-4 w-4 accent-[#2878FF]"
              />
              <span>Gemini AI Summarization</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm text-[#071426] dark:text-slate-200">
              <input
                type="checkbox"
                checked={autoForm.ai_translation_enabled}
                onChange={(e) => setAutoForm({ ...autoForm, ai_translation_enabled: e.target.checked })}
                className="h-4 w-4 accent-[#2878FF]"
              />
              <span>Gemini EN ↔ ID Translation</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm text-[#071426] dark:text-slate-200">
              <input
                type="checkbox"
                checked={autoForm.duplicate_detection_enabled}
                onChange={(e) => setAutoForm({ ...autoForm, duplicate_detection_enabled: e.target.checked })}
                className="h-4 w-4 accent-[#2878FF]"
              />
              <span>Duplicate Headline Detection</span>
            </label>

            <div>
              <label htmlFor="auto-interval" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Update Interval (Minutes, default 30)
              </label>
              <input
                id="auto-interval"
                type="number"
                min={5}
                max={1440}
                value={autoForm.update_interval_minutes}
                onChange={(e) =>
                  setAutoForm({ ...autoForm, update_interval_minutes: Number(e.target.value) || 30 })
                }
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm tabular-nums text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <span className="tabular-nums">
              Last Run: {automationSettings.last_run_at ? new Date(automationSettings.last_run_at).toLocaleString() : 'Never'}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={saveAutomation}
              className="rounded-lg bg-[#071426] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2878FF] dark:bg-[#2878FF]"
            >
              Save Automation Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'sources') {
    const addSource = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setNotice(null);
      try {
        const res = await authFetch('/api/admin/sources', {
          method: 'POST',
          body: JSON.stringify({
            name: sourceName,
            type: sourceType,
            url: sourceUrl,
            country_code: sourceCountry,
            default_category_slug: sourceCat,
            is_active: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setNotice(data.error || 'Failed to add source.');
        } else {
          setSourceName('');
          setSourceUrl('');
          setNotice(`Added source "${data.source.name}".`);
          await onRefresh();
        }
      } finally {
        setBusy(false);
      }
    };

    const toggleSource = async (s: Source) => {
      await authFetch('/api/admin/sources', {
        method: 'POST',
        body: JSON.stringify({ ...s, is_active: !s.is_active }),
      });
      await onRefresh();
    };

    const testSource = async (s: Source) => {
      setTestResults((prev) => ({ ...prev, [s.id]: { ok: true, msg: 'Testing...' } }));
      const res = await authFetch(`/api/admin/sources/${s.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [s.id]: {
          ok: Boolean(data.ok),
          msg: data.ok ? `OK (${data.itemCount} items) — ${data.sampleTitle || ''}` : data.error || 'Failed',
        },
      }));
      await onRefresh();
    };

    const removeSource = async (id: string) => {
      await authFetch(`/api/admin/sources/${id}`, { method: 'DELETE' });
      await onRefresh();
    };

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10233F]/55">
          <h2 className="text-lg font-bold text-[#071426] dark:text-white">Add Information Source (RSS / News API)</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            NewsAPI Status: {newsApiConfigured ? 'Configured' : 'NEWS_API_KEY unset (RSS feeds work directly without a key)'}
          </p>

          <form onSubmit={addSource} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              required
              placeholder="Source Name"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            >
              <option value="rss">RSS / Atom</option>
              <option value="news_api">News API</option>
              <option value="government">Government Official</option>
              <option value="research">Research Institute</option>
              <option value="international_org">International Org</option>
            </select>
            <input
              type="url"
              required
              placeholder="https://example.com/rss.xml"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white lg:col-span-2"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#2878FF] px-4 text-xs font-semibold text-white hover:bg-[#1f63d6]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Source</span>
            </button>
          </form>
          {notice && <p className="mt-3 text-xs text-[#2878FF]">{notice}</p>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#10233F]/55">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-[#F3F5F8] text-slate-600 dark:border-slate-700 dark:bg-[#071426] dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#071426] dark:text-white">{s.name}</p>
                    <p className="max-w-xs truncate text-slate-500">{s.url}</p>
                    {testResults[s.id] && (
                      <p className={`mt-1 ${testResults[s.id].ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {testResults[s.id].msg}
                      </p>
                    )}
                    {s.last_error && !testResults[s.id] && (
                      <p className="mt-1 text-rose-600">{s.last_error}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 uppercase text-slate-600 dark:text-slate-300">{s.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        s.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {s.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {s.is_active ? 'Active' : 'Paused'} ({s.last_status})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void testSource(s)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Test</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleSource(s)}
                        className="rounded border border-slate-200 px-2.5 py-1 text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200"
                      >
                        {s.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSource(s.id)}
                        aria-label={`Delete ${s.name}`}
                        className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === 'categories') {
    const addCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      await authFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name_en: catNameEn, name_id: catNameId, description_en: catDescEn }),
      });
      setCatNameEn('');
      setCatNameId('');
      setCatDescEn('');
      await onRefresh();
    };
    const deleteCategory = async (id: string) => {
      await authFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      await onRefresh();
    };

    return (
      <div className="space-y-6">
        <form
          onSubmit={addCategory}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10233F]/55 sm:grid-cols-4"
        >
          <input
            type="text"
            required
            placeholder="Name (English)"
            value={catNameEn}
            onChange={(e) => setCatNameEn(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
          <input
            type="text"
            required
            placeholder="Nama (Indonesia)"
            value={catNameId}
            onChange={(e) => setCatNameId(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
          <input
            type="text"
            placeholder="Description"
            value={catDescEn}
            onChange={(e) => setCatDescEn(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
          <button type="submit" className="h-10 rounded-lg bg-[#2878FF] px-4 text-xs font-semibold text-white">
            Add Category
          </button>
        </form>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#10233F]/55"
            >
              <div>
                <p className="text-sm font-bold text-[#071426] dark:text-white">{c.name_en}</p>
                <p className="text-xs text-slate-500">{c.name_id} · /{c.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => void deleteCategory(c.id)}
                aria-label={`Delete ${c.name_en}`}
                className="text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'countries') {
    const addCountry = async (e: React.FormEvent) => {
      e.preventDefault();
      await authFetch('/api/admin/countries', {
        method: 'POST',
        body: JSON.stringify({ code: coCode, name_en: coNameEn, name_id: coNameId, continent: coContinent }),
      });
      setCoCode('');
      setCoNameEn('');
      setCoNameId('');
      await onRefresh();
    };

    return (
      <div className="space-y-6">
        <form
          onSubmit={addCountry}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10233F]/55 sm:grid-cols-5"
        >
          <input
            type="text"
            required
            maxLength={2}
            placeholder="ISO Code (e.g. MY)"
            value={coCode}
            onChange={(e) => setCoCode(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm uppercase text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
          <input
            type="text"
            required
            placeholder="Country (EN)"
            value={coNameEn}
            onChange={(e) => setCoNameEn(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
          <input
            type="text"
            placeholder="Negara (ID)"
            value={coNameId}
            onChange={(e) => setCoNameId(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
          <select
            value={coContinent}
            onChange={(e) => setCoContinent(e.target.value as ContinentName)}
            className="h-10 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          >
            {['Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica'].map((con) => (
              <option key={con} value={con}>{con}</option>
            ))}
          </select>
          <button type="submit" className="h-10 rounded-lg bg-[#2878FF] px-4 text-xs font-semibold text-white">
            Add Country
          </button>
        </form>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {countries.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#10233F]/55">
              <p className="font-mono text-xs font-bold text-[#2878FF]">{c.code}</p>
              <p className="text-sm font-semibold text-[#071426] dark:text-white">{c.name_en}</p>
              <p className="text-xs text-slate-500">{c.continent}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'ai') {
    const runAiWorkbench = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setNotice(null);
      setAiOutput(null);
      try {
        const res = await authFetch('/api/admin/ai/analyze', {
          method: 'POST',
          body: JSON.stringify({ title: aiTitle, text: aiInput }),
        });
        const data = await res.json();
        if (!res.ok) {
          setNotice(data.error || 'Gemini AI error');
        } else {
          setAiOutput(data.result);
          await onRefresh();
        }
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10233F]/55">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-[#071426] dark:text-white">Gemini AI Information System</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server Model: <span className="font-mono">{automationSettings.ai_model}</span> · Total Tokens Used:{' '}
                <span className="font-mono tabular-nums">{automationSettings.token_usage_total.toLocaleString()}</span>
              </p>
            </div>
            <span
              className={`text-xs font-semibold ${
                geminiConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {geminiConfigured ? 'GEMINI_API_KEY Connected' : 'GEMINI_API_KEY Not Configured'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ai-len" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Summary Length
              </label>
              <select
                id="ai-len"
                value={autoForm.summary_length}
                onChange={(e) => setAutoForm({ ...autoForm, summary_length: e.target.value as any })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
              >
                <option value="short">Short (2 sentences)</option>
                <option value="medium">Medium (3 sentences)</option>
                <option value="detailed">Detailed (4-5 sentences)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={async () => {
                  await authFetch('/api/admin/automation/settings', {
                    method: 'POST',
                    body: JSON.stringify(autoForm),
                  });
                  setNotice('AI prompt & summary length saved.');
                  await onRefresh();
                }}
                className="h-10 rounded-lg bg-[#071426] px-4 text-xs font-semibold text-white hover:bg-[#2878FF] dark:bg-[#2878FF]"
              >
                Save AI Rules
              </button>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ai-prompt" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Editorial System Prompt
              </label>
              <textarea
                id="ai-prompt"
                rows={3}
                value={autoForm.ai_system_prompt}
                onChange={(e) => setAutoForm({ ...autoForm, ai_system_prompt: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] p-3 text-xs text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
              />
            </div>
          </div>

          <form onSubmit={runAiWorkbench} className="mt-6 border-t border-slate-200 pt-5 space-y-3 dark:border-slate-700">
            <h3 className="text-sm font-bold text-[#071426] dark:text-white">Test Gemini Summary, Translation & Detection</h3>
            <input
              type="text"
              placeholder="Source Headline"
              value={aiTitle}
              onChange={(e) => setAiTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
            <textarea
              rows={4}
              required
              placeholder="Paste factual source excerpt to summarize, detect category/country, and translate..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-[#F3F5F8] p-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2878FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f63d6] disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{busy ? 'Analyzing...' : 'Analyze with Gemini'}</span>
            </button>
          </form>

          {notice && <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">{notice}</p>}

          {aiOutput && (
            <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-[#071426] p-4 text-xs text-slate-100">
              {JSON.stringify(aiOutput, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (tab === 'settings') {
    const saveSite = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      try {
        const res = await authFetch('/api/admin/website/settings', {
          method: 'POST',
          body: JSON.stringify(siteForm),
        });
        if (res.ok) {
          setNotice('Website settings saved.');
          await onRefresh();
        }
      } finally {
        setBusy(false);
      }
    };

    return (
      <form
        onSubmit={saveSite}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10233F]/55"
      >
        <h2 className="text-lg font-bold text-[#071426] dark:text-white">Website Settings</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ws-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Website Name
            </label>
            <input
              id="ws-name"
              type="text"
              value={siteForm.site_name}
              onChange={(e) => setSiteForm({ ...siteForm, site_name: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="ws-tagline" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tagline
            </label>
            <input
              id="ws-tagline"
              type="text"
              value={siteForm.tagline}
              onChange={(e) => setSiteForm({ ...siteForm, tagline: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="ws-ig" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Instagram Credit URL
            </label>
            <input
              id="ws-ig"
              type="url"
              value={siteForm.instagram_url}
              onChange={(e) => setSiteForm({ ...siteForm, instagram_url: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="ws-seo" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              SEO Title
            </label>
            <input
              id="ws-seo"
              type="text"
              value={siteForm.seo_title}
              onChange={(e) => setSiteForm({ ...siteForm, seo_title: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">Homepage Sections</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(Object.keys(siteForm.homepage_sections) as Array<keyof WebsiteSettings['homepage_sections']>).map((key) => (
              <label key={key} className="flex items-center gap-2 text-xs text-[#071426] dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={siteForm.homepage_sections[key]}
                  onChange={(e) =>
                    setSiteForm({
                      ...siteForm,
                      homepage_sections: { ...siteForm.homepage_sections, [key]: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-[#2878FF]"
                />
                <span className="capitalize">{key}</span>
              </label>
            ))}
          </div>
        </div>

        {notice && <p className="text-xs text-emerald-600 dark:text-emerald-400">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#2878FF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1f63d6]"
        >
          Save Website Settings
        </button>
      </form>
    );
  }

  // Activity Logs Tab
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#10233F]/55">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 className="text-lg font-bold text-[#071426] dark:text-white">System & Administrator Activity Log</h2>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col gap-1 px-5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-mono font-semibold uppercase text-[#2878FF]">[{log.log_type}/{log.status}]</span>{' '}
              <span className="text-[#071426] dark:text-slate-200">{log.message}</span>
            </div>
            <span className="font-mono tabular-nums text-slate-400">
              {new Date(log.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
