/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1220',
        panel: '#111a2f',
        panel2: '#172447',
        border: '#1e2c54',
        ink: '#e6ecff',
        muted: '#8493b8',
        accent: '#3b82f6',
        good: '#22c55e',
        bad: '#ef4444',
        warn: '#f59e0b',
        neutral: '#94a3b8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
