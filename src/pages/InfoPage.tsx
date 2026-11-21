import React, { useState } from 'react';
import { Instagram, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sanitizeExternalUrl } from '../utils/editorial';

interface InfoPageProps {
  page: 'about' | 'contact' | 'privacy' | 'terms' | 'disclaimer';
}

export function InfoPage({ page }: InfoPageProps) {
  const { language, websiteSettings, t } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const instagramUrl =
    sanitizeExternalUrl(websiteSettings?.instagram_url || 'https://www.instagram.com/wazzz.dotcom/') ||
    'https://www.instagram.com/wazzz.dotcom/';

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'err', text: data.error || 'Failed to send inquiry.' });
      } else {
        setStatus({
          type: 'ok',
          text:
            language === 'id'
              ? 'Pesan Anda telah diterima oleh tim editorial INFORVERSE.'
              : 'Your message has been received by the INFORVERSE editorial desk.',
        });
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      }
    } catch {
      setStatus({ type: 'err', text: t.common.errorLoad });
    } finally {
      setSending(false);
    }
  };

  if (page === 'contact') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-[#071426] dark:text-white">{t.footer.contact}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {language === 'id'
            ? 'Hubungi redaksi INFORVERSE untuk koreksi sumber, saran umpan RSS resmi, atau pertanyaan kemitraan.'
            : 'Contact the INFORVERSE editorial desk for source corrections, official RSS feed suggestions, or inquiries.'}
        </p>

        <form
          onSubmit={handleContact}
          className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10233F]/55"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {language === 'id' ? 'Nama' : 'Name'}
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
              />
            </div>
          </div>
          <div>
            <label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'id' ? 'Subjek' : 'Subject'}
            </label>
            <input
              id="contact-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'id' ? 'Pesan' : 'Message'}
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] p-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
          </div>
          {status && (
            <p className={`text-sm ${status.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {status.text}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2878FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f63d6] disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            <span>{language === 'id' ? 'Kirim Pesan' : 'Send Message'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-6">
      <h1 className="text-3xl font-bold text-[#071426] dark:text-white">
        {page === 'about'
          ? t.footer.about
          : page === 'privacy'
            ? t.footer.privacy
            : page === 'terms'
              ? t.footer.terms
              : t.footer.disclaimer}
      </h1>

      {page === 'about' && (
        <div className="space-y-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            <strong>INFORVERSE</strong> ({websiteSettings?.tagline || t.tagline}) is an international and Indonesian
            information portal dedicated to presenting verified news, scientific breakthroughs, technological shifts,
            macroeconomic updates, environmental reports, and regional dispatches.
          </p>
          <p>
            Our editorial architecture distinguishes original source reports, editorial articles, and AI-assisted
            summaries—always citing the primary source institution or publication.
          </p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-[#F3F5F8] p-6 dark:border-slate-800 dark:bg-[#10233F]/65">
            <h2 className="text-lg font-bold text-[#071426] dark:text-white">{t.footer.instagramCredit}</h2>
            <p className="mt-2 text-sm">{t.footer.createdBy}</p>
            <p className="text-sm">{t.footer.ideaBy}</p>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2878FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f63d6]"
            >
              <Instagram className="h-4 w-4" />
              <span>@wazzz.dotcom</span>
            </a>
          </div>
        </div>
      )}

      {page === 'privacy' && (
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            INFORVERSE prioritizes reader privacy. Public reading requires no user account or login. Preferences such as
            language selection, light/dark theme, saved bookmarks, and local search history remain strictly in your
            browser&apos;s local storage.
          </p>
          <p>
            Server-side visitor counters record aggregate page traffic without profiling individual readers.
          </p>
        </div>
      )}

      {page === 'terms' && (
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            All automated RSS/API syndication summaries remain attributed to their respective original publishers,
            research institutions, or official agencies. Full source links are provided on every dispatch page.
          </p>
        </div>
      )}

      {page === 'disclaimer' && (
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            AI-generated summaries and bilingual translations are labeled explicitly as AI-Generated Summary and are
            grounded strictly in the cited original source. Sensitive topics including disasters, public health,
            security, and geopolitical conflicts carry verification notices encouraging readers to cross-check official
            agency bulletins.
          </p>
        </div>
      )}
    </div>
  );
}
