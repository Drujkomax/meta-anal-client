import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f4f6f8',
        panel: '#ffffff',
        ink: '#14171c',
        muted: '#6b7280',
        accent: '#0f766e',
        accentSoft: '#d5f3ef',
        line: '#e7eaee',
      },
      fontFamily: {
        heading: ['var(--font-space-grotesk)'],
        body: ['var(--font-manrope)'],
      },
      boxShadow: {
        panel: '0 10px 24px rgba(15, 23, 42, 0.06)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
