---
name: Elite Learning Ethos
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3f4942'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6f7a72'
  outline-variant: '#bec9c0'
  surface-tint: '#036c48'
  primary: '#005034'
  on-primary: '#ffffff'
  primary-container: '#006b47'
  on-primary-container: '#92e8bb'
  inverse-primary: '#82d8ab'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#623e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#825400'
  on-tertiary-container: '#ffcf91'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9df5c6'
  primary-fixed-dim: '#82d8ab'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005235'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#f9bb65'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  success-emerald: '#00875a'
  warning-amber: '#ef9f13'
  error-ruby: '#ba1a1a'
  surface-lowest: '#ffffff'
  surface-high: '#e6e8ea'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  container-padding: 2rem
  grid-gutter: 1.5rem
  section-gap: 2.5rem
  card-internal: 1.5rem
---

## Brand & Style
The brand identity centers on "Elite Preparedness"—a professional, high-achieving atmosphere designed for students aiming for top-tier corporate placements. The style is **Corporate Modern with a Glassmorphic edge**, blending the reliability of a traditional educational platform with the energy of a high-tech startup.

The visual language uses emerald green to signify growth and success, balanced against a clean, "Cool Grey" surface architecture. It evokes feelings of ambition, clarity, and systematic progress. Key characteristics include high-density information layouts, subtle motion (scrolling tickers), and translucent "glass" overlays that add a layer of sophistication to progress tracking.

## Colors
The palette is rooted in **Emerald Fidelity**. 
- **Primary (#006b47):** Used for brand identity, progress bars, and high-priority actions. It represents the "Ready" state of a candidate.
- **Surface Architecture:** The system uses a multi-tiered neutral palette ranging from `#ffffff` (lowest container) to `#f7f9fb` (background) and `#e6e8ea` (high-contrast surfaces).
- **Functional Accents:** Tertiary gold is reserved for motivational elements (streaks, badges), while Error Ruby is strictly for urgency (notifications, "Hard" difficulty).
- **Gradients:** Hero sections use a directional linear gradient from `primary` to a lighter `primary-container` tint to create depth without sacrificing legibility.

## Typography
The system employs a dual-font strategy. **Plus Jakarta Sans** is the "Display" face, chosen for its modern, geometric friendliness and excellent legibility in bold weights. It is used exclusively for headlines and brand elements.

**Inter** serves as the "Utility" face, handling all body copy, data points, and labels. It provides a neutral, highly readable foundation for dense information like course descriptions and time-stamped activity logs. 

All labels use uppercase styling with increased letter spacing to differentiate metadata from interactive content.

## Layout & Spacing
The layout follows a **Fixed-Width Adaptive Grid** with a maximum content width of 1440px. 
- **Desktop:** A 12-column grid. The main content spans 8 columns, while the sidebar occupies 4.
- **Tablet/Mobile:** Content reflows into a single column. Horizontal padding reduces from 40px (Desktop) to 24px (Tablet) to 16px (Mobile).
- **Rhythm:** An 8px/4px hybrid spacing system is used. Card internal padding is strictly 24px (`1.5rem`) to maintain a premium, airy feel even in data-dense areas.
- **Top Navigation:** A fixed 72px header provides constant context and global search access.

## Elevation & Depth
Elevation is primarily conveyed through **Tonal Layering** and **Soft Ambient Shadows**. 
- **Level 0 (Background):** `#f7f9fb` (Neutral Base).
- **Level 1 (Cards):** White background with a `1px` border of `#e0e3e5`. A subtle `shadow-sm` is applied to differentiate from the background.
- **Level 2 (Active/Hover):** When interacted with, cards transition to a `shadow-lg` and a border color shift to the primary emerald tint.
- **Glassmorphism:** Hero sections and special banners use `backdrop-filter: blur(12px)` and semi-transparent white overlays (`rgba(255, 255, 255, 0.1)`) to create a sense of focused depth without breaking the grid.

## Shapes
The shape language is **Generously Rounded**, reinforcing the "modern and approachable" brand pillars.
- **Standard Cards:** 24px (`1.5rem`) corner radius (3xl).
- **Buttons & Inputs:** 12px (`0.75rem`) corner radius (xl).
- **Chips/Badges:** Full pill-shape for status indicators.
- **Icons:** Contained within soft-square backgrounds with 12px rounding to match the button language.
- **Progress Bars:** Fully rounded (pill) tracks and indicators.

## Components
- **Buttons:** Primary buttons are solid emerald with white text. Secondary buttons use a light-grey background (`surface-container-low`) and transition to primary on hover.
- **Cards:** Defined by 24px rounding and a subtle border. Feature "Course Cards" include an image header with a 1/3 gradient overlay for text legibility.
- **Progress Indicators:** Linear bars use a height of 6px or 8px. Circular "Readiness" meters use a heavy stroke (8px) with a centered "Mastery" percentage.
- **Mock Test Tiles:** Centered icons with a vertical layout, focusing on "Question Count" and "Difficulty" as the primary metadata.
- **Timeline:** A vertical 2px track with 12px circular nodes, color-coded by event type (Live Session vs. Mock Test).
- **Announcement Ribbon:** A high-contrast marquee at the very top for urgent placement news, using a semi-transparent scrolling animation.