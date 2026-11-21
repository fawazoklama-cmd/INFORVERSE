import React, { useEffect, useState } from 'react';
import { ArrowUp, Instagram, Rss } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_LOGO_URL } from '../data/baselineCatalog';
import { sanitizeExternalUrl } from '../utils/editorial';

export function Footer() {
  const { navigate, t, websiteSettings } = useApp();
  const [logoError, setLogoError] = useState(false);
  const logoSrc = websiteSettings?.logo_url?.trim() || DEFAULT_LOGO_URL;

  useEffect(() => {
    setLogoError(false);
  }, [logoSrc]);

  const instagramUrl =
    sanitizeExternalUrl(websiteSettings?.instagram_url || 'https://www.instagram.com/wazzz.dotcom/') ||
    'https://www.instagram.com/wazzz.dotcom/';

  const handleNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <footer className="border-t border-slate-200 bg-[#071426] text-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand & Tagline */}
          <div className="md:col-span-5">
            <a
              href="/"
              onClick={(e) => handleNav(e, '/')}
              className="inline-flex items-center gap-3 text-2xl font-bold tracking-[-0.03em] text-white"
            >
              {!logoError && logoSrc ? (
                <img
                  src={logoSrc}
                  alt="INFORVERSE official logo"
                  onError={() => setLogoError(true)}
                  className="h-16 w-auto rounded-xl border border-slate-700/80 bg-[#010b1d] p-1 object-contain"
                />
              ) : (
                <span>
                  INFOR<span className="text-[#2878FF]">VERSE</span>
                </span>
              )}
            </a>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              {websiteSettings?.tagline || t.tagline}
            </p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
              Global & Indonesia Information Portal — International Affairs, Science, Technology, Economy, and Verified Dispatches.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Portal</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { label: t.footer.about, path: '/about' },
                { label: t.footer.contact, path: '/contact' },
                { label: t.footer.privacy, path: '/privacy' },
                { label: t.footer.terms, path: '/terms' },
                { label: t.footer.disclaimer, path: '/disclaimer' },
              ].map((link) => (
                <li key={link.path}>
                  <a
                    href={link.path}
                    onClick={(e) => handleNav(e, link.path)}
                    className="text-slate-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-slate-300 transition-colors hover:text-[#2878FF]"
                >
                  <Rss className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.footer.rssFeed}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Creator Credit & Instagram Button */}
          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {t.footer.instagramCredit}
            </h3>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>{t.footer.createdBy}</p>
              <p>{t.footer.ideaBy}</p>
            </div>
            <div className="mt-5">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#2878FF] to-[#10233F] px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition-all duration-200 hover:-translate-y-0.5 hover:from-[#3b86ff] hover:to-[#18335b] hover:ring-[#2878FF]"
              >
                <Instagram className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                <span>@wazzz.dotcom</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} INFORVERSE. {t.footer.createdBy}.</p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 text-slate-300 transition-colors hover:text-white"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.common.backToTop}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
