# Plan: Fix and Deploy Site

> Project: Karaokeando (karaokeaparty.netlify.app)
> Task: Troubleshooting changes and deployment

## Phase 1: Analysis & Quick Fixes
- [ ] Centralize admin playlist API functions from `AdminPlaylists.tsx` to `api.ts` (Cleaner architecture).
- [ ] Implement missing translations for Admin dashboard in `pt` and `en`.
- [ ] Verify Tailwind build issue mentioned in the last commit.
- [ ] Identify why deployment "didn't work out".

## Phase 2: UX & SEO Improvements
- [ ] Address UX Audit failures (Contrast, accessibility, labels).
- [ ] Address SEO Check failures (Meta tags, title).

## Phase 3: Deployment & Verification
- [ ] Run `npm run build` in both frontend and backend (if applicable).
- [ ] Run `python3 .agent/scripts/verify_all.py .` to ensure all tests pass.
- [ ] Perform deployment using Netlify CLI or through the MCP.
- [ ] Verify live site URL.

## Specialist Agents
- `frontend-specialist`: For UI/UX and translations.
- `devops-engineer`: For deployment investigation.
- `debugger`: For identifying why previous changes failed.
