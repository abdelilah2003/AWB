/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          primary: '#F25041',
          secondary: '#D94436',
          soft: '#FDE9E7',
          danger: '#C62828',
          light: '#FFF3F1',
        },
        bg: {
          navbar: '#FFFFFF',
          page: '#FFFDFC',
          card: '#FFFFFF',
          'card-hover': '#FFF7F6',
          panel: '#FDE9E7',
          dark: '#A9362C',
        },
        text: {
          primary: '#2F2726',
          secondary: '#675E5C',
          muted: '#9B8F8B',
          inverse: '#FFFFFF',
        },
        border: {
          subtle: '#F1D4D0',
          primary: '#F25041',
        },
        success: '#2E7D32',
        warning: '#B45309',
      },
      fontFamily: {
        serif: ['"Sora"', 'sans-serif'],
        sans: ['"Manrope"', 'sans-serif'],
      },
      boxShadow: {
        'navbar': '0 2px 4px rgba(242, 80, 65, 0.08)',
        'card': '0 1px 3px rgba(242, 80, 65, 0.14)',
        'elevated': '0 8px 24px rgba(242, 80, 65, 0.18)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.6s ease-out',
        slideInDown: 'slideInDown 0.7s ease-out',
        slideInLeft: 'slideInLeft 0.8s ease-out',
      },
    },
  },
  plugins: [],
};
