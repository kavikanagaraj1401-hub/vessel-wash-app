import React, { useState, useMemo } from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import {
  History,
  Calendar,
  Clock,
  Sun,
  Moon,
  BarChart3,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  UtensilsCrossed,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { getTodayDateStr } from '../logic/dateUtils';

export function HistoryScreen({
  attendanceLogs = [],
  members = [],
  daysConfig = [],
  computedDays = [],
  selectedDateStr,
  onSelectDate,
  onTabChange,
  todayDateStr = getTodayDateStr(),
}) {
  // Default to 'logs' (Timeline Logs) as requested
  const [activeSubTab, setActiveSubTab] = useState('logs'); // 'logs' | 'report'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'with_meals' | 'no_data'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' (1-30) | 'desc' (30-1)
  const [copied, setCopied] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState(new Set(members.map(m => m.id)));

  // Map for quick member lookups
  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);

  // Overall totals
  const totalWashes = attendanceLogs.filter(l => l.status === 'present').length;
  const totalLunchWashes = attendanceLogs.filter(l => l.status === 'present' && l.meal === 'lunch').length;
  const totalDinnerWashes = attendanceLogs.filter(l => l.status === 'present' && l.meal === 'dinner').length;

  // Compile detailed report per member for the 'report' tab
  const memberReports = useMemo(() => {
    return members.map(member => {
      const memberLogs = attendanceLogs
        .filter(l => l.memberId === member.id && l.status === 'present')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lunchCount = memberLogs.filter(l => l.meal === 'lunch').length;
      const dinnerCount = memberLogs.filter(l => l.meal === 'dinner').length;
      const totalCount = memberLogs.length;
      const uniqueDates = Array.from(new Set(memberLogs.map(l => l.date)));

      return {
        member,
        totalCount,
        lunchCount,
        dinnerCount,
        uniqueDaysCount: uniqueDates.length,
        logs: memberLogs,
      };
    }).sort((a, b) => b.totalCount - a.totalCount);
  }, [members, attendanceLogs]);

  // Build unified date-by-date timeline logs
  const timelineDates = useMemo(() => {
    if (!daysConfig || daysConfig.length === 0) return [];

    const computedMap = new Map(computedDays.map(d => [d.date, d]));

    const dates = daysConfig.map(day => {
      const compDay = computedMap.get(day.date) || day;
      const isLunchAvail = Boolean(day.lunchProvided);
      const isDinnerAvail = Boolean(day.dinnerProvided);
      const hasAnyMeal = isLunchAvail || isDinnerAvail;

      // Extract present members (eaters who ate)
      const lunchPresentMembers = (day.lunchEaters || [])
        .map(id => memberMap.get(id))
        .filter(Boolean);

      const dinnerPresentMembers = (day.dinnerEaters || [])
        .map(id => memberMap.get(id))
        .filter(Boolean);

      // Extract who washed on this date
      // 1. Lunch washers: check verified attendanceLogs first, then computed slot
      let lunchWashers = [];
      if (isLunchAvail) {
        const verifiedLunch = attendanceLogs.filter(
          l => l.date === day.date && l.meal === 'lunch' && l.status === 'present'
        );
        if (verifiedLunch.length > 0) {
          lunchWashers = verifiedLunch.map(l => ({
            id: l.memberId,
            name: l.memberName,
            slotIndex: l.slotIndex,
            code: memberMap.get(l.memberId)?.code || '',
            verified: true,
            markedBy: l.markedBy,
          }));
        } else if (day.date <= todayDateStr) {
          // Fall back to computed slots for past/today
          const lunchSlots = (compDay.slots || []).filter(s => s.meal === 'lunch');
          lunchWashers = lunchSlots
            .filter(s => s.assignedMemberId && s.assignedMemberName !== '-')
            .map(s => ({
              id: s.assignedMemberId,
              name: s.assignedMemberName,
              slotIndex: s.slotIndex,
              code: memberMap.get(s.assignedMemberId)?.code || '',
              verified: false,
            }));
        }
      }

      // 2. Dinner washer: check verified attendanceLogs first, then computed slot
      let dinnerWashers = [];
      if (isDinnerAvail) {
        const verifiedDinner = attendanceLogs.filter(
          l => l.date === day.date && l.meal === 'dinner' && l.status === 'present'
        );
        if (verifiedDinner.length > 0) {
          dinnerWashers = verifiedDinner.map(l => ({
            id: l.memberId,
            name: l.memberName,
            slotIndex: l.slotIndex,
            code: memberMap.get(l.memberId)?.code || '',
            verified: true,
            markedBy: l.markedBy,
          }));
        } else if (day.date <= todayDateStr) {
          const dinnerSlot = (compDay.slots || []).find(s => s.meal === 'dinner');
          if (dinnerSlot && dinnerSlot.assignedMemberId && dinnerSlot.assignedMemberName !== '-') {
            dinnerWashers = [{
              id: dinnerSlot.assignedMemberId,
              name: dinnerSlot.assignedMemberName,
              slotIndex: dinnerSlot.slotIndex || 1,
              code: memberMap.get(dinnerSlot.assignedMemberId)?.code || '',
              verified: false,
            }];
          }
        }
      }

      // Parse date components
      const dateParts = day.date.split('-');
      const dayNum = dateParts[2] || String(day.dayNumber).padStart(2, '0');
      const dateObj = new Date(`${day.date}T00:00:00`);
      const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDateStr = dateObj.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      return {
        date: day.date,
        dayNum,
        weekdayName,
        fullDateStr,
        hasAnyMeal,
        isLunchAvail,
        isDinnerAvail,
        lunchPresentMembers,
        dinnerPresentMembers,
        lunchWashers,
        dinnerWashers,
        isToday: day.date === selectedDateStr,
      };
    });

    // Filter
    let filtered = dates;
    if (dateFilter === 'with_meals') {
      filtered = dates.filter(d => d.hasAnyMeal);
    } else if (dateFilter === 'no_data') {
      filtered = dates.filter(d => !d.hasAnyMeal);
    }

    // Sort
    return filtered.sort((a, b) => {
      return sortOrder === 'asc'
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    });
  }, [daysConfig, computedDays, attendanceLogs, memberMap, dateFilter, sortOrder, selectedDateStr]);

  const toggleMemberExpand = (memberId) => {
    const next = new Set(expandedMembers);
    if (next.has(memberId)) {
      next.delete(memberId);
    } else {
      next.add(memberId);
    }
    setExpandedMembers(next);
  };

  // Copy formatted text report for WhatsApp / Slack
  const handleCopyReport = () => {
    let reportText = `*Vessel Washing Attendance Timeline — Continuous Rotation*\n`;
    reportText += `Total Washes: ${totalWashes} (Lunch: ${totalLunchWashes}, Dinner: ${totalDinnerWashes})\n\n`;

    timelineDates.forEach(d => {
      if (!d.hasAnyMeal) {
        reportText += `*${d.date} (${d.weekdayName})*: No Data (Meals not available)\n\n`;
        return;
      }

      reportText += `*${d.date} (${d.weekdayName})*:\n`;
      if (d.isLunchAvail) {
        const washers = d.lunchWashers.map(w => w.name).join(', ') || 'None';
        const eaters = d.lunchPresentMembers.map(m => m.name).join(', ') || 'None';
        reportText += `  • Lunch Washer: ${washers}\n`;
        reportText += `    Present: ${eaters}\n`;
      } else {
        reportText += `  • Lunch: Not Available\n`;
      }

      if (d.isDinnerAvail) {
        const washers = d.dinnerWashers.map(w => w.name).join(', ') || 'None';
        const eaters = d.dinnerPresentMembers.map(m => m.name).join(', ') || 'None';
        reportText += `  • Dinner Washer: ${washers}\n`;
        reportText += `    Present: ${eaters}\n`;
      } else {
        reportText += `  • Dinner: Not Available\n`;
      }
      reportText += `\n`;
    });

    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-3.5 pb-24 px-4 pt-3 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D64F6]">
            Activity & Audit History
          </span>
          <h2 className="text-xl font-bold tracking-tight text-neutral-textPrimary">
            Timeline Logs
          </h2>
          <p className="text-xs text-neutral-textSecondary mt-0.5">
            Date-by-date record of present members and vessel washers
          </p>
        </div>

        {/* Copy Report Button */}
        <button
          type="button"
          onClick={handleCopyReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-neutral-border text-neutral-textPrimary shadow-2xs active-scale hover:bg-[#ECEEF0] transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#1E1E1E]" /> : <Copy className="w-3.5 h-3.5 text-neutral-textTertiary" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Top Segmented Sub-Tab Switcher */}
      <div className="flex p-1 bg-[#ECEEF0] rounded-full border border-neutral-border/60">
        <button
          type="button"
          onClick={() => setActiveSubTab('logs')}
          className={`flex-1 basis-0 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-full transition-all select-none ${
            activeSubTab === 'logs'
              ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
              : 'text-neutral-textSecondary hover:text-neutral-textPrimary font-semibold'
          }`}
        >
          <History className={`w-3.5 h-3.5 flex-shrink-0 ${activeSubTab === 'logs' ? 'text-white' : 'text-neutral-textTertiary'}`} />
          <span className="truncate">Timeline Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('report')}
          className={`flex-1 basis-0 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-full transition-all select-none ${
            activeSubTab === 'report'
              ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
              : 'text-neutral-textSecondary hover:text-neutral-textPrimary font-semibold'
          }`}
        >
          <BarChart3 className={`w-3.5 h-3.5 flex-shrink-0 ${activeSubTab === 'report' ? 'text-white' : 'text-neutral-textTertiary'}`} />
          <span className="truncate">Member Summary</span>
        </button>
      </div>

      {/* 1. TIMELINE LOGS (DATE BY DATE) VIEW */}
      {activeSubTab === 'logs' && (
        <div className="space-y-3">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 sm:p-3 rounded-[20px] bg-white border border-neutral-border/70 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-neutral-textTertiary block truncate">Total Washes</span>
              <span className="text-lg font-bold text-neutral-textPrimary">{totalWashes}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-[20px] bg-white border border-[#FFD89D]/60 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-700 block truncate">Lunch</span>
              <span className="text-lg font-bold text-neutral-textPrimary">{totalLunchWashes}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-[20px] bg-white border border-[#A28EF9]/50 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#42299C] block truncate">Dinner</span>
              <span className="text-lg font-bold text-neutral-textPrimary">{totalDinnerWashes}</span>
            </div>
          </div>

          {/* Filters & Sorting Controls */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1">
              {[
                { id: 'all', label: 'All Dates' },
                { id: 'with_meals', label: 'With Meals' },
                { id: 'no_data', label: 'No Data' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDateFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none active-scale ${
                    dateFilter === f.id
                      ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
                      : 'bg-white text-neutral-textSecondary border border-neutral-border hover:bg-[#ECEEF0]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Toggle (Ascending vs Descending) */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-neutral-border text-neutral-textSecondary shadow-2xs hover:text-neutral-textPrimary select-none active-scale flex-shrink-0 whitespace-nowrap"
              title="Toggle date order"
            >
              <ArrowUpDown className="w-3 h-3 text-neutral-textTertiary" />
              <span>{sortOrder === 'asc' ? '1 → 30' : '30 → 1'}</span>
            </button>
          </div>

          {/* List of Dates */}
          {timelineDates.length === 0 ? (
            <EmptyState
              icon={History}
              title="No dates match the filter"
              description="Change your filter selection above to view logs."
            />
          ) : (
            <div className="space-y-2.5">
              {timelineDates.map(item => {
                const {
                  date,
                  dayNum,
                  weekdayName,
                  fullDateStr,
                  hasAnyMeal,
                  isLunchAvail,
                  isDinnerAvail,
                  lunchPresentMembers,
                  dinnerPresentMembers,
                  lunchWashers,
                  dinnerWashers,
                  isToday,
                } = item;

                // ==========================================
                // CASE 1: LUNCH AND DINNER NOT AVAILABLE (NO DATA)
                // ==========================================
                if (!hasAnyMeal) {
                  return (
                    <Card
                      key={date}
                      padding="sm"
                      className="bg-[#ECEEF0]/50 border-neutral-200/80 transition-all hover:border-neutral-300 rounded-[22px]"
                    >
                      <div className="flex items-center justify-between">
                        {/* Date Left Badge */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-[#ECEEF0] text-neutral-textTertiary flex flex-col items-center justify-center font-bold">
                            <span className="text-[9px] uppercase leading-none font-semibold text-neutral-400">
                              {weekdayName}
                            </span>
                            <span className="text-sm leading-none font-bold text-neutral-500 mt-0.5">
                              {dayNum}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-neutral-textSecondary">
                                {fullDateStr}
                              </span>
                              {isToday && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/20 text-[#2C1885] border border-[#A28EF9]/30">
                                  Today
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-textTertiary flex items-center gap-1 mt-0.5">
                              <UtensilsCrossed className="w-3 h-3 text-neutral-textTertiary" />
                              Lunch & Dinner Not Available
                            </span>
                          </div>
                        </div>

                        {/* No Data Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#ECEEF0] text-neutral-textTertiary border border-neutral-300/60">
                            Without Data
                          </span>
                          {onSelectDate && onTabChange && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectDate(date);
                                onTabChange('today');
                              }}
                              className="p-1.5 text-neutral-textTertiary hover:text-[#7D64F6] rounded-full hover:bg-white transition-colors"
                              title="Open in Today Screen"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                }

                // ==========================================
                // CASE 2: DATE WITH AT LEAST ONE AVAILABLE MEAL
                // ==========================================
                return (
                  <Card
                    key={date}
                    padding="none"
                    className={`overflow-hidden border rounded-[22px] transition-all shadow-2xs ${
                      isToday
                        ? 'border-[#A28EF9] ring-2 ring-[#A28EF9]/30'
                        : 'border-neutral-border hover:border-neutral-300'
                    }`}
                  >
                    {/* Date Card Header */}
                    <div className="p-3.5 bg-white border-b border-neutral-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-[#A28EF9]/20 text-[#2C1885] border border-[#A28EF9]/30 flex flex-col items-center justify-center font-bold shadow-2xs">
                          <span className="text-[9px] uppercase leading-none font-semibold">
                            {weekdayName}
                          </span>
                          <span className="text-sm leading-none font-bold mt-0.5">
                            {dayNum}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-neutral-textPrimary">
                              {fullDateStr}
                            </h4>
                            {isToday && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/25 text-[#2C1885] border border-[#A28EF9]/40">
                                Today
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-textTertiary">
                            {isLunchAvail && isDinnerAvail
                              ? 'Lunch & Dinner held'
                              : isLunchAvail
                              ? 'Lunch only'
                              : 'Dinner only'}
                          </span>
                        </div>
                      </div>

                      {/* Quick jump to date on Today screen */}
                      {onSelectDate && onTabChange && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDate(date);
                            onTabChange('today');
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-[#2C1885] px-3 py-1 rounded-full bg-[#A28EF9]/15 hover:bg-[#A28EF9]/25 transition-colors active-scale"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Meal Details Sections */}
                    <div className="p-3.5 space-y-3 bg-[#ECEEF0]/30">
                      {/* 1. LUNCH SECTION */}
                      {isLunchAvail ? (
                        <div className="p-3 rounded-2xl bg-white border border-[#FFD89D]/70 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 rounded-full bg-[#FFD89D]/30 border border-[#FFD89D] text-amber-700">
                                <Sun className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-xs font-bold text-neutral-textPrimary">
                                Lunch
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFD89D]/25 text-amber-800 border border-[#FFD89D]">
                              Available ({lunchWashers.length} {lunchWashers.length === 1 ? 'Washer' : 'Washers'})
                            </span>
                          </div>

                          {/* Washer Row */}
                          <div className="p-2.5 rounded-xl bg-[#A4F5A6]/20 border border-[#A4F5A6]/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#A4F5A6] text-[#1E1E1E] flex items-center justify-center text-[10px] font-bold">
                                🧼
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E1E1E] block leading-none">
                                  Washed Vessels:
                                </span>
                                <span className="text-xs font-bold text-neutral-textPrimary mt-0.5 block">
                                  {lunchWashers.length > 0
                                    ? lunchWashers.map(w => `${w.name}${w.markedBy ? ` (${w.markedBy})` : ''}`).join(' & ')
                                    : 'None recorded'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#A4F5A6] text-[#1E1E1E]">
                              Washed
                            </span>
                          </div>

                          {/* Present Members / Eaters */}
                          <div>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-textTertiary mb-1.5">
                              <Users className="w-3 h-3" />
                              <span>Present Members / Ate ({lunchPresentMembers.length}):</span>
                            </div>

                            {lunchPresentMembers.length === 0 ? (
                              <p className="text-xs text-neutral-textTertiary italic">
                                No members marked present.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {lunchPresentMembers.map(member => {
                                  const isWasher = lunchWashers.some(w => w.id === member.id);
                                  return (
                                    <span
                                      key={member.id}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                        isWasher
                                          ? 'bg-[#A4F5A6]/30 text-[#1E1E1E] border border-[#A4F5A6] font-bold'
                                          : 'bg-[#ECEEF0] text-neutral-textPrimary border border-neutral-border'
                                      }`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                      <span>{member.name}</span>
                                      {isWasher && (
                                        <span className="text-[9px] font-bold px-1.5 rounded-full bg-[#A4F5A6] text-[#1E1E1E] ml-0.5">
                                          Washer
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-[#ECEEF0]/60 border border-neutral-200/70 flex items-center justify-between text-xs text-neutral-textTertiary">
                          <div className="flex items-center gap-1.5">
                            <Sun className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Lunch: Not Available</span>
                          </div>
                          <span className="text-[10px] italic">Skipped</span>
                        </div>
                      )}

                      {/* 2. DINNER SECTION */}
                      {isDinnerAvail ? (
                        <div className="p-3 rounded-2xl bg-white border border-[#A28EF9]/40 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 rounded-full bg-[#A28EF9]/20 border border-[#A28EF9]/30 text-[#42299C]">
                                <Moon className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-xs font-bold text-neutral-textPrimary">
                                Dinner
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#A28EF9]/20 text-[#2C1885] border border-[#A28EF9]/40">
                              Available (1 Washer)
                            </span>
                          </div>

                          {/* Washer Row */}
                          <div className="p-2.5 rounded-xl bg-[#A4F5A6]/20 border border-[#A4F5A6]/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#A4F5A6] text-[#1E1E1E] flex items-center justify-center text-[10px] font-bold">
                                🧼
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E1E1E] block leading-none">
                                  Washed Vessels:
                                </span>
                                <span className="text-xs font-bold text-neutral-textPrimary mt-0.5 block">
                                  {dinnerWashers.length > 0
                                    ? dinnerWashers.map(w => `${w.name}${w.markedBy ? ` (${w.markedBy})` : ''}`).join(', ')
                                    : 'None recorded'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#A4F5A6] text-[#1E1E1E]">
                              Washed
                            </span>
                          </div>

                          {/* Present Members / Eaters */}
                          <div>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-textTertiary mb-1.5">
                              <Users className="w-3 h-3" />
                              <span>Present Members / Ate ({dinnerPresentMembers.length}):</span>
                            </div>

                            {dinnerPresentMembers.length === 0 ? (
                              <p className="text-xs text-neutral-textTertiary italic">
                                No members marked present.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {dinnerPresentMembers.map(member => {
                                  const isWasher = dinnerWashers.some(w => w.id === member.id);
                                  return (
                                    <span
                                      key={member.id}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                        isWasher
                                          ? 'bg-[#A4F5A6]/30 text-[#1E1E1E] border border-[#A4F5A6] font-bold'
                                          : 'bg-[#ECEEF0] text-neutral-textPrimary border border-neutral-border'
                                      }`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                      <span>{member.name}</span>
                                      {isWasher && (
                                        <span className="text-[9px] font-bold px-1.5 rounded-full bg-[#A4F5A6] text-[#1E1E1E] ml-0.5">
                                          Washer
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-[#ECEEF0]/60 border border-neutral-200/70 flex items-center justify-between text-xs text-neutral-textTertiary">
                          <div className="flex items-center gap-1.5">
                            <Moon className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Dinner: Not Available</span>
                          </div>
                          <span className="text-[10px] italic">Skipped</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. DETAILED MEMBER REPORT VIEW */}
      {activeSubTab === 'report' && (
        <div className="space-y-3">
          {/* Quick Metrics Header */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 sm:p-3 rounded-[20px] bg-white border border-neutral-border/70 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-neutral-textTertiary block truncate">Total Washes</span>
              <span className="text-lg font-bold text-neutral-textPrimary">{totalWashes}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-[20px] bg-white border border-[#FFD89D]/60 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-700 block truncate">Lunch</span>
              <span className="text-lg font-bold text-neutral-textPrimary">{totalLunchWashes}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-[20px] bg-white border border-[#A28EF9]/50 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#42299C] block truncate">Dinner</span>
              <span className="text-lg font-bold text-neutral-textPrimary">{totalDinnerWashes}</span>
            </div>
          </div>

          {/* Member Breakdown Cards */}
          <div className="space-y-2.5">
            {memberReports.map(({ member, totalCount, lunchCount, dinnerCount, logs }) => {
              const isExpanded = expandedMembers.has(member.id);

              return (
                <Card key={member.id} padding="none" className="overflow-hidden rounded-[22px] border border-neutral-border shadow-2xs">
                  {/* Member Summary Header Row */}
                  <div
                    onClick={() => toggleMemberExpand(member.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#ECEEF0]/40 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#A28EF9]/25 text-[#1E1E1E] border border-[#A28EF9]/40 flex items-center justify-center font-bold text-xs shadow-2xs">
                        {member.code}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-textPrimary leading-tight">
                          {member.name}
                        </h4>
                        <span className="text-[11px] text-neutral-textTertiary">
                          {lunchCount} Lunch &middot; {dinnerCount} Dinner
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#1E1E1E] block leading-none">
                          {totalCount} {totalCount === 1 ? 'day' : 'days'}
                        </span>
                        <span className="text-[10px] text-neutral-textTertiary">washed</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-textTertiary" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-textTertiary" />
                      )}
                    </div>
                  </div>

                  {/* Expandable List of Exact Dates Washed */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1.5 border-t border-neutral-border/60 bg-[#ECEEF0]/30 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-textTertiary block">
                        Dates & Meals Washed:
                      </span>

                      {logs.length === 0 ? (
                        <p className="text-xs text-neutral-textTertiary italic py-1">
                          No washing records completed yet this month.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {logs.map(log => {
                            const isLunch = log.meal === 'lunch';
                            const logTime = new Date(log.markedAt || log.date);

                            return (
                              <div
                                key={log.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-border text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-neutral-textTertiary flex-shrink-0" />
                                  <span className="font-semibold text-neutral-textPrimary">
                                    {log.date}
                                  </span>
                                  <span className="text-neutral-border">&middot;</span>
                                  <span className="flex items-center gap-1 text-neutral-textSecondary">
                                    {isLunch ? (
                                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                                    ) : (
                                      <Moon className="w-3.5 h-3.5 text-[#7D64F6]" />
                                    )}
                                    <span className="capitalize">
                                      {log.meal} {log.slotIndex === 2 ? '#2' : ''}
                                    </span>
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#A4F5A6] text-[#1E1E1E]">
                                    Washed
                                  </span>
                                  <span className="text-[10px] text-neutral-textTertiary">
                                    {logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
