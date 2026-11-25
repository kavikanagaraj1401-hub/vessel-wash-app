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
    <div className="bg-white dark:bg-[#171F2C] rounded-2xl border border-[#DDD9D0] dark:border-[#2A364B] p-3 shadow-xs space-y-2.5">
      {/* Top row: Date Switcher Controls (No previous day button to disallow navigating to past dates) */}
      <div className="flex items-center justify-between gap-2">
        {/* Left spacer / Today indicator */}
        <div className="w-8 flex items-center justify-center flex-shrink-0">
          {isToday ? (
            <span className="w-2.5 h-2.5 rounded-full bg-[#22AC77] dark:bg-[#4ADE80]" title="Live Today" />
          ) : (
            <button
              type="button"
              onClick={() => onSelectDate && onSelectDate(todayDateStr)}
              className="text-[#ECBD56] hover:text-[#DEAA3E] text-xs font-bold cursor-pointer"
              title="Return to Today"
            >
              Today
            </button>
          )}
        </div>

        {/* Center: Selected Date + Live Time */}
        <div className="flex flex-col items-center justify-center min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap justify-center text-center">
            <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] tracking-tight">
              {formatShortDate(selectedDateStr)}
            </span>
            {dayOfWeek && (
              <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] font-medium">
                · {dayOfWeek}
              </span>
            )}
            {isToday && (
              <span className="text-[11px] text-[#ECBD56] font-bold">
                · {currentTime}
              </span>
            )}
          </div>
        </div>

        {/* Next Day Button */}
        <button
          type="button"
          onClick={handleNext}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#4E525D] dark:text-[#9BA5B7] hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C] active-scale transition-colors border border-[#DDD9D0] dark:border-[#2A364B] flex-shrink-0 cursor-pointer"
          title="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Middle row: Quick Jump Input (Restricted to today onwards) */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
        <div className="flex items-center gap-1.5 text-xs text-[#4E525D] dark:text-[#9BA5B7]">
          <Calendar className="w-3.5 h-3.5 text-[#ECBD56]" />
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
            className="text-[11px] font-semibold bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] rounded-lg px-2 py-0.5 outline-none focus:border-[#ECBD56] cursor-pointer"
          />
        </div>

        {/* Return to Today Button */}
        {!isToday && (
          <button
            type="button"
            onClick={() => onSelectDate && onSelectDate(todayDateStr)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#111216] px-2.5 py-1 rounded-lg bg-[#ECBD56] hover:bg-[#DEAA3E] active-scale transition-all cursor-pointer shadow-2xs"
            title={`Return to today (${formatDayMonth(todayDateStr)})`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Today ({formatDayMonth(todayDateStr)})</span>
          </button>
        )}
      </div>

      {/* Horizontal date chips (Today and upcoming dates only) */}
      <div className="grid grid-cols-7 gap-1 pt-1 border-t border-[#DDD9D0]/50 dark:border-[#2A364B]/50">
        {visibleDays.map(day => {
          const isSelected = day.date === selectedDateStr;
          const isThisToday = day.date === todayDateStr;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate && onSelectDate(day.date)}
              className={`flex flex-col items-center py-1 px-0.5 rounded-lg text-xs transition-all active-scale select-none cursor-pointer ${
                isSelected
                  ? 'bg-[#ECBD56] text-[#111216] shadow-xs font-bold ring-2 ring-[#ECBD56]/40'
                  : isThisToday
                  ? 'bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#22AC77] dark:text-[#4ADE80] border border-[#97E2C0] dark:border-[#166534] font-bold'
                  : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] hover:bg-[#EAE8E2] dark:hover:bg-[#253248]'
              }`}
            >
              <span className={`text-[9px] leading-tight ${isSelected ? 'text-[#111216] font-bold' : isThisToday ? 'text-[#22AC77] dark:text-[#4ADE80] font-bold' : 'text-[#848A96] dark:text-[#64748B]'}`}>
                {day.dayOfWeek ? day.dayOfWeek.slice(0, 3) : ''}
              </span>
              <span className="text-[11px] leading-tight mt-0.5 font-bold">
                {day.dayNumber}
              </span>
              {isThisToday && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-[#22AC77] dark:bg-[#4ADE80] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
