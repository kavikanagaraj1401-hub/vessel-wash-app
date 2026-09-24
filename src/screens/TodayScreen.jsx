import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Sun,
  Moon,
  Check,
  UtensilsCrossed,
  AlertCircle,
  Users,
  Lock,
} from 'lucide-react';
import { assignSlot, assignLunchPair } from '../logic/rotationEngine';
import { getTodayDateStr } from '../logic/dateUtils';

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

  const memberMap = useMemo(() => new Map(allMembers.map(m => [m.id, m])), [allMembers]);

  // Clean local state: independent attendance lists per meal without carryover
  const [localLunchEaters, setLocalLunchEaters] = useState(() => todayConfig?.lunchEaters || []);
  const [localDinnerEaters, setLocalDinnerEaters] = useState(() => todayConfig?.dinnerEaters || []);

  // Synchronize local eaters fresh when the selected date changes
  useEffect(() => {
    if (todayConfig) {
      setLocalLunchEaters(todayConfig.lunchEaters || []);
      setLocalDinnerEaters(todayConfig.dinnerEaters || []);
    }
  }, [todayConfig?.date]);

  // Current active eater list for selected meal
  const currentEaters = useMemo(() => {
    return selectedMeal === 'lunch' ? localLunchEaters : localDinnerEaters;
  }, [selectedMeal, localLunchEaters, localDinnerEaters]);

  const currentEaterSet = useMemo(() => new Set(currentEaters), [currentEaters]);

  // Instant dynamic recalculation handler on attendance toggle
  const handleToggleEater = useCallback((memberId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const currentList = selectedMeal === 'lunch' ? localLunchEaters : localDinnerEaters;
    const updatedSet = new Set(currentList);
    if (updatedSet.has(memberId)) {
      updatedSet.delete(memberId);
    } else {
      updatedSet.add(memberId);
    }
    const updatedArray = Array.from(updatedSet);
    if (selectedMeal === 'lunch') {
      setLocalLunchEaters(updatedArray);
    } else {
      setLocalDinnerEaters(updatedArray);
    }
    onUpdateEaters(selectedMeal, updatedArray);
  }, [selectedMeal, localLunchEaters, localDinnerEaters, onUpdateEaters]);

  const handleSelectAllEaters = useCallback((e) => {
    if (e) e.preventDefault();
    const allIds = activeMembers.map(m => m.id);
    if (selectedMeal === 'lunch') {
      setLocalLunchEaters(allIds);
    } else {
      setLocalDinnerEaters(allIds);
    }
    onUpdateEaters(selectedMeal, allIds);
  }, [selectedMeal, activeMembers, onUpdateEaters]);

  const handleClearAllEaters = useCallback((e) => {
    if (e) e.preventDefault();
    if (selectedMeal === 'lunch') {
      setLocalLunchEaters([]);
    } else {
      setLocalDinnerEaters([]);
    }
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
      const { assigned1, assigned2, updatedQueue } = assignLunchPair(queue, activeEaterList);
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
      const { assignedId, updatedQueue } = assignSlot(queue, activeEaterList);
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
  }, [selectedMeal, isMealProvided, washersCount, currentEaters, queue, todayConfig?.date, memberMap]);

  // Reset logs if meal is set unavailable
  useEffect(() => {
    if (!isMealProvided && todayConfig?.date) {
      const prefix = `${todayConfig.date}-${selectedMeal}`;
      const toRemove = attendanceLogs.filter(l => l.slotId.startsWith(prefix));
      toRemove.forEach(l => onResetAttendanceForSlot(l.slotId));
    }
  }, [isMealProvided, todayConfig?.date, selectedMeal]);

  const nextMember = liveNextWasherId ? memberMap.get(liveNextWasherId) : null;

  return (
    <div className="w-full max-w-full pb-28 px-4 pt-3 space-y-4">
      {/* Member Info Banner if not Admin */}
      {!isAdmin && (
        <div className="p-3 rounded-[20px] bg-sky-50 border border-sky-200 text-sky-900 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <UtensilsCrossed className="w-4 h-4 text-sky-700 flex-shrink-0" />
            <span className="font-medium text-[11px] leading-tight">
              <strong>Member Access:</strong> You can mark meal availability, washer requirements, and attendance below. Advanced settings (Excel roster &amp; members) are managed by Admin.
            </span>
          </div>
        </div>
      )}

      {/* Responsive Cards Layout */}
      <div className="w-full max-w-full space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-5 md:gap-4 lg:gap-6">
        {/* ========================================================================= */}
        {/* CARD 1: MEAL & WASHER ROSTER SETTINGS                                     */}
        {/* Responsive layout: Tablet 50% (col-span-1), Desktop 60% (col-span-3)     */}
        {/* ========================================================================= */}
        <div className="md:col-span-1 lg:col-span-3 rounded-[24px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-xs p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#DDD9D0]/50 dark:border-[#2A364B]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FCF7ED] dark:bg-[#272115] text-[#ECBD56] flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3] leading-tight">
                    Meal &amp; Attendance Settings
                  </h2>
                  <span className="text-[11px] text-[#848A96] dark:text-[#64748B] font-medium block">
                    Configure meal availability, requirement &amp; attending members
                  </span>
                </div>
              </div>
            </div>

            {/* 1. Meal Toggle: Segmented control [ Lunch | Dinner ] */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#111216] dark:text-[#F7F6F3] uppercase tracking-wider block">
                Select Meal
              </label>
              <div className="flex p-1 bg-[#F2F1ED] dark:bg-[#1F2A3C] rounded-full border border-[#DDD9D0] dark:border-[#2A364B]">
                <button
                  type="button"
                  onClick={() => handleSelectMeal('lunch')}
                  className={`flex-1 basis-0 min-w-0 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-full transition-all select-none active-scale cursor-pointer ${
                    selectedMeal === 'lunch'
                      ? 'bg-[#ECBD56] text-[#111216] shadow-xs'
                      : 'text-[#4E525D] dark:text-[#9BA5B7] hover:text-[#111216] dark:hover:text-[#F7F6F3]'
                  }`}
                >
                  <Sun className={`w-3.5 h-3.5 flex-shrink-0 ${selectedMeal === 'lunch' ? 'text-[#111216]' : 'text-[#848A96] dark:text-[#64748B]'}`} />
                  <span className="truncate">Lunch</span>
                  {todayConfig?.lunchProvided && (
                    <span className="w-2 h-2 rounded-full bg-[#22AC77] dark:bg-[#4ADE80] inline-block flex-shrink-0 border border-white dark:border-[#171F2C]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMeal('dinner')}
                  className={`flex-1 basis-0 min-w-0 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-full transition-all select-none active-scale cursor-pointer ${
                    selectedMeal === 'dinner'
                      ? 'bg-[#ECBD56] text-[#111216] shadow-xs'
                      : 'text-[#4E525D] dark:text-[#9BA5B7] hover:text-[#111216] dark:hover:text-[#F7F6F3]'
                  }`}
                >
                  <Moon className={`w-3.5 h-3.5 flex-shrink-0 ${selectedMeal === 'dinner' ? 'text-[#111216]' : 'text-[#848A96] dark:text-[#64748B]'}`} />
                  <span className="truncate">Dinner</span>
                  {todayConfig?.dinnerProvided && (
                    <span className="w-2 h-2 rounded-full bg-[#22AC77] dark:bg-[#4ADE80] inline-block flex-shrink-0 border border-white dark:border-[#171F2C]" />
                  )}
                </button>
              </div>
            </div>

            {/* 2. Meal Status Indicator & Availability Toggle */}
            <div className="p-3 rounded-[20px] bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isMealProvided ? 'bg-[#22AC77] dark:bg-[#4ADE80]' : 'bg-[#E0851A] dark:bg-[#FF9F45]'}`} />
                  <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] truncate">
                    {selectedMeal === 'lunch' ? 'Lunch Status' : 'Dinner Status'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full flex-shrink-0 ${
                    isMealProvided
                      ? 'bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#22AC77] dark:text-[#4ADE80] border border-[#97E2C0] dark:border-[#166534]'
                      : 'bg-[#FDF3E8] dark:bg-[#331C08] text-[#E0851A] dark:text-[#FF9F45] border border-[#F7C68B] dark:border-[#854D0E]'
                  }`}>
                    {isMealProvided ? 'Available' : 'Not Available'}
                  </span>
                </div>
                <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] block truncate mt-0.5">
                  {isMealProvided
                    ? 'Available — Washing active'
                    : 'Not Available — Duty inactive'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onToggleMealProvided(selectedMeal, !isMealProvided)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all active-scale whitespace-nowrap shadow-2xs flex-shrink-0 cursor-pointer ${
                  isMealProvided
                    ? 'bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] hover:bg-[#F2F1ED] dark:hover:bg-[#253248]'
                    : 'bg-[#22AC77] dark:bg-[#4ADE80] text-[#111216] font-bold hover:opacity-95'
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
                  <label className="text-[11px] font-bold text-[#111216] dark:text-[#F7F6F3] uppercase tracking-wider block">
                    Washer Requirement
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleLunchWashers && onToggleLunchWashers(1)}
                    className={`py-2 px-3 rounded-full text-xs font-bold border transition-all active-scale flex items-center justify-center select-none cursor-pointer ${
                      washersCount === 1
                        ? 'bg-[#ECBD56] text-[#111216] border-[#ECBD56] shadow-xs'
                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border-[#DDD9D0] dark:border-[#2A364B] hover:bg-neutral-200 dark:hover:bg-[#253248]'
                    }`}
                  >
                    <span>Single</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLunchWashers && onToggleLunchWashers(2)}
                    className={`py-2 px-3 rounded-full text-xs font-bold border transition-all active-scale flex items-center justify-center select-none cursor-pointer ${
                      washersCount === 2
                        ? 'bg-[#ECBD56] text-[#111216] border-[#ECBD56] shadow-xs'
                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border-[#DDD9D0] dark:border-[#2A364B] hover:bg-neutral-200 dark:hover:bg-[#253248]'
                    }`}
                  >
                    <span>Multiple</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Attendance Tracker ("Who Ate Today?") */}
            {isMealProvided && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E1E1E] flex items-center gap-1.5">
                    <span>Who ate today?</span>
                    <span className="text-[11px] font-medium text-neutral-textTertiary">
                      ({currentEaters.length} attending)
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllEaters}
                      className="text-[11px] font-bold text-[#ECBD56] hover:underline cursor-pointer"
                    >
                      [Select All]
                    </button>
                    <span className="text-[#DDD9D0] dark:text-[#2A364B]">&middot;</span>
                    <button
                      type="button"
                      onClick={handleClearAllEaters}
                      className="text-[11px] font-semibold text-[#848A96] dark:text-[#64748B] hover:text-[#111216] dark:hover:text-[#F7F6F3] cursor-pointer"
                    >
                      [Clear]
                    </button>
                  </div>
                </div>

                {/* Responsive auto-wrapping flex chips with consistent 8px gap */}
                <div className="flex flex-wrap gap-2 items-center pt-0.5">
                  {activeMembers.map((member) => {
                    const ate = currentEaterSet.has(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={(e) => handleToggleEater(member.id, e)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200 active-scale select-none border cursor-pointer ${
                          ate
                            ? 'bg-[#ECBD56] text-[#111216] border-[#DEAA3E] shadow-2xs font-bold'
                            : 'bg-white dark:bg-[#171F2C] text-[#4E525D] dark:text-[#9BA5B7] border-[#DDD9D0] dark:border-[#2A364B] hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C]'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            ate ? 'bg-black/15 text-[#111216]' : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7]'
                          }`}
                        >
                          {member.code}
                        </span>
                        <span>{member.name}</span>
                        {ate && <Check className="w-3.5 h-3.5 text-[#111216]" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* ========================================================================= */}
      {/* CARD 2: WASHER DISPLAY CARDS (Automated Read-Only Queue Rotation Display)   */}
      {/* Responsive layout: Tablet 50% (col-span-1), Desktop 40% (col-span-2)     */}
      {/* ========================================================================= */}
      <div className="md:col-span-1 lg:col-span-2 rounded-[24px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-xs p-4 sm:p-5 space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#DDD9D0]/50 dark:border-[#2A364B]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#22AC77] dark:text-[#4ADE80] flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3] leading-tight">
                  Washer Assignment
                </h2>
                <span className="text-[11px] text-[#848A96] dark:text-[#64748B] font-medium block">
                  Live automated rotation based on attendance
                </span>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B] flex-shrink-0">
              Live Queue
            </span>
          </div>

          {/* Roster Content States */}
          {!isMealProvided ? (
            <div className="p-6 rounded-[20px] bg-[#F2F1ED]/50 dark:bg-[#1F2A3C]/40 border border-dashed border-[#DDD9D0] dark:border-[#2A364B] text-center space-y-1.5">
              <UtensilsCrossed className="w-7 h-7 text-[#848A96] dark:text-[#64748B] mx-auto opacity-50" />
              <h3 className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                {selectedMeal === 'lunch' ? 'Lunch' : 'Dinner'} is Not Available
              </h3>
              <p className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] max-w-xs mx-auto">
                Tap <strong>"Mark Available"</strong> in the settings card to activate duty and display the assigned washer.
              </p>
            </div>
          ) : currentEaters.length === 0 ? (
            <div className="p-5 rounded-[20px] bg-[#FDF3E8] dark:bg-[#331C08] border border-[#F7C68B] dark:border-[#854D0E] text-center space-y-1.5">
              <AlertCircle className="w-6 h-6 text-[#E0851A] dark:text-[#FF9F45] mx-auto" />
              <h3 className="text-xs font-bold text-[#E0851A] dark:text-[#FF9F45]">
                No member attendance marked yet
              </h3>
              <p className="text-[11px] text-[#E0851A]/90 dark:text-[#FF9F45]/90 max-w-xs mx-auto">
                Select who ate {selectedMeal} in the settings to calculate the assigned vessel washer from the queue.
              </p>
            </div>
          ) : liveAssignedSlots.length === 0 || !liveAssignedSlots[0]?.assignedMemberId ? (
            <div className="p-5 rounded-[20px] bg-[#F2F1ED]/60 dark:bg-[#1F2A3C]/60 border border-[#DDD9D0] dark:border-[#2A364B] text-center">
              <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7]">
                No eligible washer found for the selected attending members.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* 1. TODAY'S WASHER: Card with Gold Accent */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] uppercase tracking-wider">
                    Today's Washer
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B]">
                    {liveAssignedSlots.length === 2 ? '2 Persons Assigned' : '1 Person Assigned'}
                  </span>
                </div>

                {/* Multiple Washer Layout: 12px to 16px gap, equal-width flex columns / grid */}
                <div className={`grid ${liveAssignedSlots.length === 2 ? 'grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4' : 'grid-cols-1 gap-3'}`}>
                  {liveAssignedSlots.map((slot) => {
                    const member = memberMap.get(slot.assignedMemberId);
                    return (
                      <div
                        key={slot.id}
                        className="p-4 rounded-[22px] bg-white dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Gold Accent Avatar */}
                          <div className="w-12 h-12 rounded-full bg-[#ECBD56] text-[#111216] font-extrabold text-sm flex items-center justify-center shadow-xs flex-shrink-0">
                            {member?.code || 'M'}
                          </div>
                          <div className="min-w-0">
                            {/* Primary Accent Badge */}
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#FCF7ED] dark:bg-[#272115] text-[#845D08] dark:text-[#FBE6AB] border border-[#ECBD56]/40 inline-block truncate max-w-full">
                              {liveAssignedSlots.length === 2
                                ? `Washer ${slot.slotIndex}`
                                : selectedMeal === 'lunch'
                                ? 'Lunch Duty'
                                : 'Dinner Duty'}
                            </span>
                            <h3 className="text-base font-bold text-[#111216] dark:text-[#F7F6F3] tracking-tight truncate leading-tight mt-0.5">
                              {slot.assignedMemberName}
                            </h3>
                            <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] block truncate">
                              Assigned via Queue &amp; Attendance
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <span className="text-[10px] text-[#848A96] dark:text-[#64748B] block font-medium">Position</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#171F2C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B] inline-block">
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
                <div className="p-4 rounded-[22px] bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Neutral Avatar */}
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                      {nextMember.code}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-[#4E525D] dark:text-[#9BA5B7] uppercase tracking-wide block truncate">
                        Next Washer (Upcoming)
                      </span>
                      <h4 className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3] tracking-tight truncate leading-tight">
                        {nextMember.name}
                      </h4>
                      <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] block truncate">
                        Front of rotation queue for upcoming duty cycle
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <span className="text-[10px] text-[#848A96] dark:text-[#64748B] block font-medium">Rotation</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] inline-block">
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
