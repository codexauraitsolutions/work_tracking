# SiteTrack — clickable prototype

Construction work orders, daily site progress and automatic RA bills.
Three roles: **Admin**, **Site Supervisor**, **Client**.

Plain HTML, CSS and JavaScript — no framework, no build step.

## Deploy to Vercel

**Option A — GitHub (recommended)**
1. Create a new GitHub repository and push this folder to it.
2. On vercel.com → **Add New… → Project** → import the repository.
3. Framework Preset: **Other**. Leave Build Command, Output Directory and Install Command empty (no overrides).
4. Click **Deploy**.

**Option B — Vercel CLI**
```bash
npm i -g vercel
cd sitetrack
vercel          # preview
vercel --prod   # production
```

## Run locally
```bash
npx serve .     # http://localhost:3000
```

> Keep this repo **without a `package.json`**. If one is added with a `build` script,
> Vercel expects a `public` output folder and the deploy fails.

## Files
| Path | What it is |
|---|---|
| `index.html` | Page shell |
| `css/styles.css` | All styles (desktop phone-frame + full-screen mobile) |
| `js/data.js` | Sample data, billing-cycle and RA bill calculations |
| `js/app.js` | Navigation, header, tab bar, shared components, Back-button handling |
| `js/screens.js` | Every screen for Admin, Supervisor and Client |
| `js/actions.js` | Button actions (upload, verify, generate / approve / accept bill…) |
| `vendor/lucide.min.js` | Icons (Lucide, ISC licence) |
| `manifest.webmanifest`, `icons/` | “Add to Home Screen” support |

## Notes
- **Demo date** is fixed at 22 Oct 2026 (`TODAY` in `js/data.js`) so the sample bill cycle ends “today”.
- **PDF upload is simulated** — any PDF is read as the sample Ayati work order.
- Changes are saved in the browser (localStorage). Profile → **Reset demo data** starts fresh.
- On phones the app opens full screen; the phone’s Back button works like the in-app back arrow.
  Open the site and choose **Add to Home Screen** to use it like an installed app.
