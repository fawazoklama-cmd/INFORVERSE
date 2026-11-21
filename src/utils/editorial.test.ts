import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateReadingTime,
  getArticleTypeLabel,
  getLocalizedArticleFields,
  isDuplicateHeadline,
  jaccardSimilarity,
  matchProvinceInText,
  requiresSensitiveVerification,
  sanitizeExternalUrl,
  slugify,
} from './editorial';
import type { Article, IndonesianRegion } from '../types/inforverse';

test('slugify converts headlines cleanly into URL-safe slugs', () => {
  assert.equal(slugify('Indonesia Launches New Maritime Solar Grid!'), 'indonesia-launches-new-maritime-solar-grid');
  assert.equal(slugify('  KTT Ekonomi Global — Jakarta 2026  '), 'ktt-ekonomi-global-jakarta-2026');
});

test('calculateReadingTime estimates minimum 1 minute and scales by 200 WPM', () => {
  assert.equal(calculateReadingTime('Short note.'), 1);
  const words450 = Array.from({ length: 450 }, () => 'word').join(' ');
  assert.equal(calculateReadingTime(words450), 3);
});

test('sanitizeExternalUrl blocks javascript: and data: URIs while preserving https and safe relative paths', () => {
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(sanitizeExternalUrl('https://www.instagram.com/wazzz.dotcom/'), 'https://www.instagram.com/wazzz.dotcom/');
  assert.equal(sanitizeExternalUrl('/src/assets/images/test.jpg'), '/src/assets/images/test.jpg');
  assert.equal(sanitizeExternalUrl('//evil.com/path'), '');
});

test('duplicate detection identifies identical or overlapping headlines', () => {
  const existing = ['ASEAN Summit Reaches Clean Energy Grid Accord in Jakarta'];
  assert.equal(isDuplicateHeadline('ASEAN Summit Reaches Clean Energy Grid Accord in Jakarta', existing), true);
  assert.equal(
    isDuplicateHeadline('Clean Energy Grid Accord Reached at ASEAN Summit in Jakarta', existing),
    true
  );
  assert.equal(isDuplicateHeadline('Deep Space Telescope Captures Exoplanet Atmosphere', existing), false);
  assert.ok(jaccardSimilarity('quantum computer breakthrough', 'quantum computer milestone') > 0.3);
});

test('requiresSensitiveVerification flags conflict, disaster, health, and security', () => {
  assert.equal(requiresSensitiveVerification('disaster'), true);
  assert.equal(requiresSensitiveVerification('health'), true);
  assert.equal(requiresSensitiveVerification('security'), true);
  assert.equal(requiresSensitiveVerification('technology'), false);
});

test('getLocalizedArticleFields returns translated fields when available and falls back safely', () => {
  const article: Article = {
    id: 'a1',
    title: 'Global Summit',
    slug: 'global-summit',
    subtitle: 'Delegates meet',
    summary: 'English summary',
    content: 'English body',
    image_url: '',
    image_caption: '',
    category_id: 'c1',
    country_id: 'co1',
    region_id: null,
    province: null,
    source_id: null,
    source_name: 'Desk',
    source_url: '',
    author: 'Editor',
    article_type: 'ai_summary',
    requires_verification: false,
    is_verified: true,
    language: 'en',
    status: 'published',
    is_automatic: true,
    is_featured: false,
    views_count: 10,
    tags: [],
    seo_title: '',
    seo_description: '',
    published_at: '2026-11-21T00:00:00Z',
    updated_at: '2026-11-21T00:00:00Z',
    created_at: '2026-11-21T00:00:00Z',
    translations: {
      id: {
        id: 't1',
        article_id: 'a1',
        language: 'id',
        title: 'KTT Global',
        subtitle: 'Para delegasi bertemu',
        summary: 'Ringkasan Indonesia',
        content: 'Isi Indonesia',
        is_ai_translated: true,
      },
    },
  };

  const idFields = getLocalizedArticleFields(article, 'id');
  assert.equal(idFields.title, 'KTT Global');
  assert.equal(idFields.isTranslated, true);

  const enFields = getLocalizedArticleFields(article, 'en');
  assert.equal(enFields.title, 'Global Summit');
  assert.equal(enFields.isTranslated, false);
});

test('matchProvinceInText matches explicitly mentioned Indonesian provinces without fabricating', () => {
  const regions: IndonesianRegion[] = [
    {
      id: 'reg-jawa',
      slug: 'jawa',
      name_en: 'Java',
      name_id: 'Jawa',
      country_id: 'co-id',
      provinces: ['DKI Jakarta', 'Jawa Barat', 'Jawa Timur'],
    },
  ];
  assert.deepEqual(matchProvinceInText('Transit upgrade expands across Jawa Barat corridor', regions), {
    regionId: 'reg-jawa',
    province: 'Jawa Barat',
  });
  assert.deepEqual(matchProvinceInText('Global semiconductor talks continue in Geneva', regions), {
    regionId: null,
    province: null,
  });
  assert.equal(getArticleTypeLabel('ai_summary', 'en'), 'AI-Generated Summary');
});
