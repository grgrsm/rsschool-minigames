## Description

<!-- What does this PR implement? Link the task / issue. -->

## Task checklist

- [ ] Layout matches Desktop (≥1025px), Tablet (769–1024px) and Mobile (≤768px) mockups
- [ ] Burger menu implemented for mobile, blocks body scroll while open
- [ ] Header has Guest and Authenticated states
- [ ] Auth dialog: Login/Register tabs, validation, closes on ✕ / backdrop / Esc
- [ ] "New Games" carousel scrolls left/right, arrow buttons disable at the edges
- [ ] "Top Players This Week" table renders from `leaderboard.json`
- [ ] No `console.log` left in the code
- [ ] No magic numbers/colors — everything comes from SCSS design tokens
- [ ] No explicit `any` anywhere in TypeScript
- [ ] No content is laid out as a raw image where semantic markup applies
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run format:check` passes

## Screenshots

<!-- Attach Desktop / Tablet / Mobile screenshots -->

## How to test

```bash
npm install
npm run dev
```
