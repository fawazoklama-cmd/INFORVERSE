# INFORVERSE — Installation, Configuration & Vercel Deployment Guide

## 1. Local Development Setup
```bash
npm install
cp .env.example .env
npm run dev
```
The server starts on `http://localhost:3000`, mounting the Express API and Vite frontend together.

## 2. Supabase PostgreSQL Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and execute the entire contents of `supabase/schema.sql`. This provisions all 15 tables (`articles`, `categories`, `countries`, `regions`, `sources`, `article_sources`, `article_translations`, `tags`, `article_tags`, `admin_profiles`, `automation_settings`, `automation_logs`, `website_settings`, `visitors_analytics`, `newsletter_subscribers`), foreign keys, indexes, and Row Level Security (RLS) policies.
3. In **Project Settings → API**, copy:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep strictly server-side; never expose in `VITE_*` variables)
   - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` (optional for client Supabase Auth)

## 3. Creating an Administrator Account
- **With Supabase Auth**: Create a user in **Authentication → Users**, then insert their `id` and `email` into `public.admin_profiles` (`role = 'super_admin'`).
- **With Environment Variables**: Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` / Vercel Environment Variables.
- **First-Run Preview Mode**: When `ADMIN_EMAIL` / `ADMIN_PASSWORD` are unset and no admin has been claimed yet, `/admin` displays a one-time Administrator Claim form that securely hashes your chosen password (`scrypt`) on the server and locks setup immediately after claiming.

## 4. Gemini API & News API Configuration
- **Gemini API**: Obtain a key from Google AI Studio and set `GEMINI_API_KEY`. Used exclusively on the backend (`server/services/gemini.ts`) with model `gemini-4-hydrogen` for summarization, EN↔ID translation, category/country detection, and content analysis.
- **News API (Optional)**: Obtain an API key from NewsAPI.org / GNews and set `NEWS_API_KEY`.
- **RSS Feeds**: Add or toggle official RSS/Atom feeds directly in `/admin` → **Sources**.

## 5. Vercel Deployment & Cron Automation
1. Push your repository to GitHub (ensure `.env` is ignored and no secrets are committed).
2. Import the repository in Vercel and configure all environment variables from `.env.example`:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` (generate a strong random 32+ char string)
   - `ADMIN_EMAIL` & `ADMIN_PASSWORD`
   - `APP_URL` (your production `https://...vercel.app` URL)
3. `vercel.json` is pre-configured to trigger `/api/cron/collect` every 30 minutes (`*/30 * * * *`).
4. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when invoking Cron Jobs, protecting the automated collector from unauthorized browser execution.
