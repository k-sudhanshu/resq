---
name: Emergency Response Systems
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#43474f'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#737780'
  outline-variant: '#c3c6d0'
  surface-tint: '#3b6090'
  primary: '#002c57'
  on-primary: '#ffffff'
  primary-container: '#1b4372'
  on-primary-container: '#8db1e6'
  inverse-primary: '#a5c8ff'
  secondary: '#585f66'
  on-secondary: '#ffffff'
  secondary-container: '#dce3eb'
  on-secondary-container: '#5e656c'
  tertiary: '#003508'
  on-tertiary: '#ffffff'
  tertiary-container: '#004e10'
  on-tertiary-container: '#71c16d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#a5c8ff'
  on-primary-fixed: '#001c3a'
  on-primary-fixed-variant: '#214877'
  secondary-fixed: '#dce3eb'
  secondary-fixed-dim: '#c0c7cf'
  on-secondary-fixed: '#151c22'
  on-secondary-fixed-variant: '#40484e'
  tertiary-fixed: '#a3f69c'
  tertiary-fixed-dim: '#88d982'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005312'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  instruction-xl:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.5'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 16px
  container-max: 768px
---

## Brand & Style

The design system is engineered for high-stress, emergency-first environments where clarity, speed of comprehension, and trust are paramount. The personality is "calmly authoritative"—it acts as a steady hand during a crisis. 

The aesthetic follows a **Modern/Minimalist** approach with subtle **Tactile** cues. By prioritizing high legibility and large interactive surfaces, the UI minimizes cognitive load for users who may be panicked or in physical distress. The layout is intentionally spacious to prevent accidental inputs, using a human-centric philosophy that feels more like a supportive medical tool than a generic software application.

## Colors

The palette is anchored by a deep medical blue to establish institutional trust. 
- **Primary Blue:** Used for primary actions, branding, and active states.
- **Secondary Blue:** Used for subtle background fills, borders, and inactive UI elements to provide a soft, low-contrast environment.
- **Functional Colors:** Success (Green), Warning (Amber), and Critical (Red) follow standard medical semantics. The "Critical" red is reserved exclusively for life-threatening alerts or immediate emergency triggers to maintain its psychological impact.
- **Surface Strategy:** Content lives on pure white cards against a very light neutral gray background to create a clear "layering" effect without heavy shadows.

## Typography

Manrope was selected for its modern, geometric balance and exceptional legibility at various weights. 
- **Scale:** A significant contrast exists between headlines and body text to guide the eye quickly to the most important information.
- **Emergency Instructions:** Use the `instruction-xl` token for step-by-step first-aid guidance. The increased line height and font size ensure the text is readable even if the device is at arm's length or shaking.
- **Alignment:** All critical text should be left-aligned to improve scanning speed, which is vital during time-sensitive procedures.

## Layout & Spacing

This design system uses a **Centered Content** layout model optimized for mobile-first usage.
- **Mobile (< 600px):** 4-column grid with 16px margins. Primary actions are often pinned to the bottom of the viewport for thumb-accessibility.
- **Desktop/Tablet (> 600px):** Content is constrained to a 768px wide central container to maintain the mobile-centric visual focus and prevent excessive eye-travel.
- **Rhythm:** An 8px-based spacing system is used for internal component padding, while a larger 24px-32px scale is used between distinct instructional blocks to reduce visual noise.

## Elevation & Depth

This design system utilizes **Tonal Layers** and **Low-Contrast Outlines** rather than heavy drop shadows to communicate hierarchy.
- **Level 0 (Background):** #F9FAFB.
- **Level 1 (Cards/Surfaces):** White background with a 1px solid border of #E1E8F0. 
- **Interaction Depth:** Only active interactive elements (like a "Start Emergency Guide" button) may have a soft, ambient shadow (10% opacity, 8px blur, 4px Y-offset) to signal push-ability.
- **Focus States:** High-contrast 2px primary blue outline for accessibility.

## Shapes

The shape language is "Rounded" to project a friendly, approachable, and human-safe feel. 
- **Cards & Major Blocks:** Use `rounded-lg` (16px) to create a soft container.
- **Buttons & Inputs:** Use `rounded-md` (8px) for a precise but non-aggressive feel.
- **Pills/Chips:** Fully rounded (500px) for status indicators to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Deep Blue (#1B4372) with White text. Minimum height 56px for touch safety.
- **Secondary:** Soft Blue (#E1E8F0) with Primary text.
- **Emergency (Action):** Large, full-width buttons with icons for rapid identification.

### Cards
- White background, 16px corner radius, 1px border (#E1E8F0).
- Internal padding should be a minimum of 20px (lg) to ensure text does not feel cramped.

### AI Chat/Instructional Interface
- **Message Bubbles:** AI responses should use the Secondary Blue background to distinguish them from user inputs or standard UI.
- **Progress Indicators:** Use a thick (6px) progress bar at the top of the screen during step-by-step guides to indicate the current stage of the emergency procedure.

### Input Fields
- Large 56px height, 16px font size (to prevent iOS auto-zoom), with clear labels and a focus state that uses a 2px Primary Blue border.

### Chips/Status
- Small, rounded-pill indicators for categorizing medical topics (e.g., "Cardiac," "Trauma"). Use low-saturation background versions of the functional colors with dark text for maximum legibility.