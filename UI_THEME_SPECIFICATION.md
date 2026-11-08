# Vastire UI Theme & Color Design System

A pure, standalone design system and color specification extracted directly from the application UI. This document contains zero application-level features, business logic, or domain rules, serving as a drop-in design token reference for any web application.

---

## 1. Master Color Palette (HEX, RGB, Purpose)

### 1.1 Brand Primary (Emerald Spectrum)
The signature brand accent conveying freshness, trust, security, and modern clarity.

| Token | HEX | RGB | HSL | Intended Usage |
| :--- | :--- | :--- | :--- | :--- |
| `brand-50` | `#f0fdf4` | `240, 253, 244` | `138°, 76%, 97%` | Pill backgrounds, active card tints, subtle highlights |
| `brand-100` | `#dcfce7` | `220, 252, 231` | `141°, 78%, 93%` | Active badge borders, discount pill backgrounds |
| `brand-200` | `#bbf7d0` | `187, 247, 208` | `141°, 76%, 85%` | Subtle border accents, decorative glow rings |
| `brand-500` | `#10b981` | `16, 185, 129` | `160°, 84%, 39%` | Focus rings (`ring-emerald-500/20`), active icons, notification dots |
| `brand-600` | `#059669` | `5, 150, 105` | `161°, 94%, 30%` | **Primary CTA Buttons**, active tabs, checkmark icons, primary brand accents |
| `brand-700` | `#047857` | `4, 120, 87` | `163°, 94%, 24%` | High-emphasis green text, price savings text, hover links |
| `brand-800` | `#065f46` | `6, 95, 70` | `163°, 88%, 20%` | Dark text on light green badge pills |
| `brand-900` | `#064e3b` | `6, 78, 59` | `164°, 86%, 16%` | Deep forest green accents |
| `brand-950` | `#022c22` | `2, 44, 34` | `166°, 91%, 9%` | Dark high-contrast notification & SLA banner bars |

---

### 1.2 Neutral & Structural Scale (Slate Spectrum)
The architectural foundation for text, surfaces, borders, and shadows.

| Token | HEX | RGB | HSL | Intended Usage |
| :--- | :--- | :--- | :--- | :--- |
| `slate-50` | `#f8fafc` | `248, 250, 252` | `210°, 40%, 98%` | **Page Canvas Background** (`body`), image stage containers |
| `slate-100` | `#f1f5f9` | `241, 245, 249` | `210°, 40%, 96%` | Search input backgrounds, divider lines, disabled buttons |
| `slate-200` | `#e2e8f0` | `226, 232, 240` | `214°, 32%, 91%` | **Standard Card & Input Borders**, horizontal rules |
| `slate-300` | `#cbd5e1` | `203, 213, 225` | `213°, 27%, 84%` | Hover border states, subtle input outlines |
| `slate-400` | `#94a3b8` | `148, 163, 184` | `215°, 20%, 65%` | Strikethrough text, placeholder text, icon default fill |
| `slate-500` | `#64748b` | `100, 116, 139` | `215°, 16%, 47%` | Secondary descriptions, subheadings, unit labels |
| `slate-600` | `#475569` | `71, 85, 105` | `215°, 19%, 35%` | Standard body copy, footer navigation links |
| `slate-700` | `#334155` | `51, 65, 85` | `215°, 25%, 27%` | Form labels, card secondary headings |
| `slate-800` | `#1e293b` | `30, 41, 59` | `217°, 33%, 17%` | High-contrast sub-headings, alternate button borders |
| `slate-900` | `#0f172a` | `15, 23, 42` | `222°, 47%, 11%` | **Primary Text & Headings**, dark badges, top header text |
| `slate-950` | `#020617` | `2, 6, 23` | `229°, 84%, 5%` | **Alternate CTA Buttons**, floating dark toasts, deep overlays |

---

### 1.3 Semantic & Functional Accents

| Purpose | Surface / BG | Border | Text / Icon | Sample Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `bg-emerald-50` (`#ecfdf5`) | `border-emerald-200` (`#a7f3d0`) | `text-emerald-700` (`#047857`) | Verified status, positive confirmation, checkmarks |
| **Attention / Notice** | `bg-amber-50` (`#fffbeb`) | `border-amber-200` (`#fde68a`) | `text-amber-800` (`#92400e`) | Grace periods, countdown notices, warning banners |
| **Danger / Destructive** | `bg-rose-50/20` (`#fff1f2`) | `border-rose-500` (`#f43f5e`) | `text-rose-600` (`#e11d48`) | Form validation errors, active heart / favorite toggles |
| **Informative / Neutral**| `bg-slate-100` (`#f1f5f9`) | `border-slate-200` (`#e2e8f0`) | `text-slate-800` (`#1e293b`) | Secondary pills, sort chips, neutral state markers |
| **Disabled** | `bg-slate-100/70` (`#f8fafc`)| `border-slate-200` (`#e2e8f0`) | `text-slate-400` (`#94a3b8`) | Inactive inputs, unavailable options |

---

## 2. Surface & Elevation Architecture

The UI adheres to a strict 4-tier layer system:

```
[Layer 4] Overlays / Modals / Drawers (z-50 to z-100) -> bg-slate-900/75 or bg-black/60 with backdrop-blur-md
[Layer 3] Floating / Sticky Navigation (z-30 to z-50) -> bg-white/95 with backdrop-blur-lg & border-b border-slate-200
[Layer 2] Interactive Cards & Containers (z-1 to z-10) -> bg-white, border border-slate-200/80, shadow-sm
[Layer 1] Canvas Ground Level (z-0)                   -> bg-slate-50 (#f8fafc)
```

1. **Canvas (`bg-slate-50`)**:
   * A soft, non-stark neutral ground that provides gentle contrast for pure white cards without harshness.
2. **Card Surfaces (`bg-white`)**:
   * Sharp, clean white `#ffffff` containers with `border border-slate-200/80` or `border-slate-100`.
   * Hover elevation: scales smoothly to `shadow-xl` and transitions border to `border-emerald-400`.
3. **Elevated Floating UI (Bottom Nav & Header)**:
   * `bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]`.
4. **Toast / High-Contrast Floating Notifications**:
   * `bg-slate-900/95 backdrop-blur-md text-white border border-white/10 shadow-2xl rounded-2xl`.

---

## 3. Typography Hierarchy

### 3.1 Font Families
* **Interface & Body Font**: Modern Sans (`Inter`, system UI font fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
  * Features: `font-feature-settings: "cv02", "cv03", "cv04", "cv11"`
* **Brand Wordmark Font**: `Poppins` (Weights: `700`, `800`, `900`, tracking: `-0.035em`).

### 3.2 Scale & Weight Mapping
* **Page Titles / Hero Titles**: `text-2xl sm:text-3xl font-black text-slate-900 tracking-tight`
* **Section Headings**: `text-lg sm:text-xl font-black text-slate-900 tracking-tight`
* **Card Titles**: `text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug`
* **Form Field Labels**: `text-xs font-bold text-slate-700 block mb-1`
* **Body / Descriptions**: `text-xs sm:text-sm font-medium text-slate-500 leading-relaxed`
* **Sub-labels / Meta / Micro**: `text-[10px] sm:text-[11px] text-slate-400 font-semibold tracking-tight`
* **Price Emphasis**: `text-sm sm:text-base font-black text-slate-900`
* **Discount / Strikethrough Price**: `text-[11px] text-slate-400 line-through`

---

## 4. Border Radius & Geometry System

* **Pills & Circular Badges**: `rounded-full` (9999px)
* **Standard Buttons & Inputs**: `rounded-xl` (12px)
* **Standard Cards & Modal Dialogs**: `rounded-2xl` (16px)
* **Large Interactive Panels**: `rounded-3xl` (24px)
* **Aspect Ratio**: Cards use a square stage `aspect-square` with `rounded-xl` internal image frame.

---

## 5. Component Style Recipes (Ready-to-Use Tailwind CSS)

### 5.1 Primary Call-to-Action Button
```html
<button class="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer">
  Action Label
</button>
```

### 5.2 Alternate / Secondary Dark Button
```html
<button class="w-full py-3.5 px-6 bg-slate-950 hover:bg-slate-900 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-slate-950/20 border border-slate-800 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer">
  Secondary Action
</button>
```

### 5.3 Neutral Outlined / Ghost Button
```html
<button class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition active:scale-95 cursor-pointer">
  Outline Action
</button>
```

### 5.4 Standard Form Input Field
```html
<!-- Default State -->
<input
  type="text"
  placeholder="Enter value..."
  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm text-slate-900 bg-white placeholder:text-slate-400 transition"
/>

<!-- Error Validation State -->
<input
  type="text"
  class="w-full px-3.5 py-2.5 rounded-xl border border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 focus:border-rose-500 focus:outline-none text-sm text-slate-900 transition"
/>
```

### 5.5 Interactive Custom Themed Dropdown Trigger
```html
<button class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-900 text-sm font-medium shadow-2xs transition">
  <span>Select Option</span>
  <svg class="w-4 h-4 text-slate-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
  </svg>
</button>
```

### 5.6 Interactive Card (Product / Item Card)
```html
<div class="group relative bg-white border border-slate-200/80 hover:border-emerald-400 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between">
  <!-- Image Stage -->
  <div class="w-full aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    <!-- Image with subtle hover zoom -->
    <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
  </div>

  <!-- Content -->
  <h3 class="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition mt-3">
    Item Title
  </h3>
</div>
```

### 5.7 Status & Pill Badges
```html
<!-- Success / Discount Badge -->
<span class="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/90 px-2 py-0.5 rounded-full uppercase tracking-tight">
  Save 20%
</span>

<!-- High-Contrast Accent Badge -->
<span class="text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-xs">
  Best Seller
</span>

<!-- Warning / Grace Period Pill -->
<div class="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-amber-900 font-bold text-xs space-y-1">
  <span class="text-amber-800">Notice or Grace Period Active</span>
</div>
```

### 5.8 Floating Dark Notification Toast
```html
<div class="w-full max-w-sm px-4 py-3 bg-slate-900/95 backdrop-blur-md text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3">
  <div class="flex items-center gap-2.5">
    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    <span>Item added successfully</span>
  </div>
</div>
```

---

## 6. Standalone Tailwind Configuration (`tailwind.config.js`)

Copy and paste this snippet directly into any new project to reproduce this exact color system:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        brand: [
          "Poppins",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        xs: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
```

---

## 7. Raw CSS Custom Properties (`theme.css`)

For frameworks that use standard CSS variables without Tailwind:

```css
:root {
  /* Canvas & Text */
  --color-canvas: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-subtle: #f1f5f9;
  --color-border: #e2e8f0;
  --color-border-subtle: #f1f5f9;
  
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-tertiary: #94a3b8;
  --color-text-strong: #334155;

  /* Brand Emerald */
  --color-brand-50: #f0fdf4;
  --color-brand-100: #dcfce7;
  --color-brand-500: #10b981;
  --color-brand-600: #059669;
  --color-brand-700: #047857;
  --color-brand-900: #064e3b;
  --color-brand-950: #022c22;

  /* Status Colors */
  --color-success-bg: #ecfdf5;
  --color-success-border: #a7f3d0;
  --color-success-text: #047857;

  --color-warning-bg: #fffbeb;
  --color-warning-border: #fde68a;
  --color-warning-text: #92400e;

  --color-error-bg: rgba(255, 241, 242, 0.5);
  --color-error-border: #f43f5e;
  --color-error-text: #e11d48;

  /* Border Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  --shadow-card-hover: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  --shadow-button: 0 10px 15px -3px rgba(5, 150, 105, 0.25);
}

body {
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```
