# XTreino Freitas

A digital platform for eSports training and products focused on the Free Fire community — includes an e-commerce store, tournament/event management, and a client area.

## Run & Operate

- **Start**: `serve . -l 5000` (static file server on port 5000)
- No build step required — pure HTML/CSS/JS served directly
- Required env vars: Firebase config is embedded in each HTML file as `window.FIREBASE_CONFIG`; Mercado Pago token in `netlify.toml`

## Stack

- **Frontend**: Native HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS via CDN, Font Awesome via CDN
- **Backend/BaaS**: Firebase (Firestore, Auth, Storage)
- **Payments**: Mercado Pago
- **Serverless**: Netlify Functions (Node.js + esbuild) — not active in Replit
- **Node.js**: 18.x

## Where things live

- `index.html` / `script.js` — Main storefront; `loadDynamicEvents()` fetches `adminEvents` (status=Aberto) for the events grid
- `admin.html` / `admin.js` — Admin dashboard (~10 000 lines)
- `client.html` / `client.js` — Client area
- `config/firebase.js` — Firebase init: sets `window.firebaseApp/Auth/Db/Storage`
- `config/firestore.rules` — Firestore security rules (deploy via Firebase CLI)
- `config/storage.rules` — Storage rules; `events/` path allows authenticated write (deploy via Firebase CLI)
- `netlify/functions/create-preference.js` — Mercado Pago preference creator (Netlify-only)
- `assets/` — Images, logos, downloadable content
- `styles.css` / `admin-styles.css` / `mobile-optimizations.css` — Stylesheets

## Architecture decisions

- No build step: static files served directly via `serve`
- Firebase is the sole backend for auth, database, and file storage
- `adminEvents` Firestore collection drives the home-page events section; static fallback shown when empty
- Event image uploads go to Firebase Storage under `events/` path; URL saved in `adminEvents.imageUrl`
- PAGO events store `preco` field; home-page button calls `openEventPayment()` → Netlify `create-preference`
- Payment processing handled by Netlify Functions (not available in Replit dev) — `MP_ACCESS_TOKEN` in `netlify.toml`
- Tailwind loaded via CDN with custom retry/fallback logic
- Token-based currency system for event registrations

## Product

- Store selling gaming sensitivities, passes, and merchandise
- Event/tournament registration system: admin creates events with image (1920×1080 / 1080×1080 / 1920×720) and optional Mercado Pago price; events appear live on home page
- Admin panel for managing orders, users, events, notifications
- Client area for profile, orders, products, tokens, affiliates, notifications

## User preferences

- Admin credentials: `admin@xtreino.dev` / `Admin@2025!` (role: ceo)

## Gotchas

- Netlify Functions (payments, webhooks) won't work in Replit — they require Netlify deployment
- `config/storage.rules` and `config/firestore.rules` are local — deploy with `firebase deploy --only storage` / `--only firestore:rules`
- Tailwind is CDN-only; no PostCSS/build pipeline
- `failed-precondition` on `adminEvents` queries: composite index (`status + createdAt`, `category + createdAt`) needed in Firebase Console; code falls back gracefully without it

## Pointers

- [Firebase Console](https://console.firebase.google.com/)
- [Mercado Pago Docs](https://www.mercadopago.com.br/developers/)
