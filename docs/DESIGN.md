# Design Foundation

## Overview
This document establishes the design system for MIRROR, inspired by the clean, functional aesthetic of [fanout.sh](https://fanout.sh/). The goal is to remove "AI slop" design elements and create a calm, consistent product experience from the website through every app page.

## Fonts

### Primary Font System
- **Body**: System font stack, regular weight (400), size 16px base, line-height 1.6
- **Headings**: Medium weight (500), scaled proportionally from base size
- **Removed**: All bold headings (700–800), Google Fonts (Inter), and CDN dependencies

### Font Stack
```
-- Light mode:  system-ui, -apple-system, "Segoe UI", Ubuntu, sans-serif;
-- Dark mode:   system-ui, -apple-system, "Segoe UI", Ubuntu, sans-serif;
```

### Weight Scale
| Element   | Weight |
|-----------|--------|
| Body text | 400    |
| Headings  | 500    |
| Strong    | 600    |

### Size Scale (relative to base 16px)
- xs: 12px (0.75rem)
- sm: 14px (0.875rem)
- base: 16px (1rem)
- lg: 20px (1.25rem)
- xl: 24px (1.5rem)
- 2xl: 30px (1.875rem)
- 3xl: 36px (2.25rem)

### Line Height
- Base: 1.6
- Headings: 1.1–1.2

### Letter Spacing
- Tight: -.03em
- Upright: .02em
- Caps: .06em

## Colours

### Token File (single source of truth)
Created as `src/styles/tokens.css` with CSS variables for both light and dark modes.

### Light Mode Tokens
```
--bg: #f8fafc;
--bg-subtle: #f1f5f9;
--ink: #0f172a;
--muted: #64748b;
--accent: #1e40af;
--accent-ink: #fff;
--border: #e2e8f0;
--ring: #3b82f6;
--success: #10b981;
--error: #ef4444;
```

### Dark Mode Tokens (prefers-color-scheme: dark)
```
--bg: #0f172a;
--bg-subtle: #1e293b;
--ink: #f8fafc;
--muted: #94a3b8;
--accent: #60a5fa;
--accent-ink: #0f172a;
--border: #334155;
--ring: #93c5fd;
```

### Colour Usage Rules
- One accent colour throughout (--accent), with tints/shades for states
- Neutral greys for backgrounds and borders
- Green/red used only with explicit labels (▲/▼) and text, never colour alone
- Contrast minimum 4.5:1 for text, 3:1 for UI components

## Spacing

### Token Scale (4px base unit)
- 0: 0 (no margin/padding)
- 1: 4px (0.25rem)
- 2: 8px (0.5rem)
- 3: 12px (0.75rem)
- 4: 16px (1rem)
- 5: 20px (1.25rem)
- 6: 24px (1.5rem)
- 7: 28px (1.75rem)
- 8: 32px (2rem)
- 12: 48px (3rem)
- 16: 64px (4rem)

### Usage
- Consistent vertical rhythm: 4px grid
- Component padding: typically 3–6
- Section spacing: typically 8–12
- Margins: never use values between the scale steps

## Radii

### Border Radius Scale
- 0: 0px (sharp corners)
- 1: 4px (small inputs, chips)
- 2: 8px (default buttons, inputs)
- 3: 12px (cards, modals)
- 4: 16px (large cards, orb)
- 5: 20px (rounded corners, avatars)
- 6: 999px (full pill, buttons)

### Usage
- Buttons: radius 5 (999px for pill shape)
- Inputs: radius 2 (8px)
- Cards: radius 3 (12px)
- Orb: radius 4 (16px)
- Avatars: radius 5 (20px)

## Shadows

### Shadow Scale
- None: none
- 1: 0 1px 2px rgba(0, 0, 0, 0.05)
- 2: 0 1px 3px rgba(0, 0, 0, 0.1)
- 3: 0 4px 6px rgba(0, 0, 0, 0.1)
- 4: 0 10px 20px rgba(0, 0, 0, 0.1)
- 5: 0 25px 50px rgba(0, 0, 0, 0.25)

### Usage
- Elevation: shadow 2 or 3 for cards, modals
- Focus ring: ring variable, not shadow
- Orb/ambient: shadow 4 or 5 for depth

## Motion / Ease

### Easing Functions
- Default: cubic-bezier(.22, 1, .36, 1) (spring-like)
- Reduced: linear 0s (prefers-reduced-motion)
- Fast: cubic-bezier(.4, 0, .2, 1)
- Slow: cubic-bezier(.25, .46, .45, .94)

### Transition Duration
- Fast: 150ms
- Normal: 250ms
- Slow: 350ms

### Usage
- Buttons: transform .2s var(--ease) on hover
- Modals/panels: 250ms fade/slide
- Orb state changes: 1.4s–6s for pulse animations (respect prefers-reduced-motion)
- No automatic "glowing blobs" or decorative animations

## Components

### Button (shared across website and app)
```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 24px;
  border: 0;
  border-radius: var(--radius-full, 999px);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -.01em;
  transition: transform .2s var(--ease), background .2s var(--ease), box-shadow .2s var(--ease);
  white-space: nowrap;
  cursor: pointer;
}

.button:hover:not(:disabled) { transform: translateY(-1px); }
.button:active:not(:disabled) { transform: none; }
.button--primary { ... }
.button--secondary { ... }
.button--ghost { ... }
```

### Input / Form Controls
- Height: 44px minimum (tap target)
- Border radius: var(--radius-2, 8px)
- Font size: 14px
- Padding: 0 12px
- Focus ring: var(--ring) with outline-offset 4px

### Card
- Padding: var(--spacing-4, 16px) internally
- Border radius: var(--radius-3, 12px)
- Border: 1px solid var(--border)
- Background: var(--bg) or var(--bg-subtle)
- Shadow: var(--shadow-3, 0 4px 6px rgba(0,0,0,0.1))

### Orb (signature MIRROR element)
- Size: variable, max 240px
- Border radius: var(--radius-4, 16px)
- No glowing blobs, gradient text, or heavy shadows
- Single accent colour with opacity variations

## Responsive Breakpoints
- Mobile: <640px (420px in some contexts)
- Tablet: 640px–1024px
- Desktop: >1024px

## Accessibility
- 44px minimum tap targets
- Visible focus (2px solid accent, 4px outline-offset)
- Colour contrast: 4.5:1 text, 3:1 UI components
- Reduced motion support: `prefers-reduced-motion: reduce`
- One h1 per page
- ARIA labels on interactive elements
- Keyboard-navigable (tab order, focus management)

## One Token File
All of the above tokens are collected in `src/styles/tokens.css`, imported by:
- `src/index.css` (app)
- `src/landing.css` (website landing page)
- `src/pages/landing/home.css` (landing page layout)

This ensures consistent theming across the entire product.
