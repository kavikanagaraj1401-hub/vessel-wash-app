// Vessel Wash Application - Design Token System (Light & Dark Modes)

export const tokens = {
  // Light Mode Tokens
  light: {
    paper: '#F2F1ED',         // Light paper neutral background
    surface: '#FFFFFF',       // Pure white cards & surface
    surfaceSecondary: '#EAE8E2', // Muted secondary cards/badges
    border: '#DDD9D0',        // Subtle card & divider border
    borderSubtle: '#E8E5DD',
    ink: '#111216',           // Deep rich dark ink text
    textPrimary: '#111216',
    textSecondary: '#4E525D', // Secondary muted text
    textTertiary: '#848A96',  // Tertiary metadata text
    accentGold: '#ECBD56',    // Primary gold interactive elements & buttons
    accentGoldHover: '#DEAA3E',
    accentGoldSubtle: '#FCF7ED',
    semanticOk: '#22AC77',    // Success green
    semanticOkSubtle: '#EAF8F1',
    semanticWarn: '#E0851A',  // Warning amber
    semanticWarnSubtle: '#FDF3E8',
    semanticError: '#D9483B', // Error red
    semanticErrorSubtle: '#FDF1F0',
    semanticInfo: '#2563EB',  // Info blue
    semanticInfoSubtle: '#EFF6FF',
    adminGradient: 'linear-gradient(135deg, #ECBD56 0%, #111216 100%)',
  },

  // Dark Mode Tokens
  dark: {
    paper: '#0B0C0E',         // Deep dark canvas
    surface: '#171F2C',       // Deep slate dark surface / cards
    surfaceSecondary: '#1F2A3C', // Sub-cards / secondary surface
    border: '#2A364B',        // Muted dark border
    borderSubtle: '#202B3B',
    ink: '#F7F6F3',           // Soft light ink text
    textPrimary: '#F7F6F3',
    textSecondary: '#9BA5B7', // Secondary light muted text
    textTertiary: '#64748B',  // Tertiary dark metadata text
    accentGold: '#ECBD56',    // Primary gold interactive elements
    accentGoldHover: '#F3CB6C',
    accentGoldSubtle: '#272115',
    semanticOk: '#4ADE80',    // Dark mode success green
    semanticOkSubtle: '#0E2E1D',
    semanticWarn: '#FF9F45',  // Dark mode warning orange
    semanticWarnSubtle: '#331C08',
    semanticError: '#FF5A4E', // Dark mode error red
    semanticErrorSubtle: '#331310',
    semanticInfo: '#BFB4FF',  // Dark mode info lilac
    semanticInfoSubtle: '#1B1E3B',
    adminGradient: 'linear-gradient(135deg, #ECBD56 0%, #111216 100%)',
  },

  // Common Admin Gradient Specification
  adminGradient: 'linear-gradient(135deg, #ECBD56 0%, #111216 100%)',

  typography: {
    display: 'text-2xl font-bold tracking-tight',
    h1: 'text-xl font-semibold tracking-tight',
    h2: 'text-lg font-semibold',
    h3: 'text-base font-semibold',
    bodyLarge: 'text-base font-normal',
    body: 'text-sm font-normal text-[#4E525D] dark:text-[#9BA5B7]',
    bodyMedium: 'text-sm font-medium',
    bodySmall: 'text-xs font-normal text-[#848A96] dark:text-[#64748B]',
    caption: 'text-[11px] font-medium tracking-wide uppercase',
    buttonLabel: 'text-sm font-semibold tracking-tight',
  },
  radius: {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-[22px]',
    full: 'rounded-full',
  },
};
