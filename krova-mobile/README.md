# KROVA Mobile (PWA)

Mobile-first installable web app for KROVA. Runs on the same FastAPI backend
and Supabase auth as the website.

## Stack
- Next.js 15 (App Router)
- Tailwind v4
- Motion (Framer)
- Supabase Auth
- Service worker for offline + cache
- Web App Manifest for installability

## Dev
```bash
cd krova-mobile
npm install
npm run dev      # http://localhost:3001
```

Backend must be running on `http://localhost:8000`. Edit `.env.local` to point
elsewhere.

## Install as a PWA

### Android (Chrome)
1. Open `http://localhost:3001` (or your prod URL) on the phone
2. The install prompt slides up after a few seconds
3. Tap **Install**

### iOS (Safari)
1. Open the URL in Safari
2. Tap the Share button
3. Tap **Add to Home Screen**

(iOS doesn't support `beforeinstallprompt` — we show the iOS-specific hint
in the bottom prompt instead.)

## What's in here
- `app/login` — sign-in
- `app/(app)/briefing` — today's priorities
- `app/(app)/actions` — approve / reject AI drafts
- `app/(app)/people` — relationships graph
- `app/(app)/settings` — account + channels
- `public/manifest.json` — PWA manifest
- `public/sw.js` — service worker
- `public/icons/*` — PWA icons (192, 512, maskable, apple-touch)

## What's missing for v1
- Push notifications (would need a server-side push subscription endpoint)
- Background sync (queued approvals if offline)
- Channel-specific deep links (open WhatsApp etc.)
