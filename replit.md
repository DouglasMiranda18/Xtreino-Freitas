# XTreino Freitas

A digital platform for eSports training and products focused on the Free Fire community — includes an e-commerce store, tournament/event management, and a client area.

## Run & Operate

- **Start**: `serve -s . -l 5000` (static file server on port 5000)
- No build step required — pure HTML/CSS/JS served directly
- Required env vars: Firebase config is embedded in `/config/firebase.js`; Mercado Pago token in `netlify.toml`

## Stack

- **Frontend**: Native HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS via CDN, Font Awesome via CDN
- **Backend/BaaS**: Firebase (Firestore, Auth, Storage)
- **Payments**: Mercado Pago
- **Serverless**: Netlify Functions (Node.js + esbuild) — not active in Replit
- **Node.js**: 18.x

## Where things live

- `index.html` / `script.js` — Main storefront
- `admin.html` / `admin.js` — Admin dashboard
- `client.html` / `client.js` — Client area
- `config/firebase.js` — Firebase configuration
- `netlify/functions/` — Serverless function handlers (Netlify-only)
- `assets/` — Images, logos, downloadable content
- `styles.css` / `admin-styles.css` / `mobile-optimizations.css` — Stylesheets

## Architecture decisions

- No build step: static files served directly via `serve`
- Firebase is the sole backend for auth, database, and file storage
- Payment processing handled by Netlify Functions (not available in Replit dev environment)
- Tailwind loaded via CDN with custom retry/fallback logic
- Token-based currency system for event registrations

## Product

- Store selling gaming sensibilities, passes, and merchandise
- Event/tournament registration system with token currency
- Admin panel for managing orders, users, and events
- Client area for profile management and download access

## User preferences

_Populate as you build_

## Gotchas

- Netlify Functions (payments, webhooks) won't work in Replit — they require Netlify deployment
- Tailwind is CDN-only; no PostCSS/build pipeline
- Firebase credentials are embedded in `config/firebase.js`

## Pointers

- [Firebase Console](https://console.firebase.google.com/)
- [Mercado Pago Docs](https://www.mercadopago.com.br/developers/)
