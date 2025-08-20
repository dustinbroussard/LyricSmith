import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: ['class'],
  content: ['./index.html','./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--color-bg)',
        surface: 'var(--color-surface)',
        text:    'var(--color-text)',
        muted:   'var(--color-text-muted)',
        primary: 'var(--color-primary)',
        accent:  'var(--color-accent)',
        success: 'var(--color-success)',
        border:  'var(--color-border)',
        focus:   'var(--color-focus)'
      },
      boxShadow: {
        glow: '0 0 20px var(--color-accent), inset 0 0 0 1px color-mix(in oklab, var(--color-accent) 40%, transparent)'
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem' }
    }
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.brand-gradient': {
          backgroundImage: 'linear-gradient(135deg, var(--color-primary), var(--color-accent) 55%, var(--color-success))'
        },
        '.neon-ring': {
          boxShadow: '0 0 0 3px color-mix(in oklab, var(--color-accent) 60%, transparent)'
        }
      })
    }
  ]
}
