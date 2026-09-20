# MiniGames — Home Page (RS School task)

Responsive Home Page SPA built with **TypeScript + SCSS**, bundled with **Vite**.
No frameworks — plain DOM components, design tokens from the UI Kit, and mock data
from the provided JSON files.

## Requirements

- Node.js 18+ (Node 20 LTS recommended)
- npm 9+

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Other scripts

```bash
npm run build         # type-check + production build into dist/
npm run preview        # serve the production build locally (after npm run build)
npm run lint            # ESLint, zero warnings/errors expected
npm run lint:fix        # ESLint with autofix
npm run format           # Prettier — write
npm run format:check     # Prettier — check only
```

## Project structure

```
src/
├── assets/                 # (icons are inline SVG in src/utils/icons.ts)
├── components/
│   ├── header/              # Guest / Authenticated header, responsive nav
│   ├── burger-menu/          # Mobile & tablet nav drawer
│   ├── hero/                  # "Take a Short Break & Have Fun" banner
│   ├── carousel/               # "New Games" slider (scroll + disabled arrows)
│   ├── leaderboard/             # "Top Players This Week" table
│   ├── dev-section/              # "Are You a Game Developer?" block
│   ├── footer/                    # Site footer
│   ├── auth-dialog/                # Login / Register <dialog> with validation
│   └── shared/                      # Small shared bits (section eyebrow label)
├── state/                    # Tiny pub-sub session store (guest/authenticated)
├── styles/                    # Design tokens, breakpoints, mixins, reset, typography
├── types/                      # game.ts, leaderboard.ts, auth.ts
├── mocks/                        # games.json, leaderboard.json, categories.json
└── index.ts                       # Entry point — mounts everything into #app
```

## Notes

- All colors/fonts/sizes come from `src/styles/_tokens.scss`, generated from the
  UI Kit's Color/Font/Size token sheets — no magic values in component styles.
- Breakpoints: Mobile ≤768px, Tablet 769–1024px, Desktop ≥1025px
  (`src/styles/_breakpoints.scss`).
- The Auth Dialog is a native `<dialog>`: closes on the ✕ button, backdrop click,
  and <kbd>Esc</kbd>. Body scroll is locked while it — or the mobile burger menu —
  is open.
- Game card and hero illustrations that weren't provided as image assets are
  hand-drawn inline SVG, so the app has zero missing-asset placeholders.
- There's no real backend: a successful Login/Register just switches the header
  into the Authenticated state (uses the typed-in email/username as the display
  name), and Log Out returns to Guest.
