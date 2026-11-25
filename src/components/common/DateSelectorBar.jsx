import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Sparkles } from 'lucide-react';
import { formatDayMonth, formatShortDate, getTodayDateStr } from '../../logic/dateUtils';

/**
 * Sleek horizontal Date Selector Bar with Light & Dark token system
 */
export function DateSelectorBar({
  selectedDateStr = getTodayDateStr(),
  onSelectDate,
  todayDateStr = getTodayDateStr(),
  availableDays = [],
}) {
  // Ensure selected date is never before today
  React.useEffect(() => {
    if (selectedDateStr < todayDateStr && onSelectDate) {
      onSelectDate(todayDateStr);
    }
  }, [selectedDateStr, todayDateStr, onSelectDate]);

  // Restrict available days to today and future dates only
  const currentOrFutureDays = React.useMemo(() => {
    const filtered = (availableDays || []).filter(d => d.date >= todayDateStr);
    return filtered.length > 0 ? filtered : [{ date: todayDateStr, dayOfWeek: '', dayNumber: parseInt(todayDateStr.split('-')[2], 10) }];
  }, [availableDays, todayDateStr]);

  const currentIndex = currentOrFutureDays.findIndex(d => d.date === selectedDateStr);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < currentOrFutureDays.length - 1) {
      onSelectDate(currentOrFutureDays[currentIndex + 1].date);
    } else {
      const cur = new Date(selectedDateStr);
      cur.setDate(cur.getDate() + 1);
      const nextDate = cur.toISOString().split('T')[0];
      onSelectDate(nextDate);
    }
  };

  const isToday = selectedDateStr === todayDateStr;

  // Window of 7 days starting from today onwards for the strip
  const startIdx = Math.max(0, Math.min(safeIndex, Math.max(0, currentOrFutureDays.length - 7)));
  const visibleDays = currentOrFutureDays.slice(startIdx, startIdx + 7);

  const currentDayObj = currentOrFutureDays[currentIndex] || {};
  const dayOfWeek = currentDayObj.dayOfWeek || '';

  const [currentTime, setCurrentTime] = React.useState(() => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minDate = todayDateStr;
  const maxDate = availableDays[availableDays.length - 1]?.date || '2035-12-31';

  return (
    <div className="bg-white dark:bg-[#151922] rounded-[24px] border border-[#E8E5DE] dark:border-[#263042] p-3.5 shadow-sm space-y-2.5 transition-colors duration-200">
      {/* Top row: Date Switcher Controls (No previous day button to disallow navigating to past dates) */}
      <div className="flex items-center justify-between gap-2">
        {/* Left spacer / Today indicator */}
        <div className="w-8 flex items-center justify-center flex-shrink-0">
          {isToday ? (
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] dark:bg-[#4ADE80] ring-2 ring-[#16A34A]/20 dark:ring-[#4ADE80]/30" title="Live Today" />
          ) : (
            <button
              type="button"
              onClick={() => onSelectDate && onSelectDate(todayDateStr)}
              className="text-[#EA580C] dark:text-[#F59E0B] hover:text-[#C2410C] text-xs font-extrabold cursor-pointer"
              title="Return to Today"
            >
              Today
            </button>
          )}
        </div>

        {/* Center: Selected Date + Live Time */}
        <div className="flex flex-col items-center justify-center min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap justify-center text-center">
            <span className="text-xs sm:text-sm font-extrabold text-[#18181B] dark:text-[#F4F4F5] tracking-tight">
              {formatShortDate(selectedDateStr)}
            </span>
            {dayOfWeek && (
              <span className="text-[11px] text-[#52525B] dark:text-[#94A3B8] font-medium">
                · {dayOfWeek}
              </span>
            )}
            {isToday && (
              <span className="text-[11px] text-[#EA580C] dark:text-[#F59E0B] font-bold">
                · {currentTime}
              </span>
            )}
          </div>
        </div>

        {/* Next Day Button */}
        <button
          type="button"
          onClick={handleNext}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[#52525B] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#F4F3EF] dark:hover:bg-[#1E2533] active-scale transition-colors border border-[#E8E5DE] dark:border-[#263042] flex-shrink-0 cursor-pointer"
          title="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Middle row: Quick Jump Input (Restricted to today onwards) */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#E8E5DE]/70 dark:border-[#263042]/70">
        <div className="flex items-center gap-1.5 text-xs text-[#52525B] dark:text-[#94A3B8]">
          <Calendar className="w-3.5 h-3.5 text-[#EA580C] dark:text-[#F59E0B]" />
          <span className="text-[11px] font-medium hidden sm:inline">Jump to:</span>
          <input
            type="date"
            value={selectedDateStr}
            min={minDate}
            max={maxDate}
            onChange={(e) => {
              if (e.target.value) {
                const target = e.target.value < todayDateStr ? todayDateStr : e.target.value;
                onSelectDate(target);
              }
            }}
            className="text-[11px] font-bold bg-[#F4F3EF] dark:bg-[#1E2533] text-[#18181B] dark:text-[#F4F4F5] border border-[#E8E5DE] dark:border-[#263042] rounded-xl px-2.5 py-1 outline-none focus:ring-2 focus:ring-[#F97316]/40 cursor-pointer"
          />
        </div>

        {/* Return to Today Button */}
        {!isToday && (
          <button
            type="button"
            onClick={() => onSelectDate && onSelectDate(todayDateStr)}
            className="flex items-center gap-1 text-[11px] font-extrabold text-white px-3 py-1 rounded-xl bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#F59E0B] shadow-[0_2px_8px_rgba(249,115,22,0.3)] hover:opacity-95 active-scale transition-all cursor-pointer"
            title={`Return to today (${formatDayMonth(todayDateStr)})`}
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2.4} />
            <span>Today ({formatDayMonth(todayDateStr)})</span>
          </button>
        )}
      </div>

      {/* Horizontal date chips (Today and upcoming dates only) */}
      <div className="grid grid-cols-7 gap-1 pt-1.5 border-t border-[#E8E5DE]/60 dark:border-[#263042]/60">
        {visibleDays.map(day => {
          const isSelected = day.date === selectedDateStr;
          const isThisToday = day.date === todayDateStr;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate && onSelectDate(day.date)}
              className={`flex flex-col items-center py-1.5 px-0.5 rounded-xl text-xs transition-all active-scale select-none cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-br from-[#EA580C] via-[#F97316] to-[#F59E0B] text-white shadow-[0_3px_10px_rgba(249,115,22,0.35)] font-extrabold ring-2 ring-[#F97316]/30'
                  : isThisToday
                  ? 'bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#15803D] dark:text-[#4ADE80] border border-[#86EFAC] dark:border-[#166534] font-extrabold'
                  : 'bg-[#F4F3EF] dark:bg-[#1E2533] text-[#52525B] dark:text-[#94A3B8] hover:bg-[#EAE8E2] dark:hover:bg-[#253248] border border-transparent'
              }`}
            >
              <span className={`text-[9px] leading-tight ${isSelected ? 'text-white/90 font-bold' : isThisToday ? 'text-[#15803D] dark:text-[#4ADE80] font-bold' : 'text-[#71717A] dark:text-[#94A3B8]'}`}>
                {day.dayOfWeek ? day.dayOfWeek.slice(0, 3) : ''}
              </span>
              <span className={`text-[11px] leading-tight mt-0.5 font-extrabold ${isSelected ? 'text-white' : ''}`}>
                {day.dayNumber}
              </span>
              {isThisToday && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-[#16A34A] dark:bg-[#4ADE80] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
