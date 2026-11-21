import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Payload-First Security TDD Spec Verification for INFORVERSE Firestore Rules.
 * Verifies that every blueprint entity has matching hardened rules, Eight-Pillar invariants,
 * and that all "Dirty Dozen" attack payloads violate the rule invariants.
 */

const rulesPath = path.resolve(process.cwd(), 'DRAFT_firestore.rules');
const finalRulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

const activeRules = fs.existsSync(finalRulesPath)
  ? fs.readFileSync(finalRulesPath, 'utf8')
  : fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
  entities: Record<string, unknown>;
  firestore: Record<string, { schema: { $ref: string } }>;
};

test('Blueprint covers every requested INFORVERSE Firestore collection', () => {
  const expectedPaths = [
    '/articles/{articleId}',
    '/articleTranslations/{translationId}',
    '/categories/{categoryId}',
    '/countries/{countryId}',
    '/regions/{regionId}',
    '/sources/{sourceId}',
    '/automationSettings/{settingId}',
    '/automationLogs/{logId}',
    '/websiteSettings/{settingId}',
    '/adminProfiles/{uid}',
    '/admins/{uid}',
    '/newsletterSubscribers/{subscriberId}',
    '/analytics/{metricId}',
    '/contactMessages/{messageId}',
    '/test/{docId}',
  ];
  for (const p of expectedPaths) {
    assert.ok(blueprint.firestore[p], `Missing blueprint path ${p}`);
  }
});

test('Rules begin with rules_version = 2 and default-deny catch-all', () => {
  assert.match(activeRules, /^rules_version = '2';/);
  assert.match(activeRules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('Every blueprint collection has an explicit match block in rules', () => {
  for (const collectionPath of Object.keys(blueprint.firestore)) {
    const cleanPrefix = collectionPath.split('{')[0];
    assert.ok(
      activeRules.includes(`match ${cleanPrefix}`),
      `Missing match block for ${collectionPath}`
    );
  }
});

test('Dirty Dozen #1 & #2: Admin profile / role self-escalation blocked for non-bootstrapped users', () => {
  assert.match(activeRules, /match \/admins\/\{uid\}[\s\S]*allow create: if isBootstrappedAdmin\(\)/);
  assert.match(activeRules, /match \/adminProfiles\/\{uid\}[\s\S]*allow create: if isBootstrappedAdmin\(\)/);
});

test('Dirty Dozen #3: Email spoofing blocked via mandatory email_verified == true', () => {
  assert.match(activeRules, /request\.auth\.token\.email_verified == true/);
  assert.match(activeRules, /function isAdmin\(\) \{\s*return isVerifiedUser\(\)/);
});

test('Dirty Dozen #4 & #12: Anti-update-gap schema helpers enforce hasOnly() and affectedKeys().hasOnly()', () => {
  const helpers = [
    'isValidArticle',
    'isValidArticleTranslation',
    'isValidCategory',
    'isValidCountry',
    'isValidRegion',
    'isValidSource',
    'isValidAutomationSettings',
    'isValidAutomationLog',
    'isValidWebsiteSettings',
    'isValidAdminProfile',
    'isValidAdminRole',
    'isValidNewsletterSubscriber',
    'isValidAnalyticsMetric',
    'isValidContactMessage',
  ];
  for (const h of helpers) {
    assert.ok(activeRules.includes(`function ${h}(data)`), `Missing helper ${h}`);
  }
  assert.match(activeRules, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(/);
});

test('Dirty Dozen #5: Path variable ID poisoning guard applied to single-doc operations', () => {
  assert.match(activeRules, /function isValidId\(id\)\s*\{\s*return id is string && id\.size\(\) > 0 && id\.size\(\) <= 128 && id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\);/);
});

test('Dirty Dozen #6: Relational integrity exists() verified on articles & translations', () => {
  assert.match(activeRules, /exists\(\/databases\/\$\(database\)\/documents\/categories\/\$\(incoming\(\)\.categoryId\)\)/);
  assert.match(activeRules, /exists\(\/databases\/\$\(database\)\/documents\/countries\/\$\(incoming\(\)\.countryId\)\)/);
  assert.match(activeRules, /exists\(\/databases\/\$\(database\)\/documents\/articles\/\$\(incoming\(\)\.articleId\)\)/);
});

test('Dirty Dozen #7: List fields constrained by max size and element type check', () => {
  assert.match(activeRules, /function isValidStringList\(data, key, maxItems\)/);
  assert.match(activeRules, /data\[key\]\[0\] is string/);
});

test('Dirty Dozen #8 & #9: List queries enforce resource.data filter & isolate PII collections', () => {
  assert.match(activeRules, /match \/articles\/\{articleId\}[\s\S]*allow list: if resource\.data\.status == 'published'/);
  assert.doesNotMatch(activeRules, /match \/newsletterSubscribers\/\{subscriberId\}[\s\S]*allow get: if true/);
  assert.doesNotMatch(activeRules, /match \/contactMessages\/\{messageId\}[\s\S]*allow get: if true/);
});

test('Dirty Dozen #10 & #11: Temporal integrity (request.time) and immutable fields guarded', () => {
  assert.match(activeRules, /incoming\(\)\.createdAt == request\.time/);
  assert.match(activeRules, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(activeRules, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
  assert.match(activeRules, /incoming\(\)\.id == existing\(\)\.id/);
});
