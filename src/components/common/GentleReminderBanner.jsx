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
    <div className="px-4 pt-3 pb-1 w-full animate-fadeIn transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-[#ECBD56]/35 dark:border-[#ECBD56]/30 bg-gradient-to-r from-[#FFFDF5] to-[#FFFFFF] dark:from-[#171F2C] dark:to-[#121822] shadow-sm p-3.5 sm:p-4">
        {/* Subtle warm glow background */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#ECBD56]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#ECBD56]/15 dark:bg-[#ECBD56]/20 border border-[#ECBD56]/30 flex items-center justify-center shrink-0 text-[#D49F2A] dark:text-[#ECBD56] mt-0.5 shadow-2xs">
              {todayDinnerLog ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
              ) : (
                <Bell className="w-4.5 h-4.5 animate-pulse" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B8871E] dark:text-[#ECBD56] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Daily Washer Reminder
                </span>
                {todayDinnerLog && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Done Today
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#4E4D48] dark:text-[#9EA8B6] mt-0.5 leading-snug">
                {todayDinnerLog ? (
                  <span>
                    Today's wash duty was completed by <strong className="font-semibold text-[#111216] dark:text-[#F7F6F3]">{todayDinnerLog.memberName}</strong>.
                  </span>
                ) : (
                  <span>
                    Friendly reminder: Please remember to mark today's vessel wash duty once finished.
                    {dinnerWasher && (
                      <span className="block sm:inline sm:ml-1 mt-0.5 sm:mt-0 font-medium text-[#111216] dark:text-[#F7F6F3]">
                        Scheduled: <strong className="text-[#B8871E] dark:text-[#ECBD56]">{dinnerWasher.name} ({dinnerWasher.code || 'M'})</strong>
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {onNavigateToday && (
              <button
                type="button"
                onClick={onNavigateToday}
                className="px-2.5 py-1 text-xs font-semibold text-[#111216] dark:text-[#F7F6F3] bg-[#ECBD56]/20 hover:bg-[#ECBD56]/30 dark:bg-[#ECBD56]/25 dark:hover:bg-[#ECBD56]/35 border border-[#ECBD56]/40 rounded-lg transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss reminder"
              className="p-1 rounded-lg text-[#888680] hover:text-[#111216] dark:text-[#6E7B8E] dark:hover:text-[#F7F6F3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
