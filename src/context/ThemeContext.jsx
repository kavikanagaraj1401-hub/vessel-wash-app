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
    return isDark
      ? {
          primaryGradient: 'bg-white text-[#0B0C0E]',
          activeText: 'text-[#F5F5F7]',
          badge: 'bg-[#1C1D21] text-[#F5F5F7] border-white/10',
          ring: 'focus-visible:ring-white/20',
          accentBorder: 'border-white',
          accentBorderSubtle: 'border-white/20',
          subtleBg: 'bg-white/10',
        }
      : {
          primaryGradient: 'bg-[#111214] text-white',
          activeText: 'text-[#111214]',
          badge: 'bg-[#EFEFF1] text-[#111214] border-black/10',
          ring: 'focus-visible:ring-black/20',
          accentBorder: 'border-[#111214]',
          accentBorderSubtle: 'border-black/20',
          subtleBg: 'bg-black/5',
        };
  }, [isDark]);

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

