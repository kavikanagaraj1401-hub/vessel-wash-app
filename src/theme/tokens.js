// Vessel Wash Application - Refined Pure Grayscale Monochrome Design Tokens (Dorme Architecture)

export const tokens = {
  // Light Grayscale Surface Mode
  light: {
    paper: '#F5F5F7',            // Soft Alabaster canvas
    surface: '#FFFFFF',          // Pure white cards
    surfaceSecondary: '#EFEFF1', // Soft pill track / secondary surface
    border: 'rgba(0, 0, 0, 0.07)', // Subtle hairline border
    borderSubtle: 'rgba(0, 0, 0, 0.04)',
    borderStrong: 'rgba(0, 0, 0, 0.14)',
    ink: '#111214',              // Deep charcoal primary text
    textPrimary: '#111214',
    textSecondary: '#6E6E73',    // Neutral slate secondary text
    textTertiary: '#8E8E93',     // Ash metadata text
    activeDock: '#111214',       // Obsidian solid active pill
    activeDockText: '#FFFFFF',
    pillTrack: '#EFEFF1',
    pillActive: '#FFFFFF',
    pillActiveText: '#111214',
    semanticOk: '#111214',
    semanticOkSubtle: '#EFEFF1',
    semanticWarn: '#6E6E73',
    semanticWarnSubtle: '#F5F5F7',
    semanticError: '#111214',
    semanticErrorSubtle: '#EFEFF1',
  },

  // Dark Grayscale Surface Mode
  dark: {
    paper: '#0B0C0E',            // Deep Charcoal / Obsidian canvas
    surface: '#141518',          // Elevated dark graphite cards
    surfaceSecondary: '#1C1D21', // Soft pill track / elevated secondary surface
    border: 'rgba(255, 255, 255, 0.08)', // Subtle hairline border
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    ink: '#F5F5F7',              // Crisp off-white primary text
    textPrimary: '#F5F5F7',
    textSecondary: '#8E8E93',    // Muted silver secondary text
    textTertiary: '#636366',     // Slate tertiary text
    activeDock: '#FFFFFF',       // Solid pure white active pill
    activeDockText: '#0B0C0E',
    pillTrack: '#1C1D21',
    pillActive: '#2C2E33',
    pillActiveText: '#F5F5F7',
    semanticOk: '#F5F5F7',
    semanticOkSubtle: '#1C1D21',
    semanticWarn: '#8E8E93',
    semanticWarnSubtle: '#141518',
    semanticError: '#F5F5F7',
    semanticErrorSubtle: '#1C1D21',
  },

  typography: {
    screenTitle: 'text-[28px] sm:text-[32px] font-semibold tracking-[-0.03em] leading-tight',
    screenSubtitle: 'text-[13px] text-[#6E6E73] dark:text-[#8E8E93] font-normal tracking-normal',
    heroDisplay: 'text-[36px] sm:text-[42px] font-bold tracking-[-0.04em] leading-tight tabular-nums',
    heroOverline: 'text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93]',
    bentoLabel: 'text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] tracking-normal',
    bentoMetric: 'text-[22px] sm:text-[26px] font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-[-0.02em] tabular-nums',
    bentoSub: 'text-[11px] text-[#8E8E93] dark:text-[#636366] font-normal',
    overline: 'text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93]',
  },

  radius: {
    hero: 'rounded-[24px]',
    bento: 'rounded-[20px]',
    pill: 'rounded-full',
    dock: 'rounded-full',
  },
};
