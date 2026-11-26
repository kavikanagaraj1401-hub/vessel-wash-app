import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
  isDaytime: true,
  timeTheme: 'day',
  brandClasses: {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('vw_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const isDark = theme === 'dark';

  // Daytime check: 6:00 AM (06:00) to 6:59 PM (18:59)
  const getIsDaytime = () => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19;
  };

  const [isDaytime, setIsDaytime] = useState(getIsDaytime);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    try {
      localStorage.setItem('vw_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Keep time-based brand theme automatically updated (Orange for Day, Blue for Night)
  useEffect(() => {
    const syncBrandTime = () => {
      const daytime = getIsDaytime();
      setIsDaytime(daytime);
      const root = document.documentElement;
      if (daytime) {
        root.setAttribute('data-brand', 'day');
        root.classList.remove('brand-night');
        root.classList.add('brand-day');
      } else {
        root.setAttribute('data-brand', 'night');
        root.classList.remove('brand-day');
        root.classList.add('brand-night');
      }
    };

    syncBrandTime();
    const interval = setInterval(syncBrandTime, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (mode) => {
    if (mode === 'dark' || mode === 'light') {
      setThemeState(mode);
    }
  };

  const brandClasses = useMemo(() => {
    return isDaytime
      ? {
          primaryGradient: 'bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#F59E0B]',
          activeText: 'text-[#EA580C] dark:text-[#F59E0B]',
          badge: 'bg-[#FFF7ED] dark:bg-[#2A1D15] text-[#C2410C] dark:text-[#FDBA74] border-[#F97316]/30',
          ring: 'focus-visible:ring-[#EA580C]/40',
          accentBorder: 'border-[#EA580C] dark:border-[#F59E0B]',
          accentBorderSubtle: 'border-[#EA580C]/30 dark:border-[#F59E0B]/40',
          subtleBg: 'bg-[#EA580C]/10 dark:bg-[#F59E0B]/15',
        }
      : {
          primaryGradient: 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#06B6D4]',
          activeText: 'text-[#2563EB] dark:text-[#38BDF8]',
          badge: 'bg-[#EFF6FF] dark:bg-[#151D2E] text-[#1D4ED8] dark:text-[#93C5FD] border-[#3B82F6]/30',
          ring: 'focus-visible:ring-[#2563EB]/40',
          accentBorder: 'border-[#2563EB] dark:border-[#38BDF8]',
          accentBorderSubtle: 'border-[#2563EB]/30 dark:border-[#38BDF8]/40',
          subtleBg: 'bg-[#2563EB]/10 dark:bg-[#06B6D4]/15',
        };
  }, [isDaytime]);

  return (
    <ThemeContext.Provider value={{
      theme,
      isDark,
      toggleTheme,
      setTheme,
      isDaytime,
      timeTheme: isDaytime ? 'day' : 'night',
      brandClasses,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

