import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { TopAppBar } from './components/navigation/TopAppBar';
import { BottomNav } from './components/navigation/BottomNav';
import { SettingsModal } from './components/common/SettingsModal';
import { GentleReminderBanner } from './components/common/GentleReminderBanner';

import { TodayScreen } from './screens/TodayScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { MembersScreen } from './screens/MembersScreen';
import { BillScreen } from './screens/BillScreen';
import { AuthScreen } from './components/auth/AuthScreen';
import { extractNameFromEmail, extractUsername, isKavipriyanEmail, getNextMemberSequence } from './logic/authUtils';

import { storage, INITIAL_MEMBERS } from './logic/storage';
import { logActivityAction as defaultLogActivityAction, safeLogActivity } from './logic/activityLogger';
import {
  computeMonthRotation,
  insertNewMemberIntoQueue,
  assignSlot,
  assignLunchPair,
} from './logic/rotationEngine';
import {
  getTodayDateStr,
  formatHeaderDate,
  ensureDaysCoverDate,
  ensureMultiYearCoverage,
} from './logic/dateUtils';
import { notificationService } from './services/notificationService';
import { supabaseService } from './services/supabaseService';
import { isSupabaseConfigured } from './services/supabaseClient';

const VALID_TABS = ['today', 'members', 'bill', 'history', 'activity'];

function getInitialNavState() {
  try {
    const rawHash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase().trim();
    if (rawHash === 'settings') {
      const savedTab = sessionStorage.getItem('vw_active_tab');
      return {
        tab: VALID_TABS.includes(savedTab) ? savedTab : 'today',
        settings: true,
      };
    }
    if (VALID_TABS.includes(rawHash)) {
      return { tab: rawHash, settings: false };
    }
    const saved = sessionStorage.getItem('vw_active_tab');
    if (VALID_TABS.includes(saved)) {
      return { tab: saved, settings: false };
    }
  } catch {
    // ignore
  }
  return { tab: 'today', settings: false };
}

export default function App() {
  const initialNav = useMemo(() => getInitialNavState(), []);
  const [activeTab, setActiveTab] = useState(initialNav.tab); // 'today' | 'members' | 'bill' | 'history' | 'activity'
  const [settingsOpen, setSettingsOpen] = useState(initialNav.settings);

  const handleTabChange = useCallback((tab) => {
    if (!VALID_TABS.includes(tab)) return;
    setActiveTab(tab);
    setSettingsOpen(false);
    try {
      sessionStorage.setItem('vw_active_tab', tab);
      window.history.replaceState(null, '', `#${tab}`);
    } catch {
      // ignore
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
    try {
      window.history.replaceState(null, '', '#settings');
    } catch {
      // ignore
    }
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
    try {
      const currentTab = sessionStorage.getItem('vw_active_tab') || activeTab || 'today';
      window.history.replaceState(null, '', `#${currentTab}`);
    } catch {
      // ignore
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      if (!window.location.hash) {
        window.history.replaceState(null, '', settingsOpen ? '#settings' : `#${activeTab}`);
      }
    } catch {}

    const onHashChange = () => {
      const rawHash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase().trim();
      if (rawHash === 'settings') {
        setSettingsOpen(true);
      } else if (VALID_TABS.includes(rawHash)) {
        setActiveTab(rawHash);
        setSettingsOpen(false);
        try {
          sessionStorage.setItem('vw_active_tab', rawHash);
        } catch {}
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [activeTab, settingsOpen]);

  // Dynamic Live Today date (resolves to user's real current date, e.g. 2026-09-23)
  const actualTodayDateStr = useMemo(() => getTodayDateStr(), []);

  // Dynamic Selected Date (defaults to live today)
  const [selectedDateStr, setSelectedDateStr] = useState(actualTodayDateStr);

  // Supabase Authentication Session State
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Admin Mode override state
  const [isAdminMode, setIsAdminMode] = useState(() => {
    try {
      const saved = localStorage.getItem('vw_admin_mode');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleAdminMode = (enabled) => {
    setIsAdminMode(enabled);
    try {
      localStorage.setItem('vw_admin_mode', String(enabled));
    } catch {
      // ignore
    }
  };

  // Application Persistent State
  const [members, setMembers] = useState(() => storage.getMembers());
  const [daysConfig, setDaysConfig] = useState(() => {
    const initialDays = storage.getDaysConfig();
    return ensureMultiYearCoverage(initialDays, actualTodayDateStr);
  });
  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    let loaded = storage.getAttendanceLogs() || [];
    // Skip 2026-11-24 (pause/no meal day)
    loaded = loaded.filter(l => l.date !== '2026-11-24');

    const hasNov18 = loaded.some(l => l.date === '2026-11-18' && l.meal === 'dinner');
    if (!hasNov18) {
      loaded.push({
        id: 'att-2026-11-18-dinner-1',
        slotId: '2026-11-18-dinner-1',
        date: '2026-11-18',
        meal: 'dinner',
        slotIndex: 1,
        memberId: 'm1',
        memberName: 'Kavipriyan',
        status: 'present',
        markedAt: '2026-11-18T21:30:00.000Z',
        remarks: 'Washed by Kavipriyan',
        markedBy: 'Kavipriyan',
      });
    }
    const hasNov19 = loaded.some(l => l.date === '2026-11-19' && l.meal === 'dinner');
    if (!hasNov19) {
      loaded.push({
        id: 'att-2026-11-19-dinner-1',
        slotId: '2026-11-19-dinner-1',
        date: '2026-11-19',
        meal: 'dinner',
        slotIndex: 1,
        memberId: 'm2',
        memberName: 'Marudhu',
        status: 'present',
        markedAt: '2026-11-19T21:30:00.000Z',
        remarks: 'Washed by Marudhu',
        markedBy: 'Marudhu',
      });
    }
    // Nov 25 wash entry: only seed as historical past record if strictly in past
    if (actualTodayDateStr > '2026-11-25') {
      const hasNov25 = loaded.some(l => l.date === '2026-11-25' && l.meal === 'dinner');
      if (!hasNov25) {
        loaded.push({
          id: 'att-2026-11-25-dinner-1',
          slotId: '2026-11-25-dinner-1',
          date: '2026-11-25',
          meal: 'dinner',
          slotIndex: 1,
          memberId: 'm4',
          memberName: 'Ponneelan',
          status: 'present',
          markedAt: '2026-11-25T21:30:00.000Z',
          remarks: 'Washed by Ponneelan',
          markedBy: 'Ponneelan',
        });
      }
    } else {
      // Never allow an unconfirmed pre-seeded log for today
      loaded = loaded.filter(l => l.date !== actualTodayDateStr || l.manuallyMarked === true);
    }
    storage.saveAttendanceLogs(loaded);
    return loaded;
  });
  const [initialQueue, setInitialQueue] = useState(() => storage.getInitialQueue());
  const [activityLogs, setActivityLogs] = useState(() => storage.getActivityLogs());
  const [adminUserIds, setAdminUserIds] = useState(() => storage.getAdminUserIds());
  const [bills, setBills] = useState(() => storage.getReimbursementBills());

  const unsubscribeRealtimeRef = useRef(null);
  const lastLocalEditTimeRef = useRef(0);
  const syncTimeoutRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const selectedDateStrRef = useRef(selectedDateStr);

  useEffect(() => {
    selectedDateStrRef.current = selectedDateStr;
  }, [selectedDateStr]);

  // Centralized Real-time payload handler across all tables (attendance_history, washer_activity, members, application_settings)
  const handleRealtimePayload = useCallback((table, payload) => {
    if (table === 'attendance_history') {
      const rec = payload.new;
      if (!rec) {
        if (payload.old && payload.old.date) {
          const delDate = payload.old.date;
          const delMeal = payload.old.meal || payload.old.meal_type || 'lunch';
          setDaysConfig(prev =>
            prev.map(d => {
              if (d.date !== delDate) return d;
              return {
                ...d,
                [`${delMeal}Provided`]: false,
                [`${delMeal}Eaters`]: [],
              };
            })
          );
        }
        return;
      }

      const targetDate = rec.date;
      const meal = rec.meal || rec.meal_type;
      if (!targetDate || !meal) return;
      if (targetDate === '2026-11-24') return;

      // Ignore realtime echo if this client made local edits in the last 6 seconds
      if (Date.now() - lastLocalEditTimeRef.current < 6000) {
        return;
      }

      const isProvided = rec.is_provided !== undefined ? Boolean(rec.is_provided) : true;
      const eaters = Array.isArray(rec.eaters) ? rec.eaters : [];
      const washersCount = rec.washers_count || 1;

      setDaysConfig(prev =>
        prev.map(d => {
          if (d.date !== targetDate) return d;
          return {
            ...d,
            [meal === 'lunch' ? 'lunchProvided' : 'dinnerProvided']: isProvided,
            [meal === 'lunch' ? 'lunchEaters' : 'dinnerEaters']: eaters,
            ...(meal === 'lunch' && washersCount ? { lunchWashers: washersCount } : {}),
          };
        })
      );
    } else if (table === 'washer_activity') {
      const rec = payload.new;
      if (!rec || !rec.date) return;
      const targetDate = rec.date;
      const meal = rec.meal || rec.meal_type || 'meal';
      const washerNames = Array.isArray(rec.assigned_washer_names)
        ? rec.assigned_washer_names.join(', ')
        : (rec.assigned_washer_names || 'Assigned Member');

      setActivityLogs(prev => {
        const logId = `rt-wash-${rec.id || (targetDate + '-' + meal)}`;
        if (prev.some(l => l.id === logId)) return prev;
        const entry = {
          id: logId,
          timestamp: rec.updated_at || new Date().toISOString(),
          actorName: 'Supabase Realtime',
          actorCode: 'SYNC',
          actionType: 'WASHER_ASSIGNED',
          category: 'wash',
          title: `${meal.toUpperCase()} Washer Assigned: ${washerNames}`,
          details: `Live sync for ${targetDate}. Next in line: ${rec.next_washer_name || 'Rotation queue'}.`,
          targetDate,
        };
        return [entry, ...prev.slice(0, 49)];
      });
    } else if (table === 'members') {
      if (payload.eventType === 'INSERT') {
        const m = payload.new;
        setMembers(prev => {
          const matchIndex = prev.findIndex(
            existing =>
              existing.id === m.id ||
              (existing.name &&
                m.full_name &&
                existing.name.trim().toLowerCase() === m.full_name.trim().toLowerCase())
          );
          const mappedMember = {
            id: m.id,
            name: m.full_name || m.name,
            code: m.code || (matchIndex !== -1 ? prev[matchIndex].code : `M${m.rotation_order || prev.length + 1}`),
            email: m.email || (matchIndex !== -1 ? prev[matchIndex].email : null),
            role: m.role || (matchIndex !== -1 ? prev[matchIndex].role : 'member'),
            status: m.is_active !== undefined ? (m.is_active ? 'active' : 'inactive') : (m.status || 'active'),
            createdAt: m.created_at || new Date().toISOString(),
            updatedAt: m.updated_at || new Date().toISOString(),
          };
          if (matchIndex !== -1) {
            const updated = [...prev];
            updated[matchIndex] = { ...updated[matchIndex], ...mappedMember };
            return supabaseService.deduplicateMembers(updated);
          }
          return supabaseService.deduplicateMembers([...prev, mappedMember]);
        });
      } else if (payload.eventType === 'UPDATE') {
        const m = payload.new;
        setMembers(prev =>
          prev.map(existing => {
            const isMatch =
              existing.id === m.id ||
              (existing.name &&
                m.full_name &&
                existing.name.trim().toLowerCase() === m.full_name.trim().toLowerCase());
            if (!isMatch) return existing;
            return {
              ...existing,
              id: m.id || existing.id,
              name: m.full_name || m.name || existing.name,
              email: m.email !== undefined ? m.email : existing.email,
              role: m.role || existing.role || 'member',
              status:
                m.is_active !== undefined
                  ? (m.is_active ? 'active' : 'inactive')
                  : (m.status || existing.status),
              updatedAt: m.updated_at || new Date().toISOString(),
            };
          })
        );
      } else if (payload.eventType === 'DELETE') {
        const m = payload.old;
        setMembers(prev => prev.filter(existing => existing.id !== m.id));
      }
    } else if (table === 'application_settings') {
      const setting = payload.new;
      const key = setting?.setting_key || setting?.key;
      const val = setting?.setting_value || setting?.value;
      if (key === 'days_config' && Array.isArray(val)) {
        if (Date.now() - lastLocalEditTimeRef.current < 6000) return;
        const covered = ensureMultiYearCoverage(val, actualTodayDateStr);
        setDaysConfig(covered);
        storage.saveDaysConfig(covered);
      } else if (key === 'initial_queue' && Array.isArray(val)) {
        setInitialQueue(val);
      } else if (key === 'admin_user_ids' && Array.isArray(val)) {
        setAdminUserIds(val);
        storage.saveAdminUserIds(val);
      } else if (key === 'attendance_logs' && Array.isArray(val)) {
        setAttendanceLogs(prev => {
          const map = new Map();
          (prev || []).forEach(l => { if (l && l.id) map.set(l.id, l); });
          (val || []).forEach(l => { if (l && l.id) map.set(l.id, l); });
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.markedAt || 0) - new Date(a.markedAt || 0));
          storage.saveAttendanceLogs(merged);
          return merged;
        });
      } else if (key === 'reimbursement_bills' && Array.isArray(val)) {
        if (Date.now() - lastLocalEditTimeRef.current < 6000) return;
        const sorted = [...val].sort((a, b) => {
          const timeA = new Date(a.createdAt || a.billDateTime).getTime();
          const timeB = new Date(b.createdAt || b.billDateTime).getTime();
          return timeB - timeA;
        });
        setBills(sorted);
        storage.saveReimbursementBills(sorted);
      } else if (key === 'members_list' && Array.isArray(val) && val.length > 0) {
        setMembers(prev => {
          const deduplicated = supabaseService.deduplicateMembers(val);
          storage.saveMembers(deduplicated);
          return deduplicated;
        });
      }
    }
  }, [actualTodayDateStr]);

  // Fetch initial remote data and explicitly subscribe to real-time channels
  const syncRealtimeAndData = useCallback(async (activeSession) => {
    if (!isSupabaseConfigured) return;

    // Attach auth token if available
    if (activeSession?.access_token) {
      supabaseService.setRealtimeAuth(activeSession.access_token);
    }

    // Clean previous subscription before re-binding
    if (unsubscribeRealtimeRef.current) {
      try {
        unsubscribeRealtimeRef.current();
      } catch (e) {
        // ignore
      }
      unsubscribeRealtimeRef.current = null;
    }

    // Fetch latest fresh data
    try {
      const remote = await supabaseService.fetchInitialData();
      if (remote.success) {
        if (remote.members && remote.members.length > 0) {
          const localMembers = storage.getMembers() || [];
          const combined = supabaseService.deduplicateMembers([...remote.members, ...localMembers]);
          setMembers(combined);
          storage.saveMembers(combined);
        }
        if (remote.daysConfig && Array.isArray(remote.daysConfig) && remote.daysConfig.length > 0) {
          if (Date.now() - lastLocalEditTimeRef.current >= 6000) {
            const covered = ensureMultiYearCoverage(remote.daysConfig, actualTodayDateStr);
            setDaysConfig(covered);
            storage.saveDaysConfig(covered);
          }
        }
        if (remote.initialQueue && Array.isArray(remote.initialQueue) && remote.initialQueue.length > 0) {
          setInitialQueue(remote.initialQueue);
        }
        if (remote.adminUserIds && Array.isArray(remote.adminUserIds)) {
          setAdminUserIds(remote.adminUserIds);
          storage.saveAdminUserIds(remote.adminUserIds);
        }
        if (remote.attendanceHistory && Array.isArray(remote.attendanceHistory) && remote.attendanceHistory.length > 0) {
          if (Date.now() - lastLocalEditTimeRef.current >= 6000) {
            setDaysConfig(prev => {
              let updated = [...prev];
              remote.attendanceHistory.forEach(rec => {
                const targetDate = rec.date;
                const meal = rec.meal || rec.meal_type;
                if (!targetDate || !meal) return;
                // Never restore revoked pause date 2026-11-24
                if (targetDate === '2026-11-24') return;
                updated = updated.map(d => {
                  if (d.date !== targetDate) return d;
                  return {
                    ...d,
                    [meal === 'lunch' ? 'lunchProvided' : 'dinnerProvided']: rec.is_provided !== undefined ? Boolean(rec.is_provided) : true,
                    [meal === 'lunch' ? 'lunchEaters' : 'dinnerEaters']: Array.isArray(rec.eaters) ? rec.eaters : (d[meal === 'lunch' ? 'lunchEaters' : 'dinnerEaters'] || []),
                    ...(meal === 'lunch' && rec.washers_count ? { lunchWashers: rec.washers_count } : {}),
                  };
                });
              });
              return updated;
            });
          }
        }

        if (remote.attendanceLogs && Array.isArray(remote.attendanceLogs)) {
          let logsToSave = remote.attendanceLogs.filter(l => l.date !== '2026-11-24');
          const hasNov18 = logsToSave.some(l => l.date === '2026-11-18' && l.meal === 'dinner');
          if (!hasNov18) {
            logsToSave.push({
              id: 'att-2026-11-18-dinner-1',
              slotId: '2026-11-18-dinner-1',
              date: '2026-11-18',
              meal: 'dinner',
              slotIndex: 1,
              memberId: 'm1',
              memberName: 'Kavipriyan',
              status: 'present',
              markedAt: '2026-11-18T21:30:00.000Z',
              remarks: 'Washed by Kavipriyan',
              markedBy: 'Kavipriyan',
            });
          }
          const hasNov19 = logsToSave.some(l => l.date === '2026-11-19' && l.meal === 'dinner');
          if (!hasNov19) {
            logsToSave.push({
              id: 'att-2026-11-19-dinner-1',
              slotId: '2026-11-19-dinner-1',
              date: '2026-11-19',
              meal: 'dinner',
              slotIndex: 1,
              memberId: 'm2',
              memberName: 'Marudhu',
              status: 'present',
              markedAt: '2026-11-19T21:30:00.000Z',
              remarks: 'Washed by Marudhu',
              markedBy: 'Marudhu',
            });
          }
          const hasNov25 = logsToSave.some(l => l.date === '2026-11-25' && l.meal === 'dinner');
          if (!hasNov25) {
            logsToSave.push({
              id: 'att-2026-11-25-dinner-1',
              slotId: '2026-11-25-dinner-1',
              date: '2026-11-25',
              meal: 'dinner',
              slotIndex: 1,
              memberId: 'm4',
              memberName: 'Ponneelan',
              status: 'present',
              markedAt: '2026-11-25T21:30:00.000Z',
              remarks: 'Washed by Ponneelan',
              markedBy: 'Ponneelan',
            });
          }
          setAttendanceLogs(logsToSave);
          storage.saveAttendanceLogs(logsToSave);
          supabaseService.saveAttendanceLogs(logsToSave).catch(() => {});
        }

        // Merge local bills with remote bills so offline/newly-created bills are never lost
        const localBills = storage.getReimbursementBills() || [];
        const billMap = new Map();
        localBills.forEach(b => { if (b && b.id) billMap.set(b.id, b); });
        if (remote.reimbursementBills && Array.isArray(remote.reimbursementBills)) {
          remote.reimbursementBills.forEach(b => { if (b && b.id) billMap.set(b.id, b); });
        }
        const mergedBills = Array.from(billMap.values()).sort((a, b) => {
          const timeA = new Date(a.createdAt || a.billDateTime).getTime();
          const timeB = new Date(b.createdAt || b.billDateTime).getTime();
          return timeB - timeA;
        });
        setBills(mergedBills);
        storage.saveReimbursementBills(mergedBills);
        if (localBills.some(lb => !remote.reimbursementBills?.some(rb => rb.id === lb.id))) {
          supabaseService.saveReimbursementBills(mergedBills).catch(() => {});
        }

        // Auto-seed if database is empty on first connection
        if (!remote.members || remote.members.length === 0) {
          console.info('🌱 Seeding initial members & roster into Supabase...');
          await supabaseService.upsertMembersFromRoster(storage.getMembers(), storage.getInitialQueue());
          await supabaseService.saveApplicationRules({
            daysConfig: storage.getDaysConfig(),
            initialQueue: storage.getInitialQueue(),
            adminUserIds: ['m1'],
            rosterRules: { initialSeed: true },
          });
          const refreshed = await supabaseService.fetchInitialData();
          if (refreshed.success && refreshed.members) {
            setMembers(refreshed.members);
            setInitialQueue(refreshed.members.map(m => m.id));
          }
        }
      }
    } catch (err) {
      console.warn('Initial remote fetch warning:', err);
    }

    // Explicitly subscribe to real-time channels: attendance_history, members, washer_activity, and application_settings
    unsubscribeRealtimeRef.current = supabaseService.subscribeToRosterRealtime(
      (table, payload) => {
        handleRealtimePayload(table, payload);
      },
      activeSession
    );
  }, [handleRealtimePayload]);

  // Fresh fetch of members from Supabase to prevent duplicates and keep list synchronized
  const handleRefreshMembers = useCallback(async () => {
    try {
      const freshMembers = await supabaseService.fetchMembers();
      if (freshMembers && freshMembers.length > 0) {
        setMembers(freshMembers);
        storage.saveMembers(freshMembers);
        await supabaseService.saveMembersList(freshMembers);
      }
    } catch (err) {
      console.warn('Failed to refresh members list:', err);
    }
  }, []);

  // Universal Realtime Sync on App Mount & Auth State Listeners
  useEffect(() => {
    let isMounted = true;

    // 1. Immediately initialize data sync on mount once
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      syncRealtimeAndData(null);
    }

    // 2. Concurrently check existing auth session and update token if present
    async function checkAuthSession() {
      try {
        const currentSession = await supabaseService.getSession();
        if (isMounted) {
          setSession(currentSession);
          setAuthLoading(false);
          if (currentSession?.access_token) {
            syncRealtimeAndData(currentSession);
          }
        }
      } catch (err) {
        console.warn('Session check error:', err);
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    checkAuthSession();

    const { data: authSubscription } = supabaseService.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      console.info('🔑 [Supabase Auth Event]:', event, newSession?.user?.email || 'no session');
      setSession(newSession);
      setAuthLoading(false);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        syncRealtimeAndData(newSession);
      } else if (event === 'SIGNED_OUT') {
        syncRealtimeAndData(null);
      }
    });

    return () => {
      isMounted = false;
      if (authSubscription?.subscription?.unsubscribe) {
        authSubscription.subscription.unsubscribe();
      }
      if (unsubscribeRealtimeRef.current) {
        try {
          unsubscribeRealtimeRef.current();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [syncRealtimeAndData]);

  // Resolve logged-in user profile, email & role
  const userEmail = session?.user?.email || '';
  // Extract display name from portion before '@' (e.g. "kavipriyan" from "kavipriyan@gmail.com")
  const extractedUserName = useMemo(() => {
    if (userEmail) return extractUsername(userEmail);
    return 'Kavipriyan';
  }, [userEmail]);

  // Direct role and active status state fetched from Supabase members database table
  const [dbUserRole, setDbUserRole] = useState(null);
  const [dbUserActive, setDbUserActive] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    async function loadRoleFromDatabase() {
      if (userEmail) {
        const profile = await supabaseService.fetchMemberProfile(userEmail);
        if (isCurrent && profile) {
          setDbUserRole(profile.role || 'member');
          setDbUserActive(profile.is_active !== undefined ? profile.is_active : true);
        }
      } else {
        setDbUserRole(null);
        setDbUserActive(true);
      }
    }
    loadRoleFromDatabase();
    return () => {
      isCurrent = false;
    };
  }, [userEmail]);

  const isUserKavipriyan = isKavipriyanEmail(userEmail);

  const loggedInMember = useMemo(() => {
    if (userEmail) {
      const emailLower = userEmail.toLowerCase();
      const extractedLower = extractedUserName.toLowerCase();
      return members.find(
        m =>
          (m.email && m.email.toLowerCase() === emailLower) ||
          (m.name && m.name.toLowerCase() === extractedLower) ||
          (m.email && m.email.split('@')[0].toLowerCase() === extractedLower)
      );
    }
    return null;
  }, [members, userEmail, extractedUserName]);

  // Display name in header profile badge is extracted name from email
  const userName = loggedInMember?.name || extractedUserName || 'Kavipriyan';

  // Role Access Control: Fetch role from members table. If role === 'admin', unlock admin settings.
  // If role === 'member', show only daily roster and attendance tools.
  const isAdmin = useMemo(() => {
    if (!isAdminMode) return false;
    if (isUserKavipriyan) return true;
    if (dbUserRole === 'admin') return true;
    if (loggedInMember?.role === 'admin') return true;
    if (loggedInMember?.id && adminUserIds.includes(loggedInMember.id)) return true;
    return false;
  }, [isAdminMode, isUserKavipriyan, dbUserRole, loggedInMember, adminUserIds]);

  const isPrimaryAdmin = isUserKavipriyan;

  // Current logged in member representation for activity attribution
  const currentMember = useMemo(() => {
    if (loggedInMember) return loggedInMember;
    if (isAdmin) {
      return {
        id: 'm1',
        name: userName || 'Kavipriyan',
        code: 'M1',
      };
    }
    return {
      id: `usr-${userEmail ? userEmail.split('@')[0] : 'member'}`,
      name: userName || 'Standard Member',
      code: 'MB',
    };
  }, [loggedInMember, isAdmin, userName, userEmail]);

  // Log Out / Sign Out Handler
  const handleSignOut = async () => {
    await supabaseService.signOut();
    setSession(null);
  };

  // Request notification permissions silently on app initialization
  useEffect(() => {
    if (notificationService.isSupported() && notificationService.getPermissionStatus() === 'default') {
      notificationService.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    storage.saveMembers(members);
  }, [members]);

  useEffect(() => {
    storage.saveDaysConfig(daysConfig);
  }, [daysConfig]);

  useEffect(() => {
    storage.saveAttendanceLogs(attendanceLogs);
  }, [attendanceLogs]);

  useEffect(() => {
    storage.saveInitialQueue(initialQueue);
  }, [initialQueue]);

  useEffect(() => {
    storage.saveActivityLogs(activityLogs);
  }, [activityLogs]);

  useEffect(() => {
    storage.saveReimbursementBills(bills);
  }, [bills]);



  // Activity Audit Logger Helper
  const logUserActivity = useCallback((actionType, category, title, details, targetDate = selectedDateStr) => {
    try {
      const newLog = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        actorId: currentMember?.id || 'unknown',
        actorName: currentMember?.name || 'User',
        actorCode: currentMember?.code || '',
        isAdmin: Boolean(isAdmin),
        actionType: actionType || 'USER_ACTION',
        category: category || 'general',
        title: title || 'Activity Logged',
        details: String(details || ''),
        targetDate: targetDate || selectedDateStr,
      };
      setActivityLogs(prev => [newLog, ...(Array.isArray(prev) ? prev : [])]);
      return newLog;
    } catch (err) {
      console.warn('[ActivityLogger] logUserActivity caught error:', err);
      return null;
    }
  }, [currentMember, isAdmin, selectedDateStr]);

  // Safe Action-level activity logger helper
  const logActivityAction = useCallback(async (titleOrConfig, details = '', category = 'general', actionType = 'USER_ACTION', targetDate = selectedDateStr) => {
    try {
      if (typeof titleOrConfig === 'object' && titleOrConfig !== null) {
        return defaultLogActivityAction(titleOrConfig);
      }
      const title = titleOrConfig || 'Activity Logged';
      const safeActionType = actionType || (category ? `${String(category).toUpperCase()}_ACTION` : 'USER_ACTION');
      return logUserActivity(safeActionType, category, title, details, targetDate);
    } catch (err) {
      console.warn('[ActivityLogger] Safe logActivityAction fallback caught error:', err);
      return null;
    }
  }, [logUserActivity, selectedDateStr]);

  // Date selection handler ensuring target day is covered in configuration
  const handleSelectDate = (dateStr) => {
    setDaysConfig(prev => {
      const ensured = ensureDaysCoverDate(prev, dateStr);
      storage.saveDaysConfig(ensured);
      return ensured;
    });
    setSelectedDateStr(dateStr);
  };

  // Admin role toggle handler: allows Admins to change any member's role to 'admin' or 'member'
  // Saves these changes directly to the `role` column in the Supabase `members` table
  const handleToggleAdminRole = async (targetMemberId, explicitRole = null) => {
    if (!isAdmin) return;
    const target = members.find(m => m.id === targetMemberId);
    if (!target) return;

    // Kavipriyan is permanent Primary Administrator
    if (target.id === 'm1' || target.name.trim().toLowerCase().includes('kavipriyan')) {
      alert('Kavipriyan is the Primary Administrator and cannot be demoted.');
      return;
    }

    const isCurrentlyAdmin = target.role === 'admin' || adminUserIds.includes(targetMemberId);
    const newRole = explicitRole ? explicitRole : (isCurrentlyAdmin ? 'member' : 'admin');

    // Enforce Maximum 2 Admins constraint (Kavipriyan + 1 Co-Admin) when promoting to admin
    if (newRole === 'admin' && !isCurrentlyAdmin && adminUserIds.length >= 2) {
      alert('Only two members can have an admin role. Please remove the existing Co-Admin before designating a new one.');
      return;
    }

    const updatedAdminIds = newRole === 'admin'
      ? (adminUserIds.includes(targetMemberId) ? adminUserIds : [...adminUserIds, targetMemberId])
      : adminUserIds.filter(id => id !== targetMemberId);

    setAdminUserIds(updatedAdminIds);
    storage.saveAdminUserIds(updatedAdminIds);

    // 1. Update local members state with new role
    const updatedMembers = members.map(m => (m.id === targetMemberId ? { ...m, role: newRole } : m));
    setMembers(updatedMembers);
    storage.saveMembers(updatedMembers);

    // 2. Save directly to the role column in the Supabase members table
    await supabaseService.updateMemberRole(targetMemberId, newRole);

    // 3. Save adminUserIds into application_settings
    await supabaseService.saveAdminUserIds(updatedAdminIds);

    // 4. Save updated members_list into application_settings
    await supabaseService.saveMembersList(updatedMembers);

    logUserActivity(
      'ADMIN_ROLE_CHANGE',
      'admin',
      newRole === 'admin' ? `Designated ${target.name} as Co-Admin` : `Changed ${target.name} role to Member`,
      `${currentMember.name} changed role of ${target.name} to ${newRole}. (Total Admins: ${updatedAdminIds.length}/2)`,
      selectedDateStr
    );
  };

  // Compute rotation simulation across all days in the month
  const { computedDays, finalQueue } = useMemo(() => {
    return computeMonthRotation(members, daysConfig, initialQueue);
  }, [members, daysConfig, initialQueue]);

  // Extract selected day configuration and computed assignments
  const currentDayConfig = useMemo(() => {
    return daysConfig.find(d => d.date === selectedDateStr) || daysConfig[0];
  }, [daysConfig, selectedDateStr]);

  const computedCurrentDay = useMemo(() => {
    return computedDays.find(d => d.date === selectedDateStr) || computedDays[0];
  }, [computedDays, selectedDateStr]);

  // Current queue order at start of selected date
  const currentDayQueue = computedCurrentDay?.queueBefore || finalQueue;

  // Synchronize attendance and recalculate washer assignment to Supabase
  const syncAttendanceAndWasher = useCallback(async (dateStr, meal, isProvided, eaters, washersCount, nextDaysConfig) => {
    try {
      lastLocalEditTimeRef.current = Date.now();
      const activeDays = nextDaysConfig || daysConfig;
      const compDay = computedDays.find(d => d.date === dateStr);
      const queueForMeal = compDay?.queueBefore || initialQueue;

      const activeEaterList = (eaters || []).filter(id => {
        const m = members.find(mem => mem.id === id);
        return m && m.status === 'active';
      });

      let assignedSlots = [];
      let nextWasherId = queueForMeal[0] || null;

      if (isProvided && activeEaterList.length > 0) {
        if (meal === 'lunch' && washersCount === 2 && activeEaterList.length >= 2) {
          const { assigned1, assigned2, updatedQueue } = assignLunchPair(queueForMeal, activeEaterList, members);
          assignedSlots = [
            {
              assignedMemberId: assigned1,
              assignedMemberName: members.find(m => m.id === assigned1)?.name || null,
            },
            {
              assignedMemberId: assigned2,
              assignedMemberName: members.find(m => m.id === assigned2)?.name || null,
            },
          ];
          nextWasherId = updatedQueue[0] || null;
        } else {
          const { assignedId, updatedQueue } = assignSlot(queueForMeal, activeEaterList, members);
          assignedSlots = [
            {
              assignedMemberId: assignedId,
              assignedMemberName: members.find(m => m.id === assignedId)?.name || null,
            },
          ];
          nextWasherId = updatedQueue[0] || null;
        }
      }

      const nextWasherName = nextWasherId ? members.find(m => m.id === nextWasherId)?.name || null : null;

      await supabaseService.saveAttendanceAndWasherActivity({
        date: dateStr,
        meal,
        isProvided,
        eaters,
        washersCount,
        assignedSlots,
        nextWasherId,
        nextWasherName,
      });

      // Persist latest configuration to application_settings
      await supabaseService.saveApplicationRules({
        daysConfig: activeDays,
        initialQueue,
        adminUserIds,
      });
      lastLocalEditTimeRef.current = Date.now();
    } catch (err) {
      console.warn('Failed to sync attendance/washer to Supabase:', err);
    }
  }, [daysConfig, computedDays, initialQueue, members, adminUserIds]);

  // Debounced Supabase sync to eliminate race conditions and rapid-selection self-refreshes
  const debouncedSyncAttendanceAndWasher = useCallback((dateStr, meal, isProvided, eaters, washersCount, nextDaysConfig) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncAttendanceAndWasher(dateStr, meal, isProvided, eaters, washersCount, nextDaysConfig);
    }, 350);
  }, [syncAttendanceAndWasher]);

  // Handlers with Activity Logging
  const handleMarkAttendance = (slot, status, remarks = '', markedBy = '') => {
    const actorLabel = markedBy || (currentMember.id === 'm1' ? 'Admin Kavipriyan' : currentMember.name);
    const newRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      slotId: slot.id,
      date: slot.date,
      meal: slot.meal,
      slotIndex: slot.slotIndex,
      memberId: slot.assignedMemberId,
      memberName: slot.assignedMemberName,
      status: status, // 'present' | 'absent'
      markedAt: new Date().toISOString(),
      markedBy: actorLabel,
      remarks: remarks || (status === 'present' ? 'Washed successfully' : 'Marked absent'),
    };

    // Remove existing log for this slot if any and add new
    const updated = attendanceLogs.filter(l => l.slotId !== slot.id && !(l.date === slot.date && l.meal === slot.meal && l.slotIndex === slot.slotIndex));
    const nextLogs = [newRecord, ...updated];
    setAttendanceLogs(nextLogs);
    storage.saveAttendanceLogs(nextLogs);
    supabaseService.saveAttendanceLogs(nextLogs);

    logUserActivity(
      status === 'present' ? 'MARK_WASHED' : 'MARK_NOT_WASHED',
      'attendance',
      status === 'present'
        ? `Marked Washed: ${slot.meal.toUpperCase()} (Slot ${slot.slotIndex})`
        : `Marked Not Washed: ${slot.meal.toUpperCase()} (Slot ${slot.slotIndex})`,
      `${slot.assignedMemberName} duty was marked as ${status === 'present' ? 'Washed' : 'Not Washed'} by ${actorLabel}${remarks ? ` - "${remarks}"` : ''}.`,
      slot.date
    );
  };

  const handleResetAttendanceForSlot = (slotId) => {
    const existingLog = attendanceLogs.find(l => l.slotId === slotId);
    const nextLogs = attendanceLogs.filter(l => l.slotId !== slotId);
    setAttendanceLogs(nextLogs);
    storage.saveAttendanceLogs(nextLogs);
    supabaseService.saveAttendanceLogs(nextLogs);

    if (existingLog) {
      logUserActivity(
        'RESET_WASH',
        'attendance',
        `Duty Reset: ${existingLog.meal.toUpperCase()} (Slot ${existingLog.slotIndex})`,
        `Washing duty record for ${existingLog.memberName} was reset by ${currentMember.name}.`,
        existingLog.date
      );
    }
  };

  const handleDeleteAttendanceLog = async (logId) => {
    if (!isAdmin) return;
    const existingLog = attendanceLogs.find(l => l.id === logId || l.slotId === logId);
    const nextLogs = attendanceLogs.filter(l => l.id !== logId && l.slotId !== logId);
    setAttendanceLogs(nextLogs);
    storage.saveAttendanceLogs(nextLogs);
    await supabaseService.deleteAttendanceLog(logId);

    if (existingLog) {
      logUserActivity(
        'DELETE_WASH_LOG',
        'attendance',
        `Deleted Wash Log: ${existingLog.date} ${existingLog.meal?.toUpperCase()}`,
        `Wash duty record for ${existingLog.memberName} (${existingLog.date} ${existingLog.meal}) was removed by ${currentMember?.name || 'Admin'}.`,
        existingLog.date
      );
    }
  };

  const handleUpdateEaters = (meal, eaterIds) => {
    lastLocalEditTimeRef.current = Date.now();
    const updatedDays = daysConfig.map(day => {
      if (day.date !== selectedDateStr) return day;
      return {
        ...day,
        [meal === 'lunch' ? 'lunchEaters' : 'dinnerEaters']: eaterIds,
      };
    });
    setDaysConfig(updatedDays);
    storage.saveDaysConfig(updatedDays);

    const currentDay = updatedDays.find(d => d.date === selectedDateStr);
    const isProvided = meal === 'lunch' ? Boolean(currentDay?.lunchProvided) : Boolean(currentDay?.dinnerProvided);
    const washersCount = meal === 'lunch' ? (Number(currentDay?.lunchWashers) === 2 ? 2 : 1) : 1;

    debouncedSyncAttendanceAndWasher(selectedDateStr, meal, isProvided, eaterIds, washersCount, updatedDays);

    const mealTitle = meal === 'lunch' ? 'Lunch' : 'Dinner';
    logUserActivity(
      'EATERS_UPDATE',
      'eaters',
      `Updated ${mealTitle} Eaters (${eaterIds.length} members)`,
      `${mealTitle} eaters list updated to ${eaterIds.length} members by ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleToggleMealProvided = (meal, provided) => {
    lastLocalEditTimeRef.current = Date.now();
    const updatedDays = daysConfig.map(day => {
      if (day.date !== selectedDateStr) return day;
      return {
        ...day,
        [meal === 'lunch' ? 'lunchProvided' : 'dinnerProvided']: provided,
      };
    });
    setDaysConfig(updatedDays);
    storage.saveDaysConfig(updatedDays);

    const currentDay = updatedDays.find(d => d.date === selectedDateStr);
    const eaterIds = meal === 'lunch' ? (currentDay?.lunchEaters || []) : (currentDay?.dinnerEaters || []);
    const washersCount = meal === 'lunch' ? (Number(currentDay?.lunchWashers) === 2 ? 2 : 1) : 1;

    debouncedSyncAttendanceAndWasher(selectedDateStr, meal, provided, eaterIds, washersCount, updatedDays);

    const mealTitle = meal === 'lunch' ? 'Lunch' : 'Dinner';
    logUserActivity(
      'MEAL_TOGGLE',
      'meal_status',
      `${mealTitle} Set to ${provided ? 'Available' : 'Not Available'}`,
      `${mealTitle} marked as ${provided ? 'Available / Cooked' : 'Not Available / Cancelled'} by ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleToggleLunchWashers = (washersCount) => {
    lastLocalEditTimeRef.current = Date.now();
    const updatedDays = daysConfig.map(day => {
      if (day.date !== selectedDateStr) return day;
      return {
        ...day,
        lunchWashers: washersCount,
      };
    });
    setDaysConfig(updatedDays);
    storage.saveDaysConfig(updatedDays);

    const currentDay = updatedDays.find(d => d.date === selectedDateStr);
    const isProvided = Boolean(currentDay?.lunchProvided);
    const eaterIds = currentDay?.lunchEaters || [];

    debouncedSyncAttendanceAndWasher(selectedDateStr, 'lunch', isProvided, eaterIds, washersCount, updatedDays);

    logUserActivity(
      'MEAL_TOGGLE',
      'meal_status',
      `Lunch Washer Count: ${washersCount}`,
      `Lunch washer requirement changed to ${washersCount} person(s) by ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleAddMember = async ({ name, code, status, memberType = 'permanent' }) => {
    if (!isAdmin) return;
    const seq = getNextMemberSequence(members);
    const assignedCode = code || seq.code;
    const assignedId = seq.id;
    const assignedOrder = seq.rotationOrder || seq.nextNum;

    const newMember = {
      id: assignedId,
      code: assignedCode,
      name,
      role: 'member',
      status: status || 'active',
      memberType: memberType || 'permanent',
      rotation_order: memberType === 'permanent' ? assignedOrder : null,
      has_login_set: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const isPermanent = newMember.memberType === 'permanent';
    const updatedQueue = isPermanent
      ? insertNewMemberIntoQueue(initialQueue, assignedId, 'permanent')
      : [...initialQueue];
    const rotationPosition = isPermanent ? updatedQueue.indexOf(assignedId) + 1 : null;

    // Persist new member to Supabase (if members table is reachable)
    const dbRecord = await supabaseService.addMemberToDatabase(newMember, rotationPosition);
    if (dbRecord?.id) {
      newMember.id = dbRecord.id;
    }
    const finalId = newMember.id;

    const finalQueue = isPermanent
      ? updatedQueue.map(id => (id === assignedId ? finalId : id))
      : [...initialQueue];
    const updatedMembers = supabaseService.deduplicateMembers([...members, newMember]);
    setMembers(updatedMembers);
    storage.saveMembers(updatedMembers);
    setInitialQueue(finalQueue);
    storage.saveInitialQueue(finalQueue);

    const updatedDays = daysConfig.map(day => ({
      ...day,
      lunchEaters: day.lunchEaters ? [...day.lunchEaters, finalId] : [finalId],
      dinnerEaters: day.dinnerEaters ? [...day.dinnerEaters, finalId] : [finalId],
    }));
    setDaysConfig(updatedDays);
    storage.saveDaysConfig(updatedDays);

    await supabaseService.saveApplicationRules({
      daysConfig: updatedDays,
      initialQueue: finalQueue,
    });

    // Persist to application_settings 'members_list' for 100% durable cloud persistence
    await supabaseService.saveMembersList(updatedMembers);

    logUserActivity(
      'MEMBER_ADD',
      'member',
      `Added New ${isPermanent ? 'Permanent' : 'Temporary'} Member: ${name}`,
      `${name} (${assignedCode}, ${isPermanent ? 'Permanent' : 'Temporary'}) was added ${isPermanent ? `to rotation queue at position #${rotationPosition}` : 'as attendance-based duty washer'} by Admin ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleEditMember = async (id, newName, newMemberType) => {
    if (!isAdmin) return;
    const target = members.find(m => m.id === id);
    const oldName = target?.name || id;

    const updatedMembers = members.map(m =>
      m.id === id ? {
        ...m,
        name: newName,
        ...(newMemberType ? { memberType: newMemberType } : {}),
        updatedAt: new Date().toISOString()
      } : m
    );
    setMembers(updatedMembers);
    storage.saveMembers(updatedMembers);

    // Update queue if memberType changed
    let updatedQueue = [...initialQueue];
    if (newMemberType === 'permanent' && !updatedQueue.includes(id)) {
      updatedQueue.push(id);
      setInitialQueue(updatedQueue);
      storage.saveInitialQueue(updatedQueue);
    } else if (newMemberType === 'temporary') {
      updatedQueue = updatedQueue.filter(qId => qId !== id);
      setInitialQueue(updatedQueue);
      storage.saveInitialQueue(updatedQueue);
    }

    await supabaseService.saveMembersList(updatedMembers);

    const updatedTarget = updatedMembers.find(m => m.id === id);
    if (updatedTarget) {
      await supabaseService.updateMemberInDatabase(updatedTarget);
    }

    logUserActivity(
      'MEMBER_EDIT',
      'member',
      `Renamed Member: ${oldName} → ${newName}${newMemberType ? ` (${newMemberType})` : ''}`,
      `Member name was updated from "${oldName}" to "${newName}" by Admin ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleToggleMemberStatus = async (id) => {
    if (!isAdmin) return;
    const target = members.find(m => m.id === id);
    const newStatus = target?.status === 'active' ? 'inactive' : 'active';

    const updatedMembers = members.map(m =>
      m.id === id
        ? {
            ...m,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }
        : m
    );
    setMembers(updatedMembers);
    storage.saveMembers(updatedMembers);
    await supabaseService.saveMembersList(updatedMembers);

    const updatedTarget = updatedMembers.find(m => m.id === id);
    if (updatedTarget) {
      await supabaseService.updateMemberInDatabase(updatedTarget);
    }

    logUserActivity(
      'MEMBER_STATUS',
      'member',
      `${newStatus === 'active' ? 'Reactivated' : 'Deactivated'} Member: ${target?.name}`,
      `${target?.name} (${target?.code}) status changed to ${newStatus} by Admin ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleRemoveMember = async (id) => {
    if (!isAdmin) return;
    const target = members.find(m => m.id === id);
    if (!target) return;

    // Safety guard: Kavipriyan / primary admin cannot be removed
    const isPrimary = id === 'm1' || (target.name && target.name.trim().toLowerCase().includes('kavipriyan'));
    if (isPrimary) {
      alert('The primary administrator cannot be removed.');
      return;
    }

    const updatedMembers = members.filter(m => m.id !== id);
    const updatedQueue = initialQueue.filter(qId => qId !== id);
    const updatedAdmins = adminUserIds.filter(aId => aId !== id);

    const updatedDays = daysConfig.map(day => ({
      ...day,
      lunchEaters: (day.lunchEaters || []).filter(eId => eId !== id),
      dinnerEaters: (day.dinnerEaters || []).filter(eId => eId !== id),
    }));

    setMembers(updatedMembers);
    storage.saveMembers(updatedMembers);
    setInitialQueue(updatedQueue);
    setAdminUserIds(updatedAdmins);
    setDaysConfig(updatedDays);

    // Persist updated rules to Supabase
    await supabaseService.saveApplicationRules({
      daysConfig: updatedDays,
      initialQueue: updatedQueue,
      adminUserIds: updatedAdmins,
    });

    // Persist updated members_list to application_settings
    await supabaseService.saveMembersList(updatedMembers);

    // Delete member record from Supabase members table
    await supabaseService.deleteMemberFromDatabase(id, target.name);

    logUserActivity(
      'MEMBER_REMOVED',
      'member',
      `Removed Member: ${target.name}`,
      `Member ${target.name} (${target.code}) was removed from the roster and rotation queue by Admin ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleClearActivityLogs = () => {
    if (!isAdmin) return;
    storage.saveActivityLogs([]);
    setActivityLogs([]);
  };

  const handleImportExcel = async (parsedData) => {
    if (!isAdmin) return;
    if (parsedData.daysConfig && parsedData.daysConfig.length > 0) {
      setDaysConfig(parsedData.daysConfig);
    }
    if (parsedData.attendanceLogs) {
      setAttendanceLogs(parsedData.attendanceLogs);
    }
    if (parsedData.detectedMembers && parsedData.detectedMembers.length > 0) {
      setMembers(parsedData.detectedMembers);
    }

    const rosterMembers = parsedData.detectedMembers && parsedData.detectedMembers.length > 0
      ? parsedData.detectedMembers
      : members;

    // Persist members with rotation order to Supabase
    await supabaseService.upsertMembersFromRoster(rosterMembers, initialQueue);

    // Store timetable matrix and rules in application_settings
    await supabaseService.saveApplicationRules({
      daysConfig: parsedData.daysConfig || daysConfig,
      initialQueue: initialQueue,
      adminUserIds,
      rosterRules: {
        sheetName: parsedData.sheetName,
        totalRows: parsedData.totalRows,
        lastMarkedDate: parsedData.lastMarkedDate,
      },
    });

    logUserActivity(
      'SYSTEM_IMPORT',
      'system',
      `Imported Timetable Excel (${parsedData.sheetName})`,
      `Synced ${parsedData.totalRows} days and ${parsedData.attendanceLogs?.length || 0} historical records (last marked: ${parsedData.lastMarkedDate || 'None'}) from uploaded Excel by Admin ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleResetData = async () => {
    if (!isAdmin) return;
    storage.resetToDefault();
    setMembers(INITIAL_MEMBERS);
    const initialDays = ensureDaysCoverDate(storage.getDaysConfig(), actualTodayDateStr);
    const initialQ = INITIAL_MEMBERS.map(m => m.id);
    const defaultAdmins = ['m1'];
    setDaysConfig(initialDays);
    setAttendanceLogs(storage.getAttendanceLogs());
    setInitialQueue(initialQ);
    setActivityLogs(storage.getActivityLogs());
    setAdminUserIds(defaultAdmins);
    setSelectedDateStr(actualTodayDateStr);

    // Sync reset seed data to Supabase
    await supabaseService.upsertMembersFromRoster(INITIAL_MEMBERS, initialQ);
    await supabaseService.saveApplicationRules({
      daysConfig: initialDays,
      initialQueue: initialQ,
      adminUserIds: defaultAdmins,
      rosterRules: { resetToDefault: true },
    });
  };

  // Handle Create Reimbursement Bill
  const handleCreateBill = useCallback(async (billData) => {
    lastLocalEditTimeRef.current = Date.now();
    const existing = storage.getReimbursementBills() || [];
    const nextReceiptId = storage.generateNextReceiptId(existing);
    const newBill = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      receiptId: nextReceiptId,
      billDateTime: billData.billDateTime || new Date().toISOString(),
      paidByMemberId: billData.paidByMemberId || currentMember?.id || 'm1',
      paidByMemberName: billData.paidByMemberName || currentMember?.name || 'Member',
      paidByMemberCode: billData.paidByMemberCode || currentMember?.code || 'M1',
      expenseType: billData.expenseType || 'General Expense',
      lineItems: Array.isArray(billData.lineItems) ? billData.lineItems : [],
      totalAmount: Number(billData.totalAmount) || 0,
      createdBy: currentMember?.id || 'unknown',
      creatorName: currentMember?.name || 'Member',
      creatorEmail: userEmail || '',
      createdAt: new Date().toISOString(),
    };

    let updatedBills = [];
    setBills(prev => {
      const filtered = (prev || []).filter(b => b.id !== newBill.id);
      updatedBills = [newBill, ...filtered];
      storage.saveReimbursementBills(updatedBills);
      return updatedBills;
    });

    try {
      await supabaseService.saveReimbursementBills([newBill]);
    } catch (dbErr) {
      console.warn('[BillScreen] Non-fatal: Supabase sync error for new bill:', dbErr);
    }

    try {
      if (typeof logActivityAction === 'function') {
        await logActivityAction(
          'Bill Created',
          `Expense receipt ${nextReceiptId} for ₹${newBill.totalAmount.toLocaleString('en-IN')} (${newBill.expenseType}) recorded by ${currentMember?.name || 'User'}.`,
          'bill'
        );
      }
    } catch (actErr) {
      console.warn('[BillScreen] Non-fatal: Activity log error on bill create:', actErr);
    }

    return newBill;
  }, [currentMember, userEmail, logActivityAction]);

  // Handle Delete Reimbursement Bill
  const handleDeleteBill = useCallback(async (billId) => {
    lastLocalEditTimeRef.current = Date.now();
    let target = null;
    setBills(prev => {
      target = (prev || []).find(b => b.id === billId);
      const remaining = (prev || []).filter(b => b.id !== billId);
      storage.saveReimbursementBills(remaining);
      return remaining;
    });

    try {
      await supabaseService.deleteReimbursementBill(billId);
    } catch (dbErr) {
      console.warn('[BillScreen] Non-fatal: Supabase sync error on bill delete:', dbErr);
    }

    if (target) {
      try {
        if (typeof logActivityAction === 'function') {
          await logActivityAction(
            'Bill Deleted',
            `Receipt ${target.receiptId} (₹${target.totalAmount.toLocaleString('en-IN')}) was removed by ${currentMember?.name || 'User'}.`,
            'bill'
          );
        }
      } catch (actErr) {
        console.warn('[BillScreen] Non-fatal: Activity log error on bill delete:', actErr);
      }
    }
  }, [currentMember, logActivityAction]);

  const activeMembers = members.filter(m => m.status === 'active');

  // 1. Initial Session Loading Indicator
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F2F1ED] dark:bg-[#0B0C0E] flex flex-col items-center justify-center p-4 selection:bg-[#ECBD56]/30">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#ECBD56] text-[#111216] flex items-center justify-center font-black text-2xl shadow-xl animate-pulse">
            VW
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-extrabold text-[#111216] dark:text-[#F7F6F3]">Vessel Wash System</h2>
            <div className="flex items-center justify-center gap-2 text-xs text-[#4E525D] dark:text-[#9BA5B7] font-semibold">
              <span className="w-3.5 h-3.5 border-2 border-[#ECBD56] border-t-transparent rounded-full animate-spin" />
              <span>Verifying authentication session...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Screen (Strict Supabase Auth Login)
  if (!session) {
    return (
      <AuthScreen
        onAuthSuccess={(newSession) => setSession(newSession)}
        members={members}
      />
    );
  }

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col items-center bg-[#F2F1ED] dark:bg-[#0B0C0E] text-[#111216] dark:text-[#F7F6F3] selection:bg-[#EA580C]/30 selection:text-[#111216]">
      {/* Locked Full-Viewport Shell Container (Mobile: 430px, Tablet: md:max-w-3xl, Desktop: lg:max-w-6xl) */}
      <div className="w-full max-w-[430px] md:max-w-3xl lg:max-w-6xl h-full max-h-[100dvh] flex flex-col bg-[#F2F1ED] dark:bg-[#0B0C0E] shadow-2xl relative border-x border-[#DDD9D0] dark:border-[#2A364B] overflow-hidden">
        {/* Top Header: strictly static (shrink-0) */}
        <TopAppBar
          title="Vessel Washing"
          currentDateStr={formatHeaderDate(actualTodayDateStr)}
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          currentMember={currentMember}
          memberCode={currentMember?.code}
          onSignOut={handleSignOut}
          onToggleAdminMode={handleToggleAdminMode}
          allMembers={members}
          adminUserIds={adminUserIds}
          onSettingsClick={handleOpenSettings}
          isLiveConnected={isSupabaseConfigured}
        />

        {/* Middle Content Area (Confine all vertical scrolling exclusively here) */}
        <main className="flex-1 overflow-y-auto overscroll-contain w-full min-h-0">
          {activeTab === 'today' && (
            <TodayScreen
              currentDateStr={actualTodayDateStr}
              selectedDateStr={selectedDateStr}
              onSelectDate={handleSelectDate}
              availableDays={daysConfig}
              todayConfig={currentDayConfig}
              computedToday={computedCurrentDay}
              activeMembers={activeMembers}
              allMembers={members}
              queue={currentDayQueue}
              attendanceLogs={attendanceLogs}
              isAdmin={isAdmin}
              onMarkAttendance={handleMarkAttendance}
              onUpdateEaters={handleUpdateEaters}
              onToggleMealProvided={handleToggleMealProvided}
              onToggleLunchWashers={handleToggleLunchWashers}
              onResetAttendanceForSlot={handleResetAttendanceForSlot}
            />
          )}

          {activeTab === 'members' && (
            <MembersScreen
              members={members}
              queue={currentDayQueue}
              attendanceLogs={attendanceLogs}
              isAdmin={isAdmin}
              adminUserIds={adminUserIds}
              onToggleAdminRole={handleToggleAdminRole}
              onAddMember={handleAddMember}
              onEditMember={handleEditMember}
              onToggleMemberStatus={handleToggleMemberStatus}
              onRemoveMember={handleRemoveMember}
              onRefreshMembers={handleRefreshMembers}
            />
          )}

          {activeTab === 'bill' && (
            <BillScreen
              bills={bills}
              members={members}
              currentMember={currentMember}
              isAdmin={isAdmin}
              userEmail={userEmail}
              onSaveBill={handleCreateBill}
              onDeleteBill={handleDeleteBill}
              todayDateStr={actualTodayDateStr}
            />
          )}

          {activeTab === 'history' && (
            <HistoryScreen
              attendanceLogs={attendanceLogs}
              members={members}
              daysConfig={daysConfig}
              computedDays={computedDays}
              selectedDateStr={selectedDateStr}
              onSelectDate={handleSelectDate}
              onTabChange={handleTabChange}
              todayDateStr={actualTodayDateStr}
              isAdmin={isAdmin}
              currentMember={currentMember}
              onDeleteWashLog={handleDeleteAttendanceLog}
              onResetAttendanceForSlot={handleResetAttendanceForSlot}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityScreen
              activityLogs={activityLogs}
              members={members}
              isAdmin={isAdmin}
              onClearLogs={handleClearActivityLogs}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenSettings={handleOpenSettings}
        />

        {/* Settings & Management Hub */}
        <SettingsModal
          isOpen={settingsOpen}
          onClose={handleCloseSettings}
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          onSignOut={handleSignOut}
          members={members}
          queue={currentDayQueue}
          attendanceLogs={attendanceLogs}
          computedDays={computedDays}
          todayDateStr={actualTodayDateStr}
          adminUserIds={adminUserIds}
          onToggleAdminRole={handleToggleAdminRole}
          onAddMember={handleAddMember}
          onEditMember={handleEditMember}
          onToggleMemberStatus={handleToggleMemberStatus}
          onRemoveMember={handleRemoveMember}
          onRefreshMembers={handleRefreshMembers}
          onImportExcel={handleImportExcel}
          onResetData={handleResetData}
          activityLogs={activityLogs}
          onClearLogs={handleClearActivityLogs}
        />
      </div>
    </div>
  );
}
