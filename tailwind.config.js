/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#0B0F14',
        deep: '#122A38',
        ocean: '#2C6E86',
        foam: '#DCEDEA',
        gold: '#E8A64C',
        'gold-light': '#F5C878',
        parchment: '#F4E4C6',
        'parchment-dark': '#DCC79A',
        rust: '#D9642F',
        emerald: '#3F6B4A',
        dusk: '#2E3A55',
      },
      fontFamily: {
        display: ['"Pirata One"', 'cursive'],
        heading: ['"IM Fell English SC"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      backgroundImage: {
        parchment:
          "radial-gradient(circle at 20% 20%, rgba(232,166,76,0.12), transparent 40%), radial-gradient(circle at 80% 80%, rgba(217,100,47,0.08), transparent 45%)",
        cove: "url('/images/cove-sunset-bg.jpg')",
      },
      boxShadow: {
        plank: 'inset 0 0 0 1px rgba(232,166,76,0.35), 0 8px 24px rgba(0,0,0,0.45)',
        seal: '0 4px 12px rgba(0,0,0,0.5)',
      },
      transitionTimingFunction: {
        fluid: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translateX(-5%)' },
          '50%': { transform: 'translateX(5%)' },
          '100%': { transform: 'translateX(-5%)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        needle: {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
        kenburns: {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '50%': { transform: 'scale(1.08) translate(-1%, -1%)' },
          '100%': { transform: 'scale(1) translate(0, 0)' },
        },
      },
      animation: {
        drift: 'drift 18s ease-in-out infinite',
        bob: 'bob 6s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        needle: 'needle 4s ease-in-out infinite',
        kenburns: 'kenburns 40s cubic-bezier(0.22, 1, 0.36, 1) infinite',
      },
    },
  },
  plugins: [],
};
