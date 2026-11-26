import React from 'react';
import { LayoutGrid, Receipt, Users, History } from 'lucide-react';

/**
 * Modern Sleek Horizontal Dock Bottom Navigation Bar
 * - Fixed/pinned cleanly at the viewport bottom with balanced padding and safe-area clearance
 * - Minimalist thin-stroke icons stacked directly above crisp compact text labels
 * - High-contrast active vs. muted inactive states with no bulky top lines or cramped spacing
 * - Light and Dark mode WCAG contrast accessibility
 */
export function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'today', label: 'Home', icon: LayoutGrid },
    { id: 'bill', label: 'Bill', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-t border-[#DDD9D0]/70 dark:border-[#263042]/70 pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] select-none transition-colors duration-200"
    >
      <div className="w-full max-w-lg mx-auto grid grid-cols-4 h-16 px-2">
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
              className={`flex flex-col items-center justify-center py-1.5 px-1 h-full w-full select-none active-scale transition-all duration-150 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/40 ${
                isActive
                  ? 'text-[#EA580C] dark:text-[#F59E0B]'
                  : 'text-[#71717A] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
              }`}
            >
              <Icon
                className="w-5 h-5 transition-transform duration-150"
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] sm:text-[11px] tracking-tight leading-none mt-1 transition-all ${
                  isActive
                    ? 'font-extrabold text-[#EA580C] dark:text-[#F59E0B]'
                    : 'font-medium text-[#71717A] dark:text-[#94A3B8]'
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
