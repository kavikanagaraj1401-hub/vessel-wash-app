import React from 'react';
import { LayoutGrid, Users, Receipt, History, Activity } from 'lucide-react';

/**
 * Floating Bottom Navigation Bar
 * Matching reference styling specifications:
 * - Floating dark matte black / charcoal pill (#161616, border-radius: 9999px)
 * - Inner padding: 8px 16px, centered with bottom margin
 * - 5 tabs: Dashboard, Members, Bill, History, Activity
 * - Inactive state: Muted light gray (#A1A1AA) icon with text directly underneath
 * - Active state: Pure Vibrant Neon Lime Green (#D2F521) for both icon & text (no background box)
 * - Smooth transition: transition-colors duration-200 ease-in-out
 */
export function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'today', label: 'Dashboard', icon: LayoutGrid },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'bill', label: 'Bill', icon: Receipt },
    { id: 'history', label: 'History', icon: History },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-3 pb-safe">
      {/* Floating Dark Pill Container (#161616, border-radius: 9999px) */}
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto bg-[#161616] rounded-full py-2 px-3 sm:px-5 shadow-2xl shadow-black/60 flex items-center justify-between border border-white/10 w-full max-w-[420px]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 sm:px-2.5 flex-1 select-none active-scale transition-colors duration-200 ease-in-out cursor-pointer ${
                isActive
                  ? 'text-[#D2F521]'
                  : 'text-[#A1A1AA] hover:text-[#E4E4E7]'
              }`}
            >
              <Icon
                className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200"
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] sm:text-[11px] tracking-tight leading-none font-sans ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
