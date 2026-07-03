# Sync for iOS

Native iOS client for Sync — curious onboarding, daily brief (4–5 priorities), and lightweight chat. Reuses the shared Sync engine from the parent repo via a `shared` link to `../lib`.

## First-time setup

```bash
cd sync-ios
npm install
```

`postinstall` creates `sync-ios/shared` → `../lib` (junction on Windows, symlink on macOS/Linux). If it fails, run:

```bash
npm run link-shared
```

## Run on your iPhone (works from Windows)

```bash
cd sync-ios
npm start
```

1. Install **Expo Go** from the App Store.
2. Scan the QR code (same Wi‑Fi as your PC).
3. Complete onboarding → **Brief** tab + **Chat** tab.

## Run iOS Simulator (Mac only)

```bash
cd sync-ios
npm run ios
```

## What’s inside

| Screen | Purpose |
|--------|---------|
| **Onboarding** | Curious questionnaire — name, week, priorities, radar, coming up |
| **Brief** | Real Sync briefing (decision engine + capture input) |
| **Chat** | Short curious replies; messages feed memory |

## Reset onboarding

Clear Expo Go app data, or remove AsyncStorage keys `sync.userProfile` and `sync.capturedItems`.

## Production build (EAS)

```bash
npm install -g eas-cli
cd sync-ios
eas build:configure
eas build --platform ios
```
