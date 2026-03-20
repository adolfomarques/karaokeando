# Liquid Glass Redesign Plan

## Overview
A comprehensive UI/UX overhaul for Karaokeando, implementing the **"Liquid Glass System"**. This design shifts from a standard dark theme to a premium, layered aesthetic with depth, transparency, and soft neon glows.

**Project Type:** WEB
**Primary Goal:** Premium, futuristic karaoke experience with Apple-like liquid glass aesthetics.

## Success Criteria
- [ ] All containers (cards, modals, panels) use the glass effect (20px blur, thin border).
- [ ] Primary buttons use the Pink-to-Red gradient with glow.
- [ ] Background features animated gradients and blur blobs.
- [ ] High contrast maintained (WCAG AA) despite transparency.
- [ ] Rounded corners (16-24px) consistently applied.
- [ ] All pages (Home, RoomTV, RoomMobile, Join) are visually unified.

## Tech Stack
- **Framework:** React / Vite
- **Styling:** CSS3 (Custom Variables, Backdrop-filter, Keyframe Animations)
- **Icons:** SVG (Lucide/Custom)

## File Structure Changes
- `frontend/src/index.css`: Major update for design tokens and global component overrides.
- `frontend/src/pages/Home.tsx`: Layout restructure for Hero and feature sections.
- `frontend/src/pages/RoomTV.tsx`: Component styling updates.
- `frontend/src/pages/RoomMobile.tsx`: Component styling updates.
- `frontend/src/pages/Join.tsx`: Layout and button updates.

## Task Breakdown

### Phase 1: Foundation (Design Tokens & Global CSS)
- **Task ID:** foundation-1
- **Name:** Define Liquid Glass Tokens
- **Agent:** @frontend-specialist
- **Input:** `index.css`
- **Output:** Updated `index.css` with CSS variables for the new system.
- **Verify:** Check that variables like `--glass-bg`, `--primary-glow`, etc., are defined.

- **Task ID:** foundation-2
- **Name:** Implement Animated Background
- **Agent:** @frontend-specialist
- **Input:** `index.css`, `App.tsx` (or top-level layout)
- **Output:** A globally applied animated background with blur blobs.
- **Verify:** Visual check for smooth movement and soft color transitions.

### Phase 2: Component Overhaul
- **Task ID:** components-1
- **Name:** Liquid Glass Containers
- **Agent:** @frontend-specialist
- **Input:** `index.css`
- **Output:** Refactored `.card` and new global container classes.
- **Verify:** Inspect element for `backdrop-filter: blur(20px)` and semi-transparent borders.

- **Task ID:** components-2
- **Name:** Premium Buttons & Inputs
- **Agent:** @frontend-specialist
- **Input:** `index.css`
- **Output:** Updated global button and input styles with gradients and glow.
- **Verify:** Check hover/active states for scale transitions and glow intensity.

### Phase 3: Home & Layout Restructure
- **Task ID:** layout-1
- **Name:** Home Hero Floating Container
- **Agent:** @frontend-specialist
- **Input:** `Home.tsx`
- **Output:** Hero section redesigned as a floating glass panel.
- **Verify:** Layout matches the "floating hero glass container" description.

- **Task ID:** layout-2
- **Name:** Feature Cards & Stats Strip
- **Agent:** @frontend-specialist
- **Input:** `Home.tsx`
- **Output:** Grid of glass feature cards and a subtle stats section.
- **Verify:** Check responsive behavior on mobile vs desktop.

### Phase 4: Full App Consistency
- **Task ID:** consistency-1
- **Name:** Room TV & Mobile Refactor
- **Agent:** @frontend-specialist
- **Input:** `RoomTV.tsx`, `RoomMobile.tsx`
- **Output:** Updated real-time views using the glass system.
- **Verify:** Visual consistency across TV and Mobile player.

### Phase 5: Verification & Deploy
- **Task ID:** verification-1
- **Name:** Final Audit & Build
- **Agent:** @devops-engineer
- **Input:** Current codebase
- **Output:** Successful build and audit report.
- **Verify:** `npm run build` and `ux_audit.py` pass.

- **Task ID:** deploy-1
- **Name:** Netlify Deployment
- **Agent:** @devops-engineer
- **Input:** `dist` folder
- **Output:** Production deployment.
- **Verify:** Site live on `karaokefactory.org`.

## Phase X: Final Verification Checklist
- [ ] No purple hex codes (Primary is PINK #FF0080).
- [ ] All cards have `backdrop-filter`.
- [ ] Socratic Gate questions answered.
- [ ] Build success.
- [ ] Deployed to Production.

## ✅ PHASE X COMPLETE
- Status: PENDING
