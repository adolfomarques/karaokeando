Crie sua própria festa!# i18n Implementation Plan

## Overview
Implement Internationalization (i18n) for the KaraokeFactory platform, establishing English as the primary language and Brazilian Portuguese as the secondary language. Include a persistent language switcher, dynamic SEO metadata, and completely translate all static texts.

## Project Type
WEB

## Success Criteria
- [ ] `react-i18next` is successfully installed and configured.
- [ ] English (EN) is set as the default/base language; Portuguese (PT-BR) is secondary.
- [ ] User can switch between EN and PT-BR seamlessly.
- [ ] Language preference is persisted in `localStorage`.
- [ ] HTML `lang` and `hreflang` tags update dynamically for SEO.
- [ ] No hardcoded strings remain in the frontend application code.
- [ ] Both languages have professional, consistent translations for all UI elements.

## Tech Stack
- `react-i18next` & `i18next`: Standard, robust internationalization ecosystem for React.
- `react-helmet-async` (or native React `useEffect` hooks): To handle dynamic SEO meta tags, `lang` attributes, and `hreflang` in the document `<head>`.

## File Structure
```
frontend/
├── src/
│   ├── locales/
│   │   ├── en/
│   │   │   └── translation.json
│   │   └── pt/
│   │       └── translation.json
│   ├── i18n.ts (Configuration definition)
│   ├── components/
│   │   └── LanguageSwitcher.tsx
│   └── main.tsx (Importing i18n)
```

## Task Breakdown

### Task 1: Setup i18n Framework and Translations
**Agent:** `frontend-specialist` | **Skill:** `i18n-localization`
**Priority:** P1
**Dependencies:** None
**INPUT:** Empty localization state. Install `i18next` and `react-i18next`. Create locale files.
**OUTPUT:** `i18n.ts` config file, `locales/en/translation.json`, and `locales/pt/translation.json` created. All initial hardcoded static texts translated professionally by `documentation-writer` and placed inside these JSON files.
**VERIFY:** Start the app, ensure `i18n` object initializes correctly without console errors.

### Task 2: Language Switcher Component
**Agent:** `frontend-specialist` | **Skill:** `frontend-design`
**Priority:** P2
**Dependencies:** Task 1
**INPUT:** Configured i18n. Requirement for a persistent Language Switcher.
**OUTPUT:** A Dropdown or Toggle component (`LanguageSwitcher.tsx`) storing selection in `localStorage` via `i18next-browser-languagedetector` or manual storage. Integrated into the global layout/header.
**VERIFY:** Toggling the switcher updates the active language in memory, and the choice persists upon page reload.

### Task 3: Replace Hardcoded Strings in Components
**Agent:** `frontend-specialist` | **Skill:** `clean-code`
**Priority:** P1
**Dependencies:** Task 1
**INPUT:** `Home.tsx`, `RoomTV.tsx`, `RoomMobile.tsx` currently containing hardcoded text.
**OUTPUT:** All strings replaced with the `useTranslation` hook (`t('key')`).
**VERIFY:** Application UI renders text correctly according to the selected language context. No missing key warnings.

### Task 4: SEO and Dynamic Metadata Configuration
**Agent:** `seo-specialist` | **Skill:** `seo-fundamentals`
**Priority:** P2
**Dependencies:** Task 1, Task 2
**INPUT:** Need for dynamic `html lang`, `hreflang`, and varying metadados per language.
**OUTPUT:** Implementation that natively listens to i18n language change events and updates the outer `<html lang="x">` tag, title, description, and canonical/hreflang links.
**VERIFY:** Inspecting the DOM shows correct `<html lang="en">` (or `pt`) attribute and `<head>` tags that instantly react to language changes.

## Phase X: Verification (Checklist)
- [ ] **Code Scan:** Use `grep` to search for common Portuguese words directly in `.tsx` files to guarantee zero hardcoded strings.
- [ ] **SEO Check:** Validate the `<html lang>` element syncs with the current `i18n.language`.
- [ ] **Lint and Build:** Run `npm run lint` and `npm run build` to ensure no Typescript/Build errors were introduced during the massive text extraction.
- [ ] **UX Check:** Switcher is easily accessible on mobile and desktop layouts without breaking the design.
