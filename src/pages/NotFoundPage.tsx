import React from 'react';
import { useApp } from '../context/AppContext';

export function NotFoundPage() {
  const { navigate, t, language } = useApp();
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="font-mono text-sm font-semibold text-[#2878FF]">404</p>
      <h1 className="mt-2 text-3xl font-bold text-[#071426] dark:text-white sm:text-4xl">
        {language === 'id' ? 'Halaman Tidak Ditemukan' : 'Page Not Found'}
      </h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        {language === 'id'
          ? 'Tautan informasi yang Anda buka tidak tersedia atau telah dipindahkan.'
          : 'The requested information dispatch or section does not exist or has moved.'}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-lg bg-[#2878FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f63d6]"
        >
          {t.nav.home}
        </button>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-[#071426] hover:border-[#2878FF] dark:border-slate-700 dark:text-white"
        >
          {t.nav.search}
        </button>
      </div>
    </div>
  );
}
