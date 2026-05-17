import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#6C63FF',
        'brand-dark': '#5A52E0',
        'brand-light': '#8B85FF',
        navy: '#0D0F1A',
        teal: '#00D4A8',
        surface: '#F8F8FF',
        muted: '#8B8B9E',
        border: '#E8E8F0',
        hot: '#FF6B35',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'blob': 'blob 12s ease-in-out infinite',
        'blob-delay': 'blob 14s ease-in-out infinite 2s',
        'blob-delay-2': 'blob 16s ease-in-out infinite 4s',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'count-up': 'countUp 0.8s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(40px, -30px) scale(1.08)' },
          '50%': { transform: 'translate(-20px, 40px) scale(0.95)' },
          '75%': { transform: 'translate(-40px, -20px) scale(1.05)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        countUp: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
