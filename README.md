# FirstPick

FirstPick is a mobile-first PWA for FTC teams to manage scouting, match schedules, watchlists, team notes, and match reminders during competitions. It is built to feel like a native phone app on mobile, with a compact bottom dock and fast access to the scout form, while still remaining usable on desktop.

The app currently runs as a static frontend and stores data locally by default. It also includes optional Firebase Firestore session sync so multiple devices can share the same event data in real time by creating or joining a session code.

## Features

- Mobile-first PWA layout with an iPhone-style bottom dock
- Home screen with upcoming match, live countdown, next matches, scout-next suggestion, and team reminders
- Manual schedule editor with one card per match
- Scout report form for drivetrain, autonomous, endgame, reliability, and notes
- Animated segmented controls with sliding selection states
- Team directory with search, report counts, latest scout data, and team detail sheets
- Watchlist for priority teams with notes and next-match context
- Settings sheet for event name, dark/light theme, and clearing event data
- First-run onboarding with home-screen install guidance
- Service worker for offline app-shell caching and fallback navigation
- Browser notification hooks for upcoming match alerts
- Optional Firestore-backed session sync across linked devices
- Vercel Analytics script included in the app shell

## Current Status

This repo runs without a build step. The default data store is `localStorage`, so FirstPick works offline and keeps data on the same browser/device.

If Firebase is reachable, users can open the sharing panel, create a sync session, and share the generated code with other devices. Connected devices sync these fields through a Firestore document:

- event name
- teams
- schedule
- scout reports
- watchlist entries
- reminders

The Firebase implementation is intentionally simple right now: one document per session code in the `sessions` collection. Security rules, user auth, stronger conflict handling, QR scanning, and production push notification infrastructure are still future work.

## Project Structure

```text
.
├── app.js                 # App state, navigation, forms, local persistence, Firebase sync hooks
├── assets/
│   └── icon.svg           # PWA/app icon
├── backend.md             # Backend sync requirements and notes
├── firebase/
│   ├── config.js          # Firebase project config and Firestore persistence setup
│   └── db.js              # Session create/join/reconnect/save logic
├── index.html             # Main app shell and external scripts
├── manifest.webmanifest   # PWA install metadata
├── overview.md            # Product/design requirements
├── package.json           # Local server scripts and package metadata
├── styles.css             # Mobile-first UI and theme styles
└── sw.js                  # Service worker cache and notification-click logic
```

## Run Locally

Install dependencies if needed:

```bash
npm install
```

Start the local static server:

```bash
npm run dev
```

Then open:

```text
http://localhost:4173
```

The `dev` and `start` scripts both run:

```bash
python3 -m http.server 4173
```

## Firebase Sync

Firebase is loaded through CDN scripts in `index.html`, then initialized from `firebase/config.js`. The included config points at the current FirstPick Firebase project.

To use a different Firebase project:

1. Create a Firebase project.
2. Enable Firestore Database in Native mode.
3. Register a Web app in Firebase.
4. Replace the values in `firebase/config.js`.
5. Deploy Firestore rules appropriate for your team or environment.

For quick testing, `firebase/config.js` documents permissive session rules. Those rules are convenient for prototyping but should be replaced before production use.

## Using The App

1. Open the app on a phone-sized viewport or mobile browser.
2. Use the bottom dock to move between Home, Schedule, Scout, Watchlist, and Teams.
3. Add schedule data from the Schedule tab.
4. Add team numbers and names from the Teams tab.
5. Start scout reports from the center Scout dock button, a team sheet, a match sheet, or the Home screen scout-next card.
6. Use Settings to rename the event, switch theme, or clear event data.
7. Use the sharing button in the top-left to create, join, view, or disconnect a Firebase sync session.
8. Enable match alerts from the Home screen if browser notifications are supported.

## Local Data

The frontend stores app state in `localStorage` under `ftc-companion-v3`:

- `eventName`
- `theme`
- `syncCode`
- `teams`
- `schedule`
- `reports`
- `watchlist`
- `reminders`

The active Firebase session code is stored separately under `ftc-session-code`, allowing the app to reconnect to the last session on reload.

## Backend TODO

- Replace prototype Firestore rules with production-ready access control
- Add user or team-scoped permissions for sync sessions
- Improve conflict handling for simultaneous edits
- Add QR generation/scanning for easier session linking
- Add real push notification scheduling beyond in-browser match alerts
- Add watchlist-specific notifications when priority teams are playing
- Consider importing schedules from official FTC data sources in a future version

## Design Notes

The visual design follows the palette in `overview.md`:

- Primary orange for main actions and highlights
- Red and blue only for alliance-specific UI
- Dark mode default with light mode available in settings
- Frosted glass bottom dock with a sliding active indicator
- Compact cards and controls optimized for fast use at FTC events

## Verification


Useful checks:

```bash
node --check app.js
node --check firebase/config.js
node --check firebase/db.js
python3 -m json.tool manifest.webmanifest
curl -I http://localhost:4173/
```

`curl` requires the local server to be running first.
