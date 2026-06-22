# KaraokeFactory — Design Context

> Persisted design context for the KaraokeFactory project. All future design decisions
> (UI changes, new screens, components, copy, animations) should respect these principles.

## Design Context

### Users

**Primary personas** (gathered from `README.md` + `pages/`):

1. **Host (TV owner)** — Someone throwing a party at home or in a small venue. They
   own a large TV, create a room, and run the karaoke session. They need a
   *hands-off* experience once the party starts: room code visible, big readable
   text, easy "play next" controls.
2. **Guest (mobile singer)** — A party guest who scans/joins the room from their
   phone, adds songs, sees the queue, sings solo or in a duet, and watches their
   score. They are likely in a loud, dark, social environment — touching the
   screen with one finger, possibly half-watching the TV instead of the phone.

**Context of use:** A social party, often in the evening. The TV is the
"stage" (display), the phones are the "microphones" (control). Bandwidth and
latency matter because songs stream from YouTube in real time. Many users
simultaneously. The host needs the queue, the score, and the next-up song to
always be visible at a glance.

**Job to be done:** Turn any TV + phones into a karaoke party with zero setup
friction and maximum fun.

### Brand Personality

**Three words:** Divertido · Festivo · Vibrante (Fun · Festive · Vibrant)

**Voice & tone:** Energetic, welcoming, informal. Portuguese (pt-BR) as the
default with English (en) as secondary. Uses "você", not "tu". Emojis are
welcomed in copy (🎤, 🎉, 🎙️) when they reinforce energy.

**Existing brand signals (do not change without intent):**
- **Logo:** KaraokeFactory — colorful, neon, retro-modern (microphone + disco
  ball + city skyline). Lives in `frontend/public/logo.png` (1024×682).
- **Primary color:** `#FF0080` (hot pink) — used for links, active states, glow
  effects, brand emphasis. Hex `#FF0080` is sacred.
- **Background:** `#0A0A0A` (near-black). Pure dark mode, no light theme.
- **Accent support:** Cyan `#00C8FF` and purple `#B400FF` appear in glow/gradient
  contexts (ScoreOverlay, LanguageSwitcher active states).
- **Typography:** Inter (UI body) + Outfit (score overlay headlines). Loaded
  from Google Fonts.

### Aesthetic Direction

**Visual tone:** Dark immersive UI with neon accents. The TV screen should
*feel* like a stage — black background, glowing pink text, subtle gradient
haze, no clutter. The phone UI should feel like a *controller* — focused,
high-contrast, big touch targets.

**References (positive):**
- Spotify's dark mode (cards on near-black, vivid accent)
- Apple TV's immersive screens (full-bleed video with floating UI)
- Modern karaoke game UIs (e.g. SingStar, Let's Sing) — bold, celebratory

**Anti-references (explicit "do not look like"):**
- Old-school karaoke sites (Y2K aesthetic, Comic Sans, clip art, busy
  gradients, glitter GIFs, early-2000s blue/purple)
- Retro 80s/90s karaoke machines (CRT scanlines, neon-tube lettering)
- Generic SaaS admin templates (Tailwind UI defaults, gray-100 cards, blue-500
  buttons)

**What to avoid:**
- Light mode or any "soft white" surfaces (we are dark-only)
- Heavy drop shadows on light backgrounds (use glow on dark instead)
- Stock-photo corporate imagery
- Tailwind defaults like `bg-blue-500` or `text-gray-700` — every color should
  be intentional and match the brand

### Design Principles

These five principles guide every design decision in this project:

1. **Stage-first hierarchy.** The most important info at any moment must be
   readable from across the room on a TV: room code, currently playing song,
   next singer, current score. When in doubt, make it bigger and bolder.

2. **Pink is sacred.** `#FF0080` is the brand. Use it for primary actions,
   active states, and emphasis. Don't dilute it with other accent colors as
   primary CTAs. Reserve cyan/purple for ambient glow and score celebrations
   only.

3. **Touch targets fit a party.** Phones are operated one-handed, often by
   people slightly distracted by the TV. Minimum 44×44px tap targets,
   generous spacing, no hover-only states (party lights make hover invisible).

4. **Celebration over chrome.** Animation and feedback should reward action.
   Score reveals, queue updates, and successful actions must feel *alive* —
   pulse, shimmer, scale. Avoid flat utilitarian "form submitted" patterns.

5. **Dark immersive, not dark depressing.** The dark background enables the
   stage feeling, but the UI must not feel lifeless. Layered glows, gradient
   borders, subtle haze, and accent-on-black keep it premium and warm.

### Out of scope (acknowledged constraints)

- **Accessibility:** Formal WCAG compliance is **not prioritized** at this
  stage. We still aim for reasonable contrast (pink-on-black passes AA at
  large sizes) and visible focus states on form inputs, but no automated
  testing, no full keyboard nav audit, no screen-reader pass.
- **i18n:** Supported locales are pt-BR and en. Don't add new locales without
  design discussion.
- **Themes:** Dark only. No light theme planned.

---

## How to use this context

When proposing or implementing any UI change:
- Read this file first.
- Check your change against the 5 design principles.
- If your change contradicts any principle, justify it explicitly or rethink.
- When in doubt about color, the only safe primary is `#FF0080`. Glows and
  ambient effects can use cyan/purple gradients.

Last updated: 2026-06-17 (via `teach-impeccable` workflow).
