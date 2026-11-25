import React from 'react';
import { LayoutGrid, Receipt, Users, History } from 'lucide-react';

/**
 * Version 2 ("v2") Bottom Navigation Bar
 * - Mobile fixed/sticky bottom bar pinned strictly at viewport bottom
 * - Compact centered small indicator bar above active item
 * - Clean grayscale styling for non-meal navigation tabs
 * - Edge-to-edge layout with 4px element radius
 */
export function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'today', label: 'Dashboard', icon: LayoutGrid },
    { id: 'bill', label: 'Bill', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="sticky bottom-0 z-50 w-full bg-white dark:bg-[#121620] border-t border-[#DDD9D0] dark:border-[#263042] rounded-none pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.45)] select-none transition-colors duration-200"
    >
      <div className="w-full grid grid-cols-4 h-15 sm:h-16 px-1 sm:px-2">
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
              className={`relative flex flex-col items-center justify-center gap-1 h-full w-full select-none active-scale transition-colors duration-150 cursor-pointer rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 ${
                isActive
                  ? 'text-[#18181B] dark:text-[#F4F4F5]'
                  : 'text-[#71717A] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
              }`}
            >
              {/* Shortened compact, centered indicator bar above active item */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-[#18181B] dark:bg-[#F4F4F5] rounded-[1px] shadow-xs" />
              )}
              <Icon
                className="w-5 h-5 sm:w-[22px] sm:h-[22px] transition-transform duration-150"
                strokeWidth={isActive ? 2.5 : 1.9}
              />
              <span
                className={`text-[11px] sm:text-xs tracking-tight leading-none ${
                  isActive ? 'font-extrabold text-[#18181B] dark:text-[#F4F4F5]' : 'font-semibold'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
