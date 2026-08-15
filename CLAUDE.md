# Tính tiền cầu lông (app-cal-badminton)

Mobile-first React + TypeScript + Vite web app for splitting badminton session costs. Deployed to GitHub Pages from `main`.

## Commands

- `npx vitest run` — run the test suite
- `npm run build` — typecheck (`tsc`) + production build; must pass before pushing
- `npm run dev` — local dev server
- `npm run design:gallery` — regenerate `superdesign/gallery.html` from `superdesign/metadata.json`

## UI design (REQUIRED — mockup before React)

New screens and significant layout changes go through an HTML mockup in `superdesign/` **before** any React code. Invoke the project skill `/superdesign` — it holds the full workflow (ASCII wireframe → approval → mockup → gallery → code).

- `superdesign/design-system.md` is the single source of truth for design tokens, extracted from `src/`. Read it before drawing; update it in the same commit whenever the real UI changes a shared token (primary colour, radii, control heights).
- `superdesign/gallery.html` is generated — never hand-edit it. Add the mockup to `superdesign/metadata.json` and run `npm run design:gallery`.
- Small fixes (copy, one Tailwind class, button order, display bugs) skip this entirely — edit React directly.

## Commit convention (REQUIRED — releases depend on it)

Every push to `main` automatically creates a GitHub Release (`.github/workflows/release.yml`). The version bump is inferred from Conventional Commit prefixes across all commits since the previous release, so commit subjects MUST follow this format:

- `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`, `test:` → **patch** bump (v1.0.x)
- `feat:` → **minor** bump (v1.x.0) — use for any new user-facing feature
- `feat!:` (any `type!:`) or a `BREAKING CHANGE` line in the body → **major** bump (vX.0.0) — use when existing users are affected (e.g. localStorage data format changes that old saved data can't survive, removing a calculation mode)

Manual overrides, honored only in the HEAD commit subject line:

- `[release minor]` / `[release major]` — force a bigger bump
- `[skip release]` — no release for this push (use for docs/CI-only changes when a release would be noise)

When merging a feature branch into `main`, make sure the merge/HEAD commit subject carries the right prefix — with multiple commits pushed at once, the workflow scans the whole range, so a single `feat:` commit anywhere in the push is enough for a minor bump.

## README (REQUIRED — keep in sync with features)

Releases are automated, README is not. Every user-facing feature (`feat:` commit) MUST update the "Tính năng chính" section of `README.md` in the same branch, before merging into `main` — a short Vietnamese bullet in the existing style. While touching README, also refresh stale counts if noticed (e.g. the test-case number in Tech Stack). Docs-only README syncs use a `docs:` prefix and never a `[skip release]` marker (it would cancel the release of feature commits pushed together with it).
