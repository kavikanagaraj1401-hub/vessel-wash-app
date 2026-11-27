import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, CheckCircle2, ChevronRight, X } from 'lucide-react';

export function GentleReminderBanner({
  todayDateStr,
  computedDays = [],
  members = [],
  attendanceLogs = [],
  onNavigateToday,
}) {
  const [dismissed, setDismissed] = useState(false);

  // Sync dismiss state per today's date from session storage
  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem(`vessel_reminder_dismissed_${todayDateStr}`);
      if (isDismissed === 'true') {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    } catch (e) {
      // ignore storage access errors
    }
  }, [todayDateStr]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`vessel_reminder_dismissed_${todayDateStr}`, 'true');
    } catch (e) {
      // ignore
    }
  };

  if (dismissed) return null;

  // Find today's computed washer
  const todayComp = computedDays.find(d => d.date === todayDateStr);
  const dinnerWasherId = todayComp?.slots?.dinner?.[0]?.assignedMemberId;
  const dinnerWasher = members.find(m => m.id === dinnerWasherId);

  // Check if today's wash duty is already completed in attendance logs
  const todayDinnerLog = attendanceLogs.find(
    l => l.date === todayDateStr && (l.meal === 'dinner' || l.meal === 'lunch') && l.status === 'present'
  );

  return (
    <div className="px-4 pt-3 pb-1 w-full animate-fadeIn transition-all duration-300 font-sans">
      <div className="relative overflow-hidden rounded-[20px] border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#141518] shadow-xs p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 border border-black/[0.05] dark:border-white/[0.05] flex items-center justify-center shrink-0 text-[#111214] dark:text-[#F5F5F7] mt-0.5 shadow-2xs">
              {todayDinnerLog ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-current" />
              ) : (
                <Bell className="w-4.5 h-4.5 animate-pulse text-current" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-current" />
                  Daily Washer Reminder
                </span>
                {todayDinnerLog && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-[#111214] dark:text-[#F5F5F7] border border-black/[0.07] dark:border-white/[0.08]">
                    Done Today
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 leading-snug">
                {todayDinnerLog ? (
                  <span>
                    Today's wash duty was completed by <strong className="font-semibold text-[#111214] dark:text-[#F5F5F7]">{todayDinnerLog.memberName}</strong>.
                  </span>
                ) : (
                  <span>
                    Friendly reminder: Please remember to mark today's vessel wash duty once finished.
                    {dinnerWasher && (
                      <span className="block sm:inline sm:ml-1 mt-0.5 sm:mt-0 font-medium text-[#111214] dark:text-[#F5F5F7]">
                        Scheduled: <strong className="text-[#111214] dark:text-[#F5F5F7]">{dinnerWasher.name} ({dinnerWasher.code || 'M'})</strong>
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {onNavigateToday && (
              <button
                type="button"
                onClick={onNavigateToday}
                className="px-3 py-1 text-xs font-semibold text-[#111214] dark:text-[#F5F5F7] bg-[#F5F5F7] hover:bg-black/10 dark:bg-[#1C1D21] dark:hover:bg-white/10 border border-black/[0.07] dark:border-white/[0.08] rounded-full transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss reminder"
              className="p-1 rounded-full text-[#6E6E73] hover:text-[#111214] dark:text-[#8E8E93] dark:hover:text-[#F5F5F7] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
