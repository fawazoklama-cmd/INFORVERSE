import React, { useEffect, useRef, useState } from 'react';
import { Clock, Search, X } from 'lucide-react';
import type { Article } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { getLocalizedArticleFields } from '../utils/editorial';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const { language, navigate, t, searchHistory, addSearchHistory, clearSearchHistory } = useApp();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/articles?q=${encodeURIComponent(trimmed)}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.articles || []);
        }
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    addSearchHistory(query.trim());
    onClose();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#071426]/65 px-4 pt-16 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.search.title}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#071426]">
        <form onSubmit={handleSubmit} className="flex items-center border-b border-slate-200 px-4 dark:border-slate-800">
          <Search className="h-5 w-5 text-[#2878FF]" aria-hidden="true" />
          <label htmlFor="global-search-input" className="sr-only">
            {t.search.title}
          </label>
          <input
            id="global-search-input"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="h-14 flex-1 bg-transparent px-3 text-base text-[#071426] outline-none placeholder:text-slate-400 dark:text-white"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-lg p-2 text-slate-500 hover:bg-[#F3F5F8] hover:text-[#071426] dark:text-slate-400 dark:hover:bg-[#10233F] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </form>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {query.trim() ? (
            <div>
              {loading ? (
                <p className="py-4 text-sm text-slate-500">{t.common.loading}</p>
              ) : suggestions.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {suggestions.map((art) => {
                    const fields = getLocalizedArticleFields(art, language);
                    return (
                      <li key={art.id}>
                        <button
                          type="button"
                          onClick={() => {
                            addSearchHistory(query.trim());
                            onClose();
                            navigate(`/article/${art.slug}`);
                          }}
                          className="flex w-full flex-col py-3 text-left transition-colors hover:text-[#2878FF]"
                        >
                          <span className="text-sm font-semibold text-[#071426] dark:text-white">
                            {fields.title}
                          </span>
                          <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {art.source_name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-4 text-sm text-slate-500 dark:text-slate-400">{t.search.noResults}</p>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="text-sm font-semibold text-[#2878FF] hover:underline"
                >
                  {t.search.title}: "{query.trim()}" →
                </button>
              </div>
            </div>
          ) : (
            <div>
              {searchHistory.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t.search.recentSearches}
                    </span>
                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="text-xs text-[#2878FF] hover:underline"
                    >
                      {t.search.clearHistory}
                    </button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {searchHistory.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setQuery(item);
                          onClose();
                          navigate(`/search?q=${encodeURIComponent(item)}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 py-1.5 text-xs font-medium text-[#071426] hover:border-[#2878FF] dark:border-slate-700 dark:bg-[#10233F] dark:text-slate-200"
                      >
                        <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-2 text-sm text-slate-500 dark:text-slate-400">{t.search.placeholder}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
