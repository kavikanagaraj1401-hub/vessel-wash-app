import React, { useState } from 'react';
import { VesselCleaningAnimation } from './VesselCleaningAnimation';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Check,
  X,
  UserCheck,
  Users,
  ChevronDown,
} from 'lucide-react';

/**
 * Isolated Themed Hero Card for Vessel Washing Duty.
 * Displays the assigned vessel washer with explicit controls to mark
 * whether they washed or not, supporting Self marking or On-Behalf marking.
 */
export function VesselWasherHero({
  slot,
  assignedName,
  assignedMember,
  mealName = 'Dinner',
  slotIndex = 1,
  totalWashers = 1,
  partnerName,
  washStatus = 'pending', // 'pending' | 'present' | 'absent'
  markedBy,
  markedAt,
  allMembers = [],
  onMarkWashed,
  onMarkNotWashed,
  onResetWash,
}) {
  const isWashed = washStatus === 'present';
  const isNotWashed = washStatus === 'absent';
  const isPending = !isWashed && !isNotWashed;

  // Actor selection: 'self' or member name
  const [markingType, setMarkingType] = useState('self'); // 'self' | 'behalf'
  const [behalfActor, setBehalfActor] = useState('');
  const [showBehalfPicker, setShowBehalfPicker] = useState(false);

  // Determine label for who is marking
  const getActorLabel = () => {
    if (markingType === 'self') {
      return `${assignedName} (Self)`;
    }
    return behalfActor ? `${behalfActor} (on behalf)` : `${assignedName} (Self)`;
  };

  const handleConfirmWashed = () => {
    if (onMarkWashed) {
      onMarkWashed(slot, 'present', getActorLabel());
    }
  };

  const handleConfirmNotWashed = () => {
    if (onMarkNotWashed) {
      onMarkNotWashed(slot, 'absent', getActorLabel());
    }
  };

  // Other members for behalf marking (excluding the assigned washer)
  const otherMembers = allMembers.filter(m => m.id !== slot.assignedMemberId);

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1E1E1E] via-[#252528] to-[#141414] text-white border border-white/10 shadow-xl p-4 transition-all">
      {/* Ambient background glow */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
          isWashed ? 'bg-[#A4F5A6]/20' : isNotWashed ? 'bg-rose-500/20' : 'bg-[#A28EF9]/20'
        }`}
      />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#A28EF9]/10 rounded-full blur-2xl pointer-events-none" />

      {/* 1. Header Status Bar */}
      <div className="flex items-center justify-between relative z-10 pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Sparkles className={`w-3.5 h-3.5 ${isWashed ? 'text-[#A4F5A6]' : 'text-[#A28EF9]'}`} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            {mealName}
          </span>
          {totalWashers === 2 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/25 text-[#A28EF9] border border-[#A28EF9]/30">
              Washer {slotIndex} of 2
            </span>
          )}
        </div>

        {/* Live Status Badge */}
        <div>
          {isWashed ? (
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#A4F5A6] text-[#1E1E1E] shadow-2xs">
              <CheckCircle2 className="w-3 h-3 text-[#1E1E1E]" />
              Vessels Washed
            </span>
          ) : isNotWashed ? (
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <XCircle className="w-3 h-3 text-rose-400" />
              Did Not Wash
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#FFD89D]/20 text-[#FFD89D] border border-[#FFD89D]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD89D] animate-pulse" />
              Awaiting Wash Mark
            </span>
          )}
        </div>
      </div>

      {/* 2. Vessel Cleaning Animation Illustration */}
      <div className="py-2 relative z-10">
        <VesselCleaningAnimation isCleaned={isWashed} />
      </div>

      {/* 3. Assigned Washer Card */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-full font-bold text-sm flex items-center justify-center shadow-md flex-shrink-0 transition-all ${
              isWashed
                ? 'bg-[#A4F5A6] text-[#1E1E1E] ring-2 ring-[#A4F5A6]/40'
                : isNotWashed
                ? 'bg-rose-600 text-white'
                : 'bg-[#A28EF9] text-[#1E1E1E]'
            }`}
          >
            {assignedMember?.code || 'M'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[#A28EF9] uppercase tracking-wide block">
                {totalWashers === 2 ? `Washer ${slotIndex}` : 'Assigned Washer'}
              </span>
              {partnerName && (
                <span className="text-[9px] text-slate-400 font-normal">
                  (with {partnerName})
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight truncate leading-tight">
              {assignedName}
            </h3>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <span className="text-[10px] text-slate-400 block font-medium">Selected via</span>
          <span className="text-xs font-bold text-[#A4F5A6]">Queue & Attendance</span>
        </div>
      </div>

      {/* 4. EXPLICIT WASH CONFIRMATION ACTIONS */}
      <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-white/10 relative z-10 space-y-2.5">
        {/* Status line */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#A28EF9]" />
            Duty Status:
          </span>
          {isWashed ? (
            <span className="text-[11px] font-bold text-[#A4F5A6]">Completed ✓</span>
          ) : isNotWashed ? (
            <span className="text-[11px] font-bold text-rose-400">Did Not Wash ✗</span>
          ) : (
            <span className="text-[11px] font-bold text-[#FFD89D]">Pending Mark</span>
          )}
        </div>

        {/* When Pending: Who is marking selector + Action buttons */}
        {isPending && (
          <div className="space-y-2 pt-0.5">
            {/* Who is marking selector */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-[#A28EF9]" />
                  Who is marking?
                </span>
                <span className="text-[10px] font-bold text-[#A28EF9] truncate max-w-[140px]">
                  {getActorLabel()}
                </span>
              </div>

              {/* Toggle Self vs On Behalf */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMarkingType('self');
                    setShowBehalfPicker(false);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-full text-[10px] font-bold transition-all ${
                    markingType === 'self'
                      ? 'bg-white text-[#1E1E1E] shadow-xs'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  Self ({assignedName})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMarkingType('behalf');
                    setShowBehalfPicker(!showBehalfPicker);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-full text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                    markingType === 'behalf'
                      ? 'bg-white text-[#1E1E1E] shadow-xs'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  <span>On Behalf</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* On Behalf Dropdown / Chips */}
              {(showBehalfPicker || (markingType === 'behalf' && !behalfActor)) && (
                <div className="pt-1.5 border-t border-white/10 space-y-1">
                  <span className="text-[9px] text-slate-400 block font-medium">
                    Select who is marking on behalf of {assignedName}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {otherMembers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setBehalfActor(m.name);
                          setMarkingType('behalf');
                          setShowBehalfPicker(false);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                          behalfActor === m.name
                            ? 'bg-[#FFD89D] text-[#1E1E1E] font-bold'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons: Mark as Washed vs Did Not Wash */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleConfirmWashed}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-xs font-bold bg-[#A4F5A6] hover:bg-[#8EF090] text-[#1E1E1E] shadow-md active-scale transition-all"
              >
                <Check className="w-4 h-4 text-[#1E1E1E]" />
                <span>Mark as Washed</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmNotWashed}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 active-scale transition-all"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Did Not Wash</span>
              </button>
            </div>
          </div>
        )}

        {/* When Washed: Show details of who marked it + Change button */}
        {isWashed && (
          <div className="p-2.5 rounded-xl bg-[#A4F5A6]/15 border border-[#A4F5A6]/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-[#A4F5A6] flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#A4F5A6] block truncate">
                  {assignedName} washed vessels
                </span>
                <span className="text-[10px] text-[#A4F5A6]/80 block truncate">
                  Marked by: {markedBy || `${assignedName} (Self)`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onResetWash && onResetWash(slot.id)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Change</span>
            </button>
          </div>
        )}

        {/* When Not Washed: Show details of who marked it + Mark Washed button */}
        {isNotWashed && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-rose-200 block truncate">
                  Marked as Did Not Wash
                </span>
                <span className="text-[10px] text-rose-300/80 block truncate">
                  Marked by: {markedBy || 'System / Colleague'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirmWashed}
              className="flex items-center gap-1 text-[11px] font-bold text-[#1E1E1E] px-3 py-1 rounded-full bg-[#A4F5A6] hover:bg-[#8EF090] transition-colors flex-shrink-0"
            >
              <Check className="w-3 h-3 text-[#1E1E1E]" />
              <span>Mark Washed</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
