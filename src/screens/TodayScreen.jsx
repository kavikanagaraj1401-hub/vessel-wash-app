import React, { useState, useMemo, useCallback } from 'react';
import {
  Sun,
  Moon,
  Check,
  X,
  UtensilsCrossed,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
  RotateCcw,
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

  const nextMember = liveNextWasherId ? memberMap.get(liveNextWasherId) : null;

  // On behalf tracking per slot
  const [behalfMode, setBehalfMode] = useState({});
  const [behalfActor, setBehalfActor] = useState({});

  const handleToggleBehalf = (slotId, enabled) => {
    setBehalfMode(prev => ({ ...prev, [slotId]: enabled }));
  };

  const handleSelectBehalfMember = (slotId, memberName) => {
    setBehalfActor(prev => ({ ...prev, [slotId]: memberName }));
  };

  const handleConfirmWashed = (slot) => {
    if (!onMarkAttendance) return;
    const isBehalf = Boolean(behalfMode[slot.id]);
    const chosenActor = behalfActor[slot.id];
    const actorLabel = isBehalf && chosenActor ? `${chosenActor} (on behalf of ${slot.assignedMemberName})` : `${slot.assignedMemberName} (Self)`;
    const remarks = isBehalf && chosenActor ? `Instead of ${slot.assignedMemberName} -> ${chosenActor} Washed` : 'Washed successfully';
    onMarkAttendance(slot, 'present', remarks, actorLabel);
  };

  const handleConfirmNotWashed = (slot) => {
    if (!onMarkAttendance) return;
    onMarkAttendance(slot, 'absent', 'Marked Did Not Wash', `${slot.assignedMemberName} (Absent)`);
  };

  return (
    <div className="w-full max-w-full pb-28 px-4 pt-3 space-y-4">
      {/* 1. Date Selector Bar for Countless Days / Multi-Year Navigation */}
      <DateSelectorBar
        selectedDateStr={selectedDateStr}
        onSelectDate={onSelectDate}
        todayDateStr={currentDateStr}
        availableDays={availableDays}
      />

      {/* Member Info Banner if not Admin */}
      {!isAdmin && (
        <div className="p-3.5 rounded-[22px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] flex items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-xl bg-[#FCF7ED] dark:bg-[#272115] text-[#ECBD56] flex items-center justify-center shrink-0 border border-[#ECBD56]/30">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-[11px] leading-tight text-[#4E525D] dark:text-[#9BA5B7]">
              <strong className="text-[#111216] dark:text-[#F7F6F3]">Member Access:</strong> You can mark meal availability, washer requirements, and complete washing duty records below.
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
                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border-[#DDD9D0] dark:border-[#2A364B] hover:bg-[#EAE8E2] dark:hover:bg-[#253248]'
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
                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border-[#DDD9D0] dark:border-[#2A364B] hover:bg-[#EAE8E2] dark:hover:bg-[#253248]'
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
                  <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
                    <span>Who ate {selectedMeal}?</span>
                    <span className="text-[11px] font-medium text-[#4E525D] dark:text-[#9BA5B7]">
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 active-scale select-none border cursor-pointer ${
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
        {/* CARD 2: WASHER DISPLAY & DUTY COMPLETION CARDS                            */}
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
                    Assigned duties and completion records
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
                {/* 1. ASSIGNED WASHER CARD(S) WITH INTERACTIVE WASH COMPLETION CONTROLS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] uppercase tracking-wider">
                      {selectedDateStr === currentDateStr ? "Today's Washer" : "Assigned Washer"}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B]">
                      {liveAssignedSlots.length === 2 ? '2 Persons Assigned' : '1 Person Assigned'}
                    </span>
                  </div>

                  <div className={`grid ${liveAssignedSlots.length === 2 ? 'grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4' : 'grid-cols-1 gap-3'}`}>
                    {liveAssignedSlots.map((slot) => {
                      const member = memberMap.get(slot.assignedMemberId);
                      const log = attendanceLogs.find(l =>
                        l.slotId === slot.id ||
                        (l.date === todayConfig?.date && l.meal === selectedMeal && Number(l.slotIndex) === Number(slot.slotIndex))
                      );
                      const isWashed = log?.status === 'present';
                      const isNotWashed = log?.status === 'absent';
                      const isPending = !isWashed && !isNotWashed;
                      const isBehalfActive = Boolean(behalfMode[slot.id]);

                      return (
                        <div
                          key={slot.id}
                          className="p-4 rounded-[22px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] flex flex-col justify-between shadow-2xs space-y-3"
                        >
                          {/* Member info row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-12 h-12 rounded-full font-extrabold text-sm flex items-center justify-center shadow-xs flex-shrink-0 ${
                                isWashed
                                  ? 'bg-[#22AC77] text-white ring-2 ring-[#22AC77]/40'
                                  : isNotWashed
                                  ? 'bg-[#D9483B] text-white ring-2 ring-[#D9483B]/40'
                                  : 'bg-[#ECBD56] text-[#111216]'
                              }`}>
                                {member?.code || 'M'}
                              </div>
                              <div className="min-w-0">
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
                                  Assigned via Queue
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

                          {/* Duty Status & Action Area */}
                          {isWashed ? (
                            <div className="p-2.5 rounded-xl bg-[#EAF8F1] dark:bg-[#0E2E1D] border border-[#97E2C0] dark:border-[#166534] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 className="w-4 h-4 text-[#22AC77] dark:text-[#4ADE80] shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-[#22AC77] dark:text-[#4ADE80] block truncate">
                                    Vessels Washed ✓
                                  </span>
                                  <span className="text-[10px] text-[#22AC77]/90 dark:text-[#4ADE80]/90 block truncate">
                                    {log?.remarks || `Marked by ${log?.markedBy || slot.assignedMemberName}`}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onResetAttendanceForSlot && onResetAttendanceForSlot(slot.id)}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white dark:bg-[#171F2C] text-[#4E525D] dark:text-[#9BA5B7] hover:text-[#111216] dark:hover:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] transition-colors cursor-pointer active-scale flex items-center gap-1 shrink-0"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Change</span>
                              </button>
                            </div>
                          ) : isNotWashed ? (
                            <div className="p-2.5 rounded-xl bg-[#FDF1F0] dark:bg-[#331310] border border-[#F5A9A2] dark:border-[#991B1B] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <XCircle className="w-4 h-4 text-[#D9483B] dark:text-[#FF5A4E] shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-[#D9483B] dark:text-[#FF5A4E] block truncate">
                                    Did Not Wash ✗
                                  </span>
                                  <span className="text-[10px] text-[#D9483B]/80 dark:text-[#FF5A4E]/80 block truncate">
                                    Marked by {log?.markedBy || 'Colleague / Admin'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleConfirmWashed(slot)}
                                className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#22AC77] dark:bg-[#4ADE80] text-[#111216] hover:opacity-95 shadow-2xs transition-all cursor-pointer active-scale shrink-0"
                              >
                                Mark Washed
                              </button>
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-[#DDD9D0]/50 dark:border-[#2A364B]/50 space-y-2">
                              {/* Who washed selector */}
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#848A96] dark:text-[#64748B]">
                                  Mark Wash:
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBehalf(slot.id, false)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                      !isBehalfActive
                                        ? 'bg-[#ECBD56] text-[#111216] shadow-2xs'
                                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7]'
                                    }`}
                                  >
                                    Self
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBehalf(slot.id, true)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                      isBehalfActive
                                        ? 'bg-[#ECBD56] text-[#111216] shadow-2xs'
                                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7]'
                                    }`}
                                  >
                                    On Behalf
                                  </button>
                                </div>
                              </div>

                              {/* On Behalf member picker */}
                              {isBehalfActive && (
                                <div className="p-2 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] space-y-1">
                                  <span className="text-[10px] text-[#4E525D] dark:text-[#9BA5B7] block font-medium">
                                    Select who washed for {slot.assignedMemberName}:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {activeMembers.filter(m => m.id !== slot.assignedMemberId).map(m => (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => handleSelectBehalfMember(slot.id, m.name)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                                          behalfActor[slot.id] === m.name
                                            ? 'bg-[#ECBD56] text-[#111216] font-bold'
                                            : 'bg-white dark:bg-[#171F2C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B]'
                                        }`}
                                      >
                                        {m.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmWashed(slot)}
                                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold bg-[#22AC77] dark:bg-[#4ADE80] text-[#111216] hover:opacity-95 shadow-2xs active-scale transition-all cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  <span>Mark Washed</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleConfirmNotWashed(slot)}
                                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold bg-[#FDF1F0] dark:bg-[#331310] hover:bg-[#FCE8E6] text-[#D9483B] dark:text-[#FF5A4E] border border-[#F5A9A2] dark:border-[#991B1B] active-scale transition-all cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Did Not Wash</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. NEXT WASHER: Distinct Secondary Theme */}
                {nextMember && (
                  <div className="p-4 rounded-[22px] bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
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
                          Front of rotation queue for upcoming cycle
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
