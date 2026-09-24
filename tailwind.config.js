/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Exact Design Token Palette (Light & Dark)
        gold: {
          DEFAULT: '#ECBD56',
          hover: '#DEAA3E',
          active: '#C9972E',
          light: '#FCF7ED',
          dark: '#272115',
        },
        paper: {
          light: '#F2F1ED',
          dark: '#0B0C0E',
          DEFAULT: '#F2F1ED',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#171F2C',
          DEFAULT: '#FFFFFF',
        },
        surfaceSecondary: {
          light: '#EAE8E2',
          dark: '#1F2A3C',
          DEFAULT: '#EAE8E2',
        },
        ink: {
          DEFAULT: '#111216',
          light: '#F7F6F3',
        },
        semanticOk: {
          light: '#22AC77',
          dark: '#4ADE80',
          DEFAULT: '#22AC77',
        },
        semanticWarn: {
          light: '#E0851A',
          dark: '#FF9F45',
          DEFAULT: '#E0851A',
        },
        semanticError: {
          light: '#D9483B',
          dark: '#FF5A4E',
          DEFAULT: '#D9483B',
        },
        semanticInfo: {
          light: '#2563EB',
          dark: '#BFB4FF',
          DEFAULT: '#2563EB',
        },

        // Legacy / Compatibility Colors
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
          DEFAULT: '#111216',
          hover: '#2D2D2D',
          light: '#333333',
        },
        primary: {
          DEFAULT: '#ECBD56',
          hover: '#DEAA3E',
          pressed: '#C9972E',
          light: '#FCF7ED',
          50: '#FDFBF7',
          100: '#FCF7ED',
          200: '#F9EBCB',
          500: '#ECBD56',
          600: '#DEAA3E',
          700: '#C9972E',
        },
        neutral: {
          bg: '#F2F1ED',
          card: '#FFFFFF',
          surface: '#FFFFFF',
          surfaceSecondary: '#EAE8E2',
          border: '#DDD9D0',
          borderSubtle: '#EAE8E2',
          textPrimary: '#111216',
          textSecondary: '#4E525D',
          textTertiary: '#848A96',
        },
        status: {
          success: '#22AC77',
          successBg: '#EAF8F1',
          successBorder: '#97E2C0',
          warning: '#E0851A',
          warningBg: '#FDF3E8',
          warningBorder: '#F7C68B',
          error: '#D9483B',
          errorBg: '#FDF1F0',
          errorBorder: '#F5A9A2',
          info: '#2563EB',
          infoBg: '#EFF6FF',
          infoBorder: '#93C5FD',
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
        '2xs': '0px 1px 2px rgba(17, 18, 22, 0.04)',
        xs: '0px 2px 4px rgba(17, 18, 22, 0.05)',
        sm: '0px 2px 8px rgba(17, 18, 22, 0.06)',
        md: '0px 4px 12px rgba(17, 18, 22, 0.08)',
        lg: '0px 8px 24px rgba(17, 18, 22, 0.12)',
        floating: '0px 10px 30px rgba(17, 18, 22, 0.22)',
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
