# T-010 — Next.js web app scaffold, routing, theme

**Phase 1 · Depends on: nothing · Size: 1 day**

*Renamed from "Expo project scaffold" on 2026-08-31 when the project pivoted from a native Android app to a mobile-first web app. Filename kept as T-010 for continuity with `PROGRESS.md` and dependent specs.*

## Goal

A running Next.js web app, installable as a PWA, with the navigation skeleton, the design tokens, and the shared components in place. Nothing does anything useful yet — but every later task builds on this shape.

## In scope

- `npx create-next-app@latest` with the App Router, TypeScript strict mode.
- App Router structure per `docs/01-architecture.md`: `(onboarding)`, `(tabs)`, `tank/[id]`, `emergency`.
- `src/theme/tokens.ts` with the full palette, type scale and spacing from `docs/04-design-system.md`, light and dark — using CSS custom properties or a Tailwind theme config, whichever fits the design system doc.
- A theme hook/mechanism that follows the OS colour scheme (`prefers-color-scheme`).
- The shared component set from the design system: `Screen`, `Card`, `SeverityCard`, `Chip`, `Field`, `PrimaryButton`, `SecondaryButton`, `DangerButton`, `Banner`, `EmptyState`, `Confidence`, `GroundingLink`.
- A `/dev/components` route showing every component in both themes, for eyeballing.
- `src/constants/app.ts` holding the product name in one place — the name is not final.
- A persistent bottom tab bar for mobile viewports (Tanks, Dex, Ask, Settings), matching the old five-screen layout.
- Zustand installed for UI state. **TanStack Query is not needed yet** — do not add it until T-013.
- PWA basics: `manifest.json` with app name, icons (placeholder is fine for now), `display: standalone`; a minimal service worker registered (even if it does nothing but cache the app shell for now — Web Push comes in T-018).

## Out of scope

Any feature screens, the database, AI, Web Push. Placeholder screens only.

## Rules that will be got wrong if not stated

- **No hard-coded colours, spacing or font sizes in components.** Everything from tokens.
- Mobile-first: design and test at a phone-width viewport (~375–430px) first; verify nothing breaks at wider widths, but do not optimize the layout for desktop.
- Body text minimum 16px. Do not disable text zoom/scaling (no `maximum-scale=1` or `user-scalable=no` in the viewport meta tag) — that is an accessibility regression on web exactly as font-scaling lockout would have been on native.
- HTTPS is required in production for camera access, OPFS and Web Push to work at all — Vercel gives this by default, but if self-hosting, do not skip it.

## Acceptance criteria

1. `npm run dev` runs and the app opens correctly in a mobile-width browser window (or on Jaideep's phone, pointed at the dev server on the same network).
2. The tab bar shows Tanks, Dex, Ask, Settings, and tapping each shows a different placeholder screen.
3. Opening `/dev/components` shows every shared component.
4. Switching the OS between light and dark mode changes the app's appearance correctly — no unreadable text in either.
5. Increasing the browser/OS text size does not break any screen.
6. "Add to Home Screen" on a real Android phone (Chrome) installs the app and it opens full-screen, without the browser UI.
7. A first deploy to Vercel (or the chosen host) is live at a real URL.

## Notes for Claude Code

End with the exact commands to run the dev server and to deploy, and how Jaideep opens the app on his phone (both via the dev server on his local network, and via the deployed URL) and installs it to his home screen. He has not done this before.
