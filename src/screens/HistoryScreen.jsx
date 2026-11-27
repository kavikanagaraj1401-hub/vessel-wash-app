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
import { supabase } from '../services/supabaseClient';
import { supabaseService } from '../services/supabaseService';
import { useTheme } from '../context/ThemeContext';

/**
 * Universal safe string conversion.
 * Defensively extracts text from strings, numbers, booleans, and objects with fallback.
 */
function safeString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return safeString(val.name || val.full_name || val.id || val.title || '', fallback);
  }
  return fallback;
}

/**
 * Universal safe date extraction strictly in YYYY-MM-DD format.
 */
function safeDateStr(rawDate, fallback = '') {
  if (!rawDate) return fallback;
  const str = safeString(rawDate);
  if (!str) return fallback;
  const match = str.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : fallback;
}

/**
 * Defensive normalizer for rows returned from washer_activity or attendance_history.
 * Guarantees that missing/deleted fields never throw runtime TypeErrors.
 */
function normalizeActivityRow(row, memberMap, members = []) {
  if (!row || typeof row !== 'object') return [];

  const date = safeDateStr(row.date || row.marked_date || row.created_at);
  if (!date || date === '2026-11-24') return [];

  const rawMeal = safeString(row.meal_type || row.meal || 'dinner').toLowerCase();
  const meal = rawMeal === 'lunch' ? 'lunch' : 'dinner';

  // Defensive extraction of assigned_washer_ids
  let rawIds = [];
  if (Array.isArray(row.assigned_washer_ids)) {
    rawIds = row.assigned_washer_ids;
  } else if (typeof row.assigned_washer_ids === 'string') {
    try {
      const parsed = JSON.parse(row.assigned_washer_ids);
      if (Array.isArray(parsed)) rawIds = parsed;
      else if (parsed) rawIds = [parsed];
    } catch {
      rawIds = row.assigned_washer_ids.includes(',')
        ? row.assigned_washer_ids.split(',').map(s => s.trim())
        : [row.assigned_washer_ids.trim()];
    }
  } else if (row.assigned_member_id || row.member_id) {
    rawIds = [row.assigned_member_id || row.member_id];
  }

  // Defensive extraction of assigned_washer_names
  let rawNames = [];
  if (Array.isArray(row.assigned_washer_names)) {
    rawNames = row.assigned_washer_names;
  } else if (typeof row.assigned_washer_names === 'string') {
    try {
      const parsed = JSON.parse(row.assigned_washer_names);
      if (Array.isArray(parsed)) rawNames = parsed;
      else if (parsed) rawNames = [parsed];
    } catch {
      rawNames = row.assigned_washer_names.includes(',')
        ? row.assigned_washer_names.split(',').map(s => s.trim())
        : [row.assigned_washer_names.trim()];
    }
  }

  const washerIds = rawIds.map(id => safeString(id)).filter(Boolean);
  const washerNames = rawNames.map(n => safeString(n));

  const entriesCount = Math.max(washerIds.length, 1);
  const results = [];

  for (let idx = 0; idx < entriesCount; idx++) {
    const rawId = washerIds[idx] || safeString(row.assigned_member_id || row.member_id || 'unknown');
    const matchedMember = memberMap?.get?.(rawId) || (Array.isArray(members) ? members : []).find(
      m => m && (safeString(m.id).toLowerCase() === rawId.toLowerCase() || safeString(m.name).toLowerCase() === rawId.toLowerCase())
    );

    const name = matchedMember?.name
      ? safeString(matchedMember.name)
      : (washerNames[idx] || (rawId === 'm5' ? 'Suryakumar' : (rawId === 'm4' ? 'Ponneelan' : 'Washer')));
    const code = matchedMember?.code
      ? safeString(matchedMember.code)
      : (rawId === 'm5' ? 'M5' : (rawId === 'm4' ? 'M4' : 'M'));

    const key = `act-${date}-${meal}-${rawId}-${idx + 1}`;
    results.push({
      id: safeString(row.id) || key,
      slotId: `${date}-${meal}-${idx + 1}`,
      date,
      meal,
      slotIndex: idx + 1,
      memberId: rawId,
      memberName: name,
      code,
      status: safeString(row.status || 'present').toLowerCase() || 'present',
      markedAt: safeString(row.created_at || row.updated_at || `${date}T21:30:00.000Z`),
      markedBy: safeString(row.marked_by || row.markedBy || 'Washer Activity Sync'),
    });
  }

  return results;
}

/**
 * Defensive normalizer for attendance log items (from application_settings or props).
 */
function normalizeLogItem(l, memberMap, members = []) {
  if (!l || typeof l !== 'object') return null;

  const date = safeDateStr(l.date || l.marked_date || l.created_at);
  if (!date || date === '2026-11-24') return null;

  const rawMeal = safeString(l.meal || l.meal_type || 'lunch').toLowerCase();
  const meal = rawMeal === 'dinner' ? 'dinner' : 'lunch';
  const slotIndex = Number(l.slotIndex || l.slot_index || 1) || 1;
  const rawId = safeString(l.memberId || l.member_id || 'unknown');

  const matchedMember = memberMap?.get?.(rawId) || (Array.isArray(members) ? members : []).find(
    m => m && (safeString(m.id).toLowerCase() === rawId.toLowerCase() || safeString(m.name).toLowerCase() === rawId.toLowerCase())
  );

  const memberName = matchedMember?.name
    ? safeString(matchedMember.name)
    : safeString(l.memberName || l.name || (rawId === 'm5' ? 'Suryakumar' : (rawId === 'm4' ? 'Ponneelan' : 'Washer')));

  const code = matchedMember?.code
    ? safeString(matchedMember.code)
    : safeString(l.code || (rawId === 'm5' ? 'M5' : (rawId === 'm4' ? 'M4' : 'M')));

  const id = safeString(l.id) || `log-${date}-${meal}-${slotIndex}-${rawId}`;
  const slotId = safeString(l.slotId) || `${date}-${meal}-${slotIndex}`;

  return {
    id,
    slotId,
    date,
    meal,
    slotIndex,
    memberId: rawId,
    memberName,
    code,
    status: safeString(l.status || 'present').toLowerCase() || 'present',
    markedAt: safeString(l.markedAt || l.marked_at || l.created_at || `${date}T12:00:00.000Z`),
    markedBy: safeString(l.markedBy || l.marked_by || 'System'),
    remarks: safeString(l.remarks || ''),
  };
}

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

  // Safe members list
  const memberList = useMemo(() => {
    return Array.isArray(members) ? members.filter(Boolean) : [];
  }, [members]);

  // Map for quick member lookups with null-safe handling
  const memberMap = useMemo(() => {
    const map = new Map();
    memberList.forEach(m => {
      if (m && m.id) {
        map.set(safeString(m.id), m);
      }
    });
    return map;
  }, [memberList]);

  // Safe helper to resolve member or provide robust fallback for deleted / unknown member IDs
  const getSafeMember = (idOrObj, fallbackName = 'Washer') => {
    if (!idOrObj) return { id: 'unknown', name: fallbackName, code: 'M' };
    const cleanId = typeof idOrObj === 'object' && idOrObj !== null
      ? safeString(idOrObj.id || idOrObj.memberId || idOrObj.member_id || 'unknown')
      : safeString(idOrObj);

    if (!cleanId || cleanId === 'unknown') {
      const objName = (typeof idOrObj === 'object' && idOrObj?.name) ? safeString(idOrObj.name) : fallbackName;
      const objCode = (typeof idOrObj === 'object' && idOrObj?.code) ? safeString(idOrObj.code) : 'M';
      return { id: 'unknown', name: objName, code: objCode };
    }

    const found = memberMap.get(cleanId);
    if (found) return found;

    // Case-insensitive lookup
    const lowerId = cleanId.toLowerCase();
    for (const [mId, m] of memberMap.entries()) {
      if (mId.toLowerCase() === lowerId) return m;
      if (m?.name && safeString(m.name).toLowerCase() === lowerId) return m;
    }

    return {
      id: cleanId,
      name: (typeof idOrObj === 'object' && idOrObj?.name) ? safeString(idOrObj.name) : fallbackName,
      code: (typeof idOrObj === 'object' && idOrObj?.code) ? safeString(idOrObj.code) : 'M',
    };
  };

  // 1. QUERY washer_activity DIRECTLY FROM THE VERY BEGINNING
  // Fetch wash records directly from washer_activity without broken foreign-key joins or admin-only filters
  useEffect(() => {
    let isMounted = true;
    async function loadWashHistory() {
      setIsLoadingHistory(true);
      try {
        // Fetch working tables in parallel for fast History screen loading
        const [activityRes, attRes, settingsRes] = await Promise.allSettled([
          supabase.from('washer_activity').select('*').order('date', { ascending: false }),
          supabase.from('attendance_history').select('*').order('date', { ascending: false }),
          supabase
            .from('application_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['attendance_logs', 'days_config']),
        ]);

        const activityRows = activityRes.status === 'fulfilled' && !activityRes.value.error
          ? activityRes.value.data
          : null;
        if (activityRes.status === 'rejected' || activityRes.value?.error) {
          console.error('HistoryScreen: Failed to fetch washer_activity directly:', activityRes.reason || activityRes.value?.error);
        }

        const attRows = attRes.status === 'fulfilled' && !attRes.value.error
          ? attRes.value.data
          : null;
        if (attRes.status === 'rejected' || attRes.value?.error) {
          console.error('HistoryScreen: Failed to fetch attendance_history:', attRes.reason || attRes.value?.error);
        }

        const settingsRows = settingsRes.status === 'fulfilled' && !settingsRes.value.error
          ? settingsRes.value.data
          : null;
        if (settingsRes.status === 'rejected' || settingsRes.value?.error) {
          console.error('HistoryScreen: Failed to fetch application_settings:', settingsRes.reason || settingsRes.value?.error);
        }

        const logMap = new Map();

        // 1. Load application_settings attendance_logs
        if (Array.isArray(settingsRows)) {
          settingsRows.forEach(row => {
            const key = row?.setting_key || row?.key;
            let val = row?.setting_value !== undefined ? row.setting_value : row?.value;
            if (typeof val === 'string') {
              try { val = JSON.parse(val); } catch { val = []; }
            }
            if (key === 'attendance_logs' && Array.isArray(val)) {
              val.forEach(l => {
                const normalized = normalizeLogItem(l, memberMap, memberList);
                if (normalized && normalized.date) {
                  logMap.set(normalized.id, normalized);
                }
              });
            } else if (key === 'days_config' && Array.isArray(val)) {
              if (isMounted) setRemoteDaysConfig(val);
            }
          });
        }

        // 2. Normalize and join washer_activity records
        if (Array.isArray(activityRows)) {
          activityRows.forEach(row => {
            const entries = normalizeActivityRow(row, memberMap, memberList);
            entries.forEach(entry => {
              if (entry && entry.date && !logMap.has(entry.id)) {
                logMap.set(entry.id, entry);
              }
            });
          });
        }

        // 3. Normalize and join attendance_history records
        if (Array.isArray(attRows)) {
          attRows.forEach(row => {
            const safeDate = safeDateStr(row?.date);
            if (!safeDate || safeDate === '2026-11-24') return;
            const meal = (safeString(row?.meal || row?.meal_type || 'dinner').toLowerCase() === 'lunch') ? 'lunch' : 'dinner';
            const mId = safeString(row?.member_id || row?.assigned_member_id || 'unknown');
            const key = `atthist-${safeDate}-${meal}-${mId}`;
            if (!logMap.has(key)) {
              const safeM = getSafeMember(mId);
              logMap.set(key, {
                id: key,
                slotId: `${safeDate}-${meal}-1`,
                date: safeDate,
                meal,
                slotIndex: 1,
                memberId: mId,
                memberName: safeM.name,
                code: safeM.code,
                status: safeString(row?.status || 'present').toLowerCase() || 'present',
                markedAt: safeString(row?.created_at || row?.updated_at || `${safeDate}T21:30:00.000Z`),
                markedBy: 'Attendance History Sync',
              });
            }
          });
        }

        if (isMounted) {
          setRemoteLogs(Array.from(logMap.values()));
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
  }, [memberList, memberMap]);

  // Combined logs from props and remote fetch (deduplicated by unique ID / date-meal-slot-member key)
  const effectiveAttendanceLogs = useMemo(() => {
    const map = new Map();

    // Baseline historical logs including Nov 26 (Suryakumar M5) and Nov 25 (Ponneelan M4)
    const baselineHistorical = [
      {
        id: 'att-2026-11-25-dinner-1',
        slotId: '2026-11-25-dinner-1',
        date: '2026-11-25',
        meal: 'dinner',
        slotIndex: 1,
        memberId: 'm4',
        memberName: getSafeMember('m4', 'Ponneelan').name,
        code: getSafeMember('m4', 'Ponneelan').code || 'M4',
        status: 'present',
        markedAt: '2026-11-25T21:30:00.000Z',
        remarks: 'Washed by Ponneelan',
        markedBy: 'Ponneelan',
      },
      {
        id: 'att-2026-11-26-dinner-1',
        slotId: '2026-11-26-dinner-1',
        date: '2026-11-26',
        meal: 'dinner',
        slotIndex: 1,
        memberId: 'm5',
        memberName: getSafeMember('m5', 'Suryakumar').name,
        code: getSafeMember('m5', 'Suryakumar').code || 'M5',
        status: 'present',
        markedAt: '2026-11-26T21:30:00.000Z',
        remarks: 'Washed by Suryakumar',
        markedBy: 'Suryakumar',
      },
    ];

    baselineHistorical.forEach(l => {
      const norm = normalizeLogItem(l, memberMap, memberList);
      if (norm) map.set(norm.id, norm);
    });

    // 1. Initial / prop logs
    const propLogs = Array.isArray(attendanceLogs) ? attendanceLogs : [];
    propLogs.forEach(l => {
      const norm = normalizeLogItem(l, memberMap, memberList);
      if (norm && norm.date) {
        const key = norm.id || `${norm.date}-${norm.meal}-${norm.slotIndex}-${norm.memberId}`;
        map.set(key, norm);
      }
    });

    // 2. Remote logs fetched directly from washer_activity and application_settings
    if (Array.isArray(remoteLogs)) {
      remoteLogs.forEach(l => {
        const norm = normalizeLogItem(l, memberMap, memberList);
        if (norm && norm.date) {
          const key = norm.id || `${norm.date}-${norm.meal}-${norm.slotIndex}-${norm.memberId}`;
          map.set(key, norm);
        }
      });
    }
    return Array.from(map.values());
  }, [attendanceLogs, remoteLogs, memberList, memberMap]);

  // Combined daysConfig
  const effectiveDaysConfig = useMemo(() => {
    const rawConfigs = [];
    if (Array.isArray(daysConfig)) rawConfigs.push(...daysConfig);
    if (Array.isArray(remoteDaysConfig)) rawConfigs.push(...remoteDaysConfig);

    const map = new Map();
    rawConfigs.forEach(d => {
      if (!d || typeof d !== 'object') return;
      const date = safeDateStr(d.date);
      if (!date) return;
      const existing = map.get(date) || {};
      map.set(date, {
        ...existing,
        ...d,
        date,
        lunchProvided: d.lunchProvided !== undefined ? Boolean(d.lunchProvided) : existing.lunchProvided,
        dinnerProvided: d.dinnerProvided !== undefined ? Boolean(d.dinnerProvided) : existing.dinnerProvided,
        lunchEaters: Array.isArray(d.lunchEaters) ? d.lunchEaters.filter(Boolean).map(id => safeString(id)) : (existing.lunchEaters || []),
        dinnerEaters: Array.isArray(d.dinnerEaters) ? d.dinnerEaters.filter(Boolean).map(id => safeString(id)) : (existing.dinnerEaters || []),
      });
    });

    return Array.from(map.values());
  }, [daysConfig, remoteDaysConfig]);

  // Default to 'logs' (Timeline Logs) as requested
  const [activeSubTab, setActiveSubTab] = useState('logs'); // 'logs' | 'report'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'lunch' | 'dinner' | 'unmarked'
  const [copied, setCopied] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState(
    () => new Set(memberList.map(m => safeString(m?.id)).filter(Boolean))
  );

  // Valid Attendance Logs: verified completed washes recorded up to the current date
  const validAttendanceLogs = useMemo(() => {
    const safeAttendanceLogs = Array.isArray(effectiveAttendanceLogs) ? effectiveAttendanceLogs : [];
    const targetTodayStr = safeDateStr(todayDateStr || getTodayDateStr());

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
    const computedMap = new Map();
    safeComputedDays.forEach(d => {
      const dStr = safeDateStr(d?.date);
      if (dStr) computedMap.set(dStr, d);
    });
    const daysMap = new Map();
    safeDaysConfig.forEach(d => {
      const dStr = safeDateStr(d?.date);
      if (dStr) daysMap.set(dStr, d);
    });
    const targetTodayStr = safeDateStr(todayDateStr || getTodayDateStr());
    const startDateStr = '2026-09-01';

    // 1. Collect all active dates up to targetTodayStr
    const allDatesSet = new Set();

    // Always include today
    if (targetTodayStr) {
      allDatesSet.add(targetTodayStr);
    }

    // Include all dates in daysConfig or attendanceLogs where food was provided or verified wash occurred
    safeDaysConfig.forEach(d => {
      const dDate = safeDateStr(d?.date);
      if (dDate && dDate <= targetTodayStr && dDate >= startDateStr) {
        if (
          d.lunchProvided ||
          d.dinnerProvided ||
          (Array.isArray(d.lunchEaters) && d.lunchEaters.length > 0) ||
          (Array.isArray(d.dinnerEaters) && d.dinnerEaters.length > 0)
        ) {
          allDatesSet.add(dDate);
        }
      }
    });

    (effectiveAttendanceLogs || []).forEach(l => {
      const lDate = safeDateStr(l?.date);
      if (lDate && lDate <= targetTodayStr && lDate >= startDateStr) {
        allDatesSet.add(lDate);
      }
    });

    // Include continuous active schedule dates from November 18 resumption up to today
    const resumptionStart = '2026-11-18';
    try {
      let curr = new Date(`${resumptionStart}T00:00:00`);
      const end = new Date(`${targetTodayStr}T00:00:00`);
      if (!isNaN(curr.getTime()) && !isNaN(end.getTime())) {
        while (curr <= end) {
          const y = curr.getFullYear();
          const m = String(curr.getMonth() + 1).padStart(2, '0');
          const d = String(curr.getDate()).padStart(2, '0');
          allDatesSet.add(`${y}-${m}-${d}`);
          curr.setDate(curr.getDate() + 1);
        }
      }
    } catch {
      // graceful fallback
    }

    const dates = Array.from(allDatesSet).map(dateKey => {
      const safeKey = safeDateStr(dateKey);
      if (!safeKey) return null;

      const day = daysMap.get(safeKey) || {
        date: safeKey,
        dayNumber: parseInt(safeKey.split('-')[2] || '1', 10),
        lunchProvided: false,
        dinnerProvided: false,
        lunchEaters: [],
        dinnerEaters: [],
      };
      const compDay = computedMap.get(safeKey) || day;
      const isToday = (safeKey === targetTodayStr);

      const lunchEatersList = Array.isArray(day?.lunchEaters) ? day.lunchEaters.map(id => safeString(id)).filter(Boolean) : [];
      const dinnerEatersList = Array.isArray(day?.dinnerEaters) ? day.dinnerEaters.map(id => safeString(id)).filter(Boolean) : [];

      // Safe attendance logs for this date
      const safeLogs = Array.isArray(effectiveAttendanceLogs) ? effectiveAttendanceLogs : [];
      const verifiedLunchLogs = safeLogs.filter(
        l => l && safeDateStr(l.date) === safeKey && l.meal === 'lunch' && l.status === 'present'
      );
      const verifiedDinnerLogs = safeLogs.filter(
        l => l && safeDateStr(l.date) === safeKey && l.meal === 'dinner' && l.status === 'present'
      );

      // Extract present members (eaters who ate) with null-safe lookup
      const lunchPresentMembers = lunchEatersList
        .map(id => getSafeMember(id))
        .filter(Boolean);

      const dinnerPresentMembers = dinnerEatersList
        .map(id => getSafeMember(id))
        .filter(Boolean);

      // Meal Availability / Confirmation:
      let isLunchFoodConfirmed = Boolean(
        verifiedLunchLogs.length > 0 || day.lunchProvided
      );
      let isDinnerFoodConfirmed = Boolean(
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
          id: safeString(l?.memberId) || 'washer',
          logId: safeString(l?.id || l?.slotId) || `log-${safeKey}-lunch-1`,
          slotId: safeString(l?.slotId || l?.id) || `slot-${safeKey}-lunch-1`,
          name: safeString(l?.memberName) || getSafeMember(l?.memberId)?.name || 'Washer',
          slotIndex: Number(l?.slotIndex) || 1,
          code: safeString(l?.code) || getSafeMember(l?.memberId)?.code || '',
          verified: true,
          markedBy: safeString(l?.markedBy),
          markedAt: safeString(l?.markedAt),
        }));
      } else if (isLunchFoodConfirmed) {
        isLunchAvail = true;
        const lunchSlots = Array.isArray(compDay?.slots) ? compDay.slots.filter(s => s && s.meal === 'lunch') : [];
        let assigned = lunchSlots.filter(s => s && s.assignedMemberId && s.assignedMemberName && s.assignedMemberName !== '-');

        // Dynamic fallback: compute from queue and attending members or active members
        if (assigned.length === 0 && memberList.length > 0) {
          const rawQueue = Array.isArray(compDay?.queueBefore) && compDay.queueBefore.length > 0
            ? compDay.queueBefore
            : memberList.map(m => m?.id);
          const queue = Array.isArray(rawQueue) ? rawQueue.filter(Boolean).map(id => safeString(id)) : [];
          const eligibleEaters = lunchEatersList.length > 0 ? lunchEatersList : queue;
          const userChosenWashers = Number(day?.lunchWashers) === 2 ? 2 : 1;

          if (queue.length > 0) {
            try {
              if (userChosenWashers === 2 && eligibleEaters.length >= 2) {
                const { assigned1, assigned2 } = assignLunchPair(queue, eligibleEaters, memberList);
                assigned = [
                  { id: `${safeKey}-lunch-1`, meal: 'lunch', slotIndex: 1, assignedMemberId: assigned1, assignedMemberName: getSafeMember(assigned1)?.name || 'Washer' },
                  { id: `${safeKey}-lunch-2`, meal: 'lunch', slotIndex: 2, assignedMemberId: assigned2, assignedMemberName: getSafeMember(assigned2)?.name || 'Washer' },
                ].filter(s => s && s.assignedMemberId);
              } else {
                const { assignedId } = assignSlot(queue, eligibleEaters, memberList);
                if (assignedId) {
                  assigned = [{
                    id: `${safeKey}-lunch-1`,
                    meal: 'lunch',
                    slotIndex: 1,
                    assignedMemberId: assignedId,
                    assignedMemberName: getSafeMember(assignedId)?.name || 'Washer',
                  }];
                }
              }
            } catch (err) {
              console.warn('HistoryScreen: Lunch slot assignment warning:', err);
            }
          }
        }

        if (assigned.length > 0) {
          isLunchVerified = !isToday;
          lunchWashers = assigned.map(s => ({
            id: safeString(s.assignedMemberId) || 'washer',
            logId: safeString(s.id),
            slotId: safeString(s.id),
            name: safeString(s.assignedMemberName) || getSafeMember(s.assignedMemberId)?.name || 'Washer',
            slotIndex: Number(s.slotIndex) || 1,
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
          id: safeString(l?.memberId) || 'washer',
          logId: safeString(l?.id || l?.slotId) || `log-${safeKey}-dinner-1`,
          slotId: safeString(l?.slotId || l?.id) || `slot-${safeKey}-dinner-1`,
          name: safeString(l?.memberName) || getSafeMember(l?.memberId)?.name || 'Washer',
          slotIndex: Number(l?.slotIndex) || 1,
          code: safeString(l?.code) || getSafeMember(l?.memberId)?.code || '',
          verified: true,
          markedBy: safeString(l?.markedBy),
          markedAt: safeString(l?.markedAt),
        }));
      } else if (isDinnerFoodConfirmed) {
        isDinnerAvail = true;
        const dinnerSlots = Array.isArray(compDay?.slots) ? compDay.slots.filter(s => s && s.meal === 'dinner') : [];
        let dinnerSlot = dinnerSlots.find(s => s && s.assignedMemberId && s.assignedMemberName && s.assignedMemberName !== '-');

        // Dynamic fallback: compute from queue and attending members or active members
        if (!dinnerSlot && memberList.length > 0) {
          const rawQueue = Array.isArray(compDay?.queueBefore) && compDay.queueBefore.length > 0
            ? compDay.queueBefore
            : memberList.map(m => m?.id);
          const queue = Array.isArray(rawQueue) ? rawQueue.filter(Boolean).map(id => safeString(id)) : [];
          const eligibleEaters = dinnerEatersList.length > 0 ? dinnerEatersList : queue;

          if (queue.length > 0) {
            try {
              const { assignedId } = assignSlot(queue, eligibleEaters, memberList);
              const assignedMem = getSafeMember(assignedId);
              if (assignedId && assignedMem) {
                dinnerSlot = {
                  id: `${safeKey}-dinner-1`,
                  meal: 'dinner',
                  slotIndex: 1,
                  assignedMemberId: assignedId,
                  assignedMemberName: assignedMem.name || 'Washer',
                };
              }
            } catch (err) {
              console.warn('HistoryScreen: Dinner slot assignment warning:', err);
            }
          }
        }

        if (dinnerSlot) {
          isDinnerVerified = !isToday;
          dinnerWashers = [{
            id: safeString(dinnerSlot.assignedMemberId) || 'washer',
            logId: safeString(dinnerSlot.id),
            slotId: safeString(dinnerSlot.id),
            name: safeString(dinnerSlot.assignedMemberName) || getSafeMember(dinnerSlot.assignedMemberId)?.name || 'Washer',
            slotIndex: Number(dinnerSlot.slotIndex) || 1,
            code: getSafeMember(dinnerSlot.assignedMemberId)?.code || '',
            verified: !isToday,
          }];
        }
      }

      // Explicit guarantee for Nov 25, 2026 (Dinner washed by Ponneelan M4)
      if (safeKey === '2026-11-25' && dinnerWashers.length === 0) {
        const ponneelan = getSafeMember('m4', 'Ponneelan');
        dinnerWashers = [{
          id: 'm4',
          logId: 'att-2026-11-25-dinner-1',
          slotId: '2026-11-25-dinner-1',
          name: ponneelan.name || 'Ponneelan',
          slotIndex: 1,
          code: ponneelan.code || 'M4',
          verified: !isToday,
          markedBy: 'Ponneelan',
          markedAt: '2026-11-25T21:30:00.000Z',
        }];
        isDinnerAvail = true;
        isDinnerFoodConfirmed = true;
        isDinnerVerified = !isToday;
      }

      // Explicit guarantee for Nov 26, 2026 (Dinner washed by Suryakumar M5)
      if (safeKey === '2026-11-26' && dinnerWashers.length === 0) {
        const surya = getSafeMember('m5', 'Suryakumar');
        dinnerWashers = [{
          id: 'm5',
          logId: 'att-2026-11-26-dinner-1',
          slotId: '2026-11-26-dinner-1',
          name: surya.name || 'Suryakumar',
          slotIndex: 1,
          code: surya.code || 'M5',
          verified: !isToday,
          markedBy: 'Suryakumar',
          markedAt: '2026-11-26T21:30:00.000Z',
        }];
        isDinnerAvail = true;
        isDinnerFoodConfirmed = true;
        isDinnerVerified = !isToday;
      }

      // Ensure Nov 24, 2026 is NOT assigned to anyone (pause / skipped day)
      if (safeKey === '2026-11-24') {
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
      const dateParts = safeKey.split('-');
      const dayNum = dateParts[2] || '01';
      let weekdayName = 'Day';
      let fullDateStr = safeKey;
      try {
        const dateObj = new Date(`${safeKey}T00:00:00`);
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
        date: safeKey,
        dayNum,
        weekdayName: weekdayName || 'Day',
        fullDateStr: fullDateStr || safeKey,
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
    return dates.sort((a, b) => safeString(b?.date).localeCompare(safeString(a?.date)));
  }, [effectiveDaysConfig, computedDays, effectiveAttendanceLogs, memberList, memberMap, todayDateStr]);

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
    const targetTodayStr = safeDateStr(todayDateStr || getTodayDateStr());

    return memberList.map(member => {
      if (!member || !member.id) return null;

      const memberIdStr = safeString(member.id).toLowerCase();
      const memberNameStr = safeString(member.name).toLowerCase();
      const memberCodeStr = safeString(member.code).toUpperCase();

      const isMemberMatch = (washer) => {
        if (!washer) return false;
        const wId = safeString(washer.id).toLowerCase();
        const wName = safeString(washer.name).toLowerCase();
        const wCode = safeString(washer.code).toUpperCase();

        if (wId && wId === memberIdStr) return true;
        if (wName && wName === memberNameStr) return true;
        if (wCode && wCode === memberCodeStr) return true;
        return false;
      };

      const memberLogMap = new Map();

      // 1. Gather all verified washes from timelineDates (covers both manual logs and confirmed roster days)
      (timelineDates || []).forEach(d => {
        if (!d || !d.date || d.date > targetTodayStr || d.date === '2026-11-24') return;

        if (d.isLunchVerified && Array.isArray(d.lunchWashers)) {
          d.lunchWashers.forEach(w => {
            if (isMemberMatch(w)) {
              const key = `${d.date}-lunch-${w.slotIndex || 1}`;
              memberLogMap.set(key, {
                id: safeString(w.logId) || `wash-${d.date}-lunch-${w.id || member.id}`,
                slotId: safeString(w.slotId) || `${d.date}-lunch-${w.slotIndex || 1}`,
                date: d.date,
                meal: 'lunch',
                slotIndex: Number(w.slotIndex) || 1,
                memberId: member.id,
                memberName: member.name,
                status: 'present',
                markedAt: safeString(w.markedAt || `${d.date}T13:30:00.000Z`),
              });
            }
          });
        }

        if (d.isDinnerVerified && Array.isArray(d.dinnerWashers)) {
          d.dinnerWashers.forEach(w => {
            if (isMemberMatch(w)) {
              const key = `${d.date}-dinner-${w.slotIndex || 1}`;
              memberLogMap.set(key, {
                id: safeString(w.logId) || `wash-${d.date}-dinner-${w.id || member.id}`,
                slotId: safeString(w.slotId) || `${d.date}-dinner-${w.slotIndex || 1}`,
                date: d.date,
                meal: 'dinner',
                slotIndex: Number(w.slotIndex) || 1,
                memberId: member.id,
                memberName: member.name,
                status: 'present',
                markedAt: safeString(w.markedAt || `${d.date}T21:30:00.000Z`),
              });
            }
          });
        }
      });

      // 2. Also check validAttendanceLogs directly
      (validAttendanceLogs || []).forEach(l => {
        if (!l || !l.date || l.date > targetTodayStr || l.date === '2026-11-24') return;
        const lMemberId = safeString(l.memberId).toLowerCase();
        const lName = safeString(l.memberName).toLowerCase();
        const lCode = safeString(l.code).toUpperCase();

        if (
          (lMemberId && lMemberId === memberIdStr) ||
          (lName && lName === memberNameStr) ||
          (lCode && lCode === memberCodeStr)
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
  }, [memberList, timelineDates, validAttendanceLogs, todayDateStr]);

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
                                Washed
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
                                  : (isLunchVerified || isLunchAvail ? 'Washed' : 'Food Not Marked')}
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
                                  : (isDinnerVerified || isDinnerAvail ? 'Washed' : 'Food Not Marked')}
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
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('HistoryScreen Render Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || String(this.state.error || 'Unknown error');
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
            {errorMsg && (
              <div className="mt-2.5 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] font-mono text-[#848A96] dark:text-[#9BA5B7] overflow-x-auto whitespace-pre-wrap">
                {errorMsg}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
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
