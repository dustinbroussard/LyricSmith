# LyricSmith Brand Guidelines

## Palette

### Purple (`#b802ad`)
| Token | Hex |
|-------|-----|
| `--purple-50` | `#fbe2f7` |
| `--purple-100` | `#e8a6de` |
| `--purple-200` | `#d268c6` |
| `--purple-300` | `#b802ad` |
| `--purple-400` | `#8b0181` |
| `--purple-500` | `#600058` |
| `--purple-600` | `#390032` |
| Accent `--purple-accent` | `#02b80d` |

### Green (`#9fc551`)
| Token | Hex |
|-------|-----|
| `--green-50` | `#edf5d8` |
| `--green-100` | `#d4e5ab` |
| `--green-200` | `#bad57f` |
| `--green-300` | `#9fc551` |
| `--green-400` | `#749038` |
| `--green-500` | `#4d5e20` |
| `--green-600` | `#28300a` |
| Accent `--green-accent` | `#7751c5` |

### Gold (`#e0be43`)
| Token | Hex |
|-------|-----|
| `--gold-50` | `#fdf6db` |
| `--gold-100` | `#f6e3aa` |
| `--gold-200` | `#edd078` |
| `--gold-300` | `#e0be43` |
| `--gold-400` | `#a6892d` |
| `--gold-500` | `#6f5719` |
| `--gold-600` | `#3d2a04` |
| Accent `--gold-accent` | `#4365e0` |

### Cream (`#fcf1c9`)
| Token | Hex |
|-------|-----|
| `--cream-50` | `#fffdf5` |
| `--cream-100` | `#fef9e6` |
| `--cream-200` | `#fdf5d8` |
| `--cream-300` | `#fcf1c9` |
| `--cream-400` | `#c3ba97` |
| `--cream-500` | `#8d8667` |
| `--cream-600` | `#5b553b` |
| Accent `--cream-accent` | `#c9d4fc` |

### Neutrals & Surface Tokens
| Token | Light | Dark |
|-------|-------|------|
| `--color-bg` | `#fffdf5` | `#1a1a1a` |
| `--color-surface` | `#fef9e6` | `#262626` |
| `--color-text` | `#1a1a1a` | `#fffdf5` |
| `--color-text-muted` | `#51504d` | `#c3ba97` |
| `--color-border` | `#fdf5d8` | `#383838` |
| `--color-focus` | `#e8a6de` | `#d268c6` |

## Contrast

All key combinations meet WCAG 2.1 AA:

 - `#1a1a1a` text on `#fffdf5` background – 17.09:1
 - Muted `#51504d` text on `#fffdf5` – 7.92:1
 - `#fffdf5` text on primary `#b802ad` – 5.65:1
 - `#1a1a1a` text on success `#9fc551` – 8.77:1
 - `#1a1a1a` text on warning `#e0be43` – 9.63:1
 - `#fffdf5` text on error `#b91c1c` – 6.35:1
 - `#fcf1c9` text on dark `#1a1a1a` background – 15.39:1
 - Muted `#c3ba97` text on `#1a1a1a` – 8.94:1

## CSS Variables

```css
:root {
  /* see style.css for full list */
  --purple-300: #b802ad;
  --green-300: #9fc551;
  --gold-300: #e0be43;
  --cream-300: #fcf1c9;
  --color-primary: var(--purple-300);
  --color-success: var(--green-300);
  --color-warning: var(--gold-300);
  --color-error: #b91c1c;
  --color-bg: #fffdf5;
  --color-text: #1a1a1a;
}
```

## Usage

- **Backgrounds:** use `--color-bg` for page backgrounds and `--color-surface` for cards and panels.
- **Text:** `--color-text` for body copy and `--color-text-muted` for secondary content.
- **Primary actions:** `--color-primary` (`--purple-300`); hover with `--purple-400` and active with `--purple-500`.
- **Feedback:** `--color-success`, `--color-warning`, and `--color-error` for success, warning, and error states.
- **Links & focus:** `--color-accent` and `--color-focus` provide interactive and focus affordances.

Designers and developers should rely on these semantic tokens and the Tailwind utilities defined in `tailwind.config.ts` to ensure consistency across light and dark themes.
