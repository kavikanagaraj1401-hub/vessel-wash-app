import React, { useState, useMemo, useCallback } from 'react';
import {
  Sun,
  Moon,
  Check,
  UtensilsCrossed,
  AlertCircle,
  Users,
} from 'lucide-react';
import { assignSlot, assignLunchPair } from '../logic/rotationEngine';
import { getTodayDateStr } from '../logic/dateUtils';

/**
 * Version 2 ("v2") Unslopped Home Screen
 * - Standardized 4px corner radius across all cards, controls, and chips
 * - High-contrast accessible Light & Dark surfaces
 * - Distinct Afternoon Lunch vs Night Dinner visual themes
 * - Lunch attendance chips & washer cards styled with colourful afternoon theme
 * - Dinner attendance chips, washer cards & upcoming washer styled with night theme
 * - On page refresh: meal attendance resets on Home page alone so user selects again
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
  // Persistent selected meal session: 'lunch' | 'dinner'
  const [selectedMeal, setSelectedMeal] = useState(() => {
    try {
      return localStorage.getItem('vw_selected_meal') || 'lunch';
    } catch {
      return 'lunch';
    }
  });

  const handleSelectMeal = (meal) => {
    setSelectedMeal(meal);
    try {
      localStorage.setItem('vw_selected_meal', meal);
    } catch {
      // ignore
    }
  };

  // Auto-switch to dinner if lunch is not provided but dinner is provided
  React.useEffect(() => {
    if (todayConfig) {
      if (!todayConfig.lunchProvided && todayConfig.dinnerProvided && selectedMeal === 'lunch') {
        setSelectedMeal('dinner');
      }
    }
  }, [todayConfig?.date, todayConfig?.lunchProvided, todayConfig?.dinnerProvided, selectedMeal]);

  const memberMap = useMemo(() => new Map(allMembers.map((m) => [m.id, m])), [allMembers]);

  // Requirement 4: On Home page meal attendance card alone, reset/refresh selected person state on page refresh
  // Starts with empty selection so user selects again after refresh
  const [sessionEaters, setSessionEaters] = useState(() => ({
    lunch: [],
    dinner: [],
  }));

  const currentEaters = sessionEaters[selectedMeal] || [];
  const currentEaterSet = useMemo(() => new Set(currentEaters), [currentEaters]);

  // Dynamic recalculation handler on attendance toggle
  const handleToggleEater = useCallback((memberId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSessionEaters((prev) => {
      const currentList = prev[selectedMeal] || [];
      const updatedSet = new Set(currentList);
      if (updatedSet.has(memberId)) {
        updatedSet.delete(memberId);
      } else {
        updatedSet.add(memberId);
      }
      const updatedArray = Array.from(updatedSet);
      if (onUpdateEaters) {
        onUpdateEaters(selectedMeal, updatedArray);
      }
      return {
        ...prev,
        [selectedMeal]: updatedArray,
      };
    });
  }, [selectedMeal, onUpdateEaters]);

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

  const isMealProvided = selectedMeal === 'lunch'
    ? Boolean(todayConfig?.lunchProvided)
    : Boolean(todayConfig?.dinnerProvided);

  // Simplified lunch washer requirement (Single vs Multiple)
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

  return (
    <div className="w-full max-w-full p-3 sm:p-5 space-y-4">
      {/* Responsive 2-Card Layout: Desktop/Tablet Grid, Mobile Stack */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* ========================================================================= */}
        {/* CARD 1: MEAL & ATTENDANCE SETTINGS (7 COLS ON DESKTOP)                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-white dark:bg-[#151922] border border-[#DDD9D0] dark:border-[#263042] rounded-[4px] p-4 sm:p-5 shadow-2xs space-y-4 transition-colors duration-200">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD9D0]/80 dark:border-[#263042]/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[4px] bg-[#EA580C]/10 dark:bg-[#F59E0B]/15 text-[#EA580C] dark:text-[#F59E0B] flex items-center justify-center border border-[#EA580C]/20 shrink-0">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#111216] dark:text-[#F7F6F3] leading-tight">
                  Meal &amp; Attendance
                </h2>
                <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] font-medium block">
                  Select meal session and mark attending members
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#F2F1ED] dark:bg-[#1B212D] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#263042]">
              Session
            </span>
          </div>

          {/* 1. Meal Session Selector: Distinct Afternoon Lunch vs Night Dinner Theme */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-[#111216] dark:text-[#F7F6F3] uppercase tracking-wider">
                Select Meal Session
              </label>
              <span className="text-[10px] font-semibold text-[#71717A] dark:text-[#9BA5B7]">
                {selectedMeal === 'lunch' ? '☀️ Afternoon' : '🌙 Night'}
              </span>
            </div>

            <div className="grid grid-cols-2 p-1 bg-[#F2F1ED] dark:bg-[#11141B] rounded-[4px] border border-[#DDD9D0] dark:border-[#202736] gap-1">
              {/* Lunch Tab (Afternoon Theme: Warm Golden Sunlight) */}
              <button
                type="button"
                onClick={() => handleSelectMeal('lunch')}
                aria-label="Select Lunch session"
                className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-[4px] transition-all duration-200 select-none active-scale cursor-pointer ${
                  selectedMeal === 'lunch'
                    ? 'bg-gradient-to-r from-[#FF7A00] via-[#FF9E1B] to-[#FFB703] text-[#18181B] font-extrabold shadow-sm border border-[#F59E0B]/50'
                    : 'bg-transparent text-[#52525B] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-[4px] flex items-center justify-center ${
                    selectedMeal === 'lunch'
                      ? 'bg-[#18181B]/15 text-[#18181B]'
                      : 'bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" strokeWidth={selectedMeal === 'lunch' ? 2.5 : 2} />
                </div>
                <span className="text-xs tracking-tight font-extrabold">Lunch</span>
                {todayConfig?.lunchProvided && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#4ADE80]"
                    title="Lunch Available"
                  />
                )}
              </button>

              {/* Dinner Tab (Night Theme: Deep Twilight & Midnight Atmosphere) */}
              <button
                type="button"
                onClick={() => handleSelectMeal('dinner')}
                aria-label="Select Dinner session"
                className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-[4px] transition-all duration-200 select-none active-scale cursor-pointer ${
                  selectedMeal === 'dinner'
                    ? 'bg-gradient-to-r from-[#1E1B4B] via-[#2E2768] to-[#4338CA] text-white font-extrabold shadow-sm border border-indigo-400/40'
                    : 'bg-transparent text-[#52525B] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-[4px] flex items-center justify-center ${
                    selectedMeal === 'dinner'
                      ? 'bg-white/20 text-[#FDE68A]'
                      : 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" strokeWidth={selectedMeal === 'dinner' ? 2.5 : 2} />
                </div>
                <span className="text-xs tracking-tight font-extrabold">Dinner</span>
                {todayConfig?.dinnerProvided && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"
                    title="Dinner Available"
                  />
                )}
              </button>
            </div>
          </div>

          {/* 2. Meal Status & Availability Toggle */}
          <div className="p-3 rounded-[4px] bg-[#F2F1ED]/50 dark:bg-[#1B212D]/60 border border-[#DDD9D0] dark:border-[#263042] flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isMealProvided
                      ? 'bg-[#16A34A] dark:bg-[#4ADE80] ring-2 ring-[#16A34A]/20'
                      : 'bg-[#DC2626] dark:bg-[#F87171] ring-2 ring-[#DC2626]/20'
                  }`}
                />
                <span className="text-xs font-extrabold text-[#111216] dark:text-[#F7F6F3] truncate">
                  {selectedMeal === 'lunch' ? 'Lunch Status' : 'Dinner Status'}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-[4px] shrink-0 ${
                    isMealProvided
                      ? 'bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#15803D] dark:text-[#4ADE80] border border-[#86EFAC] dark:border-[#166534]'
                      : 'bg-[#FEF2F2] dark:bg-[#321414] text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#7F1D1D]'
                  }`}
                >
                  {isMealProvided ? 'Available ✓' : 'Not Available'}
                </span>
              </div>
              <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] block truncate mt-0.5 font-medium">
                {isMealProvided
                  ? 'Meal active — washing duty in effect'
                  : 'Meal inactive — no washing duty'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onToggleMealProvided(selectedMeal, !isMealProvided)}
              className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-all active-scale whitespace-nowrap shadow-2xs shrink-0 cursor-pointer ${
                isMealProvided
                  ? 'bg-white dark:bg-[#151922] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#263042] hover:bg-[#F2F1ED] dark:hover:bg-[#202736]'
                  : 'bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white hover:opacity-95 shadow-[0_2px_8px_rgba(34,197,94,0.3)]'
              }`}
              title={isMealProvided ? 'Click to mark not available' : 'Click to mark available'}
            >
              {isMealProvided ? 'Set Not Available' : 'Mark Available ✓'}
            </button>
          </div>

          {/* 3. Washer Count (Single vs Multiple for Lunch) */}
          {selectedMeal === 'lunch' && isMealProvided && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-[#111216] dark:text-[#F7F6F3] uppercase tracking-wider">
                  Washer Requirement
                </label>
                <span className="text-[10px] text-[#71717A] dark:text-[#9BA5B7]">
                  {washersCount === 2 ? '2 washers assigned' : '1 washer assigned'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onToggleLunchWashers && onToggleLunchWashers(1)}
                  className={`py-1.5 px-3 rounded-[4px] text-xs font-extrabold border transition-all active-scale flex items-center justify-center select-none cursor-pointer ${
                    washersCount === 1
                      ? 'bg-gradient-to-r from-[#FF7A00] via-[#FF9E1B] to-[#FFB703] text-[#18181B] border-transparent shadow-xs'
                      : 'bg-[#F2F1ED] dark:bg-[#1B212D] text-[#52525B] dark:text-[#94A3B8] border-[#DDD9D0] dark:border-[#263042] hover:bg-[#EAE8E2] dark:hover:bg-[#202736]'
                  }`}
                >
                  Single (1)
                </button>

                <button
                  type="button"
                  onClick={() => onToggleLunchWashers && onToggleLunchWashers(2)}
                  className={`py-1.5 px-3 rounded-[4px] text-xs font-extrabold border transition-all active-scale flex items-center justify-center select-none cursor-pointer ${
                    washersCount === 2
                      ? 'bg-gradient-to-r from-[#FF7A00] via-[#FF9E1B] to-[#FFB703] text-[#18181B] border-transparent shadow-xs'
                      : 'bg-[#F2F1ED] dark:bg-[#1B212D] text-[#52525B] dark:text-[#94A3B8] border-[#DDD9D0] dark:border-[#263042] hover:bg-[#EAE8E2] dark:hover:bg-[#202736]'
                  }`}
                >
                  Multiple (2)
                </button>
              </div>
            </div>
          )}

          {/* 4. Attending Members ("Who Ate Today?") */}
          {isMealProvided && (
            <div className="space-y-2 pt-1 border-t border-[#DDD9D0]/80 dark:border-[#263042]/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
                  <span>Who ate {selectedMeal}?</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
                    selectedMeal === 'lunch'
                      ? 'bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24]'
                      : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {currentEaters.length} attending
                  </span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllEaters}
                    className={`text-[11px] font-extrabold hover:underline cursor-pointer ${
                      selectedMeal === 'lunch' ? 'text-[#D97706] dark:text-[#FBBF24]' : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    [Select All]
                  </button>
                  <span className="text-[#DDD9D0] dark:text-[#263042]">&middot;</span>
                  <button
                    type="button"
                    onClick={handleClearAllEaters}
                    className="text-[11px] font-semibold text-[#71717A] dark:text-[#9BA5B7] hover:text-[#111216] dark:hover:text-[#F7F6F3] cursor-pointer"
                  >
                    [Clear]
                  </button>
                </div>
              </div>

              {/* Members chip cloud with Colorful Afternoon (Lunch) vs Night (Dinner) Theme & 4px Radius */}
              <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                {activeMembers.map((member) => {
                  const ate = currentEaterSet.has(member.id);

                  // Lunch Selected: Afternoon sunny theme
                  // Dinner Selected: Night indigo/twilight theme
                  const selectedChipStyle = selectedMeal === 'lunch'
                    ? 'bg-gradient-to-r from-[#FF7A00] via-[#FF9E1B] to-[#FFB703] text-[#18181B] border-transparent shadow-xs font-extrabold'
                    : 'bg-gradient-to-r from-[#1E1B4B] via-[#2E2768] to-[#4338CA] text-white border-transparent shadow-xs font-extrabold';

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={(e) => handleToggleEater(member.id, e)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs transition-all duration-150 active-scale select-none border cursor-pointer ${
                        ate
                          ? selectedChipStyle
                          : 'bg-[#F2F1ED] dark:bg-[#1B212D] text-[#4E525D] dark:text-[#9BA5B7] border-[#DDD9D0] dark:border-[#263042] hover:bg-[#EAE8E2] dark:hover:bg-[#222A3A]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-[2px] flex items-center justify-center text-[9px] font-extrabold ${
                          ate
                            ? selectedMeal === 'lunch'
                              ? 'bg-[#18181B]/15 text-[#18181B]'
                              : 'bg-white/20 text-white'
                            : 'bg-white dark:bg-[#151922] text-[#4E525D] dark:text-[#9BA5B7]'
                        }`}
                      >
                        {member.code}
                      </span>
                      <span>{member.name}</span>
                      {ate && <Check className="w-3.5 h-3.5" strokeWidth={2.8} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: WASHER ASSIGNMENT & ROTATION QUEUE (5 COLS ON DESKTOP)            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-[#151922] border border-[#DDD9D0] dark:border-[#263042] rounded-[4px] p-4 sm:p-5 shadow-2xs space-y-4 transition-colors duration-200">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD9D0]/80 dark:border-[#263042]/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[4px] bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#16A34A] dark:text-[#4ADE80] border border-[#86EFAC]/40 dark:border-[#166534] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#111216] dark:text-[#F7F6F3] leading-tight">
                  Washer Assignment
                </h2>
                <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] font-medium block">
                  Assigned washer from rotation queue
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#F2F1ED] dark:bg-[#1B212D] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#263042]">
              Queue
            </span>
          </div>

          {/* Washer Display States */}
          {!isMealProvided ? (
            <div className="p-6 rounded-[4px] bg-[#F2F1ED]/50 dark:bg-[#1B212D]/60 border border-dashed border-[#DDD9D0] dark:border-[#263042] text-center space-y-2">
              <UtensilsCrossed className="w-7 h-7 text-[#71717A] dark:text-[#9BA5B7] mx-auto opacity-50" />
              <h3 className="text-xs font-extrabold text-[#111216] dark:text-[#F7F6F3]">
                {selectedMeal === 'lunch' ? 'Lunch' : 'Dinner'} is Not Available
              </h3>
              <p className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] max-w-xs mx-auto">
                Tap <strong>"Mark Available"</strong> in session settings to activate duty and view the assigned washer.
              </p>
            </div>
          ) : currentEaters.length === 0 ? (
            <div className="p-5 rounded-[4px] bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-center space-y-1.5">
              <AlertCircle className="w-6 h-6 text-[#D97706] dark:text-[#FBBF24] mx-auto" />
              <h3 className="text-xs font-extrabold text-[#D97706] dark:text-[#FBBF24]">
                No member attendance marked yet
              </h3>
              <p className="text-[11px] text-[#D97706]/90 dark:text-[#FBBF24]/90 max-w-xs mx-auto">
                Select who ate {selectedMeal} to compute the vessel washer turn from the queue.
              </p>
            </div>
          ) : liveAssignedSlots.length === 0 || !liveAssignedSlots[0]?.assignedMemberId ? (
            <div className="p-5 rounded-[4px] bg-[#F2F1ED]/50 dark:bg-[#1B212D]/60 border border-[#DDD9D0] dark:border-[#263042] text-center">
              <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7]">
                No eligible washer found for the selected attending members.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1. HERO ASSIGNED WASHER CARD(S):
                  - Lunch washer styled with Colourful Afternoon Sunlight Theme
                  - Dinner washer styled with Atmospheric Night Twilight Theme */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#111216] dark:text-[#F7F6F3] uppercase tracking-wider">
                    {selectedDateStr === currentDateStr ? "Today's Washer" : "Assigned Washer"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#F2F1ED] dark:bg-[#1B212D] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#263042]">
                    {liveAssignedSlots.length === 2 ? '2 Assigned' : '1 Assigned'}
                  </span>
                </div>

                <div className={`grid ${liveAssignedSlots.length === 2 ? 'grid-cols-1 sm:grid-cols-2 gap-2.5' : 'grid-cols-1 gap-2.5'}`}>
                  {liveAssignedSlots.map((slot) => {
                    const member = memberMap.get(slot.assignedMemberId);
                    const isLunch = selectedMeal === 'lunch';

                    return (
                      <div
                        key={slot.id}
                        className={`p-3.5 sm:p-4 rounded-[4px] border shadow-2xs flex items-center justify-between gap-3 ${
                          isLunch
                            ? 'bg-gradient-to-br from-[#FFF9F0] via-white to-[#FFF3E0] dark:from-[#261B0B] dark:via-[#1E1609] dark:to-[#2B1D0B] border-[#F59E0B]/50'
                            : 'bg-gradient-to-br from-[#F5F3FF] via-white to-[#EDE9FE] dark:from-[#15122C] dark:via-[#120F26] dark:to-[#1B1736] border-indigo-400/35'
                        }`}
                      >
                        {/* Member Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-[4px] font-black text-sm sm:text-base flex items-center justify-center shadow-xs shrink-0 ${
                              isLunch
                                ? 'bg-gradient-to-br from-[#FF7A00] via-[#FF9E1B] to-[#FFB703] text-[#18181B]'
                                : 'bg-gradient-to-br from-[#1E1B4B] via-[#2E2768] to-[#4338CA] text-white'
                            }`}
                          >
                            {member?.code || 'M'}
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-[2px] border inline-block truncate uppercase tracking-wider ${
                                isLunch
                                  ? 'bg-[#FF7A00]/10 text-[#C2410C] dark:text-[#FBBF24] border-[#F59E0B]/30'
                                  : 'bg-indigo-500/15 text-indigo-700 dark:text-[#C7D2FE] border-indigo-400/30'
                              }`}
                            >
                              {liveAssignedSlots.length === 2
                                ? `Washer ${slot.slotIndex}`
                                : isLunch
                                ? 'Lunch Duty'
                                : 'Dinner Duty'}
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold text-[#111216] dark:text-[#F7F6F3] tracking-tight truncate leading-tight mt-0.5">
                              {slot.assignedMemberName}
                            </h3>
                            <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] block truncate font-medium">
                              Active rotation turn
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-[10px] text-[#71717A] dark:text-[#9BA5B7] block font-semibold">
                            Position
                          </span>
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-[4px] bg-white dark:bg-[#151922] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#263042] inline-block shadow-2xs">
                            #{slot.slotIndex} in Turn
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. UPCOMING WASHER IN QUEUE (Styled with Night/Dinner Theme) */}
              {nextMember && (
                <div className="p-3.5 rounded-[4px] bg-gradient-to-br from-[#F5F3FF]/70 to-[#EDE9FE]/50 dark:from-[#15122C]/70 dark:to-[#1B1736]/50 border border-indigo-400/30 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[4px] bg-[#1E1B4B] text-white dark:bg-indigo-950/80 dark:text-[#C7D2FE] border border-indigo-400/40 font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                      {nextMember.code}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block truncate">
                        Next Washer (Upcoming)
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#111216] dark:text-[#F7F6F3] tracking-tight truncate leading-tight">
                        {nextMember.name}
                      </h4>
                      <span className="text-[10px] text-[#4E525D] dark:text-[#9BA5B7] block truncate">
                        Next in rotation queue
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-[4px] bg-white dark:bg-[#151922] text-[#111216] dark:text-[#F7F6F3] border border-indigo-400/30 inline-block">
                      Up Next
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
