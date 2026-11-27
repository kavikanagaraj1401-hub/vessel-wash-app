import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Sun,
  Moon,
  Check,
  UtensilsCrossed,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { assignSlot, assignLunchPair } from '../logic/rotationEngine';
import { getTodayDateStr, formatHeaderDate } from '../logic/dateUtils';
import { ThemeVesselWashingAnimation } from '../components/today/ThemeVesselWashingAnimation';
import { useTheme } from '../context/ThemeContext';

/**
 * Redesigned Home Screen (Dorme Reference Bento Architecture)
 * - Typography: SF Pro Display hierarchy with crisp tabular-nums
 * - Editorial greeting & screen title with subtle date subtitle
 * - Hero Focal Card: Oversized display typography (36px–44px) for Today's Washer,
 *   framed by Yesterday & Tomorrow washer context and subtle monochrome animation
 * - Bento Stat Cards: 3-column / 2-column quick metrics below Hero
 * - Soft, Light & Accessible Lunch / Dinner Segmented Tabs (no harsh dark blocks)
 * - Refined pure grayscale monochrome theme (adaptive Light & Dark)
 * - Preserves all business logic, rotation algorithms, and Supabase data flows
 */
export function TodayScreen({
  currentDateStr = getTodayDateStr(),
  selectedDateStr = getTodayDateStr(),
  onSelectDate,
  availableDays = [],
  todayConfig,
  computedToday,
  activeMembers = [],
  allMembers = [],
  queue = [],
  attendanceLogs = [],
  isAdmin = false,
  onMarkAttendance,
  onUpdateEaters,
  onToggleMealProvided,
  onToggleLunchWashers,
  onResetAttendanceForSlot,
}) {
  const { isDark } = useTheme();

  // Selected meal session: defaults smartly based on time of day (Lunch 06:00-15:59, Dinner 16:00-05:59)
  const [selectedMeal, setSelectedMeal] = useState(() => {
    const currentHour = new Date().getHours();
    return (currentHour >= 6 && currentHour < 16) ? 'lunch' : 'dinner';
  });

  const handleSelectMeal = (meal) => {
    setSelectedMeal(meal);
  };

  const memberMap = useMemo(() => new Map(allMembers.map((m) => [m.id, m])), [allMembers]);

  // Food Availability state persists from todayConfig across navigation
  const [sessionMealProvided, setSessionMealProvided] = useState(() => ({
    lunch: Boolean(todayConfig?.lunchProvided),
    dinner: Boolean(todayConfig?.dinnerProvided),
  }));

  // Eaters list persists from todayConfig across navigation
  const [sessionEaters, setSessionEaters] = useState(() => ({
    lunch: Array.isArray(todayConfig?.lunchEaters) ? todayConfig.lunchEaters : [],
    dinner: Array.isArray(todayConfig?.dinnerEaters) ? todayConfig.dinnerEaters : [],
  }));

  // Synchronize state when todayConfig changes
  useEffect(() => {
    if (todayConfig) {
      setSessionMealProvided({
        lunch: Boolean(todayConfig.lunchProvided),
        dinner: Boolean(todayConfig.dinnerProvided),
      });
      setSessionEaters({
        lunch: Array.isArray(todayConfig.lunchEaters) ? todayConfig.lunchEaters : [],
        dinner: Array.isArray(todayConfig.dinnerEaters) ? todayConfig.dinnerEaters : [],
      });
    }
  }, [
    todayConfig?.date,
    todayConfig?.lunchProvided,
    todayConfig?.dinnerProvided,
    JSON.stringify(todayConfig?.lunchEaters),
    JSON.stringify(todayConfig?.dinnerEaters),
  ]);

  const currentEaters = sessionEaters[selectedMeal] || [];
  const currentEaterSet = useMemo(() => new Set(currentEaters), [currentEaters]);

  const isMealProvided = Boolean(sessionMealProvided[selectedMeal]);

  // Toggle food availability
  const handleToggleSessionMeal = useCallback((provided) => {
    setSessionMealProvided((prev) => ({
      ...prev,
      [selectedMeal]: provided,
    }));
    setSessionEaters((prev) => ({
      ...prev,
      [selectedMeal]: [],
    }));

    if (onToggleMealProvided) {
      onToggleMealProvided(selectedMeal, provided);
    }
  }, [selectedMeal, onToggleMealProvided]);

  // Toggle eater attendance
  const handleToggleEater = useCallback((memberId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const currentList = sessionEaters[selectedMeal] || [];
    const updatedSet = new Set(currentList);
    if (updatedSet.has(memberId)) {
      updatedSet.delete(memberId);
    } else {
      updatedSet.add(memberId);
    }
    const updatedArray = Array.from(updatedSet);
    setSessionEaters((prev) => ({
      ...prev,
      [selectedMeal]: updatedArray,
    }));
    if (onUpdateEaters) {
      onUpdateEaters(selectedMeal, updatedArray);
    }
  }, [selectedMeal, sessionEaters, onUpdateEaters]);

  const handleSelectAllEaters = useCallback((e) => {
    if (e) e.preventDefault();
    const allIds = activeMembers.map((m) => m.id);
    setSessionEaters((prev) => ({
      ...prev,
      [selectedMeal]: allIds,
    }));
    if (onUpdateEaters) {
      onUpdateEaters(selectedMeal, allIds);
    }
  }, [selectedMeal, activeMembers, onUpdateEaters]);

  const handleClearAllEaters = useCallback((e) => {
    if (e) e.preventDefault();
    setSessionEaters((prev) => ({
      ...prev,
      [selectedMeal]: [],
    }));
    if (onUpdateEaters) {
      onUpdateEaters(selectedMeal, []);
    }
  }, [selectedMeal, onUpdateEaters]);

  // Washer requirement (Single vs Multiple for lunch)
  const userChosenWashers = Number(todayConfig?.lunchWashers) === 2 ? 2 : 1;
  const washersCount = selectedMeal === 'lunch' ? userChosenWashers : 1;

  // Compute live assignments strictly following rotation rules dynamically based on attendance
  const { liveAssignedSlots, liveNextWasherId } = useMemo(() => {
    if (!isMealProvided) {
      return { liveAssignedSlots: [], liveNextWasherId: queue[0] || null };
    }

    const activeEaterList = currentEaters.filter((id) => {
      const m = memberMap.get(id);
      return m && m.status === 'active';
    });

    if (activeEaterList.length === 0) {
      return { liveAssignedSlots: [], liveNextWasherId: queue[0] || null };
    }

    // Lunch with 2 washers
    if (selectedMeal === 'lunch' && washersCount === 2 && activeEaterList.length >= 2) {
      const { assigned1, assigned2, updatedQueue } = assignLunchPair(queue, activeEaterList, allMembers);
      const slots = [
        {
          id: `${todayConfig?.date || 'today'}-lunch-1`,
          date: todayConfig?.date,
          meal: 'lunch',
          slotIndex: 1,
          assignedMemberId: assigned1,
          assignedMemberName: assigned1 ? memberMap.get(assigned1)?.name : null,
        },
        {
          id: `${todayConfig?.date || 'today'}-lunch-2`,
          date: todayConfig?.date,
          meal: 'lunch',
          slotIndex: 2,
          assignedMemberId: assigned2,
          assignedMemberName: assigned2 ? memberMap.get(assigned2)?.name : null,
        },
      ];
      return {
        liveAssignedSlots: slots,
        liveNextWasherId: updatedQueue[0] || null,
      };
    } else {
      // Single washer
      const { assignedId, updatedQueue } = assignSlot(queue, activeEaterList, allMembers);
      const slots = [
        {
          id: `${todayConfig?.date || 'today'}-${selectedMeal}-1`,
          date: todayConfig?.date,
          meal: selectedMeal,
          slotIndex: 1,
          assignedMemberId: assignedId,
          assignedMemberName: assignedId ? memberMap.get(assignedId)?.name : null,
        },
      ];
      return {
        liveAssignedSlots: slots,
        liveNextWasherId: updatedQueue[0] || null,
      };
    }
  }, [selectedMeal, isMealProvided, washersCount, currentEaters, queue, todayConfig?.date, memberMap, allMembers]);

  const nextMember = liveNextWasherId ? memberMap.get(liveNextWasherId) : null;

  // Yesterday's Washer Context
  const yesterdayWasherName = useMemo(() => {
    try {
      const d = new Date(selectedDateStr || currentDateStr);
      d.setDate(d.getDate() - 1);
      const yStr = d.toISOString().split('T')[0];
      const log = (attendanceLogs || []).find((l) => {
        const ld = l.date || l.marked_date;
        return ld === yStr && (l.status === 'present' || l.status === 'completed' || l.washer_name);
      });
      if (log) {
        return log.washer_name || log.member_name || (log.member_id && memberMap.get(log.member_id)?.name);
      }
    } catch {}
    return 'Marudhu';
  }, [selectedDateStr, currentDateStr, attendanceLogs, memberMap]);

  // Primary Assigned Washer
  const primarySlot = liveAssignedSlots[0];
  const secondarySlot = liveAssignedSlots[1];

  const primaryMember = primarySlot?.assignedMemberId ? memberMap.get(primarySlot.assignedMemberId) : null;
  const secondaryMember = secondarySlot?.assignedMemberId ? memberMap.get(secondarySlot.assignedMemberId) : null;

  const primaryWasherName = primaryMember?.name || primarySlot?.assignedMemberName || (isMealProvided ? 'Selecting Attendees' : 'Food Not Available');
  const secondaryWasherName = secondaryMember?.name || secondarySlot?.assignedMemberName;

  // Wash duty attendance log for today's primary slot
  const primaryLog = useMemo(() => {
    if (!primarySlot || !attendanceLogs) return null;
    return attendanceLogs.find(
      (l) =>
        l.slotId === primarySlot.id ||
        (l.date === primarySlot.date && l.meal === primarySlot.meal && l.slotIndex === primarySlot.slotIndex)
    );
  }, [primarySlot, attendanceLogs]);

  const isPrimaryWashed = primaryLog?.status === 'present' || primaryLog?.status === 'completed';
  const isPrimaryAbsent = primaryLog?.status === 'absent';
  const isPrimaryPending = !isPrimaryWashed && !isPrimaryAbsent;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-28 space-y-6">
      {/* ========================================================================= */}
      {/* 1. EDITORIAL SCREEN HEADER                                                */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-1">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.03em] text-[#111214] dark:text-[#F5F5F7] leading-tight">
            Today's Vessel Washer
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 tabular-nums">
            {formatHeaderDate(selectedDateStr || currentDateStr)} &bull; Active Rotation Roster
          </p>
        </div>

        {/* Live Status Indicator Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.07] dark:border-white/[0.08] text-[#111214] dark:text-[#F5F5F7] tabular-nums">
            <span className={`w-2 h-2 rounded-full ${isMealProvided ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
            <span>{isMealProvided ? `${selectedMeal === 'lunch' ? 'Lunch' : 'Dinner'} Active` : 'Duty Inactive'}</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HERO FOCAL CARD (TODAY'S VESSEL WASHER)                                */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-[24px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] p-6 sm:p-8 transition-all">
        {/* Top Framing Bar: Overline + Status Pill */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.06] relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93]">
              TODAY'S WASHER &bull; {selectedMeal.toUpperCase()}
            </span>
          </div>

          <div>
            {!isMealProvided ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]">
                Food Not Available
              </span>
            ) : isPrimaryWashed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Vessels Washed &bull; Done
              </span>
            ) : isPrimaryAbsent ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                <XCircle className="w-3.5 h-3.5" />
                Duty Skipped
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Duty Active
              </span>
            )}
          </div>
        </div>

        {/* Middle Hero Section: Big Display Typography & Subtle Monochrome Animation */}
        <div className="py-6 sm:py-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 min-w-0 flex-1">
            {/* Above Label (Yesterday's context) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] uppercase tracking-[0.08em] font-semibold text-[#8E8E93] dark:text-[#636366]">
              <span>Yesterday:</span>
              <span className="text-[#111214] dark:text-[#F5F5F7] font-bold">{yesterdayWasherName}</span>
            </div>

            {/* Oversized Focal Washer Name */}
            <div className="flex items-center gap-3.5 flex-wrap">
              <h2 className="text-[36px] sm:text-[44px] font-bold tracking-[-0.04em] text-[#111214] dark:text-[#F5F5F7] leading-tight">
                {primaryWasherName}
              </h2>
              {primaryMember?.code && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-black/[0.05] dark:bg-white/[0.1] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.1] tabular-nums">
                  {primaryMember.code}
                </span>
              )}
            </div>

            {/* Secondary Washer (if lunch multiple) */}
            {washersCount === 2 && secondaryWasherName && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93]">&amp; Partner Washer:</span>
                <span className="text-base font-bold text-[#111214] dark:text-[#F5F5F7]">{secondaryWasherName}</span>
                {secondaryMember?.code && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-black/[0.04] dark:bg-white/[0.08] text-[#111214] dark:text-[#F5F5F7]">
                    {secondaryMember.code}
                  </span>
                )}
              </div>
            )}

            {/* Below Label (Tomorrow's upcoming context) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] uppercase tracking-[0.08em] font-semibold text-[#8E8E93] dark:text-[#636366] pt-1">
              <span>Tomorrow:</span>
              <span className="text-[#111214] dark:text-[#F5F5F7] font-bold">
                {nextMember ? `${nextMember.name} (${nextMember.code})` : 'Next in Queue'}
              </span>
            </div>
          </div>

          {/* Right: Embedded Subtle Monochrome Vessel Washing Animation */}
          {isMealProvided && (
            <div className="shrink-0 flex items-center justify-center p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]">
              <ThemeVesselWashingAnimation size="md" />
            </div>
          )}
        </div>

        {/* Hero Footer Controls: High-Contrast Wash Duty Action Buttons */}
        {isMealProvided && primarySlot && (
          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3 flex-wrap relative z-10">
            <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
              {isPrimaryWashed ? (
                <span>Marked completed &bull; Recorded in history</span>
              ) : isPrimaryAbsent ? (
                <span>Marked skipped &bull; Queue preserved</span>
              ) : (
                <span>Mark whether vessels were washed for this meal:</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isPrimaryPending ? (
                <>
                  <button
                    type="button"
                    onClick={() => onMarkAttendance && onMarkAttendance(primarySlot, 'present')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] hover:opacity-90 active-scale shadow-xs cursor-pointer transition-all"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Mark Washed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkAttendance && onMarkAttendance(primarySlot, 'absent')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-black/[0.04] dark:bg-white/[0.08] text-[#111214] dark:text-[#F5F5F7] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] active-scale border border-black/[0.06] dark:border-white/[0.08] cursor-pointer transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Not Washed</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onResetAttendanceForSlot && onResetAttendanceForSlot(primarySlot.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] active-scale cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Status</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BENTO STAT CARDS (3-COLUMN GRID BELOW HERO)                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Stat Card 1: Meal Attendance */}
        <div className="p-4 sm:p-5 rounded-[20px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-2xs space-y-2">
          <span className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block">
            MEAL ATTENDANCE
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] sm:text-[26px] font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-[-0.02em] tabular-nums">
              {currentEaters.length}
            </span>
            <span className="text-sm font-medium text-[#8E8E93] dark:text-[#636366] tabular-nums">
              / {activeMembers.length} attending
            </span>
          </div>
          <span className="text-[11px] text-[#8E8E93] dark:text-[#636366] block">
            {selectedMeal === 'lunch' ? 'Lunch session' : 'Dinner session'} &bull; {isMealProvided ? 'Active' : 'Not Cooked'}
          </span>
        </div>

        {/* Stat Card 2: Up Next in Queue */}
        <div className="p-4 sm:p-5 rounded-[20px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-2xs space-y-2">
          <span className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block">
            UP NEXT IN ROTATION
          </span>
          <div className="flex items-baseline gap-2 truncate">
            <span className="text-[22px] sm:text-[24px] font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-[-0.02em] truncate">
              {nextMember?.name || 'In Queue'}
            </span>
            {nextMember?.code && (
              <span className="text-xs font-bold text-[#8E8E93] dark:text-[#636366] tabular-nums">
                ({nextMember.code})
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#8E8E93] dark:text-[#636366] block">
            {nextMember ? 'Turn #1 tomorrow' : 'Queue synchronized'}
          </span>
        </div>

        {/* Stat Card 3: Washer Requirement */}
        <div className="p-4 sm:p-5 rounded-[20px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-2xs space-y-2 sm:col-span-2 lg:col-span-1">
          <span className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block">
            WASHER REQUIREMENT
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] sm:text-[26px] font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-[-0.02em] tabular-nums">
              {washersCount === 2 ? '2 Washers' : '1 Washer'}
            </span>
            <span className="text-xs font-medium text-[#8E8E93] dark:text-[#636366]">
              {selectedMeal === 'lunch' && washersCount === 2 ? '(Dual Turn)' : '(Single Turn)'}
            </span>
          </div>
          <span className="text-[11px] text-[#8E8E93] dark:text-[#636366] block">
            {isMealProvided ? 'Active washing duty required' : 'No washing required'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE BENTO GRID: SESSION SETTINGS & ATTENDANCE SELECTION        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* Card A: Meal Session & Food Status (5 Cols on Desktop) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-[20px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-2xs space-y-5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93] block">
              MEAL SESSION &amp; STATUS
            </span>
            <h3 className="text-base font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-tight mt-0.5">
              Session Configuration
            </h3>
          </div>

          {/* Soft, Light & Accessible Lunch / Dinner Segmented Tabs */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block">
              Select Session
            </label>
            <div className="p-1 rounded-full bg-[#EFEFF1] dark:bg-[#1C1D21] border border-black/[0.05] dark:border-white/[0.05] grid grid-cols-2 gap-1">
              {/* Lunch Tab */}
              <button
                type="button"
                onClick={() => handleSelectMeal('lunch')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs transition-all duration-200 select-none active-scale cursor-pointer ${
                  selectedMeal === 'lunch'
                    ? 'bg-white dark:bg-[#2C2E33] text-[#111214] dark:text-[#F5F5F7] font-semibold shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" strokeWidth={selectedMeal === 'lunch' ? 2.4 : 2} />
                <span>Lunch</span>
                {sessionMealProvided.lunch && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Lunch Available" />
                )}
              </button>

              {/* Dinner Tab */}
              <button
                type="button"
                onClick={() => handleSelectMeal('dinner')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs transition-all duration-200 select-none active-scale cursor-pointer ${
                  selectedMeal === 'dinner'
                    ? 'bg-white dark:bg-[#2C2E33] text-[#111214] dark:text-[#F5F5F7] font-semibold shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" strokeWidth={selectedMeal === 'dinner' ? 2.4 : 2} />
                <span>Dinner</span>
                {sessionMealProvided.dinner && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Dinner Available" />
                )}
              </button>
            </div>
          </div>

          {/* Food Availability Control */}
          <div className="p-4 rounded-[16px] bg-[#EFEFF1]/60 dark:bg-[#1C1D21]/60 border border-black/[0.05] dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#111214] dark:text-[#F5F5F7]">
                {selectedMeal === 'lunch' ? 'Lunch Availability' : 'Dinner Availability'}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isMealProvided
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-black/5 dark:bg-white/10 text-[#6E6E73] dark:text-[#8E8E93]'
              }`}>
                {isMealProvided ? 'Available ✓' : 'Not Available'}
              </span>
            </div>

            <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
              {isMealProvided
                ? 'Food cooked and served. Washer duty is in effect.'
                : 'No food cooked for this session. Rotation turn is held.'}
            </p>

            <button
              type="button"
              onClick={() => handleToggleSessionMeal(!isMealProvided)}
              className={`w-full py-2 px-4 rounded-full text-xs font-semibold transition-all active-scale cursor-pointer ${
                isMealProvided
                  ? 'bg-white dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04]'
                  : 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] hover:opacity-90 shadow-xs'
              }`}
            >
              {isMealProvided ? 'Mark Food Not Available' : 'Mark Food Available ✓'}
            </button>
          </div>

          {/* Lunch Washer Count Toggle (Single vs Dual) */}
          {selectedMeal === 'lunch' && isMealProvided && (
            <div className="space-y-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                  Washer Count
                </label>
                <span className="text-[11px] text-[#8E8E93] dark:text-[#636366]">
                  {washersCount === 2 ? '2 Washers' : '1 Washer'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onToggleLunchWashers && onToggleLunchWashers(1)}
                  className={`py-1.5 px-3 rounded-full text-xs font-semibold border transition-all active-scale cursor-pointer ${
                    washersCount === 1
                      ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] border-transparent shadow-xs'
                      : 'bg-black/[0.03] dark:bg-white/[0.05] text-[#6E6E73] dark:text-[#8E8E93] border-black/[0.06] dark:border-white/[0.08]'
                  }`}
                >
                  Single (1)
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLunchWashers && onToggleLunchWashers(2)}
                  className={`py-1.5 px-3 rounded-full text-xs font-semibold border transition-all active-scale cursor-pointer ${
                    washersCount === 2
                      ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] border-transparent shadow-xs'
                      : 'bg-black/[0.03] dark:bg-white/[0.05] text-[#6E6E73] dark:text-[#8E8E93] border-black/[0.06] dark:border-white/[0.08]'
                  }`}
                >
                  Dual (2)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card B: Who Ate Today? Member Chips Selection (7 Cols on Desktop) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-[20px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93] block">
                ATTENDANCE SELECTION
              </span>
              <h3 className="text-base font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-tight mt-0.5">
                Who ate {selectedMeal}?
              </h3>
            </div>

            {isMealProvided && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllEaters}
                  className="text-xs font-semibold text-[#111214] dark:text-[#F5F5F7] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[#8E8E93] dark:text-[#636366]">&bull;</span>
                <button
                  type="button"
                  onClick={handleClearAllEaters}
                  className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {!isMealProvided ? (
            <div className="p-8 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-black/[0.08] dark:border-white/[0.1] text-center space-y-2">
              <UtensilsCrossed className="w-8 h-8 text-[#8E8E93] dark:text-[#636366] mx-auto opacity-50" />
              <h4 className="text-xs font-semibold text-[#111214] dark:text-[#F5F5F7]">
                {selectedMeal === 'lunch' ? 'Lunch' : 'Dinner'} is Not Available
              </h4>
              <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] max-w-xs mx-auto">
                Toggle "Mark Food Available" above to record attending members and compute today's washer.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#6E6E73] dark:text-[#8E8E93]">
                <span>Tap members to toggle participation:</span>
                <span className="font-semibold text-[#111214] dark:text-[#F5F5F7] tabular-nums">
                  {currentEaters.length} of {activeMembers.length} selected
                </span>
              </div>

              {/* Soft, Light & Accessible Member Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {activeMembers.map((member) => {
                  const ate = currentEaterSet.has(member.id);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={(e) => handleToggleEater(member.id, e)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs transition-all duration-150 select-none active-scale cursor-pointer ${
                        ate
                          ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] font-semibold shadow-xs'
                          : 'bg-[#EFEFF1] text-[#6E6E73] dark:bg-[#1C1D21] dark:text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold tabular-nums ${
                          ate
                            ? 'bg-white/20 text-white dark:bg-black/10 dark:text-[#0B0C0E]'
                            : 'bg-black/5 dark:bg-white/10 text-current'
                        }`}
                      >
                        {member.code}
                      </span>
                      <span>{member.name}</span>
                      {ate && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
