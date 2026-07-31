import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF6F0',
          200: '#F3ECE1',
          300: '#E8DEC8',
          400: '#D2C2A5',
          800: '#3D362D',
          900: '#1C1917',
        },
        charcoal: {
          800: '#222120',
          900: '#141312',
          950: '#0A0A0A',
        },
        gold: {
          400: '#E6C687',
          500: '#D4AF37',
          600: '#B89228',
          700: '#8C6D3B',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(28, 25, 23, 0.05)',
        'elevated': '0 10px 30px -4px rgba(28, 25, 23, 0.08)',
        'glow': '0 0 25px rgba(212, 175, 55, 0.15)',
      }
    },
  },
  plugins: [],
};
export default config;
