# PDF Quick Tools

<p align="center">
  <strong>Simple PDF tools. Fast results. Privacy-first processing.</strong>
</p>

<p align="center">
  <a href="https://pdfpilot.site/">Open the live website</a>
  ·
  <a href="https://pdfpilot.site/tools">Browse all 58 tools</a>
  ·
  <a href="https://github.com/hyxeekhan-lang/PDF-Quick-Tools/releases/tag/v1.0.0">Chrome Extension release</a>
</p>

<p align="center">
  <a href="https://pdfpilot.site/"><img alt="PDF Quick Tools" src="https://raw.githubusercontent.com/hyxeekhan-lang/PDF-Quick-Tools/main/public/icons/icon-512.png" width="96" height="96"></a>
</p>

[![Live site](https://img.shields.io/badge/live-pdfpilot.site-4f46e5?style=for-the-badge)](https://pdfpilot.site/)
[![Tools](https://img.shields.io/badge/tools-58-4f46e5?style=for-the-badge)](https://pdfpilot.site/tools)
[![License: MIT](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge)](tsconfig.json)
[![React 19](https://img.shields.io/badge/React-19-087ea4?style=for-the-badge)](package.json)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge)](vite.config.ts)
[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-000000?style=for-the-badge)](vercel.json)

A browser-based PDF workspace for compressing, merging, splitting, converting, editing, organizing, and understanding documents with AI.

> **Live:** [pdfpilot.site](https://pdfpilot.site/) · **Chrome extension:** [v1.0.0](https://github.com/hyxeekhan-lang/PDF-Quick-Tools/releases/tag/v1.0.0)

## Screenshots

Captured from the live site, October 2026.

### Homepage

![PDF Quick Tools homepage](public/screenshots/website-home-2026.png)

### All PDF tools

![All PDF tools directory](public/screenshots/all-tools-2026.png)

### AI Summarizer

![AI Summarizer desktop upload page](public/screenshots/ai-summarizer-2026.png)

### Mobile AI Summarizer

![AI Summarizer on a mobile screen](public/screenshots/ai-summarizer-mobile-2026.png)

### Mobile homepage

![PDF Quick Tools on mobile](public/screenshots/home-mobile.png)

## What It Includes

58 tools in total. The most-used ones:

### PDF tools

- Compress PDF
- Merge PDF
- Split PDF
- PDF to JPG · JPG to PDF
- Rotate PDF · Rearrange pages · Delete pages · Extract pages
- Add page numbers · Watermark PDF · Sign PDF
- Redact PDF (real redaction — text is removed, not covered)
- Unlock PDF · Protect PDF · Repair PDF · Remove metadata
- Word to PDF · PDF to Word · Excel to PDF · PDF to Excel
- OCR PDF (scanned pages made searchable)
- Organize, crop, flatten, repair, and preview pages

### AI tools

- AI Summarizer
- AI Chat
- AI Quiz Generator
- AI Notes Generator
- AI PDF Translator
- AI PDF Rewriter
- AI Ask PDF
- AI PDF to Presentation
- AI Flashcard Generator
- AI Citation Generator
- AI Grammar & Writing Checker
- AI Document Analyzer
- AI Resume Analyzer
- AI PDF Question Generator

Every AI tool uses the same document workflow: browser-side PDF text extraction, an explicit AI action, progress/error states, and structured results. AI output is presented as assistance, not professional, legal, academic, financial, or hiring advice.

## Privacy By Design

- Regular PDF operations run in the browser.
- Original PDFs are not uploaded for regular tools.
- AI tools send extracted text to the server-side AI endpoint only when the user runs an AI action.
- Analytics are optional and gated behind the privacy choice banner.
- No PDF files, document text, passwords, or API keys are stored in browser preferences.
- No account is required.

Read the full policies:

- [Privacy Policy](https://pdfpilot.site/privacy)
- [Terms of Use](https://pdfpilot.site/terms)
- [Disclaimer](https://pdfpilot.site/disclaimer)
- [About Muhammad Hamid](https://pdfpilot.site/about)
- [Contact](https://pdfpilot.site/contact)

## Chrome Extension

The companion Manifest V3 extension provides quick access to PDF tools from Chrome, including search, favorites, recent tools, themes, current PDF detection, context-menu actions, and the `Ctrl + Shift + P` shortcut.

### Download

- [Download the Chrome Extension ZIP](https://pdfpilot.site/downloads/pdf-tool-chrome-extension.zip)
- [GitHub Release v1.0.0](https://github.com/hyxeekhan-lang/PDF-Quick-Tools/releases/tag/v1.0.0)

### Install locally

1. Download and extract the ZIP.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted extension folder.

For Chrome Web Store publishing, upload the ZIP through the Chrome Developer Dashboard. Chrome does not allow websites to silently install extensions.

## Technology

- React 19
- TanStack Router and TanStack Start
- TypeScript
- Vite
- Tailwind CSS v4
- `pdf-lib`
- `pdfjs-dist`
- Groq API through a server-side endpoint
- Vercel deployment

## Local Development

### Requirements

- Node.js 18 or newer
- npm
- An AI provider key for the website tools (Groq recommended)

### Setup

```bash
git clone https://github.com/hyxeekhan-lang/PDF-Quick-Tools.git
cd PDF-Quick-Tools
npm install
```

Create `.env.local` and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Vercel deployment

In the Vercel dashboard, add the same variable(s) under Project → Settings → Environment Variables:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

Set `GROQ_API_KEY` for Production, Preview, and Development as needed. The key is read only by the server and must not be added to client-side variables such as `VITE_*`.

### Owner dashboard (`/admin`)

An optional page showing which tools are being used and how often. Sign in with
the email and password you configure below. There is no account registration and
no email is sent.

Four environment variables, all server-only:

```env
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=a-long-password-nobody-can-guess
ADMIN_SESSION_SECRET=openssl_rand_32_bytes_hex
POSTGRES_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

- `POSTGRES_URL` — any hosted Postgres: Vercel Postgres, Neon, Supabase. Without
  it the site runs exactly as before; nothing is counted and the dashboard says
  so. The table is created on first use, so there is no migration to run.
- `ADMIN_SESSION_SECRET` — generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  Changing it signs out every open session.
- `ADMIN_EMAIL` is checked on every request, not only at login, so changing it
  invalidates existing sessions.

Generate the secret rather than inventing one: it is what signs the session
cookie, so a guessable value would make the cookie forgeable by anyone who
guessed it too.

**What gets stored.** One row per tool page opened: the tool's route path and a
timestamp. No IP, no user agent, no cookie, no identifier, no filename, no file
content. The IP is read to rate-limit the write and discarded. This is what keeps
the privacy page's claim accurate — the dashboard is an owner's view of traffic
that contains no visitor records, because the site keeps none.

**Access control beyond the password.** `/admin` is `noindex` and is excluded
from the sitemap. The password is compared in constant time, login attempts are
rate limited to 8 per 15 minutes per address, and the session cookie is
`HttpOnly` and `SameSite=Strict`. The rate limiter lives in serverless memory, so
it is per-instance and resets on cold start — for a hard ceiling, add a Vercel WAF
rule on `/api/admin`.

**Also check before relying on ad revenue:** if Deployment Protection is enabled
for the production domain, anonymous visitors get a Vercel login screen and
AdSense serves nothing.

### Validation and builds

```bash
npm run typecheck
npm run build
npm run build:extension
```

The Chrome extension build is written to `dist-extension/` and can be loaded unpacked in Chrome.

## Project Structure

```text
src/
├── components/       Shared UI, uploaders, feedback, AI panels, and layout
├── hooks/            Shared processing state machines
├── lib/              PDF, AI, analytics, SEO, site, and tool services
├── routes/           Website pages and individual tool routes
└── server/           Server-side Groq integration

api/                  Vercel server endpoint for AI requests
extension/            Manifest V3 Chrome extension source
public/               PWA assets, icons, sitemap, and screenshots
scripts/              Asset generation scripts
```

## Deployment

The production website is deployed at [pdfpilot.site](https://pdfpilot.site/).

The repository includes the PWA manifest, service worker, PNG install icons, extension build configuration, and GitHub release package.

## Maintainer

PDF Quick Tools is built and maintained by **Muhammad Hamid** from **Faisalabad, Pakistan**.

Contact: [jutthamid148@gmail.com](mailto:jutthamid148@gmail.com)

## License

This project is available under the MIT License.
