import React, { useState } from 'react';
import { Eye, Sparkles } from 'lucide-react';
import type { Article, ArticleStatus, ArticleType, Category, Country, IndonesianRegion, Language } from '../../types/inforverse';
import { requiresSensitiveVerification, sanitizeExternalUrl, slugify } from '../../utils/editorial';
import { auth } from '../../lib/firebase';
import { addAutomationLogToFirestore, saveArticleToFirestore } from '../../services/firestoreService';
import { StorageImageUploader } from './StorageImageUploader';

interface ArticleEditorProps {
  initialArticle?: Article | null;
  categories: Category[];
  countries: Country[];
  regions: IndonesianRegion[];
  onSaved: (article: Article) => void;
  onCancel: () => void;
}

const EDITORIAL_IMAGE_PRESETS = [
  { label: 'Global Summit', url: '/src/assets/images/hero_global_summit_1795250512890.jpg' },
  { label: 'Jakarta Skyline', url: '/src/assets/images/indo_jakarta_skyline_1795250511476.jpg' },
  { label: 'Quantum Lab', url: '/src/assets/images/tech_quantum_lab_1795250512205.jpg' },
  { label: 'Space Observatory', url: '/src/assets/images/space_orbital_observatory_1795250511424.jpg' },
  { label: 'Archipelago Energy', url: '/src/assets/images/env_archipelago_energy_1795250512657.jpg' },
];

export function ArticleEditor({
  initialArticle,
  categories,
  countries,
  regions,
  onSaved,
  onCancel,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialArticle?.title || '');
  const [subtitle, setSubtitle] = useState(initialArticle?.subtitle || '');
  const [slug, setSlug] = useState(initialArticle?.slug || '');
  const [imageUrl, setImageUrl] = useState(
    initialArticle?.image_url || EDITORIAL_IMAGE_PRESETS[0].url
  );
  const [imageCaption, setImageCaption] = useState(initialArticle?.image_caption || '');
  const [categoryId, setCategoryId] = useState(initialArticle?.category_id || categories[0]?.id || 'cat-world');
  const [countryId, setCountryId] = useState(initialArticle?.country_id || countries[0]?.id || 'co-id');
  const [regionId, setRegionId] = useState(initialArticle?.region_id || '');
  const [province, setProvince] = useState(initialArticle?.province || '');
  const [tagsInput, setTagsInput] = useState((initialArticle?.tags || []).join(', '));
  const [summary, setSummary] = useState(initialArticle?.summary || '');
  const [content, setContent] = useState(initialArticle?.content || '');
  const [sourceName, setSourceName] = useState(initialArticle?.source_name || 'INFORVERSE Editorial');
  const [sourceUrl, setSourceUrl] = useState(initialArticle?.source_url || '');
  const [author, setAuthor] = useState(initialArticle?.author || 'INFORVERSE Desk');
  const [language, setLanguage] = useState<Language>(initialArticle?.language || 'en');
  const [articleType, setArticleType] = useState<ArticleType>(initialArticle?.article_type || 'editorial');
  const [isFeatured, setIsFeatured] = useState(Boolean(initialArticle?.is_featured));
  const [publishedAt, setPublishedAt] = useState(
    initialArticle?.published_at
      ? initialArticle.published_at.slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [seoTitle, setSeoTitle] = useState(initialArticle?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(initialArticle?.seo_description || '');

  const pairedLang: Language = language === 'en' ? 'id' : 'en';
  const existingTrans = initialArticle?.translations?.[pairedLang];
  const [transTitle, setTransTitle] = useState(existingTrans?.title || '');
  const [transSummary, setTransSummary] = useState(existingTrans?.summary || '');
  const [transContent, setTransContent] = useState(existingTrans?.content || '');

  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiWorking, setAiWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRegion = regions.find((r) => r.id === regionId);

  const handleAiTranslate = async () => {
    if (!title.trim() || !summary.trim()) {
      setError('Enter title and summary before translating with Gemini.');
      return;
    }
    setAiWorking(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError('Firebase administrator session required.');
        return;
      }
      const res = await fetch('/api/admin/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title,
          subtitle,
          summary,
          content: content || summary,
          targetLanguage: pairedLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gemini translation failed.');
      } else {
        setTransTitle(data.translation.title);
        setTransSummary(data.translation.summary);
        setTransContent(data.translation.content);
      }
    } catch {
      setError('Network error while calling Gemini translation endpoint.');
    } finally {
      setAiWorking(false);
    }
  };

  const handleSave = async (status: ArticleStatus) => {
    if (!title.trim() || !summary.trim() || !content.trim()) {
      setError('Title, Summary, and Content are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isEditing = Boolean(initialArticle?.id);
      const articleId = initialArticle?.id || `art-${Date.now()}`;
      const cleanSlug = slugify(slug.trim() || title) || `article-${Date.now()}`;
      const selectedCategory = categories.find((c) => c.id === categoryId) || categories[0];
      const isSensitive = requiresSensitiveVerification(selectedCategory?.slug || '');
      const nowIso = new Date().toISOString();

      const translations: Article['translations'] = {};
      if (transTitle.trim() && transSummary.trim()) {
        translations[pairedLang] = {
          id: existingTrans?.id || `tr-${articleId}-${pairedLang}`,
          article_id: articleId,
          language: pairedLang,
          title: transTitle.trim(),
          subtitle,
          summary: transSummary.trim(),
          content: transContent.trim() || transSummary.trim(),
          is_ai_translated: true,
        };
      }

      const articlePayload: Article = {
        id: articleId,
        title: title.trim(),
        subtitle: subtitle.trim(),
        slug: cleanSlug,
        image_url: sanitizeExternalUrl(imageUrl.trim()) || imageUrl.trim() || EDITORIAL_IMAGE_PRESETS[0].url,
        image_caption: imageCaption.trim(),
        category_id: categoryId,
        country_id: countryId,
        region_id: regionId || null,
        province: province || null,
        source_id: initialArticle?.source_id || null,
        tags: tagsInput.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 15),
        summary: summary.trim(),
        content: content.trim(),
        source_name: sourceName.trim() || 'INFORVERSE Editorial',
        source_url: sanitizeExternalUrl(sourceUrl.trim()),
        author: author.trim() || auth.currentUser?.email || 'INFORVERSE Desk',
        article_type: articleType,
        requires_verification: initialArticle?.requires_verification ?? isSensitive,
        is_verified: initialArticle?.is_verified ?? true,
        language,
        is_automatic: initialArticle?.is_automatic || false,
        is_featured: isFeatured,
        views_count: initialArticle?.views_count || 0,
        published_at: new Date(publishedAt).toISOString(),
        updated_at: nowIso,
        created_at: initialArticle?.created_at || nowIso,
        seo_title: seoTitle.trim() || `${title.trim()} | INFORVERSE`,
        seo_description: seoDescription.trim() || summary.trim().slice(0, 155),
        status,
        translations,
      };

      await saveArticleToFirestore(articlePayload, isEditing);
      await addAutomationLogToFirestore({
        logType: 'admin',
        status: 'success',
        articlesPublished: status === 'published' ? 1 : 0,
        message: `${isEditing ? 'Updated' : 'Created'} article "${articlePayload.title}" (${status})`,
      });
      onSaved(articlePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article to Cloud Firestore.');
    } finally {
      setSaving(false);
    }
  };

  if (previewMode) {
    return (
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10233F]/55">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
          <h3 className="text-lg font-bold text-[#071426] dark:text-white">Article Preview</h3>
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#071426] dark:border-slate-600 dark:text-white"
          >
            Return to Editor
          </button>
        </div>
        {imageUrl && (
          <img src={imageUrl} alt={title} className="max-h-72 w-full rounded-lg object-cover" />
        )}
        <h1 className="text-3xl font-bold text-[#071426] dark:text-white">{title || 'Untitled'}</h1>
        {subtitle && <p className="text-base text-slate-600 dark:text-slate-300">{subtitle}</p>}
        <p className="rounded-lg bg-[#F3F5F8] p-4 text-sm font-medium text-[#071426] dark:bg-[#071426] dark:text-slate-200">
          {summary}
        </p>
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {content.split(/\n\n+/).map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10233F]/55">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
        <h3 className="text-lg font-bold text-[#071426] dark:text-white">
          {initialArticle ? 'Edit Article (Firestore)' : 'Create New Article (Firestore)'}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="ed-title" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Title *
          </label>
          <input
            id="ed-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!initialArticle) setSlug(slugify(e.target.value));
            }}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-subtitle" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Subtitle
          </label>
          <input
            id="ed-subtitle"
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-slug" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Slug
          </label>
          <input
            id="ed-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 font-mono text-xs text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-category" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Category
          </label>
          <select
            id="ed-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en} / {c.name_id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ed-country" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Country
          </label>
          <select
            id="ed-country"
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          >
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ed-region" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Indonesian Region (Optional)
          </label>
          <select
            id="ed-region"
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              setProvince('');
            }}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          >
            <option value="">None</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name_id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ed-province" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Province (Optional)
          </label>
          <select
            id="ed-province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            disabled={!selectedRegion}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] disabled:opacity-50 dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          >
            <option value="">None</option>
            {selectedRegion?.provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <StorageImageUploader
            folder="articles"
            currentUrl={imageUrl}
            label="Upload Article Featured Image to Firebase Storage"
            onChangeUrl={(nextUrl) => setImageUrl(nextUrl)}
          />
          <div>
            <label htmlFor="ed-image" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Or Set Featured Image URL / Editorial Preset
            </label>
            <input
              id="ed-image"
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-xs text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {EDITORIAL_IMAGE_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setImageUrl(preset.url)}
                  className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-300"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="ed-img-caption" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Image Caption
          </label>
          <input
            id="ed-img-caption"
            type="text"
            value={imageCaption}
            onChange={(e) => setImageCaption(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-lang" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Primary Language
          </label>
          <select
            id="ed-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          >
            <option value="en">English</option>
            <option value="id">Bahasa Indonesia</option>
          </select>
        </div>

        <div>
          <label htmlFor="ed-type" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Article Classification
          </label>
          <select
            id="ed-type"
            value={articleType}
            onChange={(e) => setArticleType(e.target.value as ArticleType)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          >
            <option value="editorial">Editorial Article</option>
            <option value="original">Original Source Report</option>
            <option value="ai_summary">AI-Generated Summary</option>
          </select>
        </div>

        <div>
          <label htmlFor="ed-source-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Source Name
          </label>
          <input
            id="ed-source-name"
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-source-url" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Source URL
          </label>
          <input
            id="ed-source-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-author" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Author
          </label>
          <input
            id="ed-author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-pubdate" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Publication Date / Schedule
          </label>
          <input
            id="ed-pubdate"
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-tags" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Tags (comma separated)
          </label>
          <input
            id="ed-tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 pt-5">
          <input
            id="ed-featured"
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 accent-[#2878FF]"
          />
          <label htmlFor="ed-featured" className="text-sm font-medium text-[#071426] dark:text-white">
            Feature in Homepage Hero
          </label>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="ed-summary" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Summary *
          </label>
          <textarea
            id="ed-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] p-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="ed-content" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Full Content *
          </label>
          <textarea
            id="ed-content"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] p-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-[#F3F5F8] p-4 dark:border-slate-700 dark:bg-[#071426]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              Paired Translation ({pairedLang === 'id' ? 'Bahasa Indonesia' : 'English'})
            </h4>
            <button
              type="button"
              onClick={handleAiTranslate}
              disabled={aiWorking}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2878FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f63d6] disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{aiWorking ? 'Translating...' : 'Translate with Gemini'}</span>
            </button>
          </div>
          <div className="mt-3 space-y-3">
            <input
              type="text"
              placeholder={`Translated title (${pairedLang.toUpperCase()})`}
              value={transTitle}
              onChange={(e) => setTransTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
            />
            <textarea
              rows={2}
              placeholder={`Translated summary (${pairedLang.toUpperCase()})`}
              value={transSummary}
              onChange={(e) => setTransSummary(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
            />
            <textarea
              rows={3}
              placeholder={`Translated content (${pairedLang.toUpperCase()})`}
              value={transContent}
              onChange={(e) => setTransContent(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ed-seo-title" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            SEO Title
          </label>
          <input
            id="ed-seo-title"
            type="text"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="ed-seo-desc" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            SEO Description
          </label>
          <input
            id="ed-seo-desc"
            type="text"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave('archived')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Archive
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave('draft')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#071426] hover:border-[#2878FF] dark:border-slate-700 dark:text-white"
        >
          Save Draft
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave('scheduled')}
          className="rounded-lg bg-[#10233F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#19345c]"
        >
          Schedule
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave('published')}
          className="rounded-lg bg-[#2878FF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1f63d6] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
