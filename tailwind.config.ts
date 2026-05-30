import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f5f7fa',
        background: '#f5f7fa',
        panel: '#ffffff',
        ink: '#0f1115',
        muted: '#667085',
        accent: '#1877F2',
        accentSoft: '#e7f1ff',
        line: '#e6e9ef',
      },
      fontFamily: {
        heading: ['var(--font-space-grotesk)'],
        body: ['var(--font-manrope)'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06)',
        soft: '0 1px 2px rgba(16, 24, 40, 0.05)',
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
