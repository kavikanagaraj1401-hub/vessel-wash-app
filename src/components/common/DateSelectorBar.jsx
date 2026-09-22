import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Sparkles } from 'lucide-react';

/**
 * Sleek horizontal Date Selector Bar for Testing & Day-by-Day tracking.
 * Allows jumping between past, today, and future dates with 1-tap controls.
 */
export function DateSelectorBar({
  selectedDateStr = '2026-09-21',
  onSelectDate,
  todayDateStr = '2026-09-21',
  availableDays = [],
}) {
  const currentIndex = availableDays.findIndex(d => d.date === selectedDateStr);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < availableDays.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onSelectDate(availableDays[currentIndex - 1].date);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectDate(availableDays[currentIndex + 1].date);
    }
  };

  const isToday = selectedDateStr === todayDateStr;
  const isFuture = selectedDateStr > todayDateStr;

  // Window of 7 days around selected date for the pill strip
  const safeIndex = currentIndex >= 0 ? currentIndex : 20;
  const startIdx = Math.max(0, Math.min(safeIndex - 3, availableDays.length - 7));
  const visibleDays = availableDays.slice(startIdx, startIdx + 7);

  const currentDayObj = availableDays[currentIndex] || {};
  const dayOfWeek = currentDayObj.dayOfWeek || '';
  const dayNumber = currentDayObj.dayNumber || selectedDateStr.split('-')[2];

  return (
    <div className="bg-white rounded-2xl border border-neutral-border p-3 shadow-xs space-y-2.5">
      {/* Top row: Date Switcher Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Previous Day Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!hasPrev}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-textSecondary hover:bg-neutral-surfaceSecondary disabled:opacity-25 disabled:pointer-events-none active-scale transition-colors border border-neutral-border/60 flex-shrink-0"
          title="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Center: Selected Date + Status Tag */}
        <div className="flex flex-col items-center justify-center min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-textPrimary tracking-tight">
              {dayNumber ? `${dayNumber} Sep 2026` : selectedDateStr}
            </span>
            {dayOfWeek && (
              <span className="text-[11px] text-neutral-textSecondary font-medium">
                · {dayOfWeek}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            {isToday ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Today
              </span>
            ) : isFuture ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                Testing Future Date
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Testing Past Date
              </span>
            )}
          </div>
        </div>

        {/* Next Day Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasNext}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-textSecondary hover:bg-neutral-surfaceSecondary disabled:opacity-25 disabled:pointer-events-none active-scale transition-colors border border-neutral-border/60 flex-shrink-0"
          title="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Jump Options: Native Date Picker + Reset to Today */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-border/60 text-xs">
        {/* Native Date Input Picker */}
        <div className="flex items-center gap-1.5 bg-neutral-surfaceSecondary/70 hover:bg-neutral-surfaceSecondary px-2.5 py-1 rounded-lg border border-neutral-border/80 transition-colors">
          <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <label htmlFor="test-date-picker" className="text-[11px] font-semibold text-neutral-textSecondary cursor-pointer">
            Pick Date:
          </label>
          <input
            id="test-date-picker"
            type="date"
            min="2026-09-01"
            max="2026-09-30"
            value={selectedDateStr}
            onChange={(e) => e.target.value && onSelectDate && onSelectDate(e.target.value)}
            className="text-[11px] font-semibold text-neutral-textPrimary bg-transparent outline-none cursor-pointer"
          />
        </div>

        {/* Jump to Today Button */}
        {!isToday && (
          <button
            type="button"
            onClick={() => onSelectDate && onSelectDate(todayDateStr)}
            className="flex items-center gap-1 text-[11px] font-bold text-primary px-2.5 py-1 rounded-lg bg-primary-50 hover:bg-primary-100 border border-primary-200 active-scale transition-all"
            title="Return to today (21 Sep)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Today (21 Sep)</span>
          </button>
        )}
      </div>

      {/* Horizontal mini date chips for rapid 1-tap testing */}
      <div className="grid grid-cols-7 gap-1 pt-1 border-t border-neutral-border/50">
        {visibleDays.map(day => {
          const isSelected = day.date === selectedDateStr;
          const isThisToday = day.date === todayDateStr;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate && onSelectDate(day.date)}
              className={`flex flex-col items-center py-1 px-0.5 rounded-lg text-xs transition-all active-scale select-none ${
                isSelected
                  ? 'bg-primary text-white shadow-xs font-bold ring-2 ring-primary/40'
                  : isThisToday
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold'
                  : 'bg-neutral-surfaceSecondary/50 text-neutral-textSecondary hover:bg-neutral-surfaceSecondary'
              }`}
            >
              <span className={`text-[9px] leading-tight ${isSelected ? 'text-primary-100' : isThisToday ? 'text-emerald-600 font-bold' : 'text-neutral-textTertiary'}`}>
                {day.dayOfWeek ? day.dayOfWeek.slice(0, 3) : ''}
              </span>
              <span className="text-[11px] leading-tight mt-0.5 font-bold">
                {day.dayNumber}
              </span>
              {isThisToday && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
