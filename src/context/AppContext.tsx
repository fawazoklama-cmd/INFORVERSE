import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Category, Country, IndonesianRegion, Language, ThemeMode, WebsiteSettings } from '../types/inforverse';
import { UI_COPY } from '../i18n/translations';

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (typeof UI_COPY)['en'];
  theme: ThemeMode;
  toggleTheme: () => void;
  categories: Category[];
  countries: Country[];
  regions: IndonesianRegion[];
  websiteSettings: WebsiteSettings | null;
  newsletterEnabled: boolean;
  bookmarks: string[];
  toggleBookmark: (articleId: string) => void;
  isBookmarked: (articleId: string) => boolean;
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  currentPath: string;
  navigate: (to: string) => void;
  refreshBootstrap: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem('inforverse_lang');
    if (saved === 'en' || saved === 'id') return saved;
    const browserLang = (navigator.language || 'en').toLowerCase();
    return browserLang.startsWith('id') ? 'id' : 'en';
  } catch {
    return 'en';
  }
}

function detectInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('inforverse_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);
  const [theme, setTheme] = useState<ThemeMode>(detectInitialTheme);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<IndonesianRegion[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname + window.location.search);

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('inforverse_bookmarks');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('inforverse_search_history');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('inforverse_theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem('inforverse_lang', language);
    } catch {
      // Ignore storage errors
    }
  }, [language]);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.categories || []);
      setCountries(data.countries || []);
      setRegions(data.regions || []);
      setWebsiteSettings(data.websiteSettings || null);
      setNewsletterEnabled(Boolean(data.newsletterEnabled));
    } catch {
      // Handled gracefully by pages
    }
  }, []);

  useEffect(() => {
    void refreshBootstrap();
    // Record anonymized visit once per session
    if (!sessionStorage.getItem('inforverse_visited')) {
      sessionStorage.setItem('inforverse_visited', '1');
      void fetch('/api/analytics/visit', { method: 'POST' });
    }
  }, [refreshBootstrap]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setCurrentPath(to);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleBookmark = useCallback((articleId: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(articleId) ? prev.filter((id) => id !== articleId) : [articleId, ...prev];
      try {
        localStorage.setItem('inforverse_bookmarks', JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  }, []);

  const isBookmarked = useCallback((articleId: string) => bookmarks.includes(articleId), [bookmarks]);

  const addSearchHistory = useCallback((query: string) => {
    const clean = query.trim();
    if (!clean) return;
    setSearchHistory((prev) => {
      const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem('inforverse_search_history', JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('inforverse_search_history');
    } catch {
      // Ignore storage error
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t: UI_COPY[language],
        theme,
        toggleTheme,
        categories,
        countries,
        regions,
        websiteSettings,
        newsletterEnabled,
        bookmarks,
        toggleBookmark,
        isBookmarked,
        searchHistory,
        addSearchHistory,
        clearSearchHistory,
        currentPath,
        navigate,
        refreshBootstrap,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
