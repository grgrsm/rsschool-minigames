/**
 * Inline SVG icon strings. Kept centralized so markup stays semantic
 * (no `<img>` standing in for icons/buttons) while avoiding duplication.
 * All icons use `currentColor` so they inherit color from CSS.
 */
export const icons = {
  logo: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4Z" fill="currentColor"/><path d="M9 12.5 11 14.5 15.5 10" stroke="var(--color-on-primary)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  arrowLeft: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  arrowRight: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  burger: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,

  close: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,

  star: `<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5Z"/></svg>`,

  heart: `<svg viewBox="0 0 20 18" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M10 17.3 2.4 10c-2-1.9-2-5 0-6.9 1.9-1.8 4.9-1.8 6.8 0L10 3.9l.8-.8c1.9-1.8 4.9-1.8 6.8 0 2 1.9 2 5 0 6.9L10 17.3Z"/></svg>`,

  streak: `<svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M10 1c1 3-2 4-2 7a3 3 0 1 0 6 0c1.5 1.5 2 3.3 2 5a6 6 0 1 1-12 0c0-4.5 4-5.5 6-12Z"/></svg>`,

  upload: `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 14v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  chevronDown: `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true"><path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  socialX: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 3l7.5 9.2L3.4 21H6l5.8-6.6L16.7 21H21l-7.8-9.6L20.4 3H18l-5.3 6-4.6-6H3z"/></svg>`,

  socialShare: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="19" r="2.4" stroke="currentColor" stroke-width="1.6"/><path d="M8.1 10.8 15.9 6.2M8.1 13.2l7.8 4.6" stroke="currentColor" stroke-width="1.6"/></svg>`,

  mail: `<svg viewBox="0 0 20 16" width="16" height="16" fill="none" aria-hidden="true"><rect x="1" y="1" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 2.5 10 9l8-6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  lock: `<svg viewBox="0 0 18 20" width="16" height="16" fill="none" aria-hidden="true"><rect x="1.5" y="8.5" width="15" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 8.5V6a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  user: `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><circle cx="10" cy="6.5" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 18c1-4 4-6 7.5-6s6.5 2 7.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  eye: `<svg viewBox="0 0 22 16" width="18" height="14" fill="none" aria-hidden="true"><path d="M1 8s4-6.5 10-6.5S21 8 21 8s-4 6.5-10 6.5S1 8 1 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="11" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/></svg>`,

  eyeOff: `<svg viewBox="0 0 22 18" width="18" height="15" fill="none" aria-hidden="true"><path d="M2 2l18 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.9 4.6c.36-.06.72-.1 1.1-.1 6 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3.6 4.1M6.2 5.6C3.2 7.3 1 10.5 1 10.5s4 6.5 10 6.5c1.3 0 2.5-.3 3.6-.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.6 9.2a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  google: `<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.45 3.4 1.3l2.6-2.6C13.5.8 11.4 0 9 0A9 9 0 0 0 .9 5l3 2.3C4.6 5.1 6.6 3.6 9 3.6Z"/></svg>`,

  chat: `<svg viewBox="0 0 22 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M2 3.5h18v11H9.5L5 18v-3.5H2v-11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,

  github: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.7 5.47 7.78.4.08.55-.18.55-.4 0-.2-.01-.86-.01-1.56-2.01.38-2.53-.5-2.7-.96-.09-.24-.48-.96-.82-1.16-.28-.15-.68-.53-.01-.54.63-.01 1.08.6 1.23.85.72 1.24 1.87.89 2.33.68.07-.53.28-.89.51-1.1-1.78-.2-3.64-.92-3.64-4.05 0-.9.31-1.63.82-2.21-.08-.2-.36-1.04.08-2.16 0 0 .67-.22 2.2.85a7.4 7.4 0 0 1 4 0c1.53-1.07 2.2-.85 2.2-.85.44 1.12.16 1.96.08 2.16.51.58.82 1.3.82 2.21 0 3.14-1.87 3.85-3.65 4.05.29.26.54.75.54 1.52 0 1.1-.01 1.99-.01 2.26 0 .22.15.48.55.4A8.22 8.22 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z"/></svg>`,
};
