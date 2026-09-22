// Untitled UI Design Tokens for Vessel Washing Attendance Application

export const tokens = {
  colors: {
    primary: {
      default: '#0052FF',
      hover: '#0045D8',
      pressed: '#003BB8',
      light: '#F0F5FF',
    },
    neutral: {
      bg: '#F8F9FC',
      surface: '#FFFFFF',
      surfaceSecondary: '#F2F4F7',
      border: '#EAECF0',
      borderSubtle: '#F2F4F7',
      textPrimary: '#101828',
      textSecondary: '#475467',
      textTertiary: '#98A2B3',
    },
    status: {
      success: '#027A48',
      successBg: '#ECFDF3',
      successBorder: '#A6F4C5',
      warning: '#B54708',
      warningBg: '#FFFAEB',
      warningBorder: '#FEDF89',
      error: '#D92D20',
      errorBg: '#FEF3F2',
      errorBorder: '#FECDCA',
      info: '#175CD3',
      infoBg: '#EFF8FF',
      infoBorder: '#B2DDFF',
    },
  },
  typography: {
    display: 'text-2xl font-bold tracking-tight',       // 24px
    h1: 'text-xl font-semibold tracking-tight',         // 20px
    h2: 'text-lg font-semibold',                        // 18px
    h3: 'text-base font-semibold',                      // 16px
    bodyLarge: 'text-base font-normal',                 // 16px
    body: 'text-sm font-normal text-neutral-textSecondary', // 14px
    bodyMedium: 'text-sm font-medium',                  // 14px medium
    bodySmall: 'text-xs font-normal text-neutral-textTertiary', // 12px
    caption: 'text-[11px] font-medium tracking-wide uppercase', // 11px
    buttonLabel: 'text-sm font-semibold tracking-tight', // 14px semi
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    base: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '40px',
  },
  radius: {
    sm: 'rounded-sm',   // 6px
    md: 'rounded-md',   // 10px
    lg: 'rounded-lg',   // 14px
    xl: 'rounded-xl',   // 18px
    full: 'rounded-full',
  },
  shadows: {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
  },
};
