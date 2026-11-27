import React from 'react';
import { LayoutGrid, Receipt, Users, History } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Floating Pill Bottom Navigation Dock (Dorme Architecture)
 * - Sleek floating rounded pill navigation dock (rounded-full / 28px radius)
 * - Solid high-contrast active pill indicator:
 *   - Pure white/light pill in dark mode (#FFFFFF text-[#0B0C0E])
 *   - Deep charcoal/obsidian pill in light mode (#111214 text-white)
 * - Crisp monochrome icons + micro-labels for Home, Bill, Members, and History
 * - Muted inactive items with soft hover and active-scale feedback
 */
export function BottomNav({ activeTab, onTabChange }) {
  const { isDark } = useTheme();

  const tabs = [
    { id: 'today', label: 'Home', icon: LayoutGrid },
    { id: 'bill', label: 'Bill', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="shrink-0 w-full px-4 pb-safe pt-1 pointer-events-none z-30 flex justify-center">
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto w-full max-w-[400px] mb-2 sm:mb-3 p-1.5 rounded-full bg-white/90 dark:bg-[#141518]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_14px_36px_rgba(0,0,0,0.5)] select-none transition-all duration-200"
      >
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full text-xs transition-all duration-200 select-none active-scale cursor-pointer ${
                  isActive
                    ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] font-semibold shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  className="w-4 h-4 shrink-0 transition-transform duration-150"
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span className="text-[11px] sm:text-[12px] tracking-tight truncate leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

