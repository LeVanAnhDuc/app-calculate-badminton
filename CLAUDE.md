# Tính tiền cầu lông (app-cal-badminton)

Mobile-first React + TypeScript + Vite web app for splitting badminton session costs. Deployed to GitHub Pages from `main`.

## Commands

- `npx vitest run` — run the test suite
- `npm run build` — typecheck (`tsc`) + production build; must pass before pushing
- `npm run dev` — local dev server

## Commit convention (REQUIRED — releases depend on it)

Every push to `main` automatically creates a GitHub Release (`.github/workflows/release.yml`). The version bump is inferred from Conventional Commit prefixes across all commits since the previous release, so commit subjects MUST follow this format:

- `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`, `test:` → **patch** bump (v1.0.x)
- `feat:` → **minor** bump (v1.x.0) — use for any new user-facing feature
- `feat!:` (any `type!:`) or a `BREAKING CHANGE` line in the body → **major** bump (vX.0.0) — use when existing users are affected (e.g. localStorage data format changes that old saved data can't survive, removing a calculation mode)

Manual overrides, honored only in the HEAD commit subject line:

- `[release minor]` / `[release major]` — force a bigger bump
- `[skip release]` — no release for this push (use for docs/CI-only changes when a release would be noise)

When merging a feature branch into `main`, make sure the merge/HEAD commit subject carries the right prefix — with multiple commits pushed at once, the workflow scans the whole range, so a single `feat:` commit anywhere in the push is enough for a minor bump.
