/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Palette
        periwinkle: {
          DEFAULT: '#A28EF9',
          light: '#F3F0FE',
          dark: '#7D64F6',
        },
        mint: {
          DEFAULT: '#A4F5A6',
          light: '#F0FDF1',
          dark: '#67DC6A',
        },
        peach: {
          DEFAULT: '#FFD89D',
          light: '#FFF9EF',
          dark: '#E8B669',
        },
        darkAccent: {
          DEFAULT: '#1E1E1E',
          hover: '#2D2D2D',
          light: '#333333',
        },
        // Semantic Primary Tokens (mapped to Periwinkle #A28EF9)
        primary: {
          DEFAULT: '#A28EF9',
          hover: '#9077F7',
          pressed: '#7D64F6',
          light: '#F3F0FE',
          50: '#F9F8FE',
          100: '#F3F0FE',
          200: '#E2DBFD',
          500: '#A28EF9',
          600: '#9077F7',
          700: '#7D64F6',
        },
        // Neutral Tokens
        neutral: {
          bg: '#F7F8FA',
          card: '#ECEEF0',
          surface: '#FFFFFF',
          surfaceSecondary: '#ECEEF0',
          border: '#E2E5E9',
          borderSubtle: '#ECEEF0',
          textPrimary: '#1E1E1E',
          textSecondary: '#5A606A',
          textTertiary: '#8E95A2',
        },
        // Semantic Status Tokens using pastel accents
        status: {
          success: '#1B6A22',
          successBg: '#A4F5A6',
          successBorder: '#8CEE8F',
          warning: '#7A4300',
          warningBg: '#FFD89D',
          warningBorder: '#F9C679',
          error: '#9E1C1C',
          errorBg: '#FFE0E0',
          errorBorder: '#FFB8B8',
          info: '#312E81',
          infoBg: '#E0DAFC',
          infoBorder: '#C5BAFA',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '22px',
        '3xl': '28px',
        card: '22px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        '2xs': '0px 1px 2px rgba(30, 30, 30, 0.04)',
        xs: '0px 2px 4px rgba(30, 30, 30, 0.05)',
        sm: '0px 2px 8px rgba(30, 30, 30, 0.06)',
        md: '0px 4px 12px rgba(30, 30, 30, 0.08)',
        lg: '0px 8px 24px rgba(30, 30, 30, 0.12)',
        floating: '0px 10px 30px rgba(30, 30, 30, 0.22)',
      },
      fontFamily: {
        sans: [
          'Fustat',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
