/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS variables (see styles/index.css)
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--c-surface-3) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--c-ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--c-ink-3) / <alpha-value>)',
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'primary-ink': 'rgb(var(--c-primary-ink) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        transit: 'rgb(var(--c-transit) / <alpha-value>)',
        'transit-line': 'rgb(var(--c-transit-line) / <alpha-value>)',
      },
      borderRadius: { card: '1.25rem' },
      boxShadow: { card: '0 1px 2px rgb(0 0 0 / 0.06), 0 4px 16px rgb(0 0 0 / 0.05)' },
    },
  },
  plugins: [],
};
