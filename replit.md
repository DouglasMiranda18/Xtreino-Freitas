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

- `index.html` / `script.js` — Main storefront
- `admin.html` / `admin.js` — Admin dashboard (9700+ lines)
- `client.html` / `client.js` — Client area (3573 lines)
- `config/firebase.js` — Firebase initialization (sets window.firebaseApp/Auth/Db)
- `config/firestore.rules` — Firestore security rules (deploy via Firebase CLI)
- `netlify/functions/` — Serverless function handlers (Netlify-only)
- `assets/` — Images, logos, downloadable content
- `styles.css` / `admin-styles.css` / `mobile-optimizations.css` — Stylesheets
- `js/error-codes.js`, `js/error-handler.js` — Error handling utilities

## Architecture decisions

- No build step: static files served directly via `serve`
- Firebase is the sole backend for auth, database, and file storage
- Payment processing handled by Netlify Functions (not available in Replit dev)
- Tailwind loaded via CDN with custom retry/fallback logic
- Token-based currency system for event registrations
- Notifications stored in `notifications` Firestore collection; read status tracked in `notificationReads` collection

## Product

- Store selling gaming sensitivities, passes, and merchandise
- Event/tournament registration system with token currency
- Admin panel for managing orders, users, events, and sending notifications
- Client area for profile, orders, products, tokens, affiliates, and notifications

## User preferences

- Admin credentials: `admin@xtreino.dev` / `Admin@2025!` (role: ceo)

## Gotchas

- Netlify Functions (payments, webhooks) won't work in Replit — they require Netlify deployment
- Tailwind is CDN-only; no PostCSS/build pipeline
- `config/firestore.rules` is local — must deploy to Firebase with `firebase deploy --only firestore:rules` for changes to take effect
- Data loading in admin.js now waits for both Firebase init AND user authentication before fetching protected data
- The `check-availability` Netlify function doesn't exist locally but has a fail-safe `return { available: true }` fallback in script.js

## Pointers

- [Firebase Console](https://console.firebase.google.com/)
- [Mercado Pago Docs](https://www.mercadopago.com.br/developers/)
