---
name: KaraokeFactory
description: Social real-time karaoke party platform
colors:
  midnight-black: "#0A0A0A"
  neon-pink: "#FF0080"
  neon-pink-gradient: "#FF4D6D"
  purple-glow: "#7928CA"
  text-white: "#FFFFFF"
  text-secondary: "rgba(255, 255, 255, 0.62)"
  text-tertiary: "rgba(255, 255, 255, 0.50)"
  text-muted: "rgba(255, 255, 255, 0.40)"
  glass-bg: "rgba(255, 255, 255, 0.05)"
  glass-bg-heavy: "rgba(255, 255, 255, 0.08)"
  glass-border: "rgba(255, 255, 255, 0.10)"
  admin-cyan: "#00f5ff"
  error-red: "#ff6b6b"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 9vw, 5.5rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 5vw, 2.5rem)"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.15
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.15em"
rounded:
  glass: "20px"
  input: "12px"
  button: "999px"
  admin: "0"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  section: "70px"
components:
  button-primary:
    backgroundColor: "{colors.neon-pink}"
    textColor: "{colors.text-white}"
    rounded: "{rounded.button}"
    padding: "12px 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neon-pink}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  input-default:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.text-white}"
    rounded: "{rounded.input}"
    padding: "14px 18px"
  glass-card:
    backgroundColor: "{colors.glass-bg}"
    rounded: "{rounded.glass}"
    padding: "44px 48px"
---

# Design System: KaraokeFactory

## 1. Overview

**Creative North Star: "The Liquid Stage"**

The KaraokeFactory is a dark stage where performers and audience blur together. Every surface is a pane of frosted glass suspended over black — the `midnight-black` background gives way to floating glass cards that catch neon pink and purple light like a nightclub floor. The visual system is not "dark mode" (a grudging fallback) but *dark by identity*: the void is the canvas, and the neon is the energy.

The palette is deliberately compressed: black, white, pink, purple. No warm neutrals, no beige, no pastels. The glass material (5% white with 24px blur) provides depth through translucency rather than hard shadows. Buttons pulse with glow like stage lights, cards levitate on hover, and inputs ignite at focus. This is not a quiet interface — it's a party waiting to happen, and every interaction should feel like part of the show.

**Key Characteristics:**
- Dark canvas with floating glass surfaces (backdrop-filter blur, thin white borders)
- Dual neon accent palette: hot pink (primary) + purple (secondary)
- Pill-shaped buttons with glow, not shadow
- Glass is the universal container — cards, modals, navs all share the same material language
- Admin surfaces use clean cyan (#00f5ff) as a deliberate signal: "you are in control mode"
- Reduced-motion alternative tones down blob animations and glow pulses but preserves opacity transitions

## 2. Colors

A black canvas with two neon spots and an honest white text hierarchy. The background is absolute zero, not "almost black" — `#0A0A0A` is the void, while everything above it is a frosted layer catching colored light.

### Primary
- **Neon Pink** (`#FF0080`): The voice of the brand. Used for primary buttons, active states, glow effects, and the "now playing" highlight. Appears as a gradient `#FF0080 → #FF4D6D` on buttons for warmth at the edge. Glow is `0 0 30px rgba(255, 0, 128, 0.45)` — ambient, not aggressive.

### Secondary
- **Purple Glow** (`#7928CA`): Plays backup to pink — used in the background blob drift animation, in step-2 gradient icons, and in the neon border spin animation. Never the sole accent on a call-to-action.

### Neutral
- **Midnight Black** (`#0A0A0A`): The canvas. Every page background, scrollbar track, and modal backdrop base.
- **Text White** (`#FFFFFF`): Primary body and heading text at full opacity. Never gray.
- **Text Secondary** (`rgba(255, 255, 255, 0.62)`): Supporting text, subtitles, metadata. Equivalent to `#9E9E9E` over black.
- **Text Tertiary** (`rgba(255, 255, 255, 0.50)`): Placeholder text, counters, timestamps.
- **Text Muted** (`rgba(255, 255, 255, 0.40)`): Decorative-only text, footnotes.
- **Glass BG** (`rgba(255, 255, 255, 0.05)`): The base layer for every card, modal, and container.
- **Glass Border** (`rgba(255, 255, 255, 0.10)`): Hairline that defines glass edges.

### Semantic
- **Error Red** (`#ff6b6b`): Validation errors, destructive actions, delete buttons.
- **Admin Cyan** (`#00f5ff`): Exclusive to admin surfaces — sidebar active link, hover border glow. A deliberate break from the party palette, signaling "this is the control room."

### Named Rules

**The Two-Accent Rule.** Pink does action. Purple does atmosphere. Pink is for buttons, active toggles, and CTAs. Purple is for background blobs, decorative gradients, and secondary icon fills. Never swap their roles.

## 3. Typography

**Display Font:** Inter (900, 800, 700, 600, 500, 400, 300)

A single sans-serif stack — Inter in seven weights. No serif, no decorative pair. The personality comes from weight extremes (900 display, 400 body) and negative letter-spacing on headings (tight but legible at `-0.02em`). This is the geometric sans of a neon sign: precise, confident, readable at a distance (important for the TV projection mode).

### Hierarchy

- **Display** (900, `clamp(2.5rem, 9vw, 5.5rem)`, 1.0): Hero CTA and landing page headline only. `text-wrap: balance`. Never used inside a card or body context.
- **Headline** (900, `clamp(1.8rem, 5vw, 2.5rem)`, 1.15): Section titles — "Como funciona", "Pronto para cantar?". `text-wrap: balance`.
- **Title** (800, `1.25rem`, 1.15): Card titles, step headings, "Minhas Salas". Internal content.
- **Body** (400, `0.95rem`, 1.65): All running text, descriptions, participant lists. Max line length: 65–75ch.
- **Label** (700, `0.72rem`, 1, `0.15em` letter-spacing, uppercase): Stats strip labels, small metadata. Used sparingly — one instance per section, never the entire page.

### Named Rules

**The Single-Family Rule.** No font pairing. Inter at 900 and 400 is the contrast axis. If the page needs more distinction, use weight or size, not a second family.

## 4. Elevation

The canvas is flat — absolute zero black. All depth comes from the glass material: semi-transparent white fill (`rgba(255,255,255,0.05)`) with a 24px backdrop blur and a subtle white hairline (`rgba(255,255,255,0.10)`). There are no tonal layers, no nested surfaces, no flat shadows on light gray.

The glass shadow is not a depth cue but a containment cue: `0 10px 40px rgba(0,0,0,0.5)` darkens the perimeter so the card reads as a floating pane against the black void. On hover, the shadow deepens to `0 20px 60px` and the border brightens slightly — the card "lifts" without distorting.

### Shadow Vocabulary

- **Glass Rest** (`0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`): Default state for every glass card, modal, and container. The 1px hairline is the glass edge.
- **Glass Hover** (`0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)`): Elevated state. Used on interactive glass cards (`.glass-card--lift`).
- **Glow Primary** (`0 0 30px rgba(255, 0, 128, 0.45)`): Pink outer glow — active buttons, "now playing" indicator, pulse animation.
- **Glow Strong** (`0 0 50px rgba(255, 0, 128, 0.70)`): Intensified glow for hover states on primary buttons.

### Named Rules

**The Flat-Void Rule.** The background is never gray, never tinted, never gradient. Midnight black (`#0A0A0A`) is the absolute base. Every surface above it is glass, not paint.

## 5. Components

### Buttons

The most energetic element on screen. Pill-shaped (999px) with a pink-to-warm-pink gradient, white text (800 weight), and an ambient glow. They pulse, scale, and glow on interaction.

- **Shape:** Full pill (999px)
- **Primary:** Gradient `#FF0080 → #FF4D6D`, white text, `12px 28px` padding. Glow: `0 0 20px rgba(255, 0, 128, 0.35)`. Hover: `scale(1.04)`, glow intensifies to `0 0 35px rgba(255, 0, 128, 0.65)`. Active: `scale(0.97)`.
- **Ghost** (`.btn-ghost`): Transparent background, 1px pink border at `rgba(255,0,128,0.4)`, pink text. Hover: 10% pink fill + glow.
- **Logout** (`.btn-logout`): Transparent with white border `rgba(255,255,255,0.10)`, muted text. Hover: red tint fill, white text, red border.
- **Neon Border** (`.btn-neon-border`): Dark fill (`#1a1a1a`) with a spinning conic gradient border (pink → purple). A decorative variant for high-visibility moments.
- **Tab Toggle** (`.tabs button`): Flat rounded (12px), transparent. Active state fills with the primary gradient + glow — same visual language as the primary button.

### Inputs / Fields

Frosted glass rectangles that ignite on focus.

- **Shape:** 12px rounded corners
- **Rest:** Background `rgba(255,255,255,0.04)`, border `1px solid rgba(255,255,255,0.08)`, white text, placeholder at `rgba(255,255,255,0.3)`
- **Focus:** Border shifts to neon pink, 3px pink glow ring (`0 0 0 3px rgba(255,0,128,0.20)`), background brightens to `rgba(255,255,255,0.06)`
- **TV Mode password input:** Centered text, `2rem` font size, `12px` letter-spacing, `18px` padding

### Glass Card

The universal container — used for the main join/create card, modals, "how it works" steps, and the stats strip.

- **Shape:** 20px rounded
- **Background:** `rgba(255,255,255,0.05)` with 24px backdrop blur
- **Border:** `1px solid rgba(255,255,255,0.10)`
- **Lighting overlay:** A `::before` pseudo-element with a `140deg` diagonal white gradient (7% → 0%) to simulate a light catch on the glass
- **Shadow:** Glass Rest (see Elevation)
- **Internal Padding:** `44px 48px` desktop, `28px 22px` mobile
- **Hover (lift variant):** `translateY(-6px) scale(1.02)`, deeper shadow, brighter border

### Modal Overlay

Fixed full-screen backdrop with blur, centered glass card.

- **Backdrop:** `rgba(0,0,0,0.75)` with `blur(12px)`, z-index `2000`
- **Container:** Glass card at `max-width: 420px`, `border-radius: 24px` (slightly tighter than standard glass)
- **Closing:** Click backdrop to dismiss, or the close handler on the card

### Mode Toggle (Join Room)

A segmented control for participant vs. TV mode. Each segment is a tab-style button.

- **Shape:** 12px rounded
- **Inactive:** `rgba(255,255,255,0.05)` background, `1px solid rgba(255,255,255,0.08)` border, muted white text
- **Active:** Primary gradient fill, white text, glow shadow — identical to primary button visual language
- **Layout:** Flex, equal width with `gap: 8px`

### Navigation (LandingHeader)

Minimal — logo + language switcher. No heavy nav bar.

- **Style:** Glass card flattened — `background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(16px)`, thin bottom border
- **Content:** Logo left, language switcher right

## 6. Do's and Don'ts

### Do:
- **Do** use the glass material for every container — cards, modals, nav. The frosted pane is the universal surface.
- **Do** apply glow exclusively to interactive elements: buttons, active toggles, "now playing" state. Glow communicates "act now."
- **Do** keep body text at white `#FFFFFF` — never gray. Text secondary at `62%` is the floor for body copy.
- **Do** use `text-wrap: balance` on headings (h1–h3) for even line breaks.
- **Do** cap body text line length at 65–75ch for readability in the mobile/TV modes.
- **Do** respect `prefers-reduced-motion`: replace glow-pulse and blob-drift animations with instant opacity transitions.

### Don't:
- **Don't** introduce warm neutrals, beige backgrounds, or cream tones. The canvas is midnight black — no "warm dark" or "charcoal."
- **Don't** use purple for call-to-action buttons. Purple is atmosphere; pink is action.
- **Don't** exceed 24px blur on glass surfaces — `blur(24px)` is the maximum; larger values wash out the glass effect.
- **Don't** use gradient text (`background-clip: text` with gradient). The CTA heading exception (`.cta-heading`) is the only permitted use; all other text is solid white.
- **Don't** put `border-left` colored stripes on cards or list items. Glass cards have full borders or nothing.
- **Don't** use `999` or `9999` z-index values. Use the semantic scale: glass cards `z-index: 1`, modals `2000`, tooltips `3000`.
- **Don't** render dropdowns with `position: absolute` inside `overflow: hidden` containers — use the `<dialog>` API or portal.
- **Don't** gate content visibility behind animation classes that trigger on scroll. Content must be visible at rest; motion enhances the already-visible default.
