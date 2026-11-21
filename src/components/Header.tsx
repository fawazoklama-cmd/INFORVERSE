import React, { useState } from 'react';
import { Bookmark, Globe, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onOpenSearch: () => void;
}

const RAIL_SLUGS = [
  'technology',
  'science',
  'economy',
  'politics',
  'environment',
  'education',
  'health',
  'sports',
  'space',
];

export function Header({ onOpenSearch }: HeaderProps) {
  const { language, setLanguage, theme, toggleTheme, categories, currentPath, navigate, t, bookmarks, websiteSettings } =
    useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const railCategories = RAIL_SLUGS.map((slug) => categories.find((c) => c.slug === slug)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c)
  );

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    navigate(path);
  };

  const siteName = websiteSettings?.site_name || 'INFORVERSE';
  const pathname = currentPath.split('?')[0];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-[#071426]/95">
      {/* Primary Top Bar (56px height — stays <= 7% of mobile viewport) */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:gap-8">
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="flex items-center whitespace-nowrap shrink-0 text-xl font-bold tracking-[-0.03em] text-[#071426] dark:text-white"
        >
          <span>INFOR</span>
          <span className="text-[#2878FF]">VERSE</span>
          {siteName !== 'INFORVERSE' && (
            <span className="sr-only">{siteName}</span>
          )}
        </a>

        {/* Primary Navigation Links */}
        <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-6 text-sm font-medium">
          {[
            { label: t.nav.home, path: '/' },
            { label: t.nav.world, path: '/world' },
            { label: t.nav.indonesia, path: '/indonesia' },
            { label: t.nav.trending, path: '/search?sort=popular' },
          ].map((item) => {
            const active = pathname === item.path || (item.path === '/search?sort=popular' && currentPath === item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors ${
                  active
                    ? 'border-[#2878FF] text-[#071426] dark:text-white'
                    : 'border-transparent text-slate-600 hover:text-[#071426] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label={t.nav.search}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F3F5F8] hover:text-[#071426] dark:text-slate-200 dark:hover:bg-[#10233F] dark:hover:text-white"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline whitespace-nowrap">{t.nav.search}</span>
          </button>

          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
            aria-label={language === 'en' ? 'Switch language to Indonesian' : 'Ganti bahasa ke Inggris'}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold tracking-wide text-[#071426] transition-colors hover:border-[#2878FF] hover:text-[#2878FF] dark:border-slate-700 dark:text-slate-100 dark:hover:border-[#2878FF]"
          >
            <Globe className="h-3.5 w-3.5 text-[#2878FF]" aria-hidden="true" />
            <span className="uppercase">{language}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-[#F3F5F8] hover:text-[#071426] dark:text-slate-200 dark:hover:bg-[#10233F] dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <a
            href="/bookmarks"
            onClick={(e) => handleLinkClick(e, '/bookmarks')}
            aria-label={`${t.nav.bookmarks} (${bookmarks.length})`}
            className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F3F5F8] hover:text-[#071426] dark:text-slate-200 dark:hover:bg-[#10233F]"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums text-xs">{bookmarks.length}</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-[#F3F5F8] dark:text-slate-200 dark:hover:bg-[#10233F] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Editorial Topic Rail */}
      <div className="hidden lg:block border-t border-slate-100 bg-[#F3F5F8]/70 dark:border-slate-800/80 dark:bg-[#10233F]/60">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 overflow-x-auto">
          <nav aria-label="Editorial Topics" className="flex items-center gap-5 text-xs font-medium">
            {railCategories.map((cat) => {
              const target = `/category/${cat.slug}`;
              const active = pathname === target;
              return (
                <a
                  key={cat.id}
                  href={target}
                  onClick={(e) => handleLinkClick(e, target)}
                  className={`whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'font-semibold text-[#2878FF]'
                      : 'text-slate-600 hover:text-[#071426] dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {language === 'id' ? cat.name_id : cat.name_en}
                </a>
              );
            })}
            <a
              href="/search"
              onClick={(e) => handleLinkClick(e, '/search')}
              className="whitespace-nowrap shrink-0 text-slate-500 hover:text-[#2878FF] dark:text-slate-400"
            >
              {t.nav.allCategories}
            </a>
          </nav>
          <a
            href="/admin"
            onClick={(e) => handleLinkClick(e, '/admin')}
            className="whitespace-nowrap shrink-0 text-xs font-medium text-slate-500 hover:text-[#2878FF] dark:text-slate-400"
          >
            {t.nav.admin}
          </a>
        </div>
      </div>

      {/* Mobile & Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-[#071426] lg:hidden">
          <div className="grid grid-cols-2 gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            {[
              { label: t.nav.home, path: '/' },
              { label: t.nav.world, path: '/world' },
              { label: t.nav.indonesia, path: '/indonesia' },
              { label: t.nav.trending, path: '/search?sort=popular' },
              { label: `${t.nav.bookmarks} (${bookmarks.length})`, path: '/bookmarks' },
              { label: t.nav.admin, path: '/admin' },
            ].map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[#071426] hover:bg-[#F3F5F8] dark:text-slate-100 dark:hover:bg-[#10233F]"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="pt-4">
            <p className="mb-2 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.nav.allCategories}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={(e) => handleLinkClick(e, `/category/${cat.slug}`)}
                  className="flex min-h-[40px] items-center rounded-md px-2.5 text-sm text-slate-700 hover:bg-[#F3F5F8] dark:text-slate-300 dark:hover:bg-[#10233F]"
                >
                  {language === 'id' ? cat.name_id : cat.name_en}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
