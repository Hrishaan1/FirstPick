# FirstPick

FirstPick is a mobile-first PWA for FTC teams to manage scouting, match schedules, watchlists, team notes, and match reminders during competitions. The app is built to feel like a native phone app first, while still remaining usable on desktop.

The current version is a static frontend prototype with local browser storage. It is ready for Firebase-backed sync in the next backend phase.

## Features

- Mobile-first PWA layout with an iPhone-style bottom dock
- Home screen with upcoming match, countdown, next matches, scout-next suggestion, and team reminders
- Manual schedule editor with one card per match
- Scout report form for drivetrain, autonomous, endgame, reliability, and notes
- Animated scouting option controls with sliding selection states
- Team directory with searchable team list and saved scout reports
- Watchlist for priority teams and notes
- Mock team-linking panel with a share code/QR-style visual
- First-run onboarding that tells users how to add FirstPick to their home screen
- Dark and light theme support from the requested color palette
- Service worker for offline app-shell caching
- Browser notification hooks for match alerts

## Current Status

This repo currently runs without a build step or external dependencies. Data is saved in `localStorage`, so it persists on the same device/browser but does not yet sync across phones.

Planned backend work is documented in [backend.md](backend.md). The intended production architecture is:

- Vercel for hosting
- Firebase for team linking and shared data sync
- Shared collections for schedules, teams, watchlist entries, reminders, and scout reports
- Push notification support for match reminders

## Project Structure

```text
.
├── app.js                 # App state, navigation, forms, local persistence, notification hooks
├── assets/
│   └── icon.svg           # PWA/app icon
├── backend.md             # Backend sync requirements and notes
├── index.html             # Main app shell
├── manifest.webmanifest   # PWA install metadata
├── overview.md            # Product/design requirements
├── package.json           # Local server scripts
├── styles.css             # Mobile-first UI and theme styles
└── sw.js                  # Service worker cache logic
```

## Run Locally

From the repo root:

```bash
npm run dev
```

Then open:

```text
http://localhost:4173
```

The app can also be served directly with Python:

```bash
python3 -m http.server 4173
```

## Using The App

1. Open the app on a phone-sized viewport or mobile browser.
2. Use the bottom dock to move between Home, Schedule, Scout, Watchlist, and Teams.
3. Add schedule data from the Schedule tab.
4. Add team numbers and names from the Teams tab.
5. Start scout reports from the center Scout dock button or the Home screen scout-next card.
6. Use Settings to switch between dark and light mode.
7. Use the sharing button in the top-left to view the current mock team-linking flow.

## Data Model

The frontend currently stores this shape of data in `localStorage` under `ftc-companion-v3`:

- `eventName`
- `theme`
- `syncCode`
- `teams`
- `schedule`
- `reports`
- `watchlist`
- `reminders`

This is intentionally close to the future Firebase sync model, so the local store can later be replaced with real-time backend reads/writes.

## Backend TODO

- Add Firebase project configuration
- Create team/session linking with unique share codes
- Replace local schedule/team/report/watchlist/reminder writes with synced Firebase writes
- Add permissions or team-scoped access rules
- Add real push notification scheduling for upcoming matches
- Add conflict handling for multiple people editing the schedule
- Consider QR scanning/generation for easier app linking

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
python3 -m json.tool manifest.webmanifest
curl -I http://localhost:4173/
```

`curl` requires the local server to be running first.
