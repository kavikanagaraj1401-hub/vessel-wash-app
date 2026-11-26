import React, { useState, useMemo, useEffect } from 'react';
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
  ShieldCheck,
  Eye,
  Lock,
} from 'lucide-react';
import { getTodayDateStr } from '../logic/dateUtils';
import { assignSlot, assignLunchPair } from '../logic/rotationEngine';
import { supabaseService } from '../services/supabaseService';
import { useTheme } from '../context/ThemeContext';

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
}) {
  const { brandClasses } = useTheme();

  // Direct fetch state for working Supabase tables
  const [remoteLogs, setRemoteLogs] = useState(null);
  const [remoteDaysConfig, setRemoteDaysConfig] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch wash records directly from working Supabase tables without broken foreign-key joins or role filters
  useEffect(() => {
    let isMounted = true;
    async function loadWashHistory() {
      setIsLoadingHistory(true);
      try {
        const result = await supabaseService.fetchWashHistory();
        if (isMounted && Array.isArray(result) && result.length > 0) {
          setRemoteLogs(result);
          if (Array.isArray(result.daysConfig) && result.daysConfig.length > 0) {
            setRemoteDaysConfig(result.daysConfig);
          }
        }
      } catch (err) {
        console.error('HistoryScreen: Failed to fetch wash history from working tables:', err);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadWashHistory();
    return () => { isMounted = false; };
  }, []);

  // Combined logs from props and remote fetch (deduplicated by unique ID / date-meal-slot-member key)
  const effectiveAttendanceLogs = useMemo(() => {
    const map = new Map();
    // 1. Initial / prop logs
    const propLogs = Array.isArray(attendanceLogs) ? attendanceLogs : [];
    propLogs.forEach(l => {
      if (l && l.date) {
        const key = l.id || `${l.date}-${l.meal || 'lunch'}-${l.slotIndex || 1}-${l.memberId || 'm'}`;
        map.set(key, l);
      }
    });
    // 2. Remote logs fetched directly from Supabase working tables
    if (Array.isArray(remoteLogs)) {
      remoteLogs.forEach(l => {
        if (l && l.date) {
          const key = l.id || `${l.date}-${l.meal || 'lunch'}-${l.slotIndex || 1}-${l.memberId || 'm'}`;
          map.set(key, l);
        }
      });
    }
    return Array.from(map.values());
  }, [attendanceLogs, remoteLogs]);

  // Combined daysConfig
  const effectiveDaysConfig = useMemo(() => {
    if (Array.isArray(remoteDaysConfig) && remoteDaysConfig.length > 0) {
      const map = new Map();
      (Array.isArray(daysConfig) ? daysConfig : []).forEach(d => { if (d && d.date) map.set(d.date, d); });
      remoteDaysConfig.forEach(d => { if (d && d.date) map.set(d.date, { ...map.get(d.date), ...d }); });
      return Array.from(map.values());
    }
    return Array.isArray(daysConfig) ? daysConfig : [];
  }, [daysConfig, remoteDaysConfig]);

  // Default to 'logs' (Timeline Logs) as requested
  const [activeSubTab, setActiveSubTab] = useState('logs'); // 'logs' | 'report'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'lunch' | 'dinner' | 'unmarked'
  const [copied, setCopied] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState(
    () => new Set((members || []).map(m => m?.id).filter(Boolean))
  );

  // Map for quick member lookups with null-safe handling
  const memberMap = useMemo(
    () => new Map((members || []).filter(Boolean).map(m => [m.id, m])),
    [members]
  );

  // Safe helper to resolve member or provide robust fallback for deleted / unknown member IDs
  const getSafeMember = (id, fallbackName = 'Washer') => {
    if (!id) return { id: 'unknown', name: fallbackName, code: 'M' };
    const found = memberMap.get(id);
    if (found) return found;
    return { id, name: fallbackName, code: 'M' };
  };

  // Valid Attendance Logs: verified completed washes recorded up to the current date
  const validAttendanceLogs = useMemo(() => {
    const safeAttendanceLogs = Array.isArray(effectiveAttendanceLogs) ? effectiveAttendanceLogs : [];
    const targetTodayStr = todayDateStr || getTodayDateStr();

    return safeAttendanceLogs.filter(log => {
      if (!log || log.status !== 'present' || !log.date) return false;
      // Skip paused date Nov 24, 2026
      if (log.date === '2026-11-24') return false;
      // Must be on or before current date
      return log.date <= targetTodayStr;
    });
  }, [effectiveAttendanceLogs, todayDateStr]);

  // Build unified date-by-date timeline logs (excluding future dates, ensuring continuous coverage up to today)
  const allTimelineDates = useMemo(() => {
    const safeDaysConfig = Array.isArray(effectiveDaysConfig) ? effectiveDaysConfig : [];
    const safeComputedDays = Array.isArray(computedDays) ? computedDays : [];
    const computedMap = new Map(safeComputedDays.filter(Boolean).map(d => [d.date, d]));
    const daysMap = new Map(safeDaysConfig.filter(Boolean).map(d => [d.date, d]));
    const targetTodayStr = todayDateStr || getTodayDateStr();
    const startDateStr = '2026-09-01';

    // 1. Collect all active dates up to targetTodayStr
    const allDatesSet = new Set();

    // Always include today
    allDatesSet.add(targetTodayStr);

    // Include all dates in daysConfig or attendanceLogs where food was provided or verified wash occurred
    safeDaysConfig.forEach(d => {
      if (d && d.date && d.date <= targetTodayStr && d.date >= startDateStr) {
        if (
          d.lunchProvided ||
          d.dinnerProvided ||
          (Array.isArray(d.lunchEaters) && d.lunchEaters.length > 0) ||
          (Array.isArray(d.dinnerEaters) && d.dinnerEaters.length > 0)
        ) {
          allDatesSet.add(d.date);
        }
      }
    });

    (effectiveAttendanceLogs || []).forEach(l => {
      if (l && l.date && l.date <= targetTodayStr && l.date >= startDateStr) {
        allDatesSet.add(l.date);
      }
    });

    // Include continuous active schedule dates from November 18 resumption up to today
    const resumptionStart = '2026-11-18';
    let curr = new Date(`${resumptionStart}T00:00:00`);
    const end = new Date(`${targetTodayStr}T00:00:00`);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      allDatesSet.add(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }

    const dates = Array.from(allDatesSet).map(dateKey => {
      const day = daysMap.get(dateKey) || {
        date: dateKey,
        dayNumber: parseInt(String(dateKey || '').split('-')[2] || '1', 10),
        lunchProvided: false,
        dinnerProvided: false,
        lunchEaters: [],
        dinnerEaters: [],
      };
      const compDay = computedMap.get(dateKey) || day;
      const isToday = (dateKey === targetTodayStr);

      const lunchEatersList = Array.isArray(day?.lunchEaters) ? day.lunchEaters : [];
      const dinnerEatersList = Array.isArray(day?.dinnerEaters) ? day.dinnerEaters : [];

      // Safe attendance logs for this date
      const safeLogs = Array.isArray(effectiveAttendanceLogs) ? effectiveAttendanceLogs : [];
      const verifiedLunchLogs = safeLogs.filter(
        l => l && l.date === dateKey && l.meal === 'lunch' && l.status === 'present'
      );
      const verifiedDinnerLogs = safeLogs.filter(
        l => l && l.date === dateKey && l.meal === 'dinner' && l.status === 'present'
      );

      // Extract present members (eaters who ate) with null-safe lookup
      const lunchPresentMembers = lunchEatersList
        .map(id => getSafeMember(id))
        .filter(Boolean);

      const dinnerPresentMembers = dinnerEatersList
        .map(id => getSafeMember(id))
        .filter(Boolean);

      // Meal Availability / Confirmation:
      // Food is confirmed if verified wash log exists, or if lunchProvided / dinnerProvided is true in config
      const isLunchFoodConfirmed = Boolean(
        verifiedLunchLogs.length > 0 || day.lunchProvided
      );
      const isDinnerFoodConfirmed = Boolean(
        verifiedDinnerLogs.length > 0 || day.dinnerProvided
      );

      // Lunch Washers & Verified Status
      let lunchWashers = [];
      let isLunchVerified = false;
      let isLunchAvail = false;

      if (verifiedLunchLogs.length > 0) {
        isLunchVerified = true;
        isLunchAvail = true;
        lunchWashers = verifiedLunchLogs.map(l => ({
          id: l?.memberId || 'washer',
          logId: l?.id || l?.slotId || `log-${dateKey}-lunch-${Math.random()}`,
          slotId: l?.slotId || l?.id || `slot-${dateKey}-lunch-1`,
          name: l?.memberName || getSafeMember(l?.memberId)?.name || 'Washer',
          slotIndex: l?.slotIndex || 1,
          code: getSafeMember(l?.memberId)?.code || '',
          verified: true,
          markedBy: l?.markedBy,
          markedAt: l?.markedAt,
        }));
      } else if (isLunchFoodConfirmed) {
        isLunchAvail = true;
        const lunchSlots = Array.isArray(compDay?.slots) ? compDay.slots.filter(s => s && s.meal === 'lunch') : [];
        let assigned = lunchSlots.filter(s => s && s.assignedMemberId && s.assignedMemberName && s.assignedMemberName !== '-');

        // Dynamic fallback: compute from queue and attending members or active members
        if (assigned.length === 0 && Array.isArray(members) && members.length > 0) {
          const queue = Array.isArray(compDay?.queueBefore) && compDay.queueBefore.length > 0 ? compDay.queueBefore : members.map(m => m.id);
          const eligibleEaters = lunchEatersList.length > 0 ? lunchEatersList : queue;
          const userChosenWashers = Number(day.lunchWashers) === 2 ? 2 : 1;
          if (userChosenWashers === 2 && eligibleEaters.length >= 2) {
            const { assigned1, assigned2 } = assignLunchPair(queue, eligibleEaters, members);
            assigned = [
              { id: `${dateKey}-lunch-1`, meal: 'lunch', slotIndex: 1, assignedMemberId: assigned1, assignedMemberName: getSafeMember(assigned1)?.name || 'Washer' },
              { id: `${dateKey}-lunch-2`, meal: 'lunch', slotIndex: 2, assignedMemberId: assigned2, assignedMemberName: getSafeMember(assigned2)?.name || 'Washer' },
            ].filter(s => s && s.assignedMemberId);
          } else {
            const { assignedId } = assignSlot(queue, eligibleEaters, members);
            if (assignedId) {
              assigned = [{
                id: `${dateKey}-lunch-1`,
                meal: 'lunch',
                slotIndex: 1,
                assignedMemberId: assignedId,
                assignedMemberName: getSafeMember(assignedId)?.name || 'Washer',
              }];
            }
          }
        }

        if (assigned.length > 0) {
          isLunchVerified = !isToday;
          lunchWashers = assigned.map(s => ({
            id: s.assignedMemberId || 'washer',
            logId: s.id,
            slotId: s.id,
            name: s.assignedMemberName || getSafeMember(s.assignedMemberId)?.name || 'Washer',
            slotIndex: s.slotIndex || 1,
            code: getSafeMember(s.assignedMemberId)?.code || '',
            verified: !isToday,
          }));
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
          id: l?.memberId || 'washer',
          logId: l?.id || l?.slotId || `log-${dateKey}-dinner-${Math.random()}`,
          slotId: l?.slotId || l?.id || `slot-${dateKey}-dinner-1`,
          name: l?.memberName || getSafeMember(l?.memberId)?.name || 'Washer',
          slotIndex: l?.slotIndex || 1,
          code: getSafeMember(l?.memberId)?.code || '',
          verified: true,
          markedBy: l?.markedBy,
          markedAt: l?.markedAt,
        }));
      } else if (isDinnerFoodConfirmed) {
        isDinnerAvail = true;
        const dinnerSlots = Array.isArray(compDay?.slots) ? compDay.slots.filter(s => s && s.meal === 'dinner') : [];
        let dinnerSlot = dinnerSlots.find(s => s && s.assignedMemberId && s.assignedMemberName && s.assignedMemberName !== '-');

        // Dynamic fallback: compute from queue and attending members or active members
        if (!dinnerSlot && Array.isArray(members) && members.length > 0) {
          const queue = Array.isArray(compDay?.queueBefore) && compDay.queueBefore.length > 0 ? compDay.queueBefore : members.map(m => m.id);
          const eligibleEaters = dinnerEatersList.length > 0 ? dinnerEatersList : queue;
          const { assignedId } = assignSlot(queue, eligibleEaters, members);
          const assignedMem = getSafeMember(assignedId);
          if (assignedId && assignedMem) {
            dinnerSlot = {
              id: `${dateKey}-dinner-1`,
              meal: 'dinner',
              slotIndex: 1,
              assignedMemberId: assignedId,
              assignedMemberName: assignedMem.name || 'Washer',
            };
          }
        }

        if (dinnerSlot) {
          isDinnerVerified = !isToday;
          dinnerWashers = [{
            id: dinnerSlot.assignedMemberId || 'washer',
            logId: dinnerSlot.id,
            slotId: dinnerSlot.id,
            name: dinnerSlot.assignedMemberName || getSafeMember(dinnerSlot.assignedMemberId)?.name || 'Washer',
            slotIndex: dinnerSlot.slotIndex || 1,
            code: getSafeMember(dinnerSlot.assignedMemberId)?.code || '',
            verified: !isToday,
          }];
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
      let fullDateStr = String(dateKey || '');
      try {
        if (dateKey) {
          const dateObj = new Date(`${dateKey}T00:00:00`);
          if (!isNaN(dateObj.getTime())) {
            weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            fullDateStr = dateObj.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          }
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

    // Sort strictly descending order starting from today down into the past
    return dates.sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')));
  }, [effectiveDaysConfig, computedDays, effectiveAttendanceLogs, memberMap, todayDateStr]);

  // Filtered timeline dates for the logs view
  const timelineDates = useMemo(() => {
    if (!allTimelineDates) return [];
    if (dateFilter === 'lunch') {
      return allTimelineDates.filter(d => d?.isLunchAvail || d?.isLunchVerified);
    } else if (dateFilter === 'dinner') {
      return allTimelineDates.filter(d => d?.isDinnerAvail || d?.isDinnerVerified);
    } else if (dateFilter === 'unmarked') {
      return allTimelineDates.filter(d => d?.isPending);
    }
    return allTimelineDates;
  }, [allTimelineDates, dateFilter]);

  // Overall totals (from validated timeline records across all dates, excluding today)
  const totalLunchWashes = useMemo(() => {
    return (allTimelineDates || []).filter(d => d && d.isLunchVerified && !d.isToday).length;
  }, [allTimelineDates]);

  const totalDinnerWashes = useMemo(() => {
    return (allTimelineDates || []).filter(d => d && d.isDinnerVerified && !d.isToday).length;
  }, [allTimelineDates]);

  const totalWashes = totalLunchWashes + totalDinnerWashes;

  // Compile detailed report per member for the 'report' tab (from all verified timeline dates)
  const memberReports = useMemo(() => {
    const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
    const targetTodayStr = todayDateStr || getTodayDateStr();

    return safeMembers.map(member => {
      if (!member || !member.id) return null;

      const memberIdStr = String(member.id).toLowerCase();
      const memberNameStr = String(member.name || '').toLowerCase().trim();
      const memberCodeStr = String(member.code || '').toUpperCase().trim();

      const isMemberMatch = (washer) => {
        if (!washer) return false;
        if (washer.id && String(washer.id).toLowerCase() === memberIdStr) return true;
        if (washer.name && String(washer.name).toLowerCase().trim() === memberNameStr) return true;
        if (washer.code && String(washer.code).toUpperCase().trim() === memberCodeStr) return true;
        return false;
      };

      const memberLogMap = new Map();

      // 1. Gather all verified washes from timelineDates (covers both manual logs and confirmed roster days)
      (timelineDates || []).forEach(d => {
        if (!d || d.date > targetTodayStr || d.date === '2026-11-24') return;

        if (d.isLunchVerified && Array.isArray(d.lunchWashers)) {
          d.lunchWashers.forEach(w => {
            if (isMemberMatch(w)) {
              const key = `${d.date}-lunch-${w.slotIndex || 1}`;
              memberLogMap.set(key, {
                id: w.logId || `wash-${d.date}-lunch-${w.id || member.id}`,
                slotId: w.slotId,
                date: d.date,
                meal: 'lunch',
                slotIndex: w.slotIndex || 1,
                memberId: member.id,
                memberName: member.name,
                status: 'present',
                markedAt: w.markedAt || `${d.date}T13:30:00.000Z`,
              });
            }
          });
        }

        if (d.isDinnerVerified && Array.isArray(d.dinnerWashers)) {
          d.dinnerWashers.forEach(w => {
            if (isMemberMatch(w)) {
              const key = `${d.date}-dinner-${w.slotIndex || 1}`;
              memberLogMap.set(key, {
                id: w.logId || `wash-${d.date}-dinner-${w.id || member.id}`,
                slotId: w.slotId,
                date: d.date,
                meal: 'dinner',
                slotIndex: w.slotIndex || 1,
                memberId: member.id,
                memberName: member.name,
                status: 'present',
                markedAt: w.markedAt || `${d.date}T21:30:00.000Z`,
              });
            }
          });
        }
      });

      // 2. Also check validAttendanceLogs directly
      (validAttendanceLogs || []).forEach(l => {
        if (!l || l.date > targetTodayStr || l.date === '2026-11-24') return;
        if (
          l.memberId === member.id ||
          (l.memberName && l.memberName.toLowerCase().trim() === memberNameStr) ||
          (l.code && l.code.toUpperCase().trim() === memberCodeStr)
        ) {
          const key = `${l.date}-${l.meal}-${l.slotIndex || 1}`;
          if (!memberLogMap.has(key)) {
            memberLogMap.set(key, l);
          }
        }
      });

      const memberLogs = Array.from(memberLogMap.values()).sort(
        (a, b) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
      );

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
  }, [members, timelineDates, validAttendanceLogs, todayDateStr]);

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
    <div className="space-y-3.5 pb-8 sm:pb-12 px-3 sm:px-4 pt-3 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${brandClasses?.activeText || 'text-[#EA580C] dark:text-[#F59E0B]'}`}>
              Activity &amp; Audit History
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 text-[#22AC77] dark:text-[#4ADE80] border-[#22AC77]/30 dark:border-[#4ADE80]/30">
              <Eye className="w-3 h-3" />
              <span>All Members (Read-Only)</span>
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#111216] dark:text-[#F7F6F3] mt-0.5">
            Timeline Logs
          </h2>
          <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">
            Complete verified audit record of vessel washers and attendance for all team members (Read-Only).
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
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] text-center shadow-2xs min-w-0">
              <span className="text-[9.5px] sm:text-[10px] uppercase font-bold text-[#848A96] dark:text-[#64748B] block truncate">Total Washes</span>
              <span className="text-base sm:text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalWashes}</span>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-[#F59E0B]/40 dark:border-[#F59E0B]/30 text-center shadow-2xs min-w-0">
              <span className="text-[9.5px] sm:text-[10px] uppercase font-bold text-[#D97706] dark:text-[#FBBF24] block truncate">Lunch</span>
              <span className="text-base sm:text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalLunchWashes}</span>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-[#171F2C] border border-indigo-400/40 dark:border-indigo-500/30 text-center shadow-2xs min-w-0">
              <span className="text-[9.5px] sm:text-[10px] uppercase font-bold text-indigo-700 dark:text-[#C7D2FE] block truncate">Dinner</span>
              <span className="text-base sm:text-lg font-bold text-[#111216] dark:text-[#F7F6F3]">{totalDinnerWashes}</span>
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
                  className={`flex-1 basis-0 min-w-0 py-2 px-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all select-none truncate cursor-pointer text-center ${
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
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${brandClasses?.badge || 'bg-[#EA580C]/15 text-[#EA580C] dark:text-[#F59E0B] border border-[#EA580C]/30'}`}>
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
                        ? `${brandClasses?.accentBorder || 'border-[#EA580C] dark:border-[#F59E0B]'} ring-1 ring-black/10 dark:ring-white/10`
                        : 'border-[#DDD9D0] dark:border-[#2A364B] hover:border-black/20 dark:hover:border-white/20'
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
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${brandClasses?.badge || 'bg-[#EA580C]/15 text-[#EA580C] dark:text-[#F59E0B] border border-[#EA580C]/30'}`}>
                                Today
                              </span>
                            )}
                            {isToday ? (
                              hasAnyConfirmedMeal ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 text-[#22AC77] dark:text-[#4ADE80] border border-[#22AC77]/30 dark:border-[#4ADE80]/40">
                                  Current Washer
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#EA580C]/10 dark:bg-[#F59E0B]/15 text-[#EA580C] dark:text-[#F59E0B] border border-[#EA580C]/30 dark:border-[#F59E0B]/40">
                                  Pending / Food Not Marked
                                </span>
                              )
                            ) : hasAnyConfirmedMeal ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 text-[#22AC77] dark:text-[#4ADE80] border border-[#22AC77]/30 dark:border-[#4ADE80]/40">
                                Washed ✓
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#848A96] dark:text-[#64748B] border border-[#DDD9D0] dark:border-[#2A364B]">
                                Food Not Marked
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
                            isToday
                              ? (isLunchFoodConfirmed
                                  ? 'bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 border-[#22AC77]/30 dark:border-[#4ADE80]/40'
                                  : 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30')
                              : (isLunchVerified || isLunchAvail
                                  ? 'bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 border-[#22AC77]/30 dark:border-[#4ADE80]/40'
                                  : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] border-[#DDD9D0] dark:border-[#2A364B]')
                          }`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                (isToday ? isLunchFoodConfirmed : (isLunchVerified || isLunchAvail))
                                  ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]'
                                  : 'bg-amber-500/20 text-[#D97706] dark:text-[#FBBF24]'
                              }`}>
                                🧼
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#111216] dark:text-[#F7F6F3] block leading-none">
                                  {isToday ? 'Current Washer:' : 'Washed Vessels:'}
                                </span>
                                <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] mt-0.5 block">
                                  {lunchWashers && lunchWashers.length > 0
                                    ? lunchWashers.map(w => `${w?.name || 'Washer'}${w?.markedBy ? ` (${w.markedBy})` : ''}`).join(' & ')
                                    : isToday
                                    ? (isLunchFoodConfirmed ? 'Current Washer Duty Assigned' : 'Pending / Food Not Marked')
                                    : 'None recorded'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                isToday
                                  ? (isLunchFoodConfirmed
                                      ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]'
                                      : 'bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24] border border-amber-500/30')
                                  : (isLunchVerified || isLunchAvail
                                      ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]'
                                      : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#848A96] dark:text-[#64748B] border border-[#DDD9D0] dark:border-[#2A364B]')
                              }`}>
                                {isToday
                                  ? (isLunchFoodConfirmed ? 'Current Washer' : 'Food Not Marked')
                                  : (isLunchVerified || isLunchAvail ? 'Washed ✓' : 'Food Not Marked')}
                              </span>
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
                            isToday
                              ? (isDinnerFoodConfirmed
                                  ? 'bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 border-[#22AC77]/30 dark:border-[#4ADE80]/40'
                                  : 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-400/30')
                              : (isDinnerVerified || isDinnerAvail
                                  ? 'bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 border-[#22AC77]/30 dark:border-[#4ADE80]/40'
                                  : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] border-[#DDD9D0] dark:border-[#2A364B]')
                          }`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                (isToday ? isDinnerFoodConfirmed : (isDinnerVerified || isDinnerAvail))
                                  ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]'
                                  : 'bg-indigo-500/20 text-indigo-600 dark:text-[#C7D2FE]'
                              }`}>
                                🧼
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#111216] dark:text-[#F7F6F3] block leading-none">
                                  {isToday ? 'Current Washer:' : 'Washed Vessels:'}
                                </span>
                                <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] mt-0.5 block">
                                  {dinnerWashers && dinnerWashers.length > 0
                                    ? dinnerWashers.map(w => `${w?.name || 'Washer'}${w?.markedBy ? ` (${w.markedBy})` : ''}`).join(', ')
                                    : isToday
                                    ? (isDinnerFoodConfirmed ? 'Current Washer Duty Assigned' : 'Pending / Food Not Marked')
                                    : 'None recorded'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                isToday
                                  ? (isDinnerFoodConfirmed
                                      ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]'
                                      : 'bg-indigo-500/15 text-indigo-700 dark:text-[#C7D2FE] border border-indigo-400/30')
                                  : (isDinnerVerified || isDinnerAvail
                                      ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216]'
                                      : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#848A96] dark:text-[#64748B] border border-[#DDD9D0] dark:border-[#2A364B]')
                              }`}>
                                {isToday
                                  ? (isDinnerFoodConfirmed ? 'Current Washer' : 'Food Not Marked')
                                  : (isDinnerVerified || isDinnerAvail ? 'Washed ✓' : 'Food Not Marked')}
                              </span>
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
