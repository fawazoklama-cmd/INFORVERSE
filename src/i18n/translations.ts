import type { Language } from '../types/inforverse';

export const UI_COPY: Record<
  Language,
  {
    tagline: string;
    nav: {
      home: string;
      world: string;
      indonesia: string;
      trending: string;
      bookmarks: string;
      search: string;
      allCategories: string;
      admin: string;
    };
    home: {
      heroKicker: string;
      readMore: string;
      latestUpdates: string;
      worldNews: string;
      indonesiaNews: string;
      trendingTitle: string;
      techScience: string;
      exploreWorld: string;
      moreInfo: string;
      newsletterTitle: string;
      newsletterSubtitle: string;
      newsletterPlaceholder: string;
      newsletterSubmit: string;
      newsletterDisabled: string;
      newsletterSuccess: string;
      viewAll: string;
    };
    article: {
      back: string;
      share: string;
      copyLink: string;
      copied: string;
      bookmark: string;
      bookmarked: string;
      minRead: string;
      publishedAt: string;
      updatedAt: string;
      originalSource: string;
      relatedArticles: string;
      sensitiveNotice: string;
      translatedNotice: string;
    };
    world: {
      title: string;
      subtitle: string;
      allContinents: string;
      selectCountry: string;
      articlesCount: string;
      trendingGlobal: string;
      latestIntl: string;
      noCountryArticles: string;
    };
    indonesia: {
      title: string;
      subtitle: string;
      allRegions: string;
      searchProvince: string;
      provincesInRegion: string;
      noRegionArticles: string;
    };
    category: {
      featured: string;
      latest: string;
      popular: string;
      searchInCat: string;
      allDates: string;
      last24h: string;
      last7d: string;
      last30d: string;
      loadMore: string;
      empty: string;
    };
    search: {
      title: string;
      placeholder: string;
      recentSearches: string;
      clearHistory: string;
      filterCategory: string;
      filterCountry: string;
      sortNewest: string;
      sortPopular: string;
      resultsFound: string;
      noResults: string;
    };
    footer: {
      about: string;
      contact: string;
      privacy: string;
      terms: string;
      disclaimer: string;
      rssFeed: string;
      createdBy: string;
      ideaBy: string;
      instagramCredit: string;
    };
    common: {
      loading: string;
      errorLoad: string;
      retry: string;
      backToTop: string;
      cookieText: string;
      cookieAccept: string;
    };
  }
> = {
  en: {
    tagline: 'Explore The World, Discover The Information.',
    nav: {
      home: 'Home',
      world: 'World',
      indonesia: 'Indonesia',
      trending: 'Trending',
      bookmarks: 'Saved',
      search: 'Search',
      allCategories: 'All Topics',
      admin: 'Admin',
    },
    home: {
      heroKicker: 'Lead Dispatch',
      readMore: 'Read Full Report',
      latestUpdates: 'Latest Updates',
      worldNews: 'World News',
      indonesiaNews: 'Indonesia Desk',
      trendingTitle: 'Trending & Most Read',
      techScience: 'Technology & Science',
      exploreWorld: 'Explore The World',
      moreInfo: 'More Information',
      newsletterTitle: 'Global Briefing Newsletter',
      newsletterSubtitle: 'Receive curated international and Indonesian briefings directly in your inbox.',
      newsletterPlaceholder: 'Enter your email address',
      newsletterSubmit: 'Subscribe',
      newsletterDisabled: 'Newsletter delivery requires an email service configuration (SMTP/Resend) on the server.',
      newsletterSuccess: 'Subscribed to INFORVERSE briefings.',
      viewAll: 'View all',
    },
    article: {
      back: 'Back',
      share: 'Share',
      copyLink: 'Copy Link',
      copied: 'Link Copied',
      bookmark: 'Save Article',
      bookmarked: 'Saved',
      minRead: 'min read',
      publishedAt: 'Published',
      updatedAt: 'Updated',
      originalSource: 'Original Source Reference',
      relatedArticles: 'Related Information',
      sensitiveNotice: 'Editorial Verification Note: Sensitive topics (conflict, disaster, health, or security) carry enhanced source verification notices.',
      translatedNotice: 'Displayed in English. Original source language may differ.',
    },
    world: {
      title: 'World Information',
      subtitle: 'International reporting and verified dispatches across seven continents.',
      allContinents: 'All Continents',
      selectCountry: 'Select a country on the map or list to inspect dispatches',
      articlesCount: 'articles',
      trendingGlobal: 'Trending Global',
      latestIntl: 'Latest International Updates',
      noCountryArticles: 'No published dispatches for this country selection yet.',
    },
    indonesia: {
      title: 'Indonesia Information',
      subtitle: 'Regional updates across Sumatra, Java, Kalimantan, Sulawesi, Bali & Nusa Tenggara, Maluku, and Papua.',
      allRegions: 'All Regions',
      searchProvince: 'Search province (e.g. DKI Jakarta, Jawa Barat, Kalimantan Timur)...',
      provincesInRegion: 'Provinces in Region',
      noRegionArticles: 'No published articles explicitly match this Indonesian region or province yet.',
    },
    category: {
      featured: 'Featured Report',
      latest: 'Latest Information',
      popular: 'Popular in Topic',
      searchInCat: 'Filter within category...',
      allDates: 'All Dates',
      last24h: 'Last 24 Hours',
      last7d: 'Last 7 Days',
      last30d: 'Last 30 Days',
      loadMore: 'Load More',
      empty: 'No published information matches your current filters.',
    },
    search: {
      title: 'Global Search',
      placeholder: 'Search news, countries, people, science, or topics...',
      recentSearches: 'Recent Searches',
      clearHistory: 'Clear',
      filterCategory: 'All Categories',
      filterCountry: 'All Countries',
      sortNewest: 'Newest',
      sortPopular: 'Most Popular',
      resultsFound: 'results found',
      noResults: 'No matching information found. Try broader keywords or another filter.',
    },
    footer: {
      about: 'About Us',
      contact: 'Contact',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      disclaimer: 'Disclaimer',
      rssFeed: 'RSS Feed',
      createdBy: 'Created & Developed by @wazzz.dotcom',
      ideaBy: 'Idea by @wazzz.dotcom',
      instagramCredit: 'Instagram Credit',
    },
    common: {
      loading: 'Loading information...',
      errorLoad: 'Unable to load information right now.',
      retry: 'Try Again',
      backToTop: 'Back to top',
      cookieText: 'INFORVERSE uses local browser storage solely for your language, theme, saved bookmarks, and search history preferences.',
      cookieAccept: 'Acknowledge',
    },
  },
  id: {
    tagline: 'Explore The World, Discover The Information.',
    nav: {
      home: 'Beranda',
      world: 'Dunia',
      indonesia: 'Indonesia',
      trending: 'Populer',
      bookmarks: 'Tersimpan',
      search: 'Cari',
      allCategories: 'Semua Topik',
      admin: 'Admin',
    },
    home: {
      heroKicker: 'Sorotan Utama',
      readMore: 'Baca Selengkapnya',
      latestUpdates: 'Pembaruan Terbaru',
      worldNews: 'Berita Dunia',
      indonesiaNews: 'Kabar Indonesia',
      trendingTitle: 'Paling Banyak Dibaca',
      techScience: 'Teknologi & Sains',
      exploreWorld: 'Jelajahi Dunia',
      moreInfo: 'Informasi Lainnya',
      newsletterTitle: 'Buletin Informasi Global',
      newsletterSubtitle: 'Dapatkan rangkuman perkembangan dunia dan Indonesia langsung ke email Anda.',
      newsletterPlaceholder: 'Masukkan alamat email Anda',
      newsletterSubmit: 'Berlangganan',
      newsletterDisabled: 'Layanan pengiriman email buletin belum dikonfigurasi pada server (atur NEWSLETTER_ENABLED=true).',
      newsletterSuccess: 'Berhasil berlangganan buletin INFORVERSE.',
      viewAll: 'Lihat semua',
    },
    article: {
      back: 'Kembali',
      share: 'Bagikan',
      copyLink: 'Salin Tautan',
      copied: 'Tautan Disalin',
      bookmark: 'Simpan Artikel',
      bookmarked: 'Tersimpan',
      minRead: 'menit baca',
      publishedAt: 'Dipublikasikan',
      updatedAt: 'Diperbarui',
      originalSource: 'Referensi Sumber Asli',
      relatedArticles: 'Informasi Terkait',
      sensitiveNotice: 'Catatan Verifikasi Editorial: Topik sensitif (konflik, bencana, kesehatan, atau keamanan) disertai pemeriksaan rujukan tambahan.',
      translatedNotice: 'Ditampilkan dalam Bahasa Indonesia.',
    },
    world: {
      title: 'Informasi Dunia',
      subtitle: 'Laporan internasional dan pembaruan terverifikasi dari tujuh benua.',
      allContinents: 'Semua Benua',
      selectCountry: 'Pilih negara pada peta atau daftar untuk melihat informasi terkait',
      articlesCount: 'artikel',
      trendingGlobal: 'Trending Global',
      latestIntl: 'Informasi Internasional Terbaru',
      noCountryArticles: 'Belum ada artikel terpublikasi untuk pilihan negara ini.',
    },
    indonesia: {
      title: 'Informasi Indonesia',
      subtitle: 'Kabar wilayah Sumatra, Jawa, Kalimantan, Sulawesi, Bali dan Nusa Tenggara, Maluku, serta Papua.',
      allRegions: 'Semua Wilayah',
      searchProvince: 'Cari provinsi (misal DKI Jakarta, Jawa Barat, Kalimantan Timur)...',
      provincesInRegion: 'Provinsi di Wilayah',
      noRegionArticles: 'Belum ada informasi terpublikasi yang secara eksplisit menyebut wilayah atau provinsi ini.',
    },
    category: {
      featured: 'Informasi Unggulan',
      latest: 'Informasi Terbaru',
      popular: 'Populer di Kategori',
      searchInCat: 'Cari dalam kategori...',
      allDates: 'Semua Tanggal',
      last24h: '24 Jam Terakhir',
      last7d: '7 Hari Terakhir',
      last30d: '30 Hari Terakhir',
      loadMore: 'Muat Lebih Banyak',
      empty: 'Belum ada informasi terpublikasi yang sesuai dengan filter.',
    },
    search: {
      title: 'Pencarian Global',
      placeholder: 'Cari berita, negara, tokoh, sains, teknologi, atau kata kunci...',
      recentSearches: 'Pencarian Terakhir',
      clearHistory: 'Hapus',
      filterCategory: 'Semua Kategori',
      filterCountry: 'Semua Negara',
      sortNewest: 'Terbaru',
      sortPopular: 'Terpopuler',
      resultsFound: 'hasil ditemukan',
      noResults: 'Informasi yang cocok tidak ditemukan. Coba kata kunci lebih umum.',
    },
    footer: {
      about: 'Tentang Kami',
      contact: 'Kontak',
      privacy: 'Kebijakan Privasi',
      terms: 'Ketentuan Layanan',
      disclaimer: 'Penafian',
      rssFeed: 'Feed RSS',
      createdBy: 'Created & Developed by @wazzz.dotcom',
      ideaBy: 'Idea by @wazzz.dotcom',
      instagramCredit: 'Instagram Credit',
    },
    common: {
      loading: 'Memuat informasi...',
      errorLoad: 'Gagal memuat informasi saat ini.',
      retry: 'Coba Lagi',
      backToTop: 'Ke atas',
      cookieText: 'INFORVERSE hanya menggunakan penyimpanan lokal browser untuk bahasa, tema, artikel tersimpan, dan riwayat pencarian Anda.',
      cookieAccept: 'Mengerti',
    },
  },
};
