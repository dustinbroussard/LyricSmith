# LyricSmith UI Style Guide

This guide ensures **index.html**, **hub.html**, **sunopromptengine.html**, and **musedice.html** share a unified, modern interface.

## 1. Unified Color Palette

| Token | Light | Dark |
|-------|-------|------|
| `--color-primary`   | `#6366f1` | `#6366f1` |
| `--color-secondary` | `#f59e0b` | `#f59e0b` |
| `--color-accent`    | `#10b981` | `#10b981` |
| `--color-bg`        | `#fdfbfa` | `#000000` |
| `--color-bg-alt`    | `#e8f0ff` | `#0d0d1a` |
| `--color-surface`   | `#fff3e6` | `#1a1a33` |
| `--color-text`      | `#000000` | `#e6e6ff` |
| `--color-text-muted`| `#333366` | `#99aaff` |
| `--color-border`    | `#99aaff` | `#ff6600` |

**States**

- Hover: `color-mix(in oklab, var(--color-primary) 80%, white)`
- Active: `color-mix(in oklab, var(--color-primary) 60%, black)`
- Disabled: `opacity:0.5`

## 2. Border & Outline Styling

- Border width: `1px`
- Border radius: `var(--radius-md)` (`1rem`)
- Focus ring: `box-shadow: var(--focus-ring)`
- Sides: use `border-color: var(--color-border)`; apply side‑specific rules with `border-top`, `border-right`, etc.

## 3. Typography System

Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

| Element | Weight | Size | Line height | Letter spacing |
|---------|--------|------|-------------|----------------|
| `h1` | 700 | `2.5rem` | `1.2` | `0.01em` |
| `h2` | 700 | `2rem` | `1.25` | `0.01em` |
| `h3` | 600 | `1.75rem` | `1.3` | `0.01em` |
| `h4` | 600 | `1.5rem` | `1.35` | `0.01em` |
| `h5` | 600 | `1.25rem`| `1.4` | `0.01em` |
| `h6` | 600 | `1rem`  | `1.4` | `0.01em` |
| Body | 400 | `1rem`  | `1.6` | `0` |
| Buttons/Inputs | 600 | `1rem` | `1.4` | `0.01em` |

Semantic classes: `.h1` … `.h6`, `.body-text`, `.btn`.

## 4. Text Color & Contrast

- Light bg text: `var(--color-text)` on `var(--color-bg)` (contrast 17:1)
- Dark bg text: `var(--color-text)` on `var(--color-bg)` in dark mode (contrast 15:1)
- Muted text: `var(--color-text-muted)`
- Utilities: `.text-light` sets `color: var(--color-text)`; `.text-dark` sets `color: var(--color-bg)`.

## 5. Interactive Element States

Buttons, links and inputs share:

```css
transition: background-color var(--transition-base),
            color var(--transition-base),
            box-shadow var(--transition-base);
```

- **Hover:** `box-shadow: var(--shadow-md);`
- **Focus:** `box-shadow: var(--focus-ring);`
- **Active:** `box-shadow: var(--shadow-sm);`
- **Disabled:** `opacity:0.5; cursor:not-allowed;`

## 6. Spacing & Layout Rules

- Base scale: 4px (`0.25rem`) increments via `--space-*` tokens
- Breakpoints: `640px`, `840px`, `1024px`
- Default gutters: `var(--space-4)` (`1rem`)

## 7. CSS Custom Properties

Key overrides exposed:

```css
--color-primary
--color-secondary
--color-accent
--color-bg
--color-surface
--color-text
--color-border
--radius-sm / --radius-md / --radius-lg
--shadow-sm / --shadow-md / --shadow-lg
--space-1 … --space-6
```

## 8. Implementation Instructions

1. Import the partial in your SCSS:
   ```scss
   @import 'design-system';
   ```
2. Compile to `src/styles/design-system.css`.
3. Include in HTML before `style.css`:
   ```html
   <link rel="stylesheet" href="src/styles/design-system.css">
   <link rel="stylesheet" href="style.css">
   ```
4. Apply semantic classes (`.h1`, `.btn`, `.text-light`, etc.)

A minimal reset is baked into `design-system.css` (box-sizing and body reset).

## 9. Quality Assurance Checklist

- [ ] Buttons: hover, focus, active, disabled
- [ ] Headings `h1`–`h6` match sizes
- [ ] Body text and labels use `1rem/1.6`
- [ ] Forms and navigation maintain border radius `1rem`
- [ ] Dark and light themes switch without contrast loss

