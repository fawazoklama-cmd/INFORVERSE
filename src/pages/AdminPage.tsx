import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Database,
  FileText,
  FolderTree,
  Globe,
  LogOut,
  Plus,
  RefreshCw,
  Rss,
  Settings,
  Sliders,
  Trash2,
} from 'lucide-react';
import type {
  AdminDashboardStats,
  Article,
  AutomationLog,
  AutomationSettings,
  Category,
  Country,
  IndonesianRegion,
  Source,
  WebsiteSettings,
} from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { appCheckSiteKey, auth, firebaseConfig, isFirebaseConfigured } from '../lib/firebase';
import {
  deleteArticleFromFirestore,
  fetchAdminFirestoreOverview,
  seedFirestoreBaselineIfEmpty,
} from '../services/firestoreService';
import { AdminAuthPanel } from '../components/admin/AdminAuthPanel';
import { ArticleEditor } from '../components/admin/ArticleEditor';
import { AdminPanels } from '../components/admin/AdminPanels';

type AdminTab =
  | 'overview'
  | 'articles'
  | 'automation'
  | 'sources'
  | 'categories'
  | 'countries'
  | 'ai'
  | 'settings'
  | 'logs';

export function AdminPage() {
  const { firebaseUser, adminProfile, authLoading, logoutAdmin, refreshBootstrap } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<IndonesianRegion[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);

  const [editingArticle, setEditingArticle] = useState<Article | null | undefined>(undefined);

  const loadOverview = useCallback(async () => {
    if (!firebaseUser || !adminProfile) return;
    setLoading(true);
    try {
      await seedFirestoreBaselineIfEmpty();
      const fsData = await fetchAdminFirestoreOverview();

      let integrations: AdminDashboardStats['integrations'] = {
        firebaseConfigured: isFirebaseConfigured,
        storageConfigured: Boolean(firebaseConfig.storageBucket),
        appCheckConfigured: Boolean(appCheckSiteKey),
        geminiConfigured: false,
        newsApiConfigured: false,
        newsletterConfigured: false,
      };
      let serverVisitors = fsData.totalVisitors;

      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          const res = await fetch('/api/admin/integrations-status', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (res.ok) {
            const statusJson = await res.json();
            integrations = { ...integrations, ...(statusJson.integrations || {}) };
            if (typeof statusJson.totalVisitors === 'number') {
              serverVisitors = Math.max(serverVisitors, statusJson.totalVisitors);
            }
          }
        }
      } catch {
        // Non-fatal if Express integrations endpoint is unreachable
      }

      setArticles(fsData.articles);
      setCategories(fsData.categories);
      setCountries(fsData.countries);
      setRegions(fsData.regions);
      setSources(fsData.sources);
      setAutomationSettings(fsData.automationSettings);
      setWebsiteSettings(fsData.websiteSettings);
      setLogs(fsData.logs);

      setStats({
        totalArticles: fsData.articles.length,
        publishedArticles: fsData.articles.filter((a) => a.status === 'published').length,
        draftArticles: fsData.articles.filter((a) => a.status === 'draft').length,
        totalCategories: fsData.categories.length,
        activeSources: fsData.sources.filter((s) => s.is_active).length,
        totalVisitors: serverVisitors,
        automaticUpdates: fsData.logs.filter((l) => l.log_type === 'automation' && l.status === 'success').length,
        failedUpdates: fsData.logs.filter((l) => l.log_type === 'fetch_error' || l.status === 'error').length,
        newsletterSubscribers: fsData.subscriberCount,
        integrations,
      });
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, adminProfile]);

  useEffect(() => {
    if (firebaseUser && adminProfile) {
      void loadOverview();
    }
  }, [firebaseUser, adminProfile, loadOverview]);

  if (authLoading || !firebaseUser || !adminProfile) {
    return <AdminAuthPanel />;
  }

  const handleDeleteArticle = async (id: string) => {
    await deleteArticleFromFirestore(id);
    await loadOverview();
    await refreshBootstrap();
  };

  const handleManualSeed = async () => {
    setSeeding(true);
    setSeedNotice(null);
    try {
      const seeded = await seedFirestoreBaselineIfEmpty();
      setSeedNotice(
        seeded
          ? 'Baseline categories, countries, regions, sources, and articles synced to Cloud Firestore.'
          : 'Cloud Firestore already contains baseline categories and articles.'
      );
      await loadOverview();
      await refreshBootstrap();
    } finally {
      setSeeding(false);
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <Database className="h-4 w-4" /> },
    { id: 'articles', label: 'Articles', icon: <FileText className="h-4 w-4" /> },
    { id: 'automation', label: 'Automation', icon: <Sliders className="h-4 w-4" /> },
    { id: 'sources', label: 'Sources', icon: <Rss className="h-4 w-4" /> },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="h-4 w-4" /> },
    { id: 'countries', label: 'Countries', icon: <Globe className="h-4 w-4" /> },
    { id: 'ai', label: 'AI System', icon: <Bot className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
    { id: 'logs', label: 'Activity Log', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-[#2878FF]">INFORVERSE FIREBASE ADMIN</p>
          <h1 className="text-2xl font-bold text-[#071426] dark:text-white">Editorial & Automation Console</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {adminProfile.email} ({adminProfile.role})
          </span>
          <button
            type="button"
            onClick={() => void logoutAdmin()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-rose-500 hover:text-rose-600 dark:border-slate-700 dark:text-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav aria-label="Admin sections" className="flex flex-wrap gap-1.5 lg:flex-col">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setEditingArticle(undefined);
                }}
                className={`inline-flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-[#2878FF] text-white'
                    : 'bg-[#F3F5F8] text-slate-700 hover:bg-slate-200 dark:bg-[#10233F]/55 dark:text-slate-200 dark:hover:bg-[#10233F]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="lg:col-span-9">
          {loading && !stats ? (
            <p className="py-10 text-sm text-slate-500">Loading Cloud Firestore dashboard...</p>
          ) : activeTab === 'overview' && stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total Articles', val: stats.totalArticles },
                  { label: 'Published', val: stats.publishedArticles },
                  { label: 'Drafts', val: stats.draftArticles },
                  { label: 'Categories', val: stats.totalCategories },
                  { label: 'Active Sources', val: stats.activeSources },
                  { label: 'Total Visitors', val: stats.totalVisitors },
                  { label: 'Auto Updates', val: stats.automaticUpdates },
                  { label: 'Failed Updates', val: stats.failedUpdates },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#10233F]/55"
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#071426] dark:text-white">
                      {metric.val.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10233F]/55">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-[#071426] dark:text-white">Firebase & Integration Status</h2>
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={() => void handleManualSeed()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#071426] hover:border-[#2878FF] dark:border-slate-700 dark:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{seeding ? 'Syncing...' : 'Verify Firestore Baseline'}</span>
                  </button>
                </div>
                {seedNotice && <p className="mt-2 text-xs text-[#2878FF]">{seedNotice}</p>}
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg bg-[#F3F5F8] px-3.5 py-2.5 dark:bg-[#071426]">
                    <span>Cloud Firestore & Auth</span>
                    <span className={stats.integrations.firebaseConfigured ? 'font-semibold text-emerald-600' : 'text-amber-600'}>
                      {stats.integrations.firebaseConfigured ? `Connected (${firebaseConfig.projectId})` : 'Unconfigured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F3F5F8] px-3.5 py-2.5 dark:bg-[#071426]">
                    <span>Firebase Storage</span>
                    <span className={stats.integrations.storageConfigured ? 'font-semibold text-emerald-600' : 'text-amber-600'}>
                      {stats.integrations.storageConfigured ? 'Bucket Ready' : 'Not Configured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F3F5F8] px-3.5 py-2.5 dark:bg-[#071426]">
                    <span>Firebase App Check</span>
                    <span className={stats.integrations.appCheckConfigured ? 'font-semibold text-emerald-600' : 'text-slate-500'}>
                      {stats.integrations.appCheckConfigured ? 'reCAPTCHA Active' : 'Optional (Set VITE_FIREBASE_APPCHECK_SITE_KEY)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F3F5F8] px-3.5 py-2.5 dark:bg-[#071426]">
                    <span>Gemini AI API</span>
                    <span className={stats.integrations.geminiConfigured ? 'font-semibold text-emerald-600' : 'text-amber-600'}>
                      {stats.integrations.geminiConfigured ? 'Configured' : 'GEMINI_API_KEY Unset'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F3F5F8] px-3.5 py-2.5 dark:bg-[#071426]">
                    <span>News API</span>
                    <span className={stats.integrations.newsApiConfigured ? 'font-semibold text-emerald-600' : 'text-slate-500'}>
                      {stats.integrations.newsApiConfigured ? 'Configured' : 'Optional (RSS Active)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F3F5F8] px-3.5 py-2.5 dark:bg-[#071426]">
                    <span>Newsletter Email</span>
                    <span className={stats.integrations.newsletterConfigured ? 'font-semibold text-emerald-600' : 'text-slate-500'}>
                      {stats.integrations.newsletterConfigured ? `Active (${stats.newsletterSubscribers})` : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'articles' ? (
            editingArticle !== undefined ? (
              <ArticleEditor
                initialArticle={editingArticle}
                categories={categories}
                countries={countries}
                regions={regions}
                onSaved={async () => {
                  setEditingArticle(undefined);
                  await loadOverview();
                  await refreshBootstrap();
                }}
                onCancel={() => setEditingArticle(undefined)}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#071426] dark:text-white">
                    Article Management ({articles.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setEditingArticle(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2878FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f63d6]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Article</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#10233F]/55">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-[#F3F5F8] text-slate-600 dark:border-slate-700 dark:bg-[#071426] dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Title</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Origin</th>
                        <th className="px-4 py-3 font-semibold text-right">Views</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {articles.map((art) => (
                        <tr key={art.id} className="hover:bg-[#F3F5F8]/50 dark:hover:bg-[#071426]/40">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#071426] dark:text-white">{art.title}</p>
                            <p className="text-slate-500">/{art.slug}</p>
                          </td>
                          <td className="px-4 py-3 uppercase font-semibold text-[#2878FF]">{art.status}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {art.is_automatic ? 'Auto' : 'Manual'} · {art.article_type}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {art.views_count}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingArticle(art)}
                                className="rounded border border-slate-200 px-2.5 py-1 text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteArticle(art.id)}
                                aria-label={`Delete ${art.title}`}
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
            )
          ) : activeTab !== 'overview' && automationSettings && websiteSettings && stats ? (
            <AdminPanels
              tab={activeTab}
              sources={sources}
              categories={categories}
              countries={countries}
              automationSettings={automationSettings}
              websiteSettings={websiteSettings}
              logs={logs}
              geminiConfigured={stats.integrations.geminiConfigured}
              newsApiConfigured={stats.integrations.newsApiConfigured}
              onRefresh={async () => {
                await loadOverview();
                await refreshBootstrap();
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
