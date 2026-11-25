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
import { DateSelectorBar } from '../components/common/DateSelectorBar';

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
  // Persistent selected meal: 'lunch' | 'dinner'
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

  const memberMap = useMemo(() => new Map(allMembers.map(m => [m.id, m])), [allMembers]);

  // Current active eater list for selected meal directly derived from todayConfig (single source of truth)
  const currentEaters = useMemo(() => {
    return selectedMeal === 'lunch'
      ? (todayConfig?.lunchEaters || [])
      : (todayConfig?.dinnerEaters || []);
  }, [selectedMeal, todayConfig?.lunchEaters, todayConfig?.dinnerEaters]);

  const currentEaterSet = useMemo(() => new Set(currentEaters), [currentEaters]);

  // Instant dynamic recalculation handler on attendance toggle
  const handleToggleEater = useCallback((memberId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const currentList = selectedMeal === 'lunch'
      ? (todayConfig?.lunchEaters || [])
      : (todayConfig?.dinnerEaters || []);
    const updatedSet = new Set(currentList);
    if (updatedSet.has(memberId)) {
      updatedSet.delete(memberId);
    } else {
      updatedSet.add(memberId);
    }
    const updatedArray = Array.from(updatedSet);
    onUpdateEaters(selectedMeal, updatedArray);
  }, [selectedMeal, todayConfig?.lunchEaters, todayConfig?.dinnerEaters, onUpdateEaters]);

  const handleSelectAllEaters = useCallback((e) => {
    if (e) e.preventDefault();
    const allIds = activeMembers.map(m => m.id);
    onUpdateEaters(selectedMeal, allIds);
  }, [selectedMeal, activeMembers, onUpdateEaters]);

  const handleClearAllEaters = useCallback((e) => {
    if (e) e.preventDefault();
    onUpdateEaters(selectedMeal, []);
  }, [selectedMeal, onUpdateEaters]);

  const isMealProvided = selectedMeal === 'lunch'
    ? Boolean(todayConfig?.lunchProvided)
    : Boolean(todayConfig?.dinnerProvided);

  // Simplified lunch washer requirement (Single vs Multiple)
  const userChosenWashers = Number(todayConfig?.lunchWashers) === 2 ? 2 : 1;
  const washersCount = selectedMeal === 'lunch' ? userChosenWashers : 1;

  // Compute live assignments strictly following Excel rules dynamically based on attendance
  const { liveAssignedSlots, liveNextWasherId } = useMemo(() => {
    if (!isMealProvided) {
      return { liveAssignedSlots: [], liveNextWasherId: queue[0] || null };
    }

    const activeEaterList = currentEaters.filter(id => {
      const m = memberMap.get(id);
      return m && m.status === 'active';
    });

    if (activeEaterList.length === 0) {
      return { liveAssignedSlots: [], liveNextWasherId: queue[0] || null };
    }

    // Lunch with 2 washers (Excel rule: dual washers on multiple lunch)
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
    <div className="w-full max-w-full pb-28 px-3.5 sm:px-4 pt-3 space-y-4">
      {/* 1. Date Selector Bar for Countless Days / Multi-Year Navigation */}
      <DateSelectorBar
        selectedDateStr={selectedDateStr}
        onSelectDate={onSelectDate}
        todayDateStr={currentDateStr}
        availableDays={availableDays}
      />

      {/* Responsive Cards Layout */}
      <div className="w-full max-w-full space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-5 md:gap-4 lg:gap-5">
        {/* ========================================================================= */}
        {/* CARD 1: MEAL & WASHER ROSTER SETTINGS                                     */}
        {/* Responsive layout: Tablet 50% (col-span-1), Desktop 60% (col-span-3)     */}
        {/* ========================================================================= */}
        <div className="md:col-span-1 lg:col-span-3 rounded-[26px] bg-white dark:bg-[#151922] border border-[#E8E5DE] dark:border-[#263042] shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] p-4 sm:p-5.5 space-y-4.5 flex flex-col justify-between transition-colors duration-200">
          <div className="space-y-4.5">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DE]/70 dark:border-[#263042]/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-2xl bg-gradient-to-br from-[#EA580C]/12 to-[#F59E0B]/12 text-[#EA580C] dark:text-[#F59E0B] flex items-center justify-center border border-[#EA580C]/20 flex-shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#18181B] dark:text-[#F4F4F5] leading-tight tracking-tight">
                    Meal &amp; Attendance Settings
                  </h2>
                  <span className="text-[11px] text-[#52525B] dark:text-[#94A3B8] font-medium block">
                    Configure meal availability, requirement &amp; attending members
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F4F3EF] dark:bg-[#1B212D] text-[#52525B] dark:text-[#94A3B8] border border-[#E8E5DE] dark:border-[#263042] flex-shrink-0">
                Session Hub
              </span>
            </div>

            {/* 1. Meal Toggle: Distinct Day & Night Visual Theme (Afternoon vs. Night Effect) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-[#18181B] dark:text-[#F4F4F5] uppercase tracking-wider block">
                  Select Meal Session
                </label>
                <span className="text-[10px] font-semibold text-[#71717A] dark:text-[#94A3B8]">
                  {selectedMeal === 'lunch' ? '☀️ Afternoon Session' : '🌙 Night Session'}
                </span>
              </div>

              <div className="grid grid-cols-2 p-1.5 bg-[#F4F3EF] dark:bg-[#11141B] rounded-[22px] border border-[#E4E1D8] dark:border-[#202736] gap-1.5">
                {/* Lunch Tab (Afternoon Visual Effect: Warm Golden Sunlight & Bright Amber Highlights) */}
                <button
                  type="button"
                  onClick={() => handleSelectMeal('lunch')}
                  aria-label="Select Lunch session"
                  className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-[18px] transition-all duration-300 select-none active-scale cursor-pointer ${
                    selectedMeal === 'lunch'
                      ? 'bg-gradient-to-r from-[#FF7A00] via-[#FF9E1B] to-[#FFB703] text-[#18181B] font-extrabold shadow-[0_4px_18px_rgba(255,158,27,0.38)] border border-[#F59E0B]/50'
                      : 'bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 text-[#52525B] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedMeal === 'lunch' ? 'bg-[#18181B]/15 text-[#18181B]' : 'bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24]'
                  }`}>
                    <Sun className="w-3.5 h-3.5" strokeWidth={selectedMeal === 'lunch' ? 2.5 : 2} />
                  </div>
                  <span className="text-xs tracking-tight truncate">Lunch</span>
                  {todayConfig?.lunchProvided && (
                    <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#4ADE80] ring-2 ring-white dark:ring-[#171F2C]" title="Lunch Available" />
                  )}
                </button>

                {/* Dinner Tab (Night Visual Effect: Deep Twilight / Indigo Atmosphere & Warm Lantern Glow) */}
                <button
                  type="button"
                  onClick={() => handleSelectMeal('dinner')}
                  aria-label="Select Dinner session"
                  className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-[18px] transition-all duration-300 select-none active-scale cursor-pointer ${
                    selectedMeal === 'dinner'
                      ? 'bg-gradient-to-r from-[#1E1B4B] via-[#2E2768] to-[#4338CA] text-white font-extrabold shadow-[0_4px_18px_rgba(67,56,202,0.42)] border border-indigo-400/35'
                      : 'bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-500/10 text-[#52525B] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedMeal === 'dinner' ? 'bg-white/20 text-[#FDE68A]' : 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400'
                  }`}>
                    <Moon className="w-3.5 h-3.5" strokeWidth={selectedMeal === 'dinner' ? 2.5 : 2} />
                  </div>
                  <span className="text-xs tracking-tight truncate">Dinner</span>
                  {todayConfig?.dinnerProvided && (
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-white dark:ring-[#171F2C]" title="Dinner Available" />
                  )}
                </button>
              </div>
            </div>

            {/* 2. Meal Status Indicator & Availability Toggle */}
            <div className="p-3.5 rounded-2xl bg-[#F8F7F4] dark:bg-[#1B212D] border border-[#E8E5DE] dark:border-[#263042] flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isMealProvided ? 'bg-[#16A34A] dark:bg-[#4ADE80] ring-2 ring-[#16A34A]/20' : 'bg-[#DC2626] dark:bg-[#F87171] ring-2 ring-[#DC2626]/20'}`} />
                  <span className="text-xs font-extrabold text-[#18181B] dark:text-[#F4F4F5] truncate">
                    {selectedMeal === 'lunch' ? 'Lunch Status' : 'Dinner Status'}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
                    isMealProvided
                      ? 'bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#15803D] dark:text-[#4ADE80] border border-[#86EFAC] dark:border-[#166534]'
                      : 'bg-[#FEF2F2] dark:bg-[#321414] text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#7F1D1D]'
                  }`}>
                    {isMealProvided ? 'Available ✓' : 'Not Available'}
                  </span>
                </div>
                <span className="text-[11px] text-[#52525B] dark:text-[#94A3B8] block truncate mt-0.5 font-medium">
                  {isMealProvided
                    ? 'Available — Washing schedule active'
                    : 'Not Available — Meal duties inactive'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onToggleMealProvided(selectedMeal, !isMealProvided)}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-full transition-all active-scale whitespace-nowrap shadow-xs flex-shrink-0 cursor-pointer ${
                  isMealProvided
                    ? 'bg-white dark:bg-[#151922] text-[#18181B] dark:text-[#F4F4F5] border border-[#E8E5DE] dark:border-[#263042] hover:bg-[#F4F3EF] dark:hover:bg-[#202736]'
                    : 'bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white hover:opacity-95 shadow-[0_2px_10px_rgba(34,197,94,0.3)]'
                }`}
                title={isMealProvided ? 'Click to mark meal as not available' : 'Click to mark meal as available'}
              >
                {isMealProvided ? 'Set Not Available' : 'Mark Available ✓'}
              </button>
            </div>

            {/* 3. Simplified Washer Requirement: [ Single ] | [ Multiple ] */}
            {selectedMeal === 'lunch' && isMealProvided && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-[#18181B] dark:text-[#F4F4F5] uppercase tracking-wider block">
                    Washer Requirement
                  </label>
                  <span className="text-[10px] text-[#71717A] dark:text-[#94A3B8]">
                    {washersCount === 2 ? '2 washers assigned' : '1 washer assigned'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleLunchWashers && onToggleLunchWashers(1)}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all active-scale flex items-center justify-center select-none cursor-pointer ${
                      washersCount === 1
                        ? 'bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#F59E0B] text-white border-transparent shadow-[0_2px_10px_rgba(249,115,22,0.3)]'
                        : 'bg-[#F4F3EF] dark:bg-[#1B212D] text-[#52525B] dark:text-[#94A3B8] border border-[#E8E5DE] dark:border-[#263042] hover:bg-[#EAE8E2] dark:hover:bg-[#202736]'
                    }`}
                  >
                    <span>Single (1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLunchWashers && onToggleLunchWashers(2)}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all active-scale flex items-center justify-center select-none cursor-pointer ${
                      washersCount === 2
                        ? 'bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#F59E0B] text-white border-transparent shadow-[0_2px_10px_rgba(249,115,22,0.3)]'
                        : 'bg-[#F4F3EF] dark:bg-[#1B212D] text-[#52525B] dark:text-[#94A3B8] border border-[#E8E5DE] dark:border-[#263042] hover:bg-[#EAE8E2] dark:hover:bg-[#202736]'
                    }`}
                  >
                    <span>Multiple (2)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Attendance Tracker ("Who Ate Today?") */}
            {isMealProvided && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#18181B] dark:text-[#F4F4F5] flex items-center gap-1.5">
                    <span>Who ate {selectedMeal}?</span>
                    <span className="text-[11px] font-bold text-[#EA580C] dark:text-[#F59E0B] bg-[#EA580C]/10 dark:bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
                      {currentEaters.length} attending
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllEaters}
                      className="text-[11px] font-extrabold text-[#EA580C] dark:text-[#F59E0B] hover:underline cursor-pointer"
                    >
                      [Select All]
                    </button>
                    <span className="text-[#E8E5DE] dark:text-[#263042]">&middot;</span>
                    <button
                      type="button"
                      onClick={handleClearAllEaters}
                      className="text-[11px] font-semibold text-[#71717A] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5] cursor-pointer"
                    >
                      [Clear]
                    </button>
                  </div>
                </div>

                {/* Responsive auto-wrapping flex chips with consistent gap */}
                <div className="flex flex-wrap gap-2 items-center pt-0.5">
                  {activeMembers.map((member) => {
                    const ate = currentEaterSet.has(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={(e) => handleToggleEater(member.id, e)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 active-scale select-none border cursor-pointer ${
                          ate
                            ? 'bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#F59E0B] text-white border-transparent shadow-[0_2px_8px_rgba(249,115,22,0.3)] font-extrabold'
                            : 'bg-white dark:bg-[#1B212D] text-[#52525B] dark:text-[#94A3B8] border-[#E8E5DE] dark:border-[#263042] hover:bg-[#F4F3EF] dark:hover:bg-[#222A3A]'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold ${
                            ate ? 'bg-white/20 text-white' : 'bg-[#F4F3EF] dark:bg-[#151922] text-[#52525B] dark:text-[#94A3B8]'
                          }`}
                        >
                          {member.code}
                        </span>
                        <span>{member.name}</span>
                        {ate && <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.8} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: WASHER DISPLAY & DUTY COMPLETION CARDS                            */}
        {/* Responsive layout: Tablet 50% (col-span-1), Desktop 40% (col-span-2)     */}
        {/* ========================================================================= */}
        <div className="md:col-span-1 lg:col-span-2 rounded-[26px] bg-white dark:bg-[#151922] border border-[#E8E5DE] dark:border-[#263042] shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] p-4 sm:p-5.5 space-y-4.5 flex flex-col justify-between transition-colors duration-200">
          <div className="space-y-4.5">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DE]/70 dark:border-[#263042]/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-2xl bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#16A34A] dark:text-[#4ADE80] border border-[#86EFAC]/40 dark:border-[#166534] flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#18181B] dark:text-[#F4F4F5] leading-tight tracking-tight">
                    Washer Assignment
                  </h2>
                  <span className="text-[11px] text-[#52525B] dark:text-[#94A3B8] font-medium block">
                    Assigned duties and completion records
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F4F3EF] dark:bg-[#1B212D] text-[#52525B] dark:text-[#94A3B8] border border-[#E8E5DE] dark:border-[#263042] flex-shrink-0">
                Live Queue
              </span>
            </div>

            {/* Roster Content States */}
            {!isMealProvided ? (
              <div className="p-6 rounded-[22px] bg-[#F8F7F4]/80 dark:bg-[#1B212D]/60 border border-dashed border-[#E8E5DE] dark:border-[#263042] text-center space-y-1.5">
                <UtensilsCrossed className="w-7 h-7 text-[#71717A] dark:text-[#94A3B8] mx-auto opacity-50" />
                <h3 className="text-xs font-extrabold text-[#18181B] dark:text-[#F4F4F5]">
                  {selectedMeal === 'lunch' ? 'Lunch' : 'Dinner'} is Not Available
                </h3>
                <p className="text-[11px] text-[#52525B] dark:text-[#94A3B8] max-w-xs mx-auto">
                  Tap <strong>"Mark Available"</strong> in the settings card to activate duty and display the assigned washer.
                </p>
              </div>
            ) : currentEaters.length === 0 ? (
              <div className="p-5 rounded-[22px] bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-center space-y-1.5">
                <AlertCircle className="w-6 h-6 text-[#D97706] dark:text-[#FBBF24] mx-auto" />
                <h3 className="text-xs font-extrabold text-[#D97706] dark:text-[#FBBF24]">
                  No member attendance marked yet
                </h3>
                <p className="text-[11px] text-[#D97706]/90 dark:text-[#FBBF24]/90 max-w-xs mx-auto">
                  Select who ate {selectedMeal} in the settings to calculate the assigned vessel washer from the queue.
                </p>
              </div>
            ) : liveAssignedSlots.length === 0 || !liveAssignedSlots[0]?.assignedMemberId ? (
              <div className="p-5 rounded-[22px] bg-[#F8F7F4]/60 dark:bg-[#1B212D]/60 border border-[#E8E5DE] dark:border-[#263042] text-center">
                <p className="text-xs text-[#52525B] dark:text-[#94A3B8]">
                  No eligible washer found for the selected attending members.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* 1. HERO ASSIGNED WASHER CARD(S) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#18181B] dark:text-[#F4F4F5] uppercase tracking-wider">
                      {selectedDateStr === currentDateStr ? "Today's Washer" : "Assigned Washer"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4F3EF] dark:bg-[#1B212D] text-[#52525B] dark:text-[#94A3B8] border border-[#E8E5DE] dark:border-[#263042]">
                      {liveAssignedSlots.length === 2 ? '2 Persons Assigned' : '1 Person Assigned'}
                    </span>
                  </div>

                  <div className={`grid ${liveAssignedSlots.length === 2 ? 'grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4' : 'grid-cols-1 gap-3'}`}>
                    {liveAssignedSlots.map((slot) => {
                      const member = memberMap.get(slot.assignedMemberId);

                      return (
                        <div
                          key={slot.id}
                          className="p-4 sm:p-4.5 rounded-[22px] bg-gradient-to-br from-[#FFF9F5] via-white to-[#FFF6ED] dark:from-[#1A212E] dark:via-[#171D28] dark:to-[#1E2533] border border-[#EA580C]/30 dark:border-[#F97316]/30 shadow-[0_4px_20px_rgba(249,115,22,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center justify-between gap-3 transition-all"
                        >
                          {/* Member info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#EA580C] via-[#F97316] to-[#F59E0B] text-white font-black text-sm sm:text-base flex items-center justify-center shadow-[0_4px_16px_rgba(249,115,22,0.35)] flex-shrink-0">
                              {member?.code || 'M'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#EA580C]/10 dark:bg-[#EA580C]/25 text-[#EA580C] dark:text-[#FBBF24] border border-[#EA580C]/20 inline-block truncate max-w-full uppercase tracking-wider">
                                {liveAssignedSlots.length === 2
                                  ? `Washer ${slot.slotIndex}`
                                  : selectedMeal === 'lunch'
                                  ? 'Lunch Duty'
                                  : 'Dinner Duty'}
                              </span>
                              <h3 className="text-base sm:text-lg font-extrabold text-[#18181B] dark:text-[#F4F4F5] tracking-tight truncate leading-tight mt-0.5">
                                {slot.assignedMemberName}
                              </h3>
                              <span className="text-[11px] text-[#52525B] dark:text-[#94A3B8] block truncate font-medium">
                                Assigned via Queue &amp; Timetable Rules
                              </span>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-right">
                            <span className="text-[10px] text-[#71717A] dark:text-[#94A3B8] block font-semibold">Rotation</span>
                            <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-white dark:bg-[#151922] text-[#18181B] dark:text-[#F4F4F5] border border-[#E8E5DE] dark:border-[#263042] inline-block shadow-2xs">
                              #{slot.slotIndex} in Queue
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. NEXT WASHER: Distinct Secondary Theme */}
                {nextMember && (
                  <div className="p-3.5 sm:p-4 rounded-[20px] bg-[#F8F7F4] dark:bg-[#191E29] border border-[#E8E5DE] dark:border-[#263042] flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#151922] text-[#18181B] dark:text-[#F4F4F5] border border-[#E8E5DE] dark:border-[#263042] font-extrabold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                        {nextMember.code}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-[#71717A] dark:text-[#94A3B8] uppercase tracking-wide block truncate">
                          Next Washer (Upcoming)
                        </span>
                        <h4 className="text-sm font-extrabold text-[#18181B] dark:text-[#F4F4F5] tracking-tight truncate leading-tight">
                          {nextMember.name}
                        </h4>
                        <span className="text-[11px] text-[#71717A] dark:text-[#94A3B8] block truncate">
                          Front of rotation queue for upcoming cycle
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <span className="text-[10px] text-[#71717A] dark:text-[#94A3B8] block font-medium">Rotation</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#151922] text-[#52525B] dark:text-[#94A3B8] border border-[#E8E5DE] dark:border-[#263042] inline-block">
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
    </div>
  );
}
