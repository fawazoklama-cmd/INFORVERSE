import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SearchOverlay } from './components/SearchOverlay';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { WorldPage } from './pages/WorldPage';
import { IndonesiaPage } from './pages/IndonesiaPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { SearchPage } from './pages/SearchPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { InfoPage } from './pages/InfoPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

function InforverseShell() {
  const { currentPath, t } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [cookieAck, setCookieAck] = useState<boolean>(() => {
    try {
      return localStorage.getItem('inforverse_cookie_ack') === '1';
    } catch {
      return false;
    }
  });

  const pathname = currentPath.split('?')[0].replace(/\/+$/, '') || '/';

  const renderPage = () => {
    if (pathname === '/') return <HomePage />;
    if (pathname === '/world') return <WorldPage />;
    if (pathname === '/indonesia') return <IndonesiaPage />;
    if (pathname.startsWith('/indonesia/')) {
      return <IndonesiaPage initialRegionSlug={pathname.replace('/indonesia/', '')} />;
    }
    if (pathname.startsWith('/category/')) {
      return <CategoryPage slug={pathname.replace('/category/', '')} />;
    }
    if (pathname.startsWith('/article/')) {
      return <ArticleDetailPage slug={pathname.replace('/article/', '')} />;
    }
    if (pathname === '/search') return <SearchPage />;
    if (pathname === '/bookmarks') return <BookmarksPage />;
    if (pathname === '/about') return <InfoPage page="about" />;
    if (pathname === '/contact') return <InfoPage page="contact" />;
    if (pathname === '/privacy') return <InfoPage page="privacy" />;
    if (pathname === '/terms') return <InfoPage page="terms" />;
    if (pathname === '/disclaimer') return <InfoPage page="disclaimer" />;
    if (pathname === '/admin') return <AdminPage />;
    return <NotFoundPage />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#071426] transition-colors dark:bg-[#071426] dark:text-slate-100">
      <Header onOpenSearch={() => setSearchOpen(true)} />
      <main className="flex-1">{renderPage()}</main>
      {!cookieAck && (
        <div
          role="region"
          aria-label="Storage Notice"
          className="border-t border-slate-200 bg-[#F3F5F8] px-4 py-3 dark:border-slate-800 dark:bg-[#10233F]/75 sm:px-6"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{t.common.cookieText}</p>
            <button
              type="button"
              onClick={() => {
                setCookieAck(true);
                try {
                  localStorage.setItem('inforverse_cookie_ack', '1');
                } catch {
                  // Ignore storage errors
                }
              }}
              className="shrink-0 rounded-lg bg-[#2878FF] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1f63d6]"
            >
              {t.common.cookieAccept}
            </button>
          </div>
        </div>
      )}
      <Footer />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <InforverseShell />
    </AppProvider>
  );
}
