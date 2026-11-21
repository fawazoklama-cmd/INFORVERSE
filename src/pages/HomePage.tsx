import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe2, Mail, TrendingUp } from 'lucide-react';
import type { Article } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { ArticleCard } from '../components/ArticleCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { InteractiveWorldMap } from '../components/InteractiveWorldMap';
import {
  calculateReadingTime,
  formatEditorialDate,
  getArticleTypeLabel,
  getLocalizedArticleFields,
} from '../utils/editorial';
import {
  loadPublishedArticlesWithFallback,
  subscribeLatestPublishedArticles,
} from '../services/firestoreService';

export function HomePage() {
  const { language, categories, countries, websiteSettings, newsletterEnabled, navigate, t } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);

  const [email, setEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadPublishedArticlesWithFallback({ pageSize: 50 });
      setArticles(result.articles);
    } catch {
      setError(t.common.errorLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadArticles();
    const unsubscribe = subscribeLatestPublishedArticles(
      6,
      (latest) => {
        if (latest.length === 0) return;
        setArticles((prev) => {
          const byId = new Map(prev.map((a) => [a.id, a]));
          for (const item of latest) {
            const existing = byId.get(item.id);
            byId.set(
              item.id,
              existing?.translations && !item.translations
                ? { ...item, translations: existing.translations }
                : item
            );
          }
          return Array.from(byId.values()).sort(
            (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
          );
        });
      },
      () => {
        // Non-fatal if offline or unseeded
      }
    );
    return () => unsubscribe();
  }, []);

  const sections = websiteSettings?.homepage_sections || {
    hero: true,
    latest: true,
    world: true,
    indonesia: true,
    trending: true,
    techScience: true,
    worldMap: true,
    moreInfo: true,
    newsletter: true,
  };

  const heroArticle = articles.find((a) => a.is_featured) || articles[0];
  useEffect(() => {
    setHeroImgError(false);
  }, [heroArticle?.image_url]);
  const latestArticles = articles.slice(0, 6);
  const indonesiaCountry = countries.find((c) => c.code === 'ID');
  const indonesiaArticles = articles
    .filter((a) => a.country_id === indonesiaCountry?.id || a.category_id === 'cat-indonesia')
    .slice(0, 4);
  const worldArticles = articles
    .filter((a) => a.id !== heroArticle?.id && a.country_id !== indonesiaCountry?.id)
    .slice(0, 4);
  const trendingArticles = [...articles].sort((a, b) => b.views_count - a.views_count).slice(0, 5);
  const techScienceArticles = articles
    .filter((a) => ['cat-technology', 'cat-science', 'cat-space', 'cat-innovation'].includes(a.category_id))
    .slice(0, 4);
  const moreArticles = articles.slice(0, 6);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmittingNewsletter(true);
    setNewsletterMsg(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNewsletterMsg({ type: 'err', text: data.error || t.home.newsletterDisabled });
      } else {
        setNewsletterMsg({ type: 'ok', text: t.home.newsletterSuccess });
        setEmail('');
      }
    } catch {
      setNewsletterMsg({ type: 'err', text: t.common.errorLoad });
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-10 h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-base text-slate-600 dark:text-slate-300">{error}</p>
        <button
          type="button"
          onClick={() => void loadArticles()}
          className="mt-4 rounded-lg bg-[#2878FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f63d6]"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  const heroFields = heroArticle ? getLocalizedArticleFields(heroArticle, language) : null;
  const heroCategory = heroArticle ? categories.find((c) => c.id === heroArticle.category_id) : null;
  const heroCountry = heroArticle ? countries.find((c) => c.id === heroArticle.country_id) : null;

  return (
    <div className="pb-16">
      {/* A. HERO SECTION */}
      {sections.hero && heroArticle && heroFields && (
        <section className="border-b border-slate-200 bg-[#F3F5F8] dark:border-slate-800 dark:bg-[#071426]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
            <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
              <div className="relative overflow-hidden rounded-xl bg-[#10233F] lg:col-span-7">
                {!heroImgError && heroArticle.image_url ? (
                  <img
                    src={heroArticle.image_url}
                    alt={heroFields.title}
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="aspect-[16/10] h-full w-full object-cover lg:min-h-[380px]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] h-full min-h-[300px] w-full items-center justify-center bg-gradient-to-br from-[#071426] to-[#10233F]">
                    <Globe2 className="h-14 w-14 text-[#2878FF]/70" />
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10233F]/65 lg:col-span-5 lg:p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-300">
                    <span className="font-semibold text-[#2878FF]">
                      {heroCategory ? (language === 'id' ? heroCategory.name_id : heroCategory.name_en) : t.home.heroKicker}
                    </span>
                    {heroCountry && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{language === 'id' ? heroCountry.name_id : heroCountry.name_en}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatEditorialDate(heroArticle.published_at, language)}</span>
                  </div>

                  <h1 className="mt-3 text-2xl font-bold leading-tight text-[#071426] dark:text-white sm:text-3xl lg:text-[2.1rem]">
                    {heroFields.title}
                  </h1>

                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                    {heroFields.summary}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {getArticleTypeLabel(heroArticle.article_type, language)}
                    </p>
                    <p className="mt-0.5 tabular-nums">
                      {heroArticle.source_name} · {calculateReadingTime(heroFields.content)} {t.article.minRead}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/article/${heroArticle.slug}`)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2878FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f63d6]"
                  >
                    <span>{t.home.readMore}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* B. LATEST UPDATES & E. TRENDING */}
      {(sections.latest || sections.trending) && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {sections.latest && (
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                  <h2 className="text-xl font-bold text-[#071426] dark:text-white sm:text-2xl">
                    {t.home.latestUpdates}
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate('/search')}
                    className="text-xs font-semibold text-[#2878FF] hover:underline"
                  >
                    {t.home.viewAll} →
                  </button>
                </div>
                <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
                  {latestArticles.map((art) => (
                    <ArticleCard key={art.id} article={art} variant="compact" />
                  ))}
                </div>
              </div>
            )}

            {sections.trending && (
              <aside className="lg:col-span-4">
                <div className="rounded-xl border border-slate-200 bg-[#F3F5F8] p-5 dark:border-slate-800 dark:bg-[#10233F]/55">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                    <TrendingUp className="h-4 w-4 text-[#2878FF]" aria-hidden="true" />
                    <h2 className="text-lg font-bold text-[#071426] dark:text-white">
                      {t.home.trendingTitle}
                    </h2>
                  </div>
                  <ol className="mt-3 space-y-4">
                    {trendingArticles.map((art, index) => {
                      const fields = getLocalizedArticleFields(art, language);
                      return (
                        <li key={art.id} className="flex items-start gap-3">
                          <span className="font-mono text-lg font-bold tabular-nums text-[#2878FF]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <a
                              href={`/article/${art.slug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/article/${art.slug}`);
                              }}
                              className="text-sm font-semibold leading-snug text-[#071426] hover:text-[#2878FF] dark:text-slate-100 dark:hover:text-[#2878FF]"
                            >
                              {fields.title}
                            </a>
                            <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                              {art.views_count.toLocaleString()} views
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </aside>
            )}
          </div>
        </section>
      )}

      {/* C. WORLD NEWS */}
      {sections.world && worldArticles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-xl font-bold text-[#071426] dark:text-white sm:text-2xl">
              {t.home.worldNews}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/world')}
              className="text-xs font-semibold text-[#2878FF] hover:underline"
            >
              {t.home.viewAll} →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {worldArticles.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        </section>
      )}

      {/* D. INDONESIA NEWS */}
      {sections.indonesia && indonesiaArticles.length > 0 && (
        <section className="border-y border-slate-200 bg-[#F3F5F8] py-10 dark:border-slate-800 dark:bg-[#10233F]/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <h2 className="text-xl font-bold text-[#071426] dark:text-white sm:text-2xl">
                {t.home.indonesiaNews}
              </h2>
              <button
                type="button"
                onClick={() => navigate('/indonesia')}
                className="text-xs font-semibold text-[#2878FF] hover:underline"
              >
                {t.home.viewAll} →
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {indonesiaArticles.map((art) => (
                <ArticleCard key={art.id} article={art} variant="horizontal" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* F. TECHNOLOGY & SCIENCE */}
      {sections.techScience && techScienceArticles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-xl font-bold text-[#071426] dark:text-white sm:text-2xl">
              {t.home.techScience}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/category/technology')}
              className="text-xs font-semibold text-[#2878FF] hover:underline"
            >
              {t.home.viewAll} →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {techScienceArticles.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        </section>
      )}

      {/* G. EXPLORE THE WORLD (INTERACTIVE MAP) */}
      {sections.worldMap && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-xl font-bold text-[#071426] dark:text-white sm:text-2xl">
              {t.home.exploreWorld}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/world')}
              className="text-xs font-semibold text-[#2878FF] hover:underline"
            >
              {t.home.viewAll} →
            </button>
          </div>
          <InteractiveWorldMap articles={articles} />
        </section>
      )}

      {/* H. MORE INFORMATION */}
      {sections.moreInfo && moreArticles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-xl font-bold text-[#071426] dark:text-white sm:text-2xl">
              {t.home.moreInfo}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="text-xs font-semibold text-[#2878FF] hover:underline"
            >
              {t.home.viewAll} →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {moreArticles.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        </section>
      )}

      {/* I. NEWSLETTER */}
      {sections.newsletter && (
        <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <div className="rounded-xl border border-slate-200 bg-[#10233F] p-6 text-white dark:border-slate-800 sm:p-8">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2878FF]">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span>INFORVERSE BRIEFING</span>
                </div>
                <h2 className="mt-2 text-2xl font-bold text-white">{t.home.newsletterTitle}</h2>
                <p className="mt-2 text-sm text-slate-300">{t.home.newsletterSubtitle}</p>
              </div>
              <div className="lg:col-span-6">
                {newsletterEnabled ? (
                  <form onSubmit={handleNewsletter} className="flex flex-col gap-3 sm:flex-row">
                    <label htmlFor="newsletter-email" className="sr-only">
                      {t.home.newsletterPlaceholder}
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.home.newsletterPlaceholder}
                      className="h-11 flex-1 rounded-lg border border-slate-700 bg-[#071426] px-4 text-sm text-white placeholder:text-slate-400 focus:border-[#2878FF] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingNewsletter}
                      className="h-11 rounded-lg bg-[#2878FF] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1f63d6] disabled:opacity-60"
                    >
                      {t.home.newsletterSubmit}
                    </button>
                  </form>
                ) : (
                  <p className="rounded-lg border border-slate-700 bg-[#071426]/80 px-4 py-3 text-xs leading-relaxed text-slate-300">
                    {t.home.newsletterDisabled}
                  </p>
                )}
                {newsletterMsg && (
                  <p
                    className={`mt-2 text-xs ${
                      newsletterMsg.type === 'ok' ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {newsletterMsg.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
