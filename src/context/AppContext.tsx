import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import type {
  AdminProfile,
  Category,
  Country,
  IndonesianRegion,
  Language,
  ThemeMode,
  WebsiteSettings,
} from '../types/inforverse';
import { UI_COPY } from '../i18n/translations';
import { auth } from '../lib/firebase';
import { fetchPublicBootstrapFromFirestore, verifyAdminAuthorization } from '../services/firestoreService';

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
  firebaseUser: User | null;
  adminProfile: AdminProfile | null;
  authLoading: boolean;
  logoutAdmin: () => Promise<void>;
  refreshAdminAuth: () => Promise<AdminProfile | null>;
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

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
      const fsData = await fetchPublicBootstrapFromFirestore();
      if (fsData && fsData.categories.length > 0) {
        setCategories(fsData.categories);
        setCountries(fsData.countries);
        setRegions(fsData.regions);
        if (fsData.websiteSettings) setWebsiteSettings(fsData.websiteSettings);
      }
    } catch {
      // Fallback transparently to server bootstrap if Firestore is not yet seeded
    }

    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      setCategories((prev) => (prev.length > 0 ? prev : data.categories || []));
      setCountries((prev) => (prev.length > 0 ? prev : data.countries || []));
      setRegions((prev) => (prev.length > 0 ? prev : data.regions || []));
      setWebsiteSettings((prev) => prev || data.websiteSettings || null);
      setNewsletterEnabled(Boolean(data.newsletterEnabled));
    } catch {
      // Handled gracefully by pages
    }
  }, []);

  const refreshAdminAuth = useCallback(async (): Promise<AdminProfile | null> => {
    const user = auth.currentUser;
    if (!user) {
      setAdminProfile(null);
      return null;
    }
    try {
      const profile = await verifyAdminAuthorization(user.uid, user.email);
      setAdminProfile(profile);
      return profile;
    } catch {
      setAdminProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await verifyAdminAuthorization(user.uid, user.email);
          setAdminProfile(profile);
        } catch {
          setAdminProfile(null);
        }
      } else {
        setAdminProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logoutAdmin = useCallback(async () => {
    await signOut(auth);
    setAdminProfile(null);
  }, []);

  useEffect(() => {
    void refreshBootstrap();
    try {
      if (!sessionStorage.getItem('inforverse_visited')) {
        sessionStorage.setItem('inforverse_visited', '1');
        void fetch('/api/analytics/visit', { method: 'POST' });
      }
    } catch {
      // Ignore storage restrictions
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

  const addSearchHistory = useCallback((queryText: string) => {
    const clean = queryText.trim();
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
        firebaseUser,
        adminProfile,
        authLoading,
        logoutAdmin,
        refreshAdminAuth,
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
