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
    <div className="bg-white dark:bg-[#141518] rounded-[20px] border border-black/[0.07] dark:border-white/[0.08] p-3.5 shadow-sm space-y-2.5 transition-colors duration-200">
      {/* Top row: Date Switcher Controls (No previous day button to disallow navigating to past dates) */}
      <div className="flex items-center justify-between gap-2">
        {/* Left spacer / Today indicator */}
        <div className="w-8 flex items-center justify-center flex-shrink-0">
          {isToday ? (
            <span className="w-2 h-2 rounded-full bg-[#111214] dark:bg-white ring-2 ring-black/10 dark:ring-white/20" title="Live Today" />
          ) : (
            <button
              type="button"
              onClick={() => onSelectDate && onSelectDate(todayDateStr)}
              className="text-[#111214] dark:text-[#F5F5F7] hover:opacity-75 text-xs font-bold cursor-pointer"
              title="Return to Today"
            >
              Today
            </button>
          )}
        </div>

        {/* Center: Selected Date + Live Time */}
        <div className="flex flex-col items-center justify-center min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap justify-center text-center">
            <span className="text-xs sm:text-sm font-bold text-[#111214] dark:text-[#F5F5F7] tracking-tight tabular-nums">
              {formatShortDate(selectedDateStr)}
            </span>
            {dayOfWeek && (
              <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] font-medium">
                · {dayOfWeek}
              </span>
            )}
            {isToday && (
              <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] font-semibold tabular-nums">
                · {currentTime}
              </span>
            )}
          </div>
        </div>

        {/* Next Day Button */}
        <button
          type="button"
          onClick={handleNext}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7] hover:bg-black/5 dark:hover:bg-white/5 active-scale transition-colors border border-black/[0.08] dark:border-white/[0.08] flex-shrink-0 cursor-pointer"
          title="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Middle row: Quick Jump Input (Restricted to today onwards) */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-black/[0.07] dark:border-white/[0.08]">
        <div className="flex items-center gap-1.5 text-xs text-[#6E6E73] dark:text-[#8E8E93]">
          <Calendar className="w-3.5 h-3.5 text-[#111214] dark:text-[#F5F5F7]" />
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
            className="text-[11px] font-bold tabular-nums bg-black/[0.04] dark:bg-white/[0.05] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-2.5 py-1 outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 cursor-pointer"
          />
        </div>

        {/* Return to Today Button */}
        {!isToday && (
          <button
            type="button"
            onClick={() => onSelectDate && onSelectDate(todayDateStr)}
            className="flex items-center gap-1 text-[11px] font-bold text-white dark:text-[#0B0C0E] px-3 py-1 rounded-xl bg-[#111214] dark:bg-white shadow-sm hover:opacity-90 active-scale transition-all cursor-pointer"
            title={`Return to today (${formatDayMonth(todayDateStr)})`}
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2.4} />
            <span>Today ({formatDayMonth(todayDateStr)})</span>
          </button>
        )}
      </div>

      {/* Horizontal date chips (Today and upcoming dates only) */}
      <div className="grid grid-cols-7 gap-1 pt-1.5 border-t border-black/[0.07] dark:border-white/[0.08]">
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
                  ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] shadow-sm font-bold ring-1 ring-black/10 dark:ring-white/20'
                  : isThisToday
                  ? 'bg-black/5 dark:bg-white/10 text-[#111214] dark:text-[#F5F5F7] border border-black/15 dark:border-white/20 font-bold'
                  : 'bg-black/[0.03] dark:bg-white/[0.04] text-[#6E6E73] dark:text-[#8E8E93] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-transparent'
              }`}
            >
              <span className={`text-[9px] leading-tight ${isSelected ? 'text-white/90 dark:text-[#0B0C0E]/90 font-bold' : isThisToday ? 'text-[#111214] dark:text-[#F5F5F7] font-bold' : 'text-[#8E8E93] dark:text-[#636366]'}`}>
                {day.dayOfWeek ? day.dayOfWeek.slice(0, 3) : ''}
              </span>
              <span className={`text-[11px] leading-tight mt-0.5 font-bold tabular-nums ${isSelected ? 'text-white dark:text-[#0B0C0E]' : ''}`}>
                {day.dayNumber}
              </span>
              {isThisToday && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-[#111214] dark:bg-white mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
