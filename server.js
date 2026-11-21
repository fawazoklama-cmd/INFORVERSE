// server.ts
import "dotenv/config";
import express from "express";
import path3 from "node:path";
import { createServer as createViteServer } from "vite";

// server/db/store.ts
import fs from "node:fs";
import path from "node:path";

// src/data/baselineCatalog.ts
var SEED_CATEGORIES = [
  { id: "cat-world", slug: "world", name_en: "World", name_id: "Dunia", description_en: "International affairs, diplomacy, and global developments across every continent.", description_id: "Hubungan internasional, diplomasi, dan perkembangan global di seluruh benua.", sort_order: 1 },
  { id: "cat-indonesia", slug: "indonesia", name_en: "Indonesia", name_id: "Indonesia", description_en: "National policies, infrastructure, and regional updates from across the Indonesian archipelago.", description_id: "Kebijakan nasional, infrastruktur, dan kabar daerah dari seluruh kepulauan Indonesia.", sort_order: 2 },
  { id: "cat-technology", slug: "technology", name_en: "Technology", name_id: "Teknologi", description_en: "Artificial intelligence, computing architecture, robotics, and digital systems.", description_id: "Kecerdasan buatan, arsitektur komputasi, robotika, dan sistem digital.", sort_order: 3 },
  { id: "cat-science", slug: "science", name_en: "Science", name_id: "Sains", description_en: "Peer-reviewed breakthroughs, physics, biology, and laboratory discoveries.", description_id: "Temuan ilmiah, fisika, biologi, dan riset laboratorium terkemuka.", sort_order: 4 },
  { id: "cat-economy", slug: "economy", name_en: "Economy", name_id: "Ekonomi", description_en: "Macroeconomics, central banks, global trade corridors, and industrial markets.", description_id: "Ekonomi makro, bank sentral, jalur perdagangan global, dan pasar industri.", sort_order: 5 },
  { id: "cat-politics", slug: "politics", name_en: "Politics", name_id: "Politik", description_en: "Governance, legislative decisions, elections, and multilateral treaties.", description_id: "Tata kelola pemerintahan, keputusan legislatif, pemilu, dan perjanjian multilateral.", sort_order: 6 },
  { id: "cat-environment", slug: "environment", name_en: "Environment", name_id: "Lingkungan", description_en: "Climate science, renewable energy transitions, conservation, and ocean stewardship.", description_id: "Ilmu iklim, transisi energi terbarukan, konservasi, dan kelestarian laut.", sort_order: 7 },
  { id: "cat-education", slug: "education", name_en: "Education", name_id: "Pendidikan", description_en: "Universities, curriculum reforms, open research initiatives, and literacy.", description_id: "Universitas, pembaruan kurikulum, riset terbuka, dan literasi global.", sort_order: 8 },
  { id: "cat-health", slug: "health", name_en: "Health", name_id: "Kesehatan", description_en: "Public health policy, biomedical research, epidemiology, and healthcare infrastructure.", description_id: "Kebijakan kesehatan masyarakat, riset biomedis, epidemiologi, dan fasilitas medis.", sort_order: 9 },
  { id: "cat-sports", slug: "sports", name_en: "Sports", name_id: "Olahraga", description_en: "International tournaments, athletics governance, and regional championships.", description_id: "Turnamen internasional, tata kelola olahraga, dan kejuaraan regional.", sort_order: 10 },
  { id: "cat-space", slug: "space", name_en: "Space", name_id: "Antariksa", description_en: "Orbital observatories, satellite networks, planetary missions, and launch engineering.", description_id: "Observatorium orbit, jaringan satelit, misi planet, dan teknik peluncuran.", sort_order: 11 },
  { id: "cat-business", slug: "business", name_en: "Business", name_id: "Bisnis", description_en: "Enterprise strategy, supply chains, startups, and corporate governance.", description_id: "Strategi perusahaan, rantai pasok, rintisan, dan tata kelola korporasi.", sort_order: 12 },
  { id: "cat-culture", slug: "culture", name_en: "Culture", name_id: "Budaya", description_en: "Heritage preservation, contemporary arts, architecture, and cultural exchange.", description_id: "Pelestarian warisan, seni kontemporer, arsitektur, dan pertukaran budaya.", sort_order: 13 },
  { id: "cat-security", slug: "security", name_en: "Security", name_id: "Keamanan", description_en: "Cybersecurity infrastructure, maritime safety, and strategic defense analysis.", description_id: "Keamanan siber, keselamatan maritim, dan analisis pertahanan strategis.", sort_order: 14 },
  { id: "cat-disaster", slug: "disaster", name_en: "Disaster", name_id: "Bencana", description_en: "Early warning systems, seismic monitoring, disaster preparedness, and relief logistics.", description_id: "Sistem peringatan dini, pemantauan seismik, mitigasi bencana, dan logistik bantuan.", sort_order: 15 },
  { id: "cat-innovation", slug: "innovation", name_en: "Innovation", name_id: "Inovasi", description_en: "Emerging industrial patents, clean-tech prototypes, and applied engineering.", description_id: "Paten industri baru, purwarupa teknologi bersih, dan rekayasa terapan.", sort_order: 16 }
];
var SEED_COUNTRIES = [
  { id: "co-id", code: "ID", iso_numeric: "360", name_en: "Indonesia", name_id: "Indonesia", continent: "Asia" },
  { id: "co-us", code: "US", iso_numeric: "840", name_en: "United States", name_id: "Amerika Serikat", continent: "North America" },
  { id: "co-gb", code: "GB", iso_numeric: "826", name_en: "United Kingdom", name_id: "Britania Raya", continent: "Europe" },
  { id: "co-jp", code: "JP", iso_numeric: "392", name_en: "Japan", name_id: "Jepang", continent: "Asia" },
  { id: "co-de", code: "DE", iso_numeric: "276", name_en: "Germany", name_id: "Jerman", continent: "Europe" },
  { id: "co-sg", code: "SG", iso_numeric: "702", name_en: "Singapore", name_id: "Singapura", continent: "Asia" },
  { id: "co-au", code: "AU", iso_numeric: "036", name_en: "Australia", name_id: "Australia", continent: "Oceania" },
  { id: "co-fr", code: "FR", iso_numeric: "250", name_en: "France", name_id: "Prancis", continent: "Europe" },
  { id: "co-br", code: "BR", iso_numeric: "076", name_en: "Brazil", name_id: "Brasil", continent: "South America" },
  { id: "co-za", code: "ZA", iso_numeric: "710", name_en: "South Africa", name_id: "Afrika Selatan", continent: "Africa" },
  { id: "co-kr", code: "KR", iso_numeric: "410", name_en: "South Korea", name_id: "Korea Selatan", continent: "Asia" },
  { id: "co-in", code: "IN", iso_numeric: "356", name_en: "India", name_id: "India", continent: "Asia" },
  { id: "co-ca", code: "CA", iso_numeric: "124", name_en: "Canada", name_id: "Kanada", continent: "North America" },
  { id: "co-ae", code: "AE", iso_numeric: "784", name_en: "United Arab Emirates", name_id: "Uni Emirat Arab", continent: "Asia" },
  { id: "co-aq", code: "AQ", iso_numeric: "010", name_en: "Antarctica Research Stations", name_id: "Stasiun Riset Antarktika", continent: "Antarctica" }
];
var SEED_REGIONS = [
  {
    id: "reg-sumatra",
    slug: "sumatra",
    name_en: "Sumatra",
    name_id: "Sumatra",
    country_id: "co-id",
    provinces: [
      "Aceh",
      "Sumatera Utara",
      "Sumatera Barat",
      "Riau",
      "Kepulauan Riau",
      "Jambi",
      "Bengkulu",
      "Sumatera Selatan",
      "Kepulauan Bangka Belitung",
      "Lampung"
    ]
  },
  {
    id: "reg-jawa",
    slug: "jawa",
    name_en: "Java",
    name_id: "Jawa",
    country_id: "co-id",
    provinces: [
      "Banten",
      "DKI Jakarta",
      "Jawa Barat",
      "Jawa Tengah",
      "DI Yogyakarta",
      "Jawa Timur"
    ]
  },
  {
    id: "reg-kalimantan",
    slug: "kalimantan",
    name_en: "Kalimantan",
    name_id: "Kalimantan",
    country_id: "co-id",
    provinces: [
      "Kalimantan Barat",
      "Kalimantan Tengah",
      "Kalimantan Selatan",
      "Kalimantan Timur",
      "Kalimantan Utara"
    ]
  },
  {
    id: "reg-sulawesi",
    slug: "sulawesi",
    name_en: "Sulawesi",
    name_id: "Sulawesi",
    country_id: "co-id",
    provinces: [
      "Sulawesi Utara",
      "Gorontalo",
      "Sulawesi Tengah",
      "Sulawesi Barat",
      "Sulawesi Selatan",
      "Sulawesi Tenggara"
    ]
  },
  {
    id: "reg-bali-nusra",
    slug: "bali-nusa-tenggara",
    name_en: "Bali & Nusa Tenggara",
    name_id: "Bali dan Nusa Tenggara",
    country_id: "co-id",
    provinces: ["Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur"]
  },
  {
    id: "reg-maluku",
    slug: "maluku",
    name_en: "Maluku Islands",
    name_id: "Maluku",
    country_id: "co-id",
    provinces: ["Maluku", "Maluku Utara"]
  },
  {
    id: "reg-papua",
    slug: "papua",
    name_en: "Papua",
    name_id: "Papua",
    country_id: "co-id",
    provinces: [
      "Papua",
      "Papua Barat",
      "Papua Selatan",
      "Papua Tengah",
      "Papua Pegunungan",
      "Papua Barat Daya"
    ]
  }
];
var SEED_SOURCES = [
  {
    id: "src-bbc-world",
    name: "BBC World News RSS",
    type: "rss",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    country_code: "GB",
    default_category_slug: "world",
    language: "en",
    is_active: true,
    last_fetched_at: null,
    last_status: "idle",
    last_error: null,
    retry_count: 0,
    created_at: "2026-11-20T08:00:00.000Z"
  },
  {
    id: "src-nasa-breaking",
    name: "NASA Breaking News RSS",
    type: "research",
    url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    country_code: "US",
    default_category_slug: "space",
    language: "en",
    is_active: true,
    last_fetched_at: null,
    last_status: "idle",
    last_error: null,
    retry_count: 0,
    created_at: "2026-11-20T08:00:00.000Z"
  },
  {
    id: "src-antara-news",
    name: "ANTARA News Indonesia RSS",
    type: "rss",
    url: "https://www.antaranews.com/rss/terkini.xml",
    country_code: "ID",
    default_category_slug: "indonesia",
    language: "id",
    is_active: true,
    last_fetched_at: null,
    last_status: "idle",
    last_error: null,
    retry_count: 0,
    created_at: "2026-11-20T08:00:00.000Z"
  },
  {
    id: "src-bmkg-info",
    name: "BMKG Indonesia Warning Feed",
    type: "government",
    url: "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.xml",
    country_code: "ID",
    default_category_slug: "disaster",
    language: "id",
    is_active: false,
    last_fetched_at: null,
    last_status: "idle",
    last_error: null,
    retry_count: 0,
    created_at: "2026-11-20T08:00:00.000Z"
  },
  {
    id: "src-newsapi-global",
    name: "NewsAPI Global Headlines",
    type: "news_api",
    url: "https://newsapi.org/v2/top-headlines?language=en&pageSize=10",
    country_code: "US",
    default_category_slug: "world",
    language: "en",
    is_active: false,
    last_fetched_at: null,
    last_status: "idle",
    last_error: null,
    retry_count: 0,
    created_at: "2026-11-20T08:00:00.000Z"
  }
];
var SEED_ARTICLES = [
  {
    id: "art-1",
    title: "Multilateral Forum Advances Cross-Border Digital Trade and Clean Grid Standards",
    slug: "multilateral-forum-digital-trade-clean-grid-standards",
    subtitle: "Economic ministers and technology delegates outline interoperable customs protocols and grid investment corridors.",
    summary: "Delegates from 28 economies convened to establish shared technical standards for cross-border digital documentation, customs clearance, and interconnected renewable power transmission.",
    content: `Economic ministers, energy regulators, and digital infrastructure delegates concluded three days of multilateral working sessions focused on streamlining cross-border trade rules and clean power interconnections.

Key working groups emphasized three practical priorities: interoperable electronic bills of lading to shorten port clearance times, harmonized cybersecurity baselines for critical energy grids, and transparent sustainability reporting for industrial supply chains.

Regional observers noted that Southeast Asian and European delegations aligned on pilot corridors linking maritime logistics hubs with verifiable clean-energy certificates, reducing compliance friction for mid-sized exporters.`,
    image_url: "/src/assets/images/hero_global_summit_1795250512890.jpg",
    image_caption: "Delegates during the plenary session on cross-border digital infrastructure standards.",
    category_id: "cat-world",
    country_id: "co-de",
    region_id: null,
    province: null,
    source_id: null,
    source_name: "INFORVERSE International Desk",
    source_url: "https://www.wto.org/",
    author: "INFORVERSE Editorial Desk",
    article_type: "editorial",
    requires_verification: false,
    is_verified: true,
    language: "en",
    status: "published",
    is_automatic: false,
    is_featured: true,
    views_count: 4820,
    tags: ["Global Trade", "Digital Infrastructure", "Clean Grid"],
    seo_title: "Multilateral Forum Advances Digital Trade & Clean Grid Standards | INFORVERSE",
    seo_description: "Delegates from 28 economies outline interoperable digital trade protocols and cross-border renewable grid standards.",
    published_at: "2026-11-21T06:30:00.000Z",
    updated_at: "2026-11-21T06:30:00.000Z",
    created_at: "2026-11-21T06:30:00.000Z",
    translations: {
      id: {
        id: "tr-1-id",
        article_id: "art-1",
        language: "id",
        title: "Forum Multilateral Memperkuat Standar Perdagangan Digital dan Jaringan Listrik Bersih",
        subtitle: "Menteri ekonomi dan delegasi teknologi merumuskan protokol kepabeanan yang saling terhubung serta koridor investasi jaringan energi.",
        summary: "Delegasi dari 28 negara menyepakati penyusunan standar teknis bersama untuk dokumen perdagangan digital lintas batas, efisiensi pelabuhan, dan interkoneksi transmisi energi terbarukan.",
        content: `Para menteri ekonomi, regulator energi, dan delegasi infrastruktur digital menyelesaikan tiga hari sesi kerja multilateral yang berfokus pada penyederhanaan aturan perdagangan lintas batas dan interkoneksi tenaga listrik bersih.

Kelompok kerja utama menekankan tiga prioritas praktis: dokumen pengapalan elektronik yang saling terhubung untuk memangkas waktu tunggu pelabuhan, standar dasar keamanan siber bagi jaringan energi kritis, serta pelaporan keberlanjutan yang transparan pada rantai pasok industri.

Pengamat kawasan mencatat keselarasan delegasi Asia Tenggara dan Eropa dalam merancang koridor percontohan yang menghubungkan pusat logistik maritim dengan sertifikasi energi bersih yang dapat diverifikasi.`,
        is_ai_translated: false
      }
    }
  },
  {
    id: "art-2",
    title: "Jakarta Expands Integrated Rail Transit and Low-Emission Corridor Across Greater Jabodetabek",
    slug: "jakarta-expands-integrated-rail-transit-corridor",
    subtitle: "Urban mobility authorities synchronize fare systems and feeder fleets connecting DKI Jakarta, Jawa Barat, and Banten.",
    summary: "Metropolitan transit agencies in DKI Jakarta and neighboring Jawa Barat have launched an integrated scheduling and ticketing phase to shorten commuter transfers and curb urban emissions.",
    content: `Urban mobility operators across DKI Jakarta, Jawa Barat, and Banten introduced unified intermodal timetable coordination connecting elevated rail lines, commuter trains, and electric feeder buses.

The operational upgrade targets peak-hour bottlenecks along central business arteries while expanding contactless payment compatibility across municipal networks.

Transport planners reported that synchronized headway intervals have reduced average interchange waiting times during morning and evening commutes, supporting broader regional air-quality targets.`,
    image_url: "/src/assets/images/indo_jakarta_skyline_1795250511476.jpg",
    image_caption: "Elevated transit corridor passing through Jakarta financial district at dusk.",
    category_id: "cat-indonesia",
    country_id: "co-id",
    region_id: "reg-jawa",
    province: "DKI Jakarta",
    source_id: null,
    source_name: "INFORVERSE Indonesia Desk",
    source_url: "https://jakarta.go.id/",
    author: "Nadia Kusuma",
    article_type: "editorial",
    requires_verification: false,
    is_verified: true,
    language: "en",
    status: "published",
    is_automatic: false,
    is_featured: true,
    views_count: 3940,
    tags: ["Jakarta", "Urban Transit", "Indonesia Infrastructure"],
    seo_title: "Jakarta Expands Integrated Rail Transit Across Jabodetabek | INFORVERSE",
    seo_description: "Urban mobility authorities synchronize rail and feeder fleets across DKI Jakarta and Jawa Barat.",
    published_at: "2026-11-21T05:15:00.000Z",
    updated_at: "2026-11-21T05:15:00.000Z",
    created_at: "2026-11-21T05:15:00.000Z",
    translations: {
      id: {
        id: "tr-2-id",
        article_id: "art-2",
        language: "id",
        title: "Jakarta Memperluas Koridor Transit Rel Terpadu dan Transportasi Rendah Emisi di Jabodetabek",
        subtitle: "Otoritas mobilitas perkotaan menyinkronkan sistem tarif dan armada pengumpan di DKI Jakarta, Jawa Barat, dan Banten.",
        summary: "Pengelola transportasi di DKI Jakarta dan wilayah penyangga Jawa Barat meluncurkan fase integrasi jadwal dan tiket terpadu guna memangkas waktu perpindahan komuter serta menekan emisi perkotaan.",
        content: `Operator mobilitas perkotaan di DKI Jakarta, Jawa Barat, dan Banten menghadirkan koordinasi jadwal antarmoda yang menghubungkan jalur rel layang, kereta komuter, dan bus pengumpan listrik.

Pembaruan operasional ini menyasar titik kepadatan jam sibuk di koridor bisnis utama sekaligus memperluas kompatibilitas pembayaran nirsentuh di seluruh jaringan transportasi daerah.

Perencana transportasi mencatat bahwa penyelarasan interval keberangkatan telah mengurangi waktu tunggu perpindahan penumpang pada jam berangkat dan pulang kerja.`,
        is_ai_translated: false
      }
    }
  },
  {
    id: "art-3",
    title: "Cryogenic Error-Correction Milestone Improves Fault-Tolerant Quantum Processor Stability",
    slug: "cryogenic-error-correction-quantum-processor-stability",
    subtitle: "Researchers demonstrate lower logical qubit decoherence rates using modular microwave shielding.",
    summary: "Physics teams in Japan and Switzerland published experimental benchmarks showing significant reductions in thermal noise across multi-qubit cryogenic arrays.",
    content: `A collaborative photonics and quantum engineering consortium has demonstrated improved logical qubit coherence times inside modular dilution refrigerators.

By isolating control wiring inside multi-stage cryogenic shielding, the team lowered stray microwave crosstalk during high-frequency gate operations.

While large-scale commercial fault-tolerant systems remain years away, independent reviewers noted the architecture offers a scalable blueprint for laboratory testbeds studying materials simulation and molecular modeling.`,
    image_url: "/src/assets/images/tech_quantum_lab_1795250512205.jpg",
    image_caption: "Cryogenic dilution refrigerator assembly inside a quantum computing cleanroom.",
    category_id: "cat-technology",
    country_id: "co-jp",
    region_id: null,
    province: null,
    source_id: null,
    source_name: "INFORVERSE Science & Tech",
    source_url: "https://www.nature.com/",
    author: "Dr. Kenji Takahashi",
    article_type: "original",
    requires_verification: false,
    is_verified: true,
    language: "en",
    status: "published",
    is_automatic: false,
    is_featured: false,
    views_count: 3180,
    tags: ["Quantum Computing", "Physics", "Semiconductors"],
    seo_title: "Cryogenic Error-Correction Milestone in Quantum Computing | INFORVERSE",
    seo_description: "Researchers reduce thermal noise and improve fault-tolerant qubit stability in cryogenic arrays.",
    published_at: "2026-11-21T04:10:00.000Z",
    updated_at: "2026-11-21T04:10:00.000Z",
    created_at: "2026-11-21T04:10:00.000Z",
    translations: {
      id: {
        id: "tr-3-id",
        article_id: "art-3",
        language: "id",
        title: "Terobosan Koreksi Kesalahan Kriogenik Meningkatkan Stabilitas Prosesor Kuantum",
        subtitle: "Tim peneliti menunjukkan penurunan laju dekoherensi qubit logis melalui pelindung gelombang mikro modular.",
        summary: "Tim fisika di Jepang dan Eropa merilis hasil uji eksperimental yang memperlihatkan penurunan kebisingan termal secara signifikan pada susunan prosesor kuantum kriogenik.",
        content: `Konsorsium teknik fotonika dan komputasi kuantum berhasil meningkatkan durasi koherensi qubit logis di dalam sistem pendingin kriogenik modular.

Dengan mengisolasi kabel kendali menggunakan pelindung kriogenik bertingkat, tim peneliti menekan gangguan sinyal gelombang mikro selama operasi gerbang logika berkecepatan tinggi.

Meskipun komputer kuantum toleran-kesalahan berskala komersial masih memerlukan waktu pengembangan bertahun-tahun, peninjau independen menilai arsitektur ini memberi landasan penting bagi simulasi material dan pemodelan molekul.`,
        is_ai_translated: false
      }
    }
  },
  {
    id: "art-4",
    title: "Deep-Space Infrared Observatory Completes Segmented Mirror Alignment Ahead of Launch",
    slug: "deep-space-infrared-observatory-mirror-alignment",
    subtitle: "Aerospace engineers finalize optical calibration tests designed to survey exoplanet atmospheres.",
    summary: "Integration teams have completed vacuum thermal and nanometer-scale mirror calibration on a next-generation infrared space telescope scheduled for deep-orbit deployment.",
    content: `Aerospace engineers completed final optical alignment inspections on a segmented gold-coated infrared space telescope inside a high-bay integration cleanroom.

The observatory is engineered to measure faint atmospheric absorption signatures around temperate rocky exoplanets as well as cold interstellar dust formations.

Following acoustic vibration checks, the spacecraft will undergo fueling and fairing encapsulation prior to launch window verification.`,
    image_url: "/src/assets/images/space_orbital_observatory_1795250511424.jpg",
    image_caption: "Aerospace integration engineers inspecting a segmented gold-coated optical array.",
    category_id: "cat-space",
    country_id: "co-us",
    region_id: null,
    province: null,
    source_id: null,
    source_name: "INFORVERSE Space Desk",
    source_url: "https://www.nasa.gov/",
    author: "Elena Vance",
    article_type: "editorial",
    requires_verification: false,
    is_verified: true,
    language: "en",
    status: "published",
    is_automatic: false,
    is_featured: false,
    views_count: 2890,
    tags: ["Space Telescope", "Exoplanets", "Aerospace"],
    seo_title: "Deep-Space Infrared Observatory Completes Mirror Alignment | INFORVERSE",
    seo_description: "Aerospace engineers complete optical mirror calibration on an infrared exoplanet observatory.",
    published_at: "2026-11-21T02:45:00.000Z",
    updated_at: "2026-11-21T02:45:00.000Z",
    created_at: "2026-11-21T02:45:00.000Z",
    translations: {
      id: {
        id: "tr-4-id",
        article_id: "art-4",
        language: "id",
        title: "Observatorium Inframerah Antariksa Rampungkan Kalibrasi Cermin Tersegmentasi Jelang Peluncuran",
        subtitle: "Insinyur kedirgantaraan menyelesaikan uji optik presisi tinggi untuk meneliti atmosfer eksoplanet.",
        summary: "Tim integrasi antariksa telah menuntaskan uji termal vakum dan kalibrasi cermin skala nanometer pada teleskop inframerah generasi baru sebelum penempatan di orbit dalam.",
        content: `Para insinyur kedirgantaraan menyelesaikan inspeksi penyelarasan optik tahap akhir pada teleskop inframerah berlapis emas tersegmentasi di ruang bersih integrasi.

Observatorium ini dirancang untuk mengukur spektrum serapan atmosfer di sekitar eksoplanet berbatu maupun formasi debu antarbintang bersuhu dingin.

Setelah melewati uji getaran akustik, wahana akan memasuki tahap pengisian bahan bakar dan penutupan selubung roket.`,
        is_ai_translated: false
      }
    }
  },
  {
    id: "art-5",
    title: "Eastern Indonesia Archipelago Piloting Hybrid Marine Solar Microgrids for Coastal Stations",
    slug: "eastern-indonesia-archipelago-hybrid-marine-solar-microgrids",
    subtitle: "Research partnerships in Maluku Utara and Papua Barat Daya deploy floating photovoltaic arrays for coastal communities.",
    summary: "Marine conservation stations and island clinics in Maluku Utara are testing salt-resistant floating solar platforms paired with battery storage to replace diesel generators.",
    content: `Coastal engineering teams working across Maluku Utara and Papua Barat Daya have commissioned hybrid floating solar microgrids designed to power marine monitoring stations, cold-storage fisheries hubs, and island clinics.

Built with corrosion-resistant pontoons calibrated for calm tropical bays, the modular arrays reduce reliance on costly shipped diesel fuel.

Local university researchers are also tracking reef-shade interactions beneath the platforms to ensure marine biodiversity remains undisturbed.`,
    image_url: "/src/assets/images/env_archipelago_energy_1795250512657.jpg",
    image_caption: "Offshore solar microgrid and marine research dock in eastern Indonesian waters.",
    category_id: "cat-environment",
    country_id: "co-id",
    region_id: "reg-maluku",
    province: "Maluku Utara",
    source_id: null,
    source_name: "INFORVERSE Environment Desk",
    source_url: "https://www.esdm.go.id/",
    author: "Rizal Pratama",
    article_type: "editorial",
    requires_verification: false,
    is_verified: true,
    language: "en",
    status: "published",
    is_automatic: false,
    is_featured: false,
    views_count: 2540,
    tags: ["Renewable Energy", "Marine Conservation", "Maluku Utara"],
    seo_title: "Eastern Indonesia Pilots Hybrid Marine Solar Microgrids | INFORVERSE",
    seo_description: "Island stations in Maluku Utara test corrosion-resistant floating solar arrays and battery storage.",
    published_at: "2026-11-20T22:15:00.000Z",
    updated_at: "2026-11-20T22:15:00.000Z",
    created_at: "2026-11-20T22:15:00.000Z",
    translations: {
      id: {
        id: "tr-5-id",
        article_id: "art-5",
        language: "id",
        title: "Kawasan Timur Indonesia Menguji Mikrogrid Surya Maritim Hibrida untuk Stasiun Pesisir",
        subtitle: "Kolaborasi riset di Maluku Utara dan Papua Barat Daya memasang panel surya apung bagi fasilitas pesisir.",
        summary: "Stasiun konservasi laut dan klinik pulau di Maluku Utara menguji platform surya apung tahan garam yang dipadukan dengan baterai penyimpanan guna mengurangi ketergantungan pada generator diesel.",
        content: `Tim rekayasa pesisir di Maluku Utara dan Papua Barat Daya mengoperasikan mikrogrid surya apung hibrida untuk memasok listrik bagi stasiun pemantauan laut, gudang pendingin perikanan, dan klinik pulau.

Dirancang dengan ponton tahan korosi untuk teluk tropis yang tenang, susunan panel modular ini menekan biaya distribusi bahan bakar diesel antar-pulau.

Peneliti universitas setempat juga memantau kondisi terumbu karang di sekitar instalasi guna menjaga keseimbangan ekosistem laut.`,
        is_ai_translated: false
      }
    }
  },
  {
    id: "art-6",
    title: "Southeast Asian Central Banks Expand Instant Cross-Border QR Settlement Links",
    slug: "southeast-asian-central-banks-instant-qr-settlement",
    subtitle: "Indonesia, Singapore, and regional partners widen local-currency retail payment interoperability.",
    summary: "Central banks across ASEAN reported record transaction volumes across bilateral QR payment corridors connecting Bank Indonesia, MAS, and neighboring monetary authorities.",
    content: `Monetary authorities in Indonesia and Singapore reported steady growth in bilateral instant QR settlements, enabling travelers and small merchants to transact directly in local currencies.

Central bank officials stated that direct local-currency settlement lowers foreign-exchange conversion spreads and improves transparency for cross-border tourism and micro-enterprises.

Technical working groups are now evaluating standardized fraud-monitoring APIs across participating payment switches.`,
    image_url: "/src/assets/images/hero_global_summit_1795250512890.jpg",
    image_caption: "Regional financial regulators reviewing cross-border payment settlement benchmarks.",
    category_id: "cat-economy",
    country_id: "co-sg",
    region_id: null,
    province: null,
    source_id: null,
    source_name: "INFORVERSE Economy",
    source_url: "https://www.bi.go.id/",
    author: "Siti Rahmawati",
    article_type: "editorial",
    requires_verification: false,
    is_verified: true,
    language: "en",
    status: "published",
    is_automatic: false,
    is_featured: false,
    views_count: 2210,
    tags: ["ASEAN Economy", "Fintech", "Local Currency"],
    seo_title: "ASEAN Central Banks Expand Instant Cross-Border QR Links | INFORVERSE",
    seo_description: "Indonesia and Singapore widen local-currency retail payment interoperability across ASEAN.",
    published_at: "2026-11-20T18:20:00.000Z",
    updated_at: "2026-11-20T18:20:00.000Z",
    created_at: "2026-11-20T18:20:00.000Z",
    translations: {
      id: {
        id: "tr-6-id",
        article_id: "art-6",
        language: "id",
        title: "Bank Sentral Asia Tenggara Memperluas Interkoneksi Pembayaran QR Lintas Batas",
        subtitle: "Indonesia, Singapura, dan mitra kawasan memperluas penyelesaian transaksi ritel berbasis mata uang lokal.",
        summary: "Otoritas moneter di ASEAN mencatat kenaikan transaksi pada koridor pembayaran QR bilateral yang menghubungkan sistem pembayaran nasional dalam mata uang lokal.",
        content: `Otoritas moneter di Indonesia dan Singapura melaporkan pertumbuhan stabil pada penyelesaian transaksi QR instan bilateral yang memungkinkan wisatawan dan pelaku UMKM bertransaksi langsung dalam mata uang lokal.

Pejabat bank sentral menjelaskan bahwa penyelesaian langsung mata uang lokal menekan biaya konversi valuta asing dan meningkatkan transparansi perdagangan ritel kawasan.

Kelompok kerja teknis kini meninjau standar API pemantauan penipuan lintas jaringan pembayaran.`,
        is_ai_translated: false
      }
    }
  },
  {
    id: "art-7",
    title: "Kalimantan Timur Forest Monitoring Network Integrates Acoustic Biodiversity Sensors",
    slug: "kalimantan-timur-forest-monitoring-acoustic-sensors",
    subtitle: "University conservation teams deploy solar-powered bioacoustic nodes to map canopy health.",
    summary: "Ecological field researchers in Kalimantan Timur have installed automated acoustic and satellite telemetry nodes to track wildlife movement and detect illegal logging alerts.",
    content: `Forestry and conservation researchers in Kalimantan Timur deployed a grid of solar-powered bioacoustic sensors across secondary rainforest corridors.

The weatherproof nodes record dawn and dusk wildlife vocalizations while cross-referencing canopy disturbance signals with open satellite imagery.

Researchers emphasized that open environmental telemetry supports provincial watershed protection and long-term ecological restoration.`,
    image_url: "/src/assets/images/env_archipelago_energy_1795250512657.jpg",
    image_caption: "Tropical canopy and watershed research zone in Kalimantan Timur.",
    category_id: "cat-science",
    country_id: "co-id",
    region_id: "reg-kalimantan",
    province: "Kalimantan Timur",
    source_id: null,
    source_name: "INFORVERSE Science Desk",
    source_url: "https://brin.go.id/",
    author: "Dr. Arif Budiman",
    article_type: "editorial",
    requires_verification: false,
    is_verified: true,
    language: "en",
    status: "published",
    is_automatic: false,
    is_featured: false,
    views_count: 1875,
    tags: ["Conservation", "Bioacoustics", "Kalimantan Timur"],
    seo_title: "Kalimantan Timur Integrates Acoustic Biodiversity Sensors | INFORVERSE",
    seo_description: "Conservation teams in Kalimantan Timur deploy solar bioacoustic nodes to monitor rainforest health.",
    published_at: "2026-11-20T14:00:00.000Z",
    updated_at: "2026-11-20T14:00:00.000Z",
    created_at: "2026-11-20T14:00:00.000Z",
    translations: {
      id: {
        id: "tr-7-id",
        article_id: "art-7",
        language: "id",
        title: "Jaringan Pemantauan Hutan Kalimantan Timur Mengintegrasikan Sensor Biodiversitas Akustik",
        subtitle: "Tim konservasi perguruan tinggi memasang simpul bioakustik bertenaga surya untuk memetakan kesehatan kanopi.",
        summary: "Peneliti ekologi lapangan di Kalimantan Timur memasang perangkat sensor akustik otomatis dan telemetri satelit guna memantau satwa liar dan mendeteksi gangguan kawasan hutan.",
        content: `Peneliti kehutanan dan konservasi di Kalimantan Timur memasang jaringan sensor bioakustik bertenaga surya di koridor hutan hujan sekunder.

Perangkat tahan cuaca tersebut merekam suara satwa pada waktu fajar dan senja sembari mencocokkan sinyal gangguan tutupan lahan dengan citra satelit terbuka.

Data telemetri lingkungan ini digunakan untuk mendukung perlindungan daerah aliran sungai dan pemulihan ekosistem jangka panjang.`,
        is_ai_translated: false
      }
    }
  },
  {
    id: "art-8",
    title: "Global Seismic Agencies Upgrade Real-Time Ocean Buoy Telemetry for Tsunami Early Warning",
    slug: "global-seismic-agencies-upgrade-tsunami-buoy-telemetry",
    subtitle: "Pacific and Indian Ocean geological institutes standardize open pressure-sensor alert relays.",
    summary: "Meteorological and geophysical agencies across the Pacific Rim and Indian Ocean have calibrated upgraded seabed pressure sensors to transmit faster coastal warning bulletins.",
    content: `Geophysical monitoring institutes across Australia, Japan, and Indonesia completed a joint calibration drill covering deep-ocean tsunami detection buoys.

Upgraded satellite relays reduce latency between seabed pressure anomalies and national warning centers, giving coastal municipalities vital extra minutes for evacuation verification.

Officials remind coastal residents to rely strictly on official national meteorological bulletins during seismic events.`,
    image_url: "/src/assets/images/space_orbital_observatory_1795250511424.jpg",
    image_caption: "Precision satellite relay hardware supporting global environmental telemetry.",
    category_id: "cat-disaster",
    country_id: "co-au",
    region_id: null,
    province: null,
    source_id: null,
    source_name: "INFORVERSE Disaster Watch",
    source_url: "https://www.unesco.org/",
    author: "INFORVERSE Desk",
    article_type: "editorial",
    requires_verification: true,
    is_verified: true,
    language: "en",
    status: "published",
    is_automatic: false,
    is_featured: false,
    views_count: 1640,
    tags: ["Early Warning", "Seismology", "Disaster Preparedness"],
    seo_title: "Global Seismic Agencies Upgrade Tsunami Buoy Telemetry | INFORVERSE",
    seo_description: "Pacific and Indian Ocean institutes standardize seabed pressure-sensor relays for faster tsunami warnings.",
    published_at: "2026-11-20T10:30:00.000Z",
    updated_at: "2026-11-20T10:30:00.000Z",
    created_at: "2026-11-20T10:30:00.000Z",
    translations: {
      id: {
        id: "tr-8-id",
        article_id: "art-8",
        language: "id",
        title: "Lembaga Seismik Global Memperbarui Telemetri Pelampung Laut untuk Peringatan Dini Tsunami",
        subtitle: "Institusi geologi Samudra Pasifik dan Hindia menyelaraskan sensor tekanan dasar laut berkecepatan tinggi.",
        summary: "Badan meteorologi dan geofisika di kawasan Samudra Pasifik dan Hindia menguji sensor tekanan dasar laut generasi baru guna mempercepat penyampaian buletin peringatan pesisir.",
        content: `Lembaga pemantau geofisika di Australia, Jepang, dan Indonesia menyelesaikan latihan kalibrasi bersama yang mencakup pelampung deteksi tsunami laut dalam.

Relai satelit yang diperbarui memangkas jeda waktu antara deteksi anomali tekanan dasar laut dan pusat peringatan nasional.

Masyarakat pesisir diimbau untuk selalu merujuk pada buletin resmi badan meteorologi dan geofisika nasional saat terjadi aktivitas seismik.`,
        is_ai_translated: false
      }
    }
  }
];
var DEFAULT_AUTOMATION_SETTINGS = {
  id: 1,
  scheduler_enabled: false,
  update_interval_minutes: 30,
  auto_publish: false,
  ai_summary_enabled: true,
  ai_translation_enabled: true,
  duplicate_detection_enabled: true,
  ai_model: "gemini-4-hydrogen",
  summary_length: "medium",
  ai_system_prompt: "You are an objective editorial assistant for INFORVERSE. Summarize strictly from provided source facts, never invent quotes or facts, distinguish claims from verified facts, and preserve original context.",
  max_retries: 3,
  token_usage_total: 0,
  last_run_at: null,
  next_run_at: null
};
var DEFAULT_LOGO_URL = "/assets/aistudio/file_0000000075988207a19a527ce9b910d4_16885cc1.png";
var DEFAULT_WEBSITE_SETTINGS = {
  id: 1,
  site_name: "INFORVERSE",
  tagline: "Explore The World, Discover The Information.",
  logo_url: DEFAULT_LOGO_URL,
  default_language: "auto",
  default_theme: "light",
  seo_title: "INFORVERSE \u2014 Global & Indonesia Information Portal",
  seo_description: "Global news, Indonesian regional updates, science, technology, economy, and AI-assisted editorial summaries.",
  instagram_url: "https://www.instagram.com/wazzz.dotcom/",
  contact_email: "editorial@inforverse.org",
  footer_note: "Explore The World, Discover The Information.",
  homepage_sections: {
    hero: true,
    latest: true,
    world: true,
    indonesia: true,
    trending: true,
    techScience: true,
    worldMap: true,
    moreInfo: true,
    newsletter: true
  }
};
var INITIAL_LOGS = [
  {
    id: "log-init-1",
    log_type: "admin",
    status: "info",
    source_id: null,
    message: "INFORVERSE editorial database initialized with baseline categories, regions, and sources.",
    details: { categories: 16, countries: 15, regions: 7 },
    created_at: "2026-11-21T00:00:00.000Z"
  }
];

// server/db/store.ts
var DATA_DIR = path.resolve(process.cwd(), "server", "data");
var DATA_FILE = path.join(DATA_DIR, "inforverse-store.json");
function getFirebaseConfigSummary() {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return {
        configured: Boolean(cfg.projectId && !cfg.projectId.includes("remixed")),
        storageConfigured: Boolean(cfg.storageBucket),
        appCheckConfigured: Boolean(cfg.recaptchaSiteKey || process.env.VITE_FIREBASE_APPCHECK_SITE_KEY)
      };
    }
  } catch {
  }
  return { configured: false, storageConfigured: false, appCheckConfigured: false };
}
function getInitialState() {
  return {
    categories: structuredClone(SEED_CATEGORIES),
    countries: structuredClone(SEED_COUNTRIES),
    regions: structuredClone(SEED_REGIONS),
    sources: structuredClone(SEED_SOURCES),
    articles: structuredClone(SEED_ARTICLES),
    automationSettings: structuredClone(DEFAULT_AUTOMATION_SETTINGS),
    websiteSettings: structuredClone(DEFAULT_WEBSITE_SETTINGS),
    logs: structuredClone(INITIAL_LOGS),
    visitorsCount: 1420,
    newsletterSubscribers: [],
    contactMessages: [],
    adminCredential: null
  };
}
var InforverseStore = class {
  constructor() {
    this.state = this.loadLocal();
  }
  loadLocal() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw);
        const defaults = getInitialState();
        return {
          ...defaults,
          ...parsed,
          automationSettings: { ...defaults.automationSettings, ...parsed.automationSettings },
          websiteSettings: {
            ...defaults.websiteSettings,
            ...parsed.websiteSettings,
            logo_url: parsed.websiteSettings?.logo_url?.trim() || defaults.websiteSettings.logo_url,
            homepage_sections: {
              ...defaults.websiteSettings.homepage_sections,
              ...parsed.websiteSettings?.homepage_sections || {}
            }
          }
        };
      }
    } catch {
    }
    const fresh = getInitialState();
    this.saveLocal(fresh);
    return fresh;
  }
  saveLocal(nextState) {
    const target = nextState || this.state;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tempFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(target, null, 2), "utf8");
      fs.renameSync(tempFile, DATA_FILE);
    } catch {
    }
  }
  getCategories() {
    return [...this.state.categories].sort((a, b) => a.sort_order - b.sort_order);
  }
  upsertCategory(category) {
    const idx = this.state.categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      this.state.categories[idx] = category;
    } else {
      this.state.categories.push(category);
    }
    this.saveLocal();
    return category;
  }
  deleteCategory(id) {
    const before = this.state.categories.length;
    this.state.categories = this.state.categories.filter((c) => c.id !== id);
    if (this.state.categories.length !== before) {
      this.saveLocal();
      return true;
    }
    return false;
  }
  getCountries() {
    return [...this.state.countries].sort((a, b) => a.name_en.localeCompare(b.name_en));
  }
  upsertCountry(country) {
    const idx = this.state.countries.findIndex((c) => c.id === country.id);
    if (idx >= 0) {
      this.state.countries[idx] = country;
    } else {
      this.state.countries.push(country);
    }
    this.saveLocal();
    return country;
  }
  getRegions() {
    return [...this.state.regions];
  }
  getSources() {
    return [...this.state.sources];
  }
  getSourceById(id) {
    return this.state.sources.find((s) => s.id === id);
  }
  upsertSource(source) {
    const idx = this.state.sources.findIndex((s) => s.id === source.id);
    if (idx >= 0) {
      this.state.sources[idx] = source;
    } else {
      this.state.sources.push(source);
    }
    this.saveLocal();
    return source;
  }
  deleteSource(id) {
    const before = this.state.sources.length;
    this.state.sources = this.state.sources.filter((s) => s.id !== id);
    if (this.state.sources.length !== before) {
      this.saveLocal();
      return true;
    }
    return false;
  }
  getArticles(includeAllStatuses = false) {
    const now = Date.now();
    let changed = false;
    for (const art of this.state.articles) {
      if (art.status === "scheduled" && new Date(art.published_at).getTime() <= now) {
        art.status = "published";
        changed = true;
      }
    }
    if (changed) this.saveLocal();
    const list = includeAllStatuses ? this.state.articles : this.state.articles.filter((a) => a.status === "published");
    return [...list].sort(
      (a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
    );
  }
  getArticleBySlug(slug, includeAllStatuses = false) {
    return this.getArticles(includeAllStatuses).find((a) => a.slug === slug);
  }
  getArticleById(id) {
    return this.state.articles.find((a) => a.id === id);
  }
  upsertArticle(article) {
    const idx = this.state.articles.findIndex((a) => a.id === article.id);
    if (idx >= 0) {
      this.state.articles[idx] = article;
    } else {
      this.state.articles.unshift(article);
    }
    this.saveLocal();
    return article;
  }
  deleteArticle(id) {
    const before = this.state.articles.length;
    this.state.articles = this.state.articles.filter((a) => a.id !== id);
    if (this.state.articles.length !== before) {
      this.saveLocal();
      return true;
    }
    return false;
  }
  incrementArticleViews(slug) {
    const article = this.state.articles.find((a) => a.slug === slug);
    if (article) {
      article.views_count += 1;
      this.saveLocal();
    }
  }
  recordVisitor() {
    this.state.visitorsCount += 1;
    this.saveLocal();
  }
  getAutomationSettings() {
    return { ...this.state.automationSettings };
  }
  updateAutomationSettings(patch) {
    this.state.automationSettings = {
      ...this.state.automationSettings,
      ...patch,
      id: 1
    };
    this.saveLocal();
    return this.getAutomationSettings();
  }
  addTokenUsage(tokens) {
    if (tokens > 0) {
      this.state.automationSettings.token_usage_total += tokens;
      this.saveLocal();
    }
  }
  getWebsiteSettings() {
    return structuredClone(this.state.websiteSettings);
  }
  updateWebsiteSettings(patch) {
    this.state.websiteSettings = {
      ...this.state.websiteSettings,
      ...patch,
      homepage_sections: {
        ...this.state.websiteSettings.homepage_sections,
        ...patch.homepage_sections || {}
      },
      id: 1
    };
    this.saveLocal();
    return this.getWebsiteSettings();
  }
  getLogs(limit = 80) {
    return [...this.state.logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
  }
  addLog(entry) {
    const fullEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.logs.unshift(fullEntry);
    if (this.state.logs.length > 250) {
      this.state.logs = this.state.logs.slice(0, 250);
    }
    this.saveLocal();
    return fullEntry;
  }
  addNewsletterSubscriber(email, language) {
    const normalized = email.trim().toLowerCase();
    if (this.state.newsletterSubscribers.some((s) => s.email === normalized)) {
      return false;
    }
    this.state.newsletterSubscribers.push({
      id: `sub-${Date.now()}`,
      email: normalized,
      language,
      subscribedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.saveLocal();
    return true;
  }
  addContactMessage(msg) {
    this.state.contactMessages.unshift({
      id: `msg-${Date.now()}`,
      ...msg,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.saveLocal();
  }
  getAdminCredential() {
    return this.state.adminCredential;
  }
  setAdminCredential(cred) {
    this.state.adminCredential = cred;
    this.saveLocal();
  }
  getDashboardStats() {
    const articles = this.state.articles;
    const logs = this.state.logs;
    const fb = getFirebaseConfigSummary();
    return {
      totalArticles: articles.length,
      publishedArticles: articles.filter((a) => a.status === "published").length,
      draftArticles: articles.filter((a) => a.status === "draft").length,
      totalCategories: this.state.categories.length,
      activeSources: this.state.sources.filter((s) => s.is_active).length,
      totalVisitors: this.state.visitorsCount,
      automaticUpdates: logs.filter((l) => l.log_type === "automation" && l.status === "success").length,
      failedUpdates: logs.filter((l) => l.log_type === "fetch_error" || l.status === "error").length,
      newsletterSubscribers: this.state.newsletterSubscribers.length,
      integrations: {
        firebaseConfigured: fb.configured,
        storageConfigured: fb.storageConfigured,
        appCheckConfigured: fb.appCheckConfigured,
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        newsApiConfigured: Boolean(process.env.NEWS_API_KEY),
        newsletterConfigured: process.env.NEWSLETTER_ENABLED === "true"
      }
    };
  }
};
var dbStore = new InforverseStore();

// server/services/security.ts
import crypto from "node:crypto";
import fs2 from "node:fs";
import net from "node:net";
import path2 from "node:path";
import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
var RUNTIME_SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
var BOOTSTRAPPED_ADMIN_EMAIL = "fawazoklama@gmail.com";
function loadFirebaseProjectId() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  try {
    const configPath = path2.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs2.existsSync(configPath)) {
      const parsed = JSON.parse(fs2.readFileSync(configPath, "utf8"));
      if (parsed.projectId && !parsed.projectId.includes("remixed")) {
        return parsed.projectId;
      }
    }
  } catch {
  }
  return null;
}
function getFirebaseAdminAuth() {
  const projectId = loadFirebaseProjectId();
  if (!projectId) return null;
  const adminApp = getApps().length ? getApp() : initializeApp({ projectId });
  return getAuth(adminApp);
}
function hashPassword(password, salt) {
  const actualSalt = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, actualSalt, 64).toString("hex");
  return { hash: derived, salt: actualSalt };
}
function verifyPassword(password, expectedHash, salt) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
function signAdminToken(payload, ttlSeconds = 60 * 60 * 12) {
  const fullPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1e3) + ttlSeconds
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const sig = crypto.createHmac("sha256", RUNTIME_SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}
function verifyAdminToken(token) {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;
    const expectedSig = crypto.createHmac("sha256", RUNTIME_SESSION_SECRET).update(encoded).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch {
    return null;
  }
}
async function verifyFirebaseAdminToken(token) {
  try {
    const adminAuth = getFirebaseAdminAuth();
    if (!adminAuth) return null;
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email || decoded.email_verified !== true) {
      return null;
    }
    const normalizedEmail = decoded.email.toLowerCase();
    const roleClaim = typeof decoded.role === "string" ? decoded.role : void 0;
    const isAdminClaim = decoded.admin === true || roleClaim === "super_admin" || roleClaim === "admin";
    const isBootstrapped = normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL;
    const extraEmails = (process.env.ADMIN_EMAIL || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!isAdminClaim && !isBootstrapped && !extraEmails.includes(normalizedEmail)) {
      return null;
    }
    return {
      uid: decoded.uid,
      email: normalizedEmail,
      role: roleClaim || (isBootstrapped ? "super_admin" : "admin"),
      exp: decoded.exp || Math.floor(Date.now() / 1e3) + 3600
    };
  } catch {
    return null;
  }
}
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = authHeader.slice(7).trim();
  const firebasePayload = await verifyFirebaseAdminToken(token);
  if (firebasePayload) {
    req.admin = firebasePayload;
    next();
    return;
  }
  const localPayload = verifyAdminToken(token);
  if (localPayload) {
    req.admin = localPayload;
    next();
    return;
  }
  res.status(401).json({ error: "Invalid or expired administrator session" });
}
function isPrivateOrLoopbackIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80:")) return true;
    if (lower.startsWith("::ffff:")) {
      return isPrivateOrLoopbackIp(lower.replace("::ffff:", ""));
    }
    return false;
  }
  return false;
}
function assertSafeExternalUrl(rawUrl) {
  const parsed = new URL(rawUrl.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS protocols are permitted.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname === "metadata.google.internal" || isPrivateOrLoopbackIp(hostname)) {
    throw new Error("Access to internal, loopback, or private network hosts is blocked.");
  }
  return parsed;
}
var rateBuckets = /* @__PURE__ */ new Map();
function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests. Please try again shortly." });
      return;
    }
    bucket.count += 1;
    next();
  };
}

// server/services/gemini.ts
import { GoogleGenAI, Type } from "@google/genai";
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in server environment variables.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
async function analyzeAndSummarizeSource(input) {
  const ai = getGeminiClient();
  const settings = dbStore.getAutomationSettings();
  const categories = dbStore.getCategories().map((c) => c.slug).join(", ");
  const countries = dbStore.getCountries().map((c) => `${c.code} (${c.name_en})`).join(", ");
  const lengthHint = (input.targetSummaryLength || settings.summary_length) === "short" ? "2 concise sentences" : (input.targetSummaryLength || settings.summary_length) === "detailed" ? "4 to 5 well-structured sentences" : "3 clear factual sentences";
  const systemInstruction = `${settings.ai_system_prompt}
Rules:
- Never fabricate facts, quotes, statistics, or locations not explicitly present in the provided source text.
- Clearly distinguish claims or allegations from verified facts.
- Produce both the primary summary in the detected language ('en' or 'id') AND an accurate translation into the opposite language ('id' if source is 'en', or 'en' if source is 'id').
- Choose categorySlug strictly from: [${categories}].
- Choose countryCode strictly from: [${countries}] or 'US' / 'ID' / 'GB' if clearly applicable, otherwise 'US'.
- Flag sensitiveTopicFlag=true if topic involves conflict, disaster, health emergency, or national security.`;
  const prompt = `Source Name: ${input.sourceName}
Source URL: ${input.sourceUrl}
Original Title: ${input.rawTitle}
Source Content:
${input.rawText.slice(0, 6e3)}

Summarize in ${lengthHint} and return structured metadata.`;
  const response = await ai.models.generateContent({
    model: settings.ai_model || "gemini-4-hydrogen",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aiTitle: { type: Type.STRING, description: "Clear, factual, non-sensational headline." },
          summary: { type: Type.STRING, description: "Factual summary in detected source language." },
          detectedLanguage: { type: Type.STRING, description: "Either 'en' or 'id'." },
          categorySlug: { type: Type.STRING, description: "Best matching category slug." },
          countryCode: { type: Type.STRING, description: "Two-letter ISO country code." },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 6 SEO keywords." },
          containsUnverifiedClaims: { type: Type.BOOLEAN },
          sensitiveTopicFlag: { type: Type.BOOLEAN },
          translatedTitle: { type: Type.STRING, description: "Accurate translation of aiTitle into the paired language." },
          translatedSummary: { type: Type.STRING, description: "Accurate translation of summary into the paired language." },
          translatedContent: { type: Type.STRING, description: "Accurate multi-paragraph summary expansion in the paired language based strictly on source text." }
        },
        required: [
          "aiTitle",
          "summary",
          "detectedLanguage",
          "categorySlug",
          "countryCode",
          "keywords",
          "containsUnverifiedClaims",
          "sensitiveTopicFlag",
          "translatedTitle",
          "translatedSummary",
          "translatedContent"
        ]
      }
    }
  });
  const parsed = JSON.parse((response.text || "{}").trim());
  const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
  dbStore.addTokenUsage(tokensUsed);
  return {
    ...parsed,
    detectedLanguage: parsed.detectedLanguage === "id" ? "id" : "en",
    tokensUsed
  };
}
async function translateTextWithGemini(input) {
  const ai = getGeminiClient();
  const settings = dbStore.getAutomationSettings();
  const targetLangName = input.targetLanguage === "id" ? "Indonesian (Bahasa Indonesia)" : "English";
  const response = await ai.models.generateContent({
    model: settings.ai_model || "gemini-4-hydrogen",
    contents: `Translate the following editorial article accurately into ${targetLangName}. Preserve all facts, names, dates, and cautious qualifiers without adding or removing information.

Title: ${input.title}
Subtitle: ${input.subtitle}
Summary: ${input.summary}
Content:
${input.content}`,
    config: {
      systemInstruction: "You are a professional newsroom translator. Preserve factual accuracy, dates, numbers, and source attributions exactly.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["title", "subtitle", "summary", "content"]
      }
    }
  });
  const parsed = JSON.parse((response.text || "{}").trim());
  const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
  dbStore.addTokenUsage(tokensUsed);
  return { ...parsed, tokensUsed };
}

// server/services/collector.ts
import { XMLParser } from "fast-xml-parser";

// src/utils/editorial.ts
var SENSITIVE_CATEGORIES = /* @__PURE__ */ new Set(["politics", "security", "disaster", "health"]);
function slugify(input) {
  return input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 96);
}
function sanitizeExternalUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return "";
  } catch {
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }
    return "";
  }
}
function normalizeTextTokens(text) {
  const stopWords = /* @__PURE__ */ new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "in",
    "on",
    "to",
    "for",
    "with",
    "at",
    "by",
    "from",
    "dan",
    "yang",
    "di",
    "ke",
    "dari",
    "untuk",
    "pada",
    "dengan",
    "ini",
    "itu"
  ]);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  return new Set(tokens);
}
function jaccardSimilarity(a, b) {
  const setA = normalizeTextTokens(a);
  const setB = normalizeTextTokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
function isDuplicateHeadline(candidateTitle, existingTitles, threshold = 0.6) {
  const normalizedCandidate = candidateTitle.trim().toLowerCase();
  for (const existing of existingTitles) {
    if (existing.trim().toLowerCase() === normalizedCandidate) return true;
    if (jaccardSimilarity(candidateTitle, existing) >= threshold) return true;
  }
  return false;
}
function requiresSensitiveVerification(categorySlug) {
  return SENSITIVE_CATEGORIES.has(categorySlug.toLowerCase());
}
function matchProvinceInText(text, regions) {
  const lower = text.toLowerCase();
  for (const region of regions) {
    for (const province of region.provinces) {
      const pattern = new RegExp(`\\b${province.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (pattern.test(lower)) {
        return { regionId: region.id, province };
      }
    }
  }
  return { regionId: null, province: null };
}

// server/services/collector.ts
function stripHtmlTags(raw) {
  return String(raw || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
async function fetchRssOrAtomFeed(rawUrl) {
  const safeUrl = assertSafeExternalUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12e3);
  try {
    const response = await fetch(safeUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "INFORVERSE-Aggregator/1.0 (+https://inforverse.org)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xmlText);
    const rssItems = parsed?.rss?.channel?.item;
    if (rssItems) {
      const arr = Array.isArray(rssItems) ? rssItems : [rssItems];
      return arr.slice(0, 10).map((item) => ({
        title: stripHtmlTags(item.title),
        link: sanitizeExternalUrl(String(item.link || item.guid?.["#text"] || item.guid || "")),
        description: stripHtmlTags(item.description || item["content:encoded"] || ""),
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
      })).filter((i) => i.title && i.link);
    }
    const atomEntries = parsed?.feed?.entry;
    if (atomEntries) {
      const arr = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
      return arr.slice(0, 10).map((entry) => {
        const linkHref = Array.isArray(entry.link) ? entry.link[0]?.["@_href"] : entry.link?.["@_href"] || entry.link;
        return {
          title: stripHtmlTags(entry.title?.["#text"] || entry.title || ""),
          link: sanitizeExternalUrl(String(linkHref || "")),
          description: stripHtmlTags(entry.summary?.["#text"] || entry.summary || entry.content || ""),
          pubDate: entry.updated || entry.published || (/* @__PURE__ */ new Date()).toISOString()
        };
      }).filter((i) => i.title && i.link);
    }
    throw new Error("Unrecognized RSS or Atom XML structure.");
  } finally {
    clearTimeout(timer);
  }
}
async function fetchNewsApiSource(source) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error("NEWS_API_KEY is not configured on the server.");
  }
  const safeUrl = assertSafeExternalUrl(source.url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12e3);
  try {
    const response = await fetch(safeUrl.toString(), {
      signal: controller.signal,
      headers: {
        "X-Api-Key": apiKey,
        "User-Agent": "INFORVERSE-Aggregator/1.0"
      }
    });
    if (!response.ok) {
      throw new Error(`NewsAPI returned HTTP ${response.status}`);
    }
    const json = await response.json();
    return (json.articles || []).slice(0, 10).map((a) => ({
      title: stripHtmlTags(a.title || ""),
      link: sanitizeExternalUrl(a.url || ""),
      description: stripHtmlTags(a.description || a.content || ""),
      pubDate: a.publishedAt || (/* @__PURE__ */ new Date()).toISOString()
    })).filter((i) => i.title && i.link);
  } finally {
    clearTimeout(timer);
  }
}
async function testSourceConnection(source) {
  try {
    const items = source.type === "news_api" ? await fetchNewsApiSource(source) : await fetchRssOrAtomFeed(source.url);
    return {
      ok: true,
      itemCount: items.length,
      sampleTitle: items[0]?.title
    };
  } catch (err) {
    return {
      ok: false,
      itemCount: 0,
      error: err instanceof Error ? err.message : "Unknown connection error"
    };
  }
}
async function runAutomatedCollection() {
  const settings = dbStore.getAutomationSettings();
  const activeSources = dbStore.getSources().filter((s) => s.is_active);
  const categories = dbStore.getCategories();
  const countries = dbStore.getCountries();
  const regions = dbStore.getRegions();
  const existingArticles = dbStore.getArticles(true);
  const existingTitles = existingArticles.map((a) => a.title);
  const existingUrls = new Set(existingArticles.map((a) => a.source_url).filter(Boolean));
  let importedCount = 0;
  let skippedDuplicates = 0;
  const errors = [];
  for (const source of activeSources) {
    let items = [];
    let fetchError = null;
    const maxRetries = Math.max(1, settings.max_retries || 1);
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        items = source.type === "news_api" ? await fetchNewsApiSource(source) : await fetchRssOrAtomFeed(source.url);
        fetchError = null;
        break;
      } catch (err) {
        fetchError = err instanceof Error ? err.message : "Fetch failed";
      }
    }
    if (fetchError) {
      dbStore.upsertSource({
        ...source,
        last_fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
        last_status: "error",
        last_error: fetchError,
        retry_count: source.retry_count + 1
      });
      dbStore.addLog({
        log_type: "fetch_error",
        status: "error",
        source_id: source.id,
        message: `Failed to fetch ${source.name}: ${fetchError}`,
        details: { url: source.url }
      });
      errors.push(`${source.name}: ${fetchError}`);
      continue;
    }
    dbStore.upsertSource({
      ...source,
      last_fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
      last_status: "ok",
      last_error: null,
      retry_count: 0
    });
    for (const item of items.slice(0, 2)) {
      if (existingUrls.has(item.link)) {
        skippedDuplicates += 1;
        continue;
      }
      if (settings.duplicate_detection_enabled && isDuplicateHeadline(item.title, existingTitles)) {
        skippedDuplicates += 1;
        continue;
      }
      const baseSlug = slugify(item.title) || `update-${Date.now()}`;
      const uniqueSlug = existingArticles.some((a) => a.slug === baseSlug) ? `${baseSlug}-${Date.now().toString().slice(-5)}` : baseSlug;
      let title = item.title;
      let summary = item.description || item.title;
      let content = `${summary}

Source reference: ${source.name} (${item.link}).`;
      let categorySlug = source.default_category_slug || "world";
      let countryCode = source.country_code || "US";
      let language = source.language;
      let keywords = [];
      let isSensitive = requiresSensitiveVerification(categorySlug);
      let isVerified = !isSensitive;
      let translations = void 0;
      let articleType = "original";
      if (settings.ai_summary_enabled && process.env.GEMINI_API_KEY) {
        try {
          const ai = await analyzeAndSummarizeSource({
            rawTitle: item.title,
            rawText: item.description || item.title,
            sourceName: source.name,
            sourceUrl: item.link
          });
          title = ai.aiTitle || item.title;
          summary = ai.summary || summary;
          content = `${ai.summary}

Original report available from ${source.name}.`;
          categorySlug = ai.categorySlug || categorySlug;
          countryCode = ai.countryCode || countryCode;
          language = ai.detectedLanguage || language;
          keywords = ai.keywords || [];
          isSensitive = ai.sensitiveTopicFlag || requiresSensitiveVerification(categorySlug);
          isVerified = !ai.containsUnverifiedClaims && !isSensitive;
          articleType = "ai_summary";
          if (settings.ai_translation_enabled && ai.translatedTitle && ai.translatedSummary) {
            const targetLang = language === "en" ? "id" : "en";
            translations = {
              [targetLang]: {
                id: `tr-${Date.now()}-${targetLang}`,
                article_id: "",
                language: targetLang,
                title: ai.translatedTitle,
                subtitle: `Source summary from ${source.name}`,
                summary: ai.translatedSummary,
                content: ai.translatedContent || ai.translatedSummary,
                is_ai_translated: true
              }
            };
          }
        } catch (aiErr) {
          dbStore.addLog({
            log_type: "ai",
            status: "warning",
            source_id: source.id,
            message: `AI enrichment skipped for "${item.title}": ${aiErr instanceof Error ? aiErr.message : "Error"}`,
            details: {}
          });
        }
      }
      const matchedCat = categories.find((c) => c.slug === categorySlug) || categories[0];
      const matchedCountry = countries.find((c) => c.code === countryCode) || countries[0];
      const { regionId, province } = matchedCountry.code === "ID" ? matchProvinceInText(`${title} ${summary}`, regions) : { regionId: null, province: null };
      const id = `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (translations) {
        for (const t of Object.values(translations)) {
          if (t) t.article_id = id;
        }
      }
      const shouldPublish = settings.auto_publish && !isSensitive;
      const newArticle = {
        id,
        title,
        slug: uniqueSlug,
        subtitle: `Reported via ${source.name}`,
        summary,
        content,
        image_url: matchedCountry.code === "ID" ? "/src/assets/images/indo_jakarta_skyline_1795250511476.jpg" : matchedCat.slug === "space" ? "/src/assets/images/space_orbital_observatory_1795250511424.jpg" : matchedCat.slug === "technology" || matchedCat.slug === "science" ? "/src/assets/images/tech_quantum_lab_1795250512205.jpg" : "/src/assets/images/hero_global_summit_1795250512890.jpg",
        image_caption: `Source attribution: ${source.name}`,
        category_id: matchedCat.id,
        country_id: matchedCountry.id,
        region_id: regionId,
        province,
        source_id: source.id,
        source_name: source.name,
        source_url: item.link,
        author: source.name,
        article_type: articleType,
        requires_verification: isSensitive,
        is_verified: isVerified,
        language,
        status: shouldPublish ? "published" : "draft",
        is_automatic: true,
        is_featured: false,
        views_count: 1,
        tags: keywords,
        seo_title: `${title} | INFORVERSE`,
        seo_description: summary.slice(0, 155),
        published_at: item.pubDate || (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        translations
      };
      dbStore.upsertArticle(newArticle);
      existingTitles.push(title);
      existingUrls.add(item.link);
      importedCount += 1;
    }
  }
  const now = /* @__PURE__ */ new Date();
  const nextRun = new Date(now.getTime() + Math.max(5, settings.update_interval_minutes) * 60 * 1e3);
  dbStore.updateAutomationSettings({
    last_run_at: now.toISOString(),
    next_run_at: nextRun.toISOString()
  });
  dbStore.addLog({
    log_type: "automation",
    status: errors.length > 0 && importedCount === 0 ? "warning" : "success",
    source_id: null,
    message: `Automated collection finished: ${importedCount} imported, ${skippedDuplicates} duplicates skipped, ${errors.length} source errors.`,
    details: { processedSources: activeSources.length, importedCount, skippedDuplicates, errors }
  });
  return {
    processedSources: activeSources.length,
    importedCount,
    skippedDuplicates,
    errors
  };
}
var schedulerTimer = null;
function startAutomationScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = setInterval(async () => {
    const settings = dbStore.getAutomationSettings();
    if (!settings.scheduler_enabled) return;
    const lastRun = settings.last_run_at ? new Date(settings.last_run_at).getTime() : 0;
    const intervalMs = Math.max(5, settings.update_interval_minutes) * 60 * 1e3;
    if (Date.now() - lastRun >= intervalMs) {
      try {
        await runAutomatedCollection();
      } catch (err) {
        dbStore.addLog({
          log_type: "automation",
          status: "error",
          source_id: null,
          message: `Scheduler cycle failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          details: {}
        });
      }
    }
  }, 6e4);
}

// server.ts
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/bootstrap", (_req, res) => {
  res.json({
    categories: dbStore.getCategories(),
    countries: dbStore.getCountries(),
    regions: dbStore.getRegions(),
    websiteSettings: dbStore.getWebsiteSettings(),
    newsletterEnabled: process.env.NEWSLETTER_ENABLED === "true"
  });
});
app.get("/api/articles", (req, res) => {
  const {
    category,
    country,
    continent,
    region,
    province,
    q,
    sort = "newest",
    dateFrom,
    limit = "50",
    offset = "0"
  } = req.query;
  let articles = dbStore.getArticles(false);
  const categories = dbStore.getCategories();
  const countries = dbStore.getCountries();
  if (category && category !== "all") {
    const cat = categories.find((c) => c.slug === category || c.id === category);
    if (cat) {
      articles = articles.filter((a) => a.category_id === cat.id);
    } else {
      articles = [];
    }
  }
  if (country && country !== "all") {
    const co = countries.find(
      (c) => c.code.toLowerCase() === country.toLowerCase() || c.id === country
    );
    if (co) {
      articles = articles.filter((a) => a.country_id === co.id);
    } else {
      articles = [];
    }
  }
  if (continent && continent !== "all") {
    const matchingCountryIds = new Set(
      countries.filter((c) => c.continent.toLowerCase() === continent.toLowerCase()).map((c) => c.id)
    );
    articles = articles.filter((a) => matchingCountryIds.has(a.country_id));
  }
  if (region && region !== "all") {
    const regions = dbStore.getRegions();
    const reg = regions.find((r) => r.slug === region || r.id === region);
    if (reg) {
      articles = articles.filter((a) => a.region_id === reg.id);
    } else {
      articles = [];
    }
  }
  if (province && province !== "all") {
    articles = articles.filter(
      (a) => a.province && a.province.toLowerCase() === province.toLowerCase()
    );
  }
  if (dateFrom) {
    const minTs = new Date(dateFrom).getTime();
    if (!Number.isNaN(minTs)) {
      articles = articles.filter((a) => new Date(a.published_at).getTime() >= minTs);
    }
  }
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    articles = articles.filter((a) => {
      const catObj = categories.find((c) => c.id === a.category_id);
      const coObj = countries.find((c) => c.id === a.country_id);
      const idTrans = a.translations?.id;
      const haystack = [
        a.title,
        a.subtitle,
        a.summary,
        a.content,
        a.author,
        a.source_name,
        a.province || "",
        ...a.tags || [],
        catObj?.name_en || "",
        catObj?.name_id || "",
        coObj?.name_en || "",
        coObj?.name_id || "",
        idTrans?.title || "",
        idTrans?.summary || ""
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }
  if (sort === "popular") {
    articles = [...articles].sort((a, b) => b.views_count - a.views_count);
  }
  const total = articles.length;
  const start = Math.max(0, Number(offset) || 0);
  const count = Math.min(100, Math.max(1, Number(limit) || 50));
  const paged = articles.slice(start, start + count);
  res.json({ articles: paged, total });
});
app.get("/api/articles/:slug", (req, res) => {
  const article = dbStore.getArticleBySlug(req.params.slug, false);
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  dbStore.incrementArticleViews(article.slug);
  const related = dbStore.getArticles(false).filter((a) => a.id !== article.id && (a.category_id === article.category_id || a.country_id === article.country_id)).slice(0, 4);
  res.json({ article, related });
});
app.post("/api/analytics/visit", rateLimit(60, 6e4), (_req, res) => {
  dbStore.recordVisitor();
  res.json({ ok: true });
});
app.post("/api/newsletter/subscribe", rateLimit(10, 6e4), (req, res) => {
  if (process.env.NEWSLETTER_ENABLED !== "true") {
    res.status(503).json({
      error: "Email newsletter delivery service is not configured yet (set NEWSLETTER_ENABLED=true and SMTP provider)."
    });
    return;
  }
  const { email, language = "en" } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  const added = dbStore.addNewsletterSubscriber(email, language);
  res.json({ ok: true, alreadySubscribed: !added });
});
app.post("/api/contact", rateLimit(10, 6e4), (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400).json({ error: "Name, email, and message are required." });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Please provide a valid email address." });
    return;
  }
  dbStore.addContactMessage({
    name: name.trim().slice(0, 120),
    email: email.trim().slice(0, 160),
    subject: (subject || "General Inquiry").trim().slice(0, 200),
    message: message.trim().slice(0, 4e3)
  });
  dbStore.addLog({
    log_type: "admin",
    status: "info",
    source_id: null,
    message: `New editorial contact inquiry from ${name.trim()}`,
    details: { subject: subject || "General Inquiry" }
  });
  res.json({ ok: true });
});
app.get("/robots.txt", (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
  res.type("text/plain").send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admim

Sitemap: ${baseUrl}/sitemap.xml
`);
});
app.get("/sitemap.xml", (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const categories = dbStore.getCategories();
  const articles = dbStore.getArticles(false);
  const staticPaths = ["", "/world", "/indonesia", "/search", "/about", "/contact", "/privacy", "/terms", "/disclaimer"];
  const urls = [
    ...staticPaths.map((p) => `<url><loc>${baseUrl}${p}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`),
    ...categories.map((c) => `<url><loc>${baseUrl}/category/${c.slug}</loc><changefreq>hourly</changefreq><priority>0.7</priority></url>`),
    ...articles.map(
      (a) => `<url><loc>${baseUrl}/article/${a.slug}</loc><lastmod>${new Date(a.updated_at).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`
    )
  ];
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`
  );
});
app.get("/rss.xml", (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const settings = dbStore.getWebsiteSettings();
  const articles = dbStore.getArticles(false).slice(0, 30);
  const escapeXml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const itemsXml = articles.map(
    (a) => `  <item>
    <title>${escapeXml(a.title)}</title>
    <link>${baseUrl}/article/${a.slug}</link>
    <guid isPermaLink="true">${baseUrl}/article/${a.slug}</guid>
    <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
    <description>${escapeXml(a.summary)}</description>
  </item>`
  ).join("\n");
  res.type("application/rss+xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(settings.site_name)}</title>
  <link>${baseUrl}</link>
  <description>${escapeXml(settings.tagline)}</description>
${itemsXml}
</channel>
</rss>`
  );
});
app.get("/api/admin/auth/status", (_req, res) => {
  res.json({
    firebaseConfigured: true,
    envConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
  });
});
app.post("/api/admin/auth/bootstrap", rateLimit(10, 6e4), (req, res) => {
  const envConfigured = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  if (envConfigured || dbStore.getAdminCredential()) {
    res.status(403).json({ error: "Administrator account has already been configured." });
    return;
  }
  const { email, password } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Please provide a valid administrator email." });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters long." });
    return;
  }
  const { hash, salt } = hashPassword(password);
  dbStore.setAdminCredential({
    email: email.trim().toLowerCase(),
    passwordHash: hash,
    salt,
    role: "super_admin",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  dbStore.addLog({
    log_type: "admin",
    status: "info",
    source_id: null,
    message: `Initial administrator account claimed for ${email.trim().toLowerCase()}`,
    details: {}
  });
  const token = signAdminToken({ email: email.trim().toLowerCase(), role: "super_admin" });
  res.json({ token, admin: { email: email.trim().toLowerCase(), role: "super_admin" } });
});
app.post("/api/admin/auth/login", rateLimit(15, 6e4), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envEmail && envPassword) {
    if (normalizedEmail === envEmail && password === envPassword) {
      const token2 = signAdminToken({ email: envEmail, role: "super_admin" });
      dbStore.addLog({
        log_type: "admin",
        status: "info",
        source_id: null,
        message: `Administrator signed in (${envEmail})`,
        details: {}
      });
      res.json({ token: token2, admin: { email: envEmail, role: "super_admin" } });
      return;
    }
    res.status(401).json({ error: "Invalid administrator email or password." });
    return;
  }
  const stored = dbStore.getAdminCredential();
  if (!stored) {
    res.status(403).json({ error: "No administrator account claimed yet. Complete initial setup first." });
    return;
  }
  if (normalizedEmail !== stored.email || !verifyPassword(password, stored.passwordHash, stored.salt)) {
    res.status(401).json({ error: "Invalid administrator email or password." });
    return;
  }
  const token = signAdminToken({ email: stored.email, role: stored.role });
  dbStore.addLog({
    log_type: "admin",
    status: "info",
    source_id: null,
    message: `Administrator signed in (${stored.email})`,
    details: {}
  });
  res.json({ token, admin: { email: stored.email, role: stored.role } });
});
app.post("/api/admin/auth/forgot-password", rateLimit(5, 6e4), (_req, res) => {
  res.json({
    message: "Password reset emails are dispatched directly by Firebase Authentication."
  });
});
app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});
app.get("/api/admin/integrations-status", requireAdmin, (_req, res) => {
  const stats = dbStore.getDashboardStats();
  res.json({
    integrations: stats.integrations,
    totalVisitors: stats.totalVisitors,
    newsletterSubscribers: stats.newsletterSubscribers
  });
});
app.get("/api/admin/overview", requireAdmin, (_req, res) => {
  res.json({
    stats: dbStore.getDashboardStats(),
    articles: dbStore.getArticles(true),
    categories: dbStore.getCategories(),
    countries: dbStore.getCountries(),
    regions: dbStore.getRegions(),
    sources: dbStore.getSources(),
    automationSettings: dbStore.getAutomationSettings(),
    websiteSettings: dbStore.getWebsiteSettings(),
    logs: dbStore.getLogs(80)
  });
});
app.post("/api/admin/articles", requireAdmin, (req, res) => {
  const body = req.body;
  if (!body.title?.trim() || !body.summary?.trim() || !body.content?.trim()) {
    res.status(400).json({ error: "Title, summary, and content are required." });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const baseSlug = slugify(body.slug || body.title);
  const existing = dbStore.getArticles(true);
  const isEditing = Boolean(body.id && dbStore.getArticleById(body.id));
  const previous = isEditing && body.id ? dbStore.getArticleById(body.id) : void 0;
  let finalSlug = baseSlug || `article-${Date.now()}`;
  if (existing.some((a) => a.slug === finalSlug && a.id !== body.id)) {
    finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
  }
  const category = dbStore.getCategories().find((c) => c.id === body.category_id) || dbStore.getCategories()[0];
  const isSensitive = requiresSensitiveVerification(category?.slug || "");
  const article = {
    id: previous?.id || `art-${Date.now()}`,
    title: body.title.trim(),
    slug: finalSlug,
    subtitle: (body.subtitle || "").trim(),
    summary: body.summary.trim(),
    content: body.content.trim(),
    image_url: sanitizeExternalUrl(body.image_url || "") || "/src/assets/images/hero_global_summit_1795250512890.jpg",
    image_caption: (body.image_caption || "").trim(),
    category_id: category.id,
    country_id: body.country_id || dbStore.getCountries()[0].id,
    region_id: body.region_id || null,
    province: body.province || null,
    source_id: previous?.source_id || null,
    source_name: (body.source_name || "INFORVERSE Editorial").trim(),
    source_url: sanitizeExternalUrl(body.source_url || ""),
    author: (body.author || req.admin?.email || "INFORVERSE Desk").trim(),
    article_type: body.article_type || "editorial",
    requires_verification: body.requires_verification ?? isSensitive,
    is_verified: body.is_verified ?? true,
    language: body.language || "en",
    status: body.status || "draft",
    is_automatic: previous?.is_automatic || false,
    is_featured: Boolean(body.is_featured),
    views_count: previous?.views_count || 0,
    tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    seo_title: (body.seo_title || `${body.title.trim()} | INFORVERSE`).trim(),
    seo_description: (body.seo_description || body.summary.trim().slice(0, 155)).trim(),
    published_at: body.published_at || previous?.published_at || now,
    updated_at: now,
    created_at: previous?.created_at || now,
    translations: body.translations || previous?.translations
  };
  const saved = dbStore.upsertArticle(article);
  dbStore.addLog({
    log_type: "admin",
    status: "success",
    source_id: null,
    message: `${isEditing ? "Updated" : "Created"} article "${saved.title}" (${saved.status})`,
    details: { articleId: saved.id, by: req.admin?.email }
  });
  res.json({ article: saved });
});
app.delete("/api/admin/articles/:id", requireAdmin, (req, res) => {
  const existing = dbStore.getArticleById(req.params.id);
  const deleted = dbStore.deleteArticle(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  dbStore.addLog({
    log_type: "admin",
    status: "info",
    source_id: null,
    message: `Deleted article "${existing?.title || req.params.id}"`,
    details: { by: req.admin?.email }
  });
  res.json({ ok: true });
});
app.post("/api/admin/categories", requireAdmin, (req, res) => {
  const body = req.body;
  if (!body.name_en?.trim() || !body.name_id?.trim()) {
    res.status(400).json({ error: "English and Indonesian category names are required." });
    return;
  }
  const cat = {
    id: body.id || `cat-${slugify(body.name_en)}-${Date.now().toString().slice(-3)}`,
    slug: slugify(body.slug || body.name_en),
    name_en: body.name_en.trim(),
    name_id: body.name_id.trim(),
    description_en: (body.description_en || "").trim(),
    description_id: (body.description_id || "").trim(),
    sort_order: Number(body.sort_order) || dbStore.getCategories().length + 1
  };
  res.json({ category: dbStore.upsertCategory(cat) });
});
app.delete("/api/admin/categories/:id", requireAdmin, (req, res) => {
  const deleted = dbStore.deleteCategory(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});
app.post("/api/admin/countries", requireAdmin, (req, res) => {
  const body = req.body;
  if (!body.code?.trim() || !body.name_en?.trim() || !body.continent) {
    res.status(400).json({ error: "Code, English name, and continent are required." });
    return;
  }
  const country = {
    id: body.id || `co-${body.code.toLowerCase().trim()}`,
    code: body.code.toUpperCase().trim().slice(0, 2),
    iso_numeric: (body.iso_numeric || "").trim(),
    name_en: body.name_en.trim(),
    name_id: (body.name_id || body.name_en).trim(),
    continent: body.continent
  };
  res.json({ country: dbStore.upsertCountry(country) });
});
app.post("/api/admin/sources", requireAdmin, (req, res) => {
  const body = req.body;
  if (!body.name?.trim() || !body.url?.trim()) {
    res.status(400).json({ error: "Source name and valid URL are required." });
    return;
  }
  try {
    assertSafeExternalUrl(body.url);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid source URL" });
    return;
  }
  const existing = body.id ? dbStore.getSourceById(body.id) : void 0;
  const source = {
    id: existing?.id || `src-${Date.now()}`,
    name: body.name.trim(),
    type: body.type || "rss",
    url: body.url.trim(),
    country_code: (body.country_code || "US").toUpperCase(),
    default_category_slug: body.default_category_slug || "world",
    language: body.language || "en",
    is_active: body.is_active ?? true,
    last_fetched_at: existing?.last_fetched_at || null,
    last_status: existing?.last_status || "idle",
    last_error: existing?.last_error || null,
    retry_count: existing?.retry_count || 0,
    created_at: existing?.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
  res.json({ source: dbStore.upsertSource(source) });
});
app.delete("/api/admin/sources/:id", requireAdmin, (req, res) => {
  const deleted = dbStore.deleteSource(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});
app.post("/api/admin/sources/:id/test", requireAdmin, async (req, res) => {
  const source = dbStore.getSourceById(req.params.id);
  if (!source) {
    res.status(404).json({ error: "Source not found" });
    return;
  }
  const result = await testSourceConnection(source);
  dbStore.upsertSource({
    ...source,
    last_fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
    last_status: result.ok ? "ok" : "error",
    last_error: result.error || null
  });
  res.json(result);
});
app.post("/api/admin/automation/settings", requireAdmin, (req, res) => {
  const updated = dbStore.updateAutomationSettings(req.body);
  dbStore.addLog({
    log_type: "admin",
    status: "info",
    source_id: null,
    message: `Updated automation settings (interval: ${updated.update_interval_minutes}m, scheduler: ${updated.scheduler_enabled ? "ON" : "OFF"})`,
    details: {}
  });
  res.json({ automationSettings: updated });
});
app.post("/api/admin/automation/run", requireAdmin, async (req, res) => {
  const payload = req.body;
  if (Array.isArray(payload?.sources)) {
    for (const s of payload.sources) {
      dbStore.upsertSource(s);
    }
  }
  const beforeIds = new Set(dbStore.getArticles(true).map((a) => a.id));
  const summary = await runAutomatedCollection();
  const importedArticles = dbStore.getArticles(true).filter((a) => !beforeIds.has(a.id));
  const updatedSources = dbStore.getSources();
  res.json({
    ...summary,
    importedArticles,
    updatedSources
  });
});
app.post("/api/admin/website/settings", requireAdmin, (req, res) => {
  const updated = dbStore.updateWebsiteSettings(req.body);
  dbStore.addLog({
    log_type: "admin",
    status: "info",
    source_id: null,
    message: "Updated website settings and homepage section visibility.",
    details: {}
  });
  res.json({ websiteSettings: updated });
});
app.post("/api/admin/ai/analyze", requireAdmin, async (req, res) => {
  const { title, text, sourceName = "Manual Editorial Input", sourceUrl = "" } = req.body;
  if (!text?.trim()) {
    res.status(400).json({ error: "Source text is required for AI analysis." });
    return;
  }
  try {
    const result = await analyzeAndSummarizeSource({
      rawTitle: title || "Editorial Source Text",
      rawText: text,
      sourceName,
      sourceUrl
    });
    res.json({ result });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Gemini AI service error"
    });
  }
});
app.post("/api/admin/ai/translate", requireAdmin, async (req, res) => {
  const { title, subtitle, summary, content, targetLanguage } = req.body;
  if (!title || !summary || !targetLanguage) {
    res.status(400).json({ error: "Title, summary, and targetLanguage are required." });
    return;
  }
  try {
    const translation = await translateTextWithGemini({
      title,
      subtitle: subtitle || "",
      summary,
      content: content || summary,
      targetLanguage
    });
    res.json({ translation });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Gemini translation service error"
    });
  }
});
app.all("/api/cron/collect", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const headerSecret = req.headers["x-cron-secret"];
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : String(headerSecret || "");
  if (!cronSecret || provided !== cronSecret) {
    res.status(401).json({ error: "Unauthorized cron execution. Valid CRON_SECRET required." });
    return;
  }
  const result = await runAutomatedCollection();
  res.json({ ok: true, ...result });
});
async function bootstrapServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path3.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path3.join(distDir, "index.html"));
    });
  }
  startAutomationScheduler();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`INFORVERSE server listening on http://localhost:${PORT}`);
  });
}
if (process.env.VERCEL !== "1") {
  bootstrapServer().catch((err) => {
    console.error("Failed to start INFORVERSE server:", err);
    process.exit(1);
  });
}
export {
  app
};
