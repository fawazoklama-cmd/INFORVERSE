# INFORVERSE Security Specification (Payload-First TDD)

## 1. Data Invariants & Access Model

1. **Zero-Trust Default Deny**: Every Firestore path is denied by default (`match /{document=**} { allow read, write: if false; }`).
2. **Admin Authorization & Email Verification**:
   - Administrative writes require `request.auth != null && request.auth.token.email_verified == true`.
   - Admin identity is verified strictly server-side in rules via `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or the bootstrapped verified operator email (`fawazoklama@gmail.com` with `email_verified == true`).
   - Public visitors never authenticate and may never create or escalate `admins` or `adminProfiles` documents.
3. **Public Editorial Read Isolation**:
   - Visitors may read (`get` / `list`) `articles` ONLY when `resource.data.status == 'published'`. Drafts, scheduled, and archived dispatches are strictly inaccessible to non-admins.
   - Visitors may read active `categories`, `countries`, `regions`, and `articleTranslations` (where `status == 'published'` or `isActive == true`), plus single-doc `websiteSettings/default`.
   - `sources`, `automationSettings`, `automationLogs`, `adminProfiles`, `admins`, `newsletterSubscribers`, and `contactMessages` are strictly protected from public `list` / `get` scraping (PII isolation on `adminProfiles`, `newsletterSubscribers`, `contactMessages`).
4. **Path Variable Hardening & Boundary Enforcement**:
   - All single-document operations enforce `isValidId(docId)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
   - Every string field enforces `.size()` upper bounds, and array fields (`tags`, `provinces`, `supportedLanguages`) enforce `.size() <= MAX` and first-element type checking.
5. **Relational & Temporal Integrity**:
   - Creating an `article` verifies parent `categories/$(incoming().categoryId)` and `countries/$(incoming().countryId)` exist via `exists()`.
   - Creating an `articleTranslation` verifies parent `articles/$(incoming().articleId)` exists via `exists()`.
   - All `createdAt` (on create) and `updatedAt` (on create/update) fields must equal `request.time`; `createdAt`, `id`, and `uid` are immutable on update.
6. **Storage Hardening**:
   - Only `/branding`, `/articles`, `/thumbnails`, and `/categories` paths are exposed.
   - Public `read` is allowed; `write`/`delete` is restricted to verified admins, MIME types `image/(jpeg|png|webp|avif|svg+xml)`, and maximum 5 MB file size.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Collection | Malicious Payload Summary | Expected Outcome |
|---|---------------|-------------------|---------------------------|------------------|
| 1 | **Identity Spoofing / Privilege Escalation** | `adminProfiles/{uid}` | Non-admin signed-in user writes `{ uid: otherUid, email: "attacker@x.com", role: "super_admin" }` | `PERMISSION_DENIED` |
| 2 | **Self-Granted Admin Document** | `admins/{uid}` | Regular user creates `/admins/{myUid}` with `{ role: "super_admin", active: true }` | `PERMISSION_DENIED` |
| 3 | **Email Spoofing (Unverified Email)** | `articles/{id}` | Token has `email: "fawazoklama@gmail.com"` with `email_verified: false` | `PERMISSION_DENIED` |
| 4 | **Shadow / Ghost Field Injection** | `articles/{id}` | Valid article fields + extra ghost key `bypassModeration: true` | `PERMISSION_DENIED` |
| 5 | **ID Poisoning (Path Traversal / 1.5KB ID)** | `articles/{id}` | Document ID `"../admins/root"` or 1500-char string | `PERMISSION_DENIED` |
| 6 | **Orphaned Record Creation** | `articleTranslations/{id}` | `articleId: "non-existent-article-999"` | `PERMISSION_DENIED` |
| 7 | **Denial-of-Wallet Unbounded Array** | `articles/{id}` | `tags` array with 50 items or non-string element `[123]` | `PERMISSION_DENIED` |
| 8 | **Draft / Unpublished Leak via List Query** | `articles` | Unauthenticated visitor lists `articles` without `where('status', '==', 'published')` | `PERMISSION_DENIED` |
| 9 | **PII Scraping on Subscribers** | `newsletterSubscribers/{id}` | Unauthenticated or non-admin user calls `get` or `list` on subscribers | `PERMISSION_DENIED` |
| 10 | **Timestamp Manipulation** | `articles/{id}` | Client sets `createdAt: "1999-01-01T00:00:00Z"` instead of `request.time` | `PERMISSION_DENIED` |
| 11 | **Immortal Field Mutation** | `articles/{id}` | Update request attempts to change `createdAt` or `id` | `PERMISSION_DENIED` |
| 12 | **Value Poisoning on Whitelisted Update** | `websiteSettings/default` | Update sets `websiteName` to `12345` (number) or a 10KB string | `PERMISSION_DENIED` |
