# Tính tiền cầu lông (app-cal-badminton)

Mobile-first React + TypeScript + Vite web app for splitting badminton session costs. Deployed to GitHub Pages from `main`.

## Commands

- `pnpm exec vitest run` — run the test suite
- `pnpm build` — typecheck (`tsc`) + production build; must pass before pushing
- `pnpm dev` — local dev server
- `pnpm design:gallery` — regenerate `superdesign/gallery.html` from `superdesign/metadata.json`

## UI design (REQUIRED — mockup before React)

New screens and significant layout changes go through an HTML mockup in `superdesign/` **before** any React code. Invoke the project skill `/superdesign` — it holds the full workflow (ASCII wireframe → approval → mockup → gallery → code).

- `superdesign/design-system.md` is the single source of truth for design tokens, extracted from `src/`. Read it before drawing; update it in the same commit whenever the real UI changes a shared token (primary colour, radii, control heights).
- `superdesign/gallery.html` is generated — never hand-edit it. Add the mockup to `superdesign/metadata.json` and run `pnpm design:gallery`.
- Small fixes (copy, one Tailwind class, button order, display bugs) skip this entirely — edit React directly.

## Code organization (mirrors `web-app-ducker-id/client`)

`src/` is layer-based, adapted from the Ducker ID client's `.claude/rules/` for a Vite SPA:

- Routing (React Router v8, data router): `router.tsx` holds the route table (`/`, `/history`, `/roster`, `/account` — signed-out it redirects to `/` — and everything else redirects to `/`); `layouts/RootLayout` renders the Toaster, `PersistStore` and `<Outlet/>`. `App.tsx` only provides the store and the router, and `main.tsx` calls `captureCallback()` **before** mounting so the router never sees `?code=`.
- `pages/<Name>Route/` — thin route components: read the store, wire `useNavigate`/`useGoBack`, render a view. `views/` and `components/` never import from `react-router` (only `router.tsx`, `layouts/`, `pages/` and `hooks/useGoBack` do), so view tests need no router.
- Shared state lives in a Zustand store: `stores/index.ts` (`createAppStore`, a factory) + `stores/slices/{session,roster,history}.ts`, typed in `types/stores/`. `contexts/AppStoreProvider` creates one store per `<App/>` mount — never a module-level singleton, or tests and remounts leak state. Read it with `useAppStore(selector)`; `ghosts/PersistStore` mirrors it into localStorage.
- `views/<Page>Page/` — one folder per page. `index.tsx` composes `mains/` (sections it renders directly); `components/` holds pieces used only inside that page; `hooks/` holds view-local state hooks.
- `components/<Name>/index.tsx` — UI used by 2+ pages. One component per folder, arrow function, a single `export default` named after the folder, props typed inline (no `interface Props`). `components/Icons/` is the one exception: a family of SVG icons with named exports.
- `hooks/useX.ts` (default export, re-exported from `hooks/index.ts`), `utils/` (pure functions), `libs/` (side effects: localStorage, canvas, sharing, OIDC), `requests/` (network), `constants/`, `types/<Domain>/index.ts` (every shared type — never `export type` from utils/libs/components).
- Imports use the `@/` alias (relative only inside the same view), grouped in this order with a comment per group: `// libs`, `// types` (all `import type`, enforced by `verbatimModuleSyntax`), `// components`, `// hooks`, `// requests`, `// others`.
- Tests stay colocated (`index.test.tsx` next to the component). Run `pnpm format` (Prettier, Ducker ID config) before committing.

GitHub Pages has no SPA fallback, so `pnpm build` copies `dist/index.html` to `dist/404.html` (`scripts/spa-fallback.cjs`); the router basename is Vite's `BASE_URL` **with** its trailing slash.

Not adopted from Ducker ID: moving every effect into a ghost (only the persistence effect lives in `ghosts/`), the 200-line view limit, one-JSX-return-per-component, and the merged `CONSTANTS` object.

## Commit convention (REQUIRED — releases depend on it)

Every push to `main` automatically creates a GitHub Release (`.github/workflows/release.yml`). The version bump is inferred from Conventional Commit prefixes across all commits since the previous release, so commit subjects MUST follow this format:

- `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`, `test:` → **patch** bump (v1.0.x)
- `feat:` → **minor** bump (v1.x.0) — use for any new user-facing feature
- `feat!:` (any `type!:`) or a `BREAKING CHANGE` line in the body → **major** bump (vX.0.0) — use when existing users are affected (e.g. localStorage data format changes that old saved data can't survive, removing a calculation mode)

Manual overrides, honored only in the HEAD commit subject line:

- `[release minor]` / `[release major]` — force a bigger bump
- `[skip release]` — no release for this push (use for docs/CI-only changes when a release would be noise)

When merging a feature branch into `main`, make sure the merge/HEAD commit subject carries the right prefix — with multiple commits pushed at once, the workflow scans the whole range, so a single `feat:` commit anywhere in the push is enough for a minor bump.

## README — keep `## Features` in sync

Releases are automated, README is not. Every user-facing feature (`feat:` commit) also updates the `## Features` section of `README.md` in the same branch, before merging into `main` — a short English bullet in the existing style. While touching README, also refresh stale counts if noticed (e.g. the test-case number in Tech Stack). Docs-only README syncs use a `docs:` prefix and never a `[skip release]` marker (it would cancel the release of feature commits pushed together with it).
