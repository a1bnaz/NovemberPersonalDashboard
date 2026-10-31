/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        muted: 'var(--muted)',
        grid: 'var(--grid)',
        axis: 'var(--axis)',
        line: 'var(--line)',
        built: 'var(--built)',
        posted: 'var(--posted)',
      },
      minHeight: {
        11: '2.75rem',
      },
      minWidth: {
        11: '2.75rem',
      },
    },
  },
  plugins: [],
}
