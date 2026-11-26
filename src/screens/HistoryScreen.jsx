import React, { useState, useMemo } from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
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
  ShieldCheck,
  Trash2,
  RotateCcw,
  Eye,
  Lock,
} from 'lucide-react';
import { getTodayDateStr } from '../logic/dateUtils';

function HistoryScreenContent({
  attendanceLogs = [],
  members = [],
  daysConfig = [],
  computedDays = [],
  selectedDateStr,
  onSelectDate,
  onTabChange,
  todayDateStr = getTodayDateStr(),
  isAdmin = false,
  currentMember = null,
  onDeleteWashLog = null,
  onResetAttendanceForSlot = null,
}) {
  // Default to 'logs' (Timeline Logs) as requested
  const [activeSubTab, setActiveSubTab] = useState('logs'); // 'logs' | 'report'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'lunch' | 'dinner' | 'unmarked'
  const [copied, setCopied] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState(
    () => new Set((members || []).map(m => m?.id).filter(Boolean))
  );
  const [deleteConfirmLog, setDeleteConfirmLog] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Map for quick member lookups with null-safe handling
  const memberMap = useMemo(
    () => new Map((members || []).filter(Boolean).map(m => [m.id, m])),
    [members]
  );

  // Valid Attendance Logs: verified completed washes recorded up to the current date
  const validAttendanceLogs = useMemo(() => {
    const safeAttendanceLogs = Array.isArray(attendanceLogs) ? attendanceLogs : [];
    const targetTodayStr = todayDateStr || getTodayDateStr();

    return safeAttendanceLogs.filter(log => {
      if (!log || log.status !== 'present' || !log.date) return false;
      // Skip paused date Nov 24, 2026
      if (log.date === '2026-11-24') return false;
      // Must be on or before current date
      return log.date <= targetTodayStr;
    });
  }, [attendanceLogs, todayDateStr]);

  // Overall totals (from validated records only)
  const totalWashes = validAttendanceLogs.length;
  const totalLunchWashes = validAttendanceLogs.filter(l => l?.meal === 'lunch').length;
  const totalDinnerWashes = validAttendanceLogs.filter(l => l?.meal === 'dinner').length;

  // Compile detailed report per member for the 'report' tab
  const memberReports = useMemo(() => {
    const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
    return safeMembers.map(member => {
      if (!member || !member.id) return null;
      const memberLogs = (validAttendanceLogs || [])
        .filter(l => l && l.memberId === member.id)
        .sort((a, b) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime());

      const lunchCount = memberLogs.filter(l => l?.meal === 'lunch').length;
      const dinnerCount = memberLogs.filter(l => l?.meal === 'dinner').length;
      const totalCount = memberLogs.length;
      const uniqueDates = Array.from(new Set(memberLogs.map(l => l?.date).filter(Boolean)));

      return {
        member,
        totalCount,
        lunchCount,
        dinnerCount,
        uniqueDaysCount: uniqueDates.length,
        logs: memberLogs,
      };
    }).filter(Boolean).sort((a, b) => (b?.totalCount || 0) - (a?.totalCount || 0));
  }, [members, validAttendanceLogs]);

  // Build unified date-by-date timeline logs (excluding future dates, ensuring continuous coverage up to today)
  const timelineDates = useMemo(() => {
    const safeDaysConfig = Array.isArray(daysConfig) ? daysConfig : [];
    const safeComputedDays = Array.isArray(computedDays) ? computedDays : [];
    const computedMap = new Map(safeComputedDays.filter(Boolean).map(d => [d.date, d]));
    const daysMap = new Map(safeDaysConfig.filter(Boolean).map(d => [d.date, d]));
    const targetTodayStr = todayDateStr || getTodayDateStr();
    const startDateStr = '2026-09-01';

    // 1. Collect all dates continuously from startDateStr up to targetTodayStr
    const allDatesSet = new Set();

    let curr = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${targetTodayStr}T00:00:00`);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      allDatesSet.add(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }

    // Also include any dates in daysConfig or attendanceLogs up to targetTodayStr
    safeDaysConfig.forEach(d => {
      if (d && d.date && d.date <= targetTodayStr && d.date >= startDateStr) {
        allDatesSet.add(d.date);
      }
    });
    (attendanceLogs || []).forEach(l => {
      if (l && l.date && l.date <= targetTodayStr && l.date >= startDateStr) {
        allDatesSet.add(l.date);
      }
    });

    const dates = Array.from(allDatesSet).map(dateKey => {
      const day = daysMap.get(dateKey) || {
        date: dateKey,
        dayNumber: parseInt(dateKey.split('-')[2], 10),
        lunchProvided: false,
        dinnerProvided: false,
        lunchEaters: [],
        dinnerEaters: [],
      };
      const compDay = computedMap.get(dateKey) || day;
      const isToday = (dateKey === targetTodayStr);

      const lunchEatersList = Array.isArray(day.lunchEaters) ? day.lunchEaters : [];
      const dinnerEatersList = Array.isArray(day.dinnerEaters) ? day.dinnerEaters : [];

      // Safe attendance logs for this date
      const safeLogs = Array.isArray(attendanceLogs) ? attendanceLogs : [];
      const verifiedLunchLogs = safeLogs.filter(
        l => l && l.date === dateKey && l.meal === 'lunch' && l.status === 'present'
      );
      const verifiedDinnerLogs = safeLogs.filter(
        l => l && l.date === dateKey && l.meal === 'dinner' && l.status === 'present'
      );

      // Extract present members (eaters who ate)
      const lunchPresentMembers = lunchEatersList
        .map(id => memberMap.get(id))
        .filter(Boolean);

      const dinnerPresentMembers = dinnerEatersList
        .map(id => memberMap.get(id))
        .filter(Boolean);

      // Meal Availability / Confirmation:
      // Food is confirmed if verified wash log exists, or if lunchProvided is set with eaters
      const isLunchFoodConfirmed = Boolean(
        verifiedLunchLogs.length > 0 || (day.lunchProvided && lunchEatersList.length > 0)
      );
      const isDinnerFoodConfirmed = Boolean(
        verifiedDinnerLogs.length > 0 || (day.dinnerProvided && dinnerEatersList.length > 0)
      );

      // Lunch Washers & Verified Status
      let lunchWashers = [];
      let isLunchVerified = false;
      let isLunchAvail = false;

      if (verifiedLunchLogs.length > 0) {
        isLunchVerified = true;
        isLunchAvail = true;
        lunchWashers = verifiedLunchLogs.map(l => ({
          id: l?.memberId,
          logId: l?.id || l?.slotId,
          slotId: l?.slotId || l?.id,
          name: l?.memberName || memberMap.get(l?.memberId)?.name || 'Washer',
          slotIndex: l?.slotIndex || 1,
          code: memberMap.get(l?.memberId)?.code || '',
          verified: true,
          markedBy: l?.markedBy,
          markedAt: l?.markedAt,
        }));
      } else if (isLunchFoodConfirmed) {
        isLunchAvail = true;
        if (!isToday) {
          const lunchSlots = Array.isArray(compDay?.slots) ? compDay.slots.filter(s => s && s.meal === 'lunch') : [];
          const assigned = lunchSlots.filter(s => s && s.assignedMemberId && s.assignedMemberName && s.assignedMemberName !== '-');
          if (assigned.length > 0) {
            isLunchVerified = true;
            lunchWashers = assigned.map(s => ({
              id: s.assignedMemberId,
              logId: s.id,
              slotId: s.id,
              name: s.assignedMemberName,
              slotIndex: s.slotIndex || 1,
              code: memberMap.get(s.assignedMemberId)?.code || '',
              verified: true,
            }));
          }
        } else {
          // Today: scheduled washer if assigned in slots
          const lunchSlots = Array.isArray(compDay?.slots) ? compDay.slots.filter(s => s && s.meal === 'lunch') : [];
          const assigned = lunchSlots.filter(s => s && s.assignedMemberId && s.assignedMemberName && s.assignedMemberName !== '-');
          if (assigned.length > 0) {
            lunchWashers = assigned.map(s => ({
              id: s.assignedMemberId,
              logId: s.id,
              slotId: s.id,
              name: s.assignedMemberName,
              slotIndex: s.slotIndex || 1,
              code: memberMap.get(s.assignedMemberId)?.code || '',
              verified: false,
            }));
          }
        }
      }

      // Dinner Washers & Verified Status
      let dinnerWashers = [];
      let isDinnerVerified = false;
      let isDinnerAvail = false;

      if (verifiedDinnerLogs.length > 0) {
        isDinnerVerified = true;
        isDinnerAvail = true;
        dinnerWashers = verifiedDinnerLogs.map(l => ({
          id: l?.memberId,
          logId: l?.id || l?.slotId,
          slotId: l?.slotId || l?.id,
          name: l?.memberName || memberMap.get(l?.memberId)?.name || 'Washer',
          slotIndex: l?.slotIndex || 1,
          code: memberMap.get(l?.memberId)?.code || '',
          verified: true,
          markedBy: l?.markedBy,
          markedAt: l?.markedAt,
        }));
      } else if (isDinnerFoodConfirmed) {
        isDinnerAvail = true;
        if (!isToday) {
          const dinnerSlots = Array.isArray(compDay?.slots) ? compDay.slots.filter(s => s && s.meal === 'dinner') : [];
          const dinnerSlot = dinnerSlots.find(s => s && s.assignedMemberId && s.assignedMemberName && s.assignedMemberName !== '-');
          if (dinnerSlot) {
            isDinnerVerified = true;
            dinnerWashers = [{
              id: dinnerSlot.assignedMemberId,
              logId: dinnerSlot.id,
              slotId: dinnerSlot.id,
              name: dinnerSlot.assignedMemberName,
              slotIndex: dinnerSlot.slotIndex || 1,
              code: memberMap.get(dinnerSlot.assignedMemberId)?.code || '',
              verified: true,
            }];
          }
        } else {
          // Today: scheduled dinner washer if assigned
          const dinnerSlots = Array.isArray(compDay?.slots) ? compDay.slots.filter(s => s && s.meal === 'dinner') : [];
          const dinnerSlot = dinnerSlots.find(s => s && s.assignedMemberId && s.assignedMemberName && s.assignedMemberName !== '-');
          if (dinnerSlot) {
            dinnerWashers = [{
              id: dinnerSlot.assignedMemberId,
              logId: dinnerSlot.id,
              slotId: dinnerSlot.id,
              name: dinnerSlot.assignedMemberName,
              slotIndex: dinnerSlot.slotIndex || 1,
              code: memberMap.get(dinnerSlot.assignedMemberId)?.code || '',
              verified: false,
            }];
          }
        }
      }

      // Ensure Nov 24, 2026 is NOT assigned to anyone (pause / skipped day)
      if (dateKey === '2026-11-24') {
        lunchWashers = [];
        dinnerWashers = [];
        isLunchVerified = false;
        isDinnerVerified = false;
        isLunchAvail = false;
        isDinnerAvail = false;
      }

      const hasAnyConfirmedMeal = isLunchAvail || isDinnerAvail || isLunchVerified || isDinnerVerified;
      const hasAnyMeal = hasAnyConfirmedMeal || isToday;
      const isPending = !hasAnyConfirmedMeal || (isLunchAvail && !isLunchVerified) || (isDinnerAvail && !isDinnerVerified);

      // Safe date components parsing
      const dateParts = String(dateKey || '').split('-');
      const dayNum = dateParts[2] || '01';
      let weekdayName = '';
      let fullDateStr = dateKey;
      try {
        const dateObj = new Date(`${dateKey}T00:00:00`);
        if (!isNaN(dateObj.getTime())) {
          weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          fullDateStr = dateObj.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      } catch {
        // graceful fallback
      }

      return {
        date: dateKey,
        dayNum,
        weekdayName: weekdayName || 'Day',
        fullDateStr: fullDateStr || dateKey,
        hasAnyMeal,
        hasAnyConfirmedMeal,
        isLunchAvail,
        isDinnerAvail,
        isLunchFoodConfirmed,
        isDinnerFoodConfirmed,
        lunchPresentMembers,
        dinnerPresentMembers,
        lunchWashers,
        dinnerWashers,
        isLunchVerified,
        isDinnerVerified,
        isPending,
        isToday,
      };
    }).filter(Boolean);

    // 2. Refined Filter Options & Logic:
    let filtered = dates;
    if (dateFilter === 'lunch') {
      filtered = dates.filter(d => d?.isLunchAvail || d?.isLunchVerified || d?.isToday);
    } else if (dateFilter === 'dinner') {
      filtered = dates.filter(d => d?.isDinnerAvail || d?.isDinnerVerified || d?.isToday);
    } else if (dateFilter === 'unmarked') {
      filtered = dates.filter(d => d?.isPending);
    }

    // 3. Sort: Strictly descending order starting from today down into the past
    return filtered.sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')));
  }, [daysConfig, computedDays, attendanceLogs, memberMap, dateFilter, todayDateStr]);

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

    (timelineDates || []).forEach(d => {
      if (!d) return;
      if (!d.hasAnyMeal) {
        reportText += `*${d.date} (${d.weekdayName})*: No Data (Meals not available)\n\n`;
        return;
      }

      reportText += `*${d.date} (${d.weekdayName})*:\n`;
      if (d.isLunchAvail) {
        const washers = (d.lunchWashers || []).map(w => w?.name || '').filter(Boolean).join(', ') || 'None';
        const eaters = (d.lunchPresentMembers || []).map(m => m?.name || '').filter(Boolean).join(', ') || 'None';
        reportText += `  • Lunch Washer: ${washers}\n`;
        reportText += `    Present: ${eaters}\n`;
      } else {
        reportText += `  • Lunch: Not Available\n`;
      }

      if (d.isDinnerAvail) {
        const washers = (d.dinnerWashers || []).map(w => w?.name || '').filter(Boolean).join(', ') || 'None';
        const eaters = (d.dinnerPresentMembers || []).map(m => m?.name || '').filter(Boolean).join(', ') || 'None';
        reportText += `  • Dinner Washer: ${washers}\n`;
        reportText += `    Present: ${eaters}\n`;
      } else {
        reportText += `  • Dinner: Not Available\n`;
      }
      reportText += `\n`;
    });

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(reportText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(err => {
        console.warn('Clipboard write failed:', err);
      });
    }
  };

  return (
    <div className="space-y-3.5 pb-6 sm:pb-8 px-4 pt-3 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ECBD56]">
              Activity &amp; Audit History
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs ${
              isAdmin
                ? 'admin-gradient text-white border-[#F59E0B]/50'
                : 'bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 text-[#22AC77] dark:text-[#4ADE80] border-[#22AC77]/30 dark:border-[#4ADE80]/30'
            }`}>
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin Access</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>All Members (Read-Only)</span>
                </>
              )}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#111216] dark:text-[#F7F6F3] mt-0.5">
            Timeline Logs
          </h2>
          <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">
            {isAdmin
              ? 'Complete audit record of vessel washers and attendance with admin manage capabilities'
              : 'Complete live history of vessel washers and attendance accessible to all team members'}
          </p>
        </div>

        {/* Copy Report Button */}
        <button
          type="button"
          onClick={handleCopyReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] shadow-2xs active-scale hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C] transition-all cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#22AC77] dark:text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5 text-[#848A96] dark:text-[#64748B]" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Top Segmented Sub-Tab Switcher (Grayscale styling for non-meal navigation) */}
      <div className="flex p-1 bg-[#F2F1ED] dark:bg-[#121620] rounded-xl border border-[#DDD9D0] dark:border-[#263042] gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('logs')}
          className={`flex-1 basis-0 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-lg transition-all select-none cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-[#18181B] text-[#F4F4F5] dark:bg-[#F4F4F5] dark:text-[#18181B] shadow-xs font-bold'
              : 'text-[#71717A] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5] font-semibold'
          }`}
        >
          <History className={`w-3.5 h-3.5 flex-shrink-0 ${activeSubTab === 'logs' ? 'text-inherit' : 'text-[#848A96] dark:text-[#64748B]'}`} />
          <span className="truncate">Timeline Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('report')}
          className={`flex-1 basis-0 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-lg transition-all select-none cursor-pointer ${
            activeSubTab === 'report'
              ? 'bg-[#18181B] text-[#F4F4F5] dark:bg-[#F4F4F5] dark:text-[#18181B] shadow-xs font-bold'
              : 'text-[#71717A] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5] font-semibold'
          }`}
        >
          <BarChart3 className={`w-3.5 h-3.5 flex-shrink-0 ${activeSubTab === 'report' ? 'text-inherit' : 'text-[#848A96] dark:text-[#64748B]'}`} />
          <span className="truncate">Member Summary</span>
        </button>
      </div>

      {/* 1. TIMELINE LOGS (DATE BY DATE) VIEW */}
      {activeSubTab === 'logs' && (
        <div className="space-y-3">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#848A96] dark:text-[#64748B] block truncate">Total Washes</span>
              <span className="text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalWashes}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-[#F59E0B]/40 dark:border-[#F59E0B]/30 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#D97706] dark:text-[#FBBF24] block truncate">Lunch</span>
              <span className="text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalLunchWashes}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-indigo-400/40 dark:border-indigo-500/30 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-[#C7D2FE] block truncate">Dinner</span>
              <span className="text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalDinnerWashes}</span>
            </div>
          </div>

          {/* Filter Tabs: Lunch afternoon theme, Dinner night theme, other tabs in clean grayscale */}
          <div className="flex p-1 bg-[#F2F1ED] dark:bg-[#121620] rounded-xl border border-[#DDD9D0] dark:border-[#263042] gap-1">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'lunch', label: 'Lunch' },
              { id: 'dinner', label: 'Dinner' },
              { id: 'unmarked', label: 'Unmarked' },
            ].map(f => {
              const isSelected = dateFilter === f.id;
              let selectedStyle = 'bg-[#18181B] text-[#F4F4F5] dark:bg-[#F4F4F5] dark:text-[#18181B] shadow-xs';
              if (f.id === 'lunch') {
                selectedStyle = 'bg-gradient-to-r from-[#FF7A00] via-[#FF9E1B] to-[#FFB703] text-[#18181B] shadow-xs font-extrabold';
              } else if (f.id === 'dinner') {
                selectedStyle = 'bg-gradient-to-r from-[#1E1B4B] via-[#2E2768] to-[#4338CA] text-white shadow-xs font-extrabold';
              }

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDateFilter(f.id)}
                  className={`flex-1 basis-0 min-w-0 py-2 px-1 text-xs font-bold rounded-lg transition-all select-none truncate cursor-pointer text-center ${
                    isSelected
                      ? selectedStyle
                      : 'text-[#71717A] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5] font-semibold'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* List of Dates */}
          {(!timelineDates || timelineDates.length === 0) ? (
            <EmptyState
              icon={History}
              title="No wash history recorded yet"
              description={
                dateFilter === 'unmarked'
                  ? 'All historical records up to today have verified attendance.'
                  : dateFilter === 'lunch'
                  ? 'No historical lunch records found up to today.'
                  : dateFilter === 'dinner'
                  ? 'No historical dinner records found up to today.'
                  : 'No wash history recorded yet up to today.'
              }
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
                  isLunchVerified,
                  isDinnerVerified,
                  isPending,
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
                      className="bg-white/60 dark:bg-[#171F2C]/60 border border-[#DDD9D0] dark:border-[#2A364B] transition-all hover:border-[#EA580C]/50 rounded-2xl"
                    >
                      <div className="flex items-center justify-between">
                        {/* Date Left Badge */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#848A96] dark:text-[#64748B] flex flex-col items-center justify-center font-bold">
                            <span className="text-[9px] uppercase leading-none font-semibold text-[#848A96] dark:text-[#64748B]">
                              {weekdayName}
                            </span>
                            <span className="text-sm leading-none font-bold text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">
                              {dayNum}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#4E525D] dark:text-[#9BA5B7]">
                                {fullDateStr}
                              </span>
                              {isToday && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#EA580C]/15 text-[#EA580C] dark:text-[#F59E0B] border border-[#EA580C]/30">
                                  Today
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#848A96] dark:text-[#64748B] flex items-center gap-1 mt-0.5">
                              <UtensilsCrossed className="w-3 h-3 text-[#848A96] dark:text-[#64748B]" />
                              {isToday ? 'Today • Food availability pending confirmation' : 'Lunch & Dinner Not Available'}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#EA580C]/10 dark:bg-[#F59E0B]/15 text-[#EA580C] dark:text-[#F59E0B] border border-[#EA580C]/30 dark:border-[#F59E0B]/40">
                            {isToday ? 'Pending / Food Not Marked' : 'Food Not Marked'}
                          </span>
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
                    className={`overflow-hidden border rounded-2xl transition-all shadow-2xs bg-white dark:bg-[#171F2C] ${
                      isToday
                        ? 'border-[#EA580C] dark:border-[#F59E0B] ring-1 ring-[#EA580C]/40'
                        : 'border-[#DDD9D0] dark:border-[#2A364B] hover:border-[#EA580C]/40'
                    }`}
                  >
                    {/* Date Card Header */}
                    <div className="p-3.5 bg-white dark:bg-[#171F2C] border-b border-[#DDD9D0]/70 dark:border-[#2A364B]/70 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#FCF7ED] dark:bg-[#272115] text-[#845D08] dark:text-[#ECBD56] border border-[#ECBD56]/40 flex flex-col items-center justify-center font-bold shadow-2xs">
                          <span className="text-[9px] uppercase leading-none font-semibold">
                            {weekdayName}
                          </span>
                          <span className="text-sm leading-none font-bold mt-0.5">
                            {dayNum}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                              {fullDateStr}
                            </h4>
                            {isToday && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#EA580C]/15 text-[#EA580C] dark:text-[#F59E0B] border border-[#EA580C]/30">
                                Today
                              </span>
                            )}
                            {isPending ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#EA580C]/10 dark:bg-[#F59E0B]/15 text-[#EA580C] dark:text-[#F59E0B] border border-[#EA580C]/30 dark:border-[#F59E0B]/40">
                                {isToday ? (hasAnyConfirmedMeal ? 'Pending (Wash In Progress)' : 'Pending / Food Not Marked') : 'Unmarked'}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 text-[#22AC77] dark:text-[#4ADE80] border border-[#22AC77]/30 dark:border-[#4ADE80]/40">
                                Completed ✓
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#848A96] dark:text-[#64748B]">
                            {isLunchAvail && isDinnerAvail
                              ? 'Lunch & Dinner held'
                              : isLunchAvail
                              ? 'Lunch only'
                              : isDinnerAvail
                              ? 'Dinner only'
                              : isToday
                              ? 'Food availability pending confirmation'
                              : 'No meals held'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meal Details Sections */}
                    <div className="p-3.5 space-y-3 bg-[#F2F1ED]/40 dark:bg-[#0B0C0E]/40">
                      {/* 1. LUNCH SECTION */}
                      {isLunchAvail ? (
                        <div className="p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#1A160F] border border-[#F59E0B]/40 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 rounded-lg bg-[#FF7A00]/15 border border-[#F59E0B]/40 text-[#D97706] dark:text-[#FBBF24]">
                                <Sun className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                                Lunch
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24] border border-amber-500/30">
                              Available ({(lunchWashers || []).length} {(lunchWashers || []).length === 1 ? 'Washer' : 'Washers'})
                            </span>
                          </div>

                          {/* Washer Row */}
                          <div className={`p-2 rounded-xl border flex items-center justify-between ${
                            isLunchVerified
                              ? 'bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 border-[#22AC77]/30 dark:border-[#4ADE80]/40'
                              : 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30'
                          }`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                isLunchVerified ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]' : 'bg-amber-500/20 text-[#D97706] dark:text-[#FBBF24]'
                              }`}>
                                🧼
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#111216] dark:text-[#F7F6F3] block leading-none">
                                  Washed Vessels:
                                </span>
                                <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] mt-0.5 block">
                                  {lunchWashers && lunchWashers.length > 0 && isLunchVerified
                                    ? lunchWashers.map(w => `${w?.name || 'Washer'}${w?.markedBy ? ` (${w.markedBy})` : ''}`).join(' & ')
                                    : isToday
                                    ? (isLunchFoodConfirmed ? 'Pending (Wash in progress today)' : 'Pending / Food Not Marked')
                                    : 'None recorded'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                isLunchVerified
                                  ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]'
                                  : 'bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24] border border-amber-500/30'
                              }`}>
                                {isLunchVerified ? 'Washed ✓' : (isToday ? (isLunchFoodConfirmed ? 'Pending' : 'Food Not Marked') : 'Unmarked')}
                              </span>

                              {/* Administrative Action (Admin Only): Delete / Reset Wash Record */}
                              {isAdmin && isLunchVerified && onDeleteWashLog && lunchWashers && lunchWashers.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmLog({
                                      logId: lunchWashers[0]?.logId || lunchWashers[0]?.slotId,
                                      washerName: (lunchWashers || []).map(w => w?.name || '').filter(Boolean).join(' & '),
                                      date,
                                      meal: 'lunch',
                                    });
                                  }}
                                  title="Admin: Delete / Reset wash record"
                                  className="p-1 rounded-lg text-[#D9483B] dark:text-[#FF5A4E] hover:bg-[#D9483B]/10 dark:hover:bg-[#FF5A4E]/15 transition-colors cursor-pointer"
                                  aria-label="Delete wash record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Present Members / Eaters */}
                          <div>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#848A96] dark:text-[#64748B] mb-1.5">
                              <Users className="w-3 h-3" />
                              <span>Present Members / Ate ({(lunchPresentMembers || []).length}):</span>
                            </div>

                            {(!lunchPresentMembers || lunchPresentMembers.length === 0) ? (
                              <p className="text-xs text-[#848A96] dark:text-[#64748B] italic">
                                No members marked present.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {(lunchPresentMembers || []).map(member => {
                                  if (!member) return null;
                                  const isWasher = (lunchWashers || []).some(w => w?.id === member.id);
                                  return (
                                    <span
                                      key={member.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
                                        isWasher
                                          ? 'bg-gradient-to-r from-[#FF7A00] via-[#FF9E1B] to-[#FFB703] text-[#18181B] border border-[#F59E0B]/50 font-extrabold shadow-2xs'
                                          : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B]'
                                      }`}
                                    >
                                      <span>{member.name}</span>
                                      {isWasher && (
                                        <span className="text-[9px] font-bold px-1 rounded-md bg-[#18181B]/15 text-[#18181B] ml-0.5">
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
                        <div className="p-2.5 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-between text-xs text-[#848A96] dark:text-[#64748B]">
                          <div className="flex items-center gap-1.5">
                            <Sun className="w-3.5 h-3.5 text-[#848A96] dark:text-[#64748B]" />
                            <span>Lunch: {isToday ? 'Pending / Food Not Marked' : 'Not Available'}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-[#EA580C] dark:text-[#F59E0B]">
                            {isToday ? 'Pending / Food Not Marked' : 'Skipped'}
                          </span>
                        </div>
                      )}

                      {/* 2. DINNER SECTION */}
                      {isDinnerAvail ? (
                        <div className="p-3 rounded-xl bg-[#FAFAFE] dark:bg-[#141226] border border-indigo-400/40 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 rounded-lg bg-indigo-500/15 border border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
                                <Moon className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                                Dinner
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-[#C7D2FE] border border-indigo-400/30">
                              Available ({(dinnerWashers || []).length} {(dinnerWashers || []).length === 1 ? 'Washer' : 'Washers'})
                            </span>
                          </div>

                          {/* Washer Row */}
                          <div className={`p-2 rounded-xl border flex items-center justify-between ${
                            isDinnerVerified
                              ? 'bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 border-[#22AC77]/30 dark:border-[#4ADE80]/40'
                              : 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-400/30'
                          }`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                isDinnerVerified ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]' : 'bg-indigo-500/20 text-indigo-600 dark:text-[#C7D2FE]'
                              }`}>
                                🧼
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#111216] dark:text-[#F7F6F3] block leading-none">
                                  Washed Vessels:
                                </span>
                                <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] mt-0.5 block">
                                  {dinnerWashers && dinnerWashers.length > 0 && isDinnerVerified
                                    ? dinnerWashers.map(w => `${w?.name || 'Washer'}${w?.markedBy ? ` (${w.markedBy})` : ''}`).join(', ')
                                    : isToday
                                    ? (isDinnerFoodConfirmed ? 'Pending (Wash in progress today)' : 'Pending / Food Not Marked')
                                    : 'None recorded'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                isDinnerVerified
                                  ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]'
                                  : 'bg-indigo-500/15 text-indigo-700 dark:text-[#C7D2FE] border border-indigo-400/30'
                              }`}>
                                {isDinnerVerified ? 'Washed ✓' : (isToday ? (isDinnerFoodConfirmed ? 'Pending' : 'Food Not Marked') : 'Unmarked')}
                              </span>

                              {/* Administrative Action (Admin Only): Delete / Reset Wash Record */}
                              {isAdmin && isDinnerVerified && onDeleteWashLog && dinnerWashers && dinnerWashers.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmLog({
                                      logId: dinnerWashers[0]?.logId || dinnerWashers[0]?.slotId,
                                      washerName: (dinnerWashers || []).map(w => w?.name || '').filter(Boolean).join(', '),
                                      date,
                                      meal: 'dinner',
                                    });
                                  }}
                                  title="Admin: Delete / Reset wash record"
                                  className="p-1 rounded-lg text-[#D9483B] dark:text-[#FF5A4E] hover:bg-[#D9483B]/10 dark:hover:bg-[#FF5A4E]/15 transition-colors cursor-pointer"
                                  aria-label="Delete wash record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Present Members / Eaters */}
                          <div>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#848A96] dark:text-[#64748B] mb-1.5">
                              <Users className="w-3 h-3" />
                              <span>Present Members / Ate ({(dinnerPresentMembers || []).length}):</span>
                            </div>

                            {(!dinnerPresentMembers || dinnerPresentMembers.length === 0) ? (
                              <p className="text-xs text-[#848A96] dark:text-[#64748B] italic">
                                No members marked present.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {(dinnerPresentMembers || []).map(member => {
                                  if (!member) return null;
                                  const isWasher = (dinnerWashers || []).some(w => w?.id === member.id);
                                  return (
                                    <span
                                      key={member.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
                                        isWasher
                                          ? 'bg-gradient-to-r from-[#1E1B4B] via-[#2E2768] to-[#4338CA] text-white border border-indigo-400/40 font-extrabold shadow-2xs'
                                          : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B]'
                                      }`}
                                    >
                                      <span>{member.name}</span>
                                      {isWasher && (
                                        <span className="text-[9px] font-bold px-1 rounded-md bg-white/20 text-[#FDE68A] ml-0.5">
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
                        <div className="p-2.5 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-between text-xs text-[#848A96] dark:text-[#64748B]">
                          <div className="flex items-center gap-1.5">
                            <Moon className="w-3.5 h-3.5 text-[#848A96] dark:text-[#64748B]" />
                            <span>Dinner: {isToday ? 'Pending / Food Not Marked' : 'Not Available'}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {isToday ? 'Pending / Food Not Marked' : 'Skipped'}
                          </span>
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
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#848A96] dark:text-[#64748B] block truncate">Total Washes</span>
              <span className="text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalWashes}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-[#F59E0B]/40 dark:border-[#F59E0B]/30 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#D97706] dark:text-[#FBBF24] block truncate">Lunch</span>
              <span className="text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalLunchWashes}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-indigo-400/40 dark:border-indigo-500/30 text-center shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-[#C7D2FE] block truncate">Dinner</span>
              <span className="text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalDinnerWashes}</span>
            </div>
          </div>

          {/* Member Breakdown Cards */}
          <div className="space-y-2.5">
            {(!memberReports || memberReports.length === 0) ? (
              <EmptyState
                icon={Users}
                title="No member summary data"
                description="No wash attendance records recorded for members yet."
              />
            ) : (
              memberReports.map(({ member, totalCount, lunchCount, dinnerCount, logs }) => {
                if (!member) return null;
                const isExpanded = expandedMembers.has(member.id);

                return (
                  <Card key={member.id} padding="none" className="overflow-hidden rounded-2xl bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs">
                    {/* Member Summary Header Row */}
                    <div
                      onClick={() => toggleMemberExpand(member.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#F2F1ED]/50 dark:hover:bg-[#1F2A3C]/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#FCF7ED] dark:bg-[#272115] text-[#845D08] dark:text-[#ECBD56] border border-[#ECBD56]/40 flex items-center justify-center font-bold text-xs shadow-2xs">
                          {member.code || 'M'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3] leading-tight">
                            {member.name || 'Member'}
                          </h4>
                          <span className="text-[11px] text-[#848A96] dark:text-[#64748B]">
                            {lunchCount || 0} Lunch &middot; {dinnerCount || 0} Dinner
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3] block leading-none">
                            {totalCount || 0} {(totalCount || 0) === 1 ? 'day' : 'days'}
                          </span>
                          <span className="text-[10px] text-[#848A96] dark:text-[#64748B]">washed</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#848A96] dark:text-[#64748B]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#848A96] dark:text-[#64748B]" />
                        )}
                      </div>
                    </div>

                    {/* Expandable List of Exact Dates Washed */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1.5 border-t border-[#DDD9D0]/60 dark:border-[#2A364B]/60 bg-[#F2F1ED]/40 dark:bg-[#0B0C0E]/40 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#848A96] dark:text-[#64748B] block">
                          Dates &amp; Meals Washed:
                        </span>

                        {(!logs || logs.length === 0) ? (
                          <p className="text-xs text-[#848A96] dark:text-[#64748B] italic py-1">
                            No washing records completed yet this month.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {logs.map(log => {
                              if (!log) return null;
                              const isLunch = log.meal === 'lunch';
                              let timeStr = '';
                              try {
                                const logTime = new Date(log.markedAt || log.date);
                                if (!isNaN(logTime.getTime())) {
                                  timeStr = logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                              } catch {
                                timeStr = '';
                              }

                              return (
                                <div
                                  key={log.id || `${log.date}-${log.meal}-${Math.random()}`}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-[#848A96] dark:text-[#64748B] flex-shrink-0" />
                                    <span className="font-semibold text-[#111216] dark:text-[#F7F6F3]">
                                      {log.date}
                                    </span>
                                    <span className="text-[#DDD9D0] dark:text-[#2A364B]">&middot;</span>
                                    <span className="flex items-center gap-1 text-[#4E525D] dark:text-[#9BA5B7]">
                                      {isLunch ? (
                                        <Sun className="w-3.5 h-3.5 text-[#D97706] dark:text-[#FBBF24]" />
                                      ) : (
                                        <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-[#C7D2FE]" />
                                      )}
                                      <span className="capitalize">
                                        {log.meal} {log.slotIndex === 2 ? '#2' : ''}
                                      </span>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]">
                                      Washed
                                    </span>
                                    {timeStr ? (
                                      <span className="text-[10px] text-[#848A96] dark:text-[#64748B]">
                                        {timeStr}
                                      </span>
                                    ) : null}
                                    {isAdmin && onDeleteWashLog && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmLog({
                                            logId: log.id || log.slotId,
                                            washerName: member.name,
                                            date: log.date,
                                            meal: log.meal,
                                          });
                                        }}
                                        title="Admin: Delete / Reset this wash record"
                                        className="p-1 rounded-lg text-[#D9483B] dark:text-[#FF5A4E] hover:bg-[#D9483B]/10 dark:hover:bg-[#FF5A4E]/15 transition-colors cursor-pointer ml-1"
                                        aria-label="Delete wash record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
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
              })
            )}
          </div>
        </div>
      )}

      {/* Admin Delete Wash Log Confirmation Modal */}
      {isAdmin && deleteConfirmLog && (
        <Modal
          isOpen={Boolean(deleteConfirmLog)}
          onClose={() => setDeleteConfirmLog(null)}
          title="Delete Historical Wash Log"
          subtitle="Admin action to remove verified vessel wash log."
        >
          <div className="space-y-4 p-1">
            <div className="p-3.5 rounded-xl bg-[#D9483B]/10 dark:bg-[#FF5A4E]/15 border border-[#D9483B]/30 dark:border-[#FF5A4E]/30 text-xs text-[#111216] dark:text-[#F7F6F3] space-y-1.5">
              <p className="font-semibold text-[#D9483B] dark:text-[#FF5A4E]">
                Are you sure you want to delete this completed wash record?
              </p>
              <div className="space-y-0.5 text-[11px] text-[#4E525D] dark:text-[#9BA5B7]">
                <p><strong>Date:</strong> {deleteConfirmLog.date}</p>
                <p><strong>Meal:</strong> <span className="capitalize">{deleteConfirmLog.meal}</span></p>
                <p><strong>Washer:</strong> {deleteConfirmLog.washerName}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmLog(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] hover:bg-[#DDD9D0] dark:hover:bg-[#2A364B] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!onDeleteWashLog || !deleteConfirmLog) return;
                  setDeleting(true);
                  try {
                    await onDeleteWashLog(deleteConfirmLog.logId);
                    setDeleteConfirmLog(null);
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#D9483B] hover:bg-[#B9382C] text-white shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

class HistoryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('HistoryScreen Render Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 space-y-4 max-w-full">
          <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-[#111216] dark:text-[#F7F6F3]">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <History className="w-4 h-4" />
              <span>Unable to display wash history</span>
            </div>
            <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] mt-1.5 leading-relaxed">
              We encountered an unexpected issue while loading the historical records. Your data is safe.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#18181B] text-white dark:bg-[#F4F4F5] dark:text-[#18181B] active-scale transition-transform cursor-pointer"
              >
                Retry Loading
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function HistoryScreen(props) {
  return (
    <HistoryErrorBoundary>
      <HistoryScreenContent {...props} />
    </HistoryErrorBoundary>
  );
}
