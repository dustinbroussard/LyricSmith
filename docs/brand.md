# LyricSmith Brand Guidelines

## Palette

| Token | Light | Dark |
|-------|-------|------|
| `--color-bg` | `#ffffff` | `#0a0a0a` |
| `--color-surface` | `#f9fafb` | `#111216` |
| `--color-text` | `#1f2937` | `#fef9c3` |
| `--color-text-muted` | `#6b7280` | `#cbd5e1` |
| `--color-primary` | `#6366f1` | `#6366f1` |
| `--color-accent` | `#f59e0b` | `#f59e0b` |
| `--color-success` | `#10b981` | `#10b981` |
| `--color-border` | `#e5e7eb` | `#26272b` |
| `--color-focus` | `#f59e0b` | `#f59e0b` |

## Usage

Use semantic tokens instead of raw hex values. Interface elements should rely on the Tailwind color utilities defined in `tailwind.config.ts`.

```html
<button class="bg-primary text-cream focus-visible:ring-2 focus-visible:ring-focus">
  Save
</button>
```

## Examples

- **Brand gradient**: apply the `.brand-gradient` class for Mardi Gras flair.
- **Neon ring**: use the `.neon-ring` utility to highlight call‑to‑action elements.

