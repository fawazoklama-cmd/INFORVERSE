# INFORVERSE — Firebase & Vercel Deployment Guide

## 1. Local Development Setup
```bash
npm install
cp .env.example .env
npm run dev
```
The server starts on `http://localhost:3000`, mounting the Express API and Vite frontend together.

## 2. Google Firebase Setup
INFORVERSE uses **Firebase Authentication**, **Cloud Firestore**, **Firebase Storage**, **Firebase App Check**, **Firebase Analytics**, and **Firebase Cloud Functions + Cloud Scheduler** (`firebase-applet-config.json`).

### A. Firebase Authentication (Admin Only)
1. Open **Firebase Console → Authentication → Sign-in method**.
2. Enable **Email/Password** (and optionally **Google**).
3. **Do NOT create public admin sign-up forms.** Instead, create administrator accounts directly in **Firebase Console → Authentication → Users** (ensure Email Verified is enabled).
4. Grant admin privileges in Cloud Firestore:
   - The bootstrapped owner email (`fawazoklama@gmail.com` with verified email) automatically initializes `admins/{uid}` and `adminProfiles/{uid}` on first login.
   - To add additional editors or admins, create `admins/{uid}` with `{ "uid": "<uid>", "role": "admin", "active": true }` and `adminProfiles/{uid}`.
   - Access the protected Administrator Console exclusively via `/admim` (not linked in public navigation).

### B. Cloud Firestore & Storage Rules
Deploy hardened security rules and composite indexes via Firebase CLI:
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```
- `firestore.rules` enforces public reads ONLY on published articles/categories/countries/regions and denies all unauthenticated or non-admin writes.
- `storage.rules` enforces public reads and authenticated admin-only image uploads (JPEG, PNG, WebP, AVIF, SVG ≤ 5 MB) inside `/branding`, `/articles`, `/thumbnails`, and `/categories`.

### C. Cloud Functions & Cloud Scheduler (Automated Collection)
1. Upgrade the Firebase project to the **Blaze** plan (required for outbound HTTP/RSS calls and Cloud Scheduler).
2. Install Cloud Functions dependencies and set secrets:
```bash
cd functions && npm install && cd ..
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set NEWS_API_KEY
firebase functions:secrets:set CRON_SECRET
firebase deploy --only functions
```
- `scheduledInformationCollector` runs every **30 minutes** (`Asia/Jakarta`), fetches active RSS/NewsAPI sources, summarizes/translates via `gemini-4-hydrogen`, deduplicates by URL/title, and logs runs to `automationLogs`.
- `triggerCollectionHttp` allows manual runs authenticated via Firebase Admin ID token or `CRON_SECRET`.

### D. Firebase App Check (Optional reCAPTCHA v3)
1. Register your domain in **Firebase Console → App Check** with **reCAPTCHA v3**.
2. Set `VITE_FIREBASE_APPCHECK_SITE_KEY` in `.env` / Vercel Environment Variables.

## 3. Vercel Frontend & Express API Deployment
1. Push your repository to GitHub (never commit `.env` or service account keys).
2. Import the repository in Vercel and configure environment variables:
   - `GEMINI_API_KEY`
   - `NEWS_API_KEY` (optional)
   - `CRON_SECRET`
   - `APP_URL` (your production `https://...vercel.app` URL)
   - `VITE_FIREBASE_APPCHECK_SITE_KEY` (optional)
3. `vercel.json` is pre-configured to route `/api/*` and trigger `/api/cron/collect` every 30 minutes (`*/30 * * * *`) with `Authorization: Bearer <CRON_SECRET>`.
