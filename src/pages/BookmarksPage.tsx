import React, { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import type { Article } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { ArticleCard } from '../components/ArticleCard';

export function BookmarksPage() {
  const { bookmarks, language, navigate, t } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/articles?limit=100');
        if (res.ok) {
          const data = await res.json();
          const all: Article[] = data.articles || [];
          setArticles(all.filter((a) => bookmarks.includes(a.id)));
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [bookmarks]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-2 text-[#2878FF]">
          <Bookmark className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase">localStorage</span>
        </div>
        <h1 className="mt-1 text-3xl font-bold text-[#071426] dark:text-white">{t.nav.bookmarks}</h1>
      </div>

      {loading ? (
        <p className="py-10 text-sm text-slate-500">{t.common.loading}</p>
      ) : articles.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-base text-slate-600 dark:text-slate-300">
            {language === 'id'
              ? 'Belum ada artikel yang disimpan. Klik ikon simpan pada artikel mana saja untuk membacanya kembali nanti.'
              : 'No saved articles yet. Click the bookmark icon on any dispatch to save it locally.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-[#2878FF] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t.nav.home}
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((art) => (
            <ArticleCard key={art.id} article={art} />
          ))}
        </div>
      )}
    </div>
  );
}
