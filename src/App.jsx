import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { TopAppBar } from './components/navigation/TopAppBar';
import { BottomNav } from './components/navigation/BottomNav';
import { SettingsModal } from './components/common/SettingsModal';

import { TodayScreen } from './screens/TodayScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { AuthScreen } from './components/auth/AuthScreen';
import { extractNameFromEmail, extractUsername, isKavipriyanEmail } from './logic/authUtils';

import { storage, INITIAL_MEMBERS } from './logic/storage';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'activity' | 'history'
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Dynamic Live Today date (resolves to user's real current date, e.g. 2026-09-23)
  const actualTodayDateStr = useMemo(() => getTodayDateStr(), []);

  // Dynamic Selected Date (defaults to live today)
  const [selectedDateStr, setSelectedDateStr] = useState(actualTodayDateStr);

  // Supabase Authentication Session State
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestBypass, setGuestBypass] = useState(false);

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
  const [attendanceLogs, setAttendanceLogs] = useState(() => storage.getAttendanceLogs());
  const [initialQueue, setInitialQueue] = useState(() => storage.getInitialQueue());
  const [activityLogs, setActivityLogs] = useState(() => storage.getActivityLogs());
  const [adminUserIds, setAdminUserIds] = useState(() => storage.getAdminUserIds());

  const unsubscribeRealtimeRef = useRef(null);

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
        setDaysConfig(val);
      } else if (key === 'initial_queue' && Array.isArray(val)) {
        setInitialQueue(val);
      } else if (key === 'admin_user_ids' && Array.isArray(val)) {
        setAdminUserIds(val);
        storage.saveAdminUserIds(val);
      } else if (key === 'attendance_logs' && Array.isArray(val)) {
        setAttendanceLogs(val);
        storage.saveAttendanceLogs(val);
      }
    }
  }, []);

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
          setMembers(
            remote.members.map(m => ({
              id: m.id,
              name: m.name,
              code: m.code,
              email: m.email || null,
              role: m.role || 'member',
              status: m.status || 'active',
              createdAt: m.created_at || new Date().toISOString(),
              updatedAt: m.updated_at || new Date().toISOString(),
            }))
          );
        }
        if (remote.daysConfig && Array.isArray(remote.daysConfig) && remote.daysConfig.length > 0) {
          setDaysConfig(remote.daysConfig);
        }
        if (remote.initialQueue && Array.isArray(remote.initialQueue) && remote.initialQueue.length > 0) {
          setInitialQueue(remote.initialQueue);
        }
        if (remote.adminUserIds && Array.isArray(remote.adminUserIds)) {
          setAdminUserIds(remote.adminUserIds);
          storage.saveAdminUserIds(remote.adminUserIds);
        }
        if (remote.attendanceHistory && Array.isArray(remote.attendanceHistory) && remote.attendanceHistory.length > 0) {
          setDaysConfig(prev => {
            let updated = [...prev];
            remote.attendanceHistory.forEach(rec => {
              const targetDate = rec.date;
              const meal = rec.meal || rec.meal_type;
              if (!targetDate || !meal) return;
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

        if (remote.attendanceLogs && Array.isArray(remote.attendanceLogs) && remote.attendanceLogs.length > 0) {
          setAttendanceLogs(remote.attendanceLogs);
          storage.saveAttendanceLogs(remote.attendanceLogs);
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
      }
    } catch (err) {
      console.warn('Failed to refresh members list:', err);
    }
  }, []);

  // Universal Realtime Sync on App Mount & Auth State Listeners
  useEffect(() => {
    let isMounted = true;

    // 1. Immediately initialize data sync and bind Universal Realtime channels on mount for ALL users
    syncRealtimeAndData(null);

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
        setGuestBypass(false);
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
    if (!session && guestBypass) return isAdminMode;
    if (isUserKavipriyan) return true;
    if (dbUserRole === 'admin') return true;
    if (loggedInMember?.role === 'admin') return true;
    if (loggedInMember?.id && adminUserIds.includes(loggedInMember.id)) return true;
    return false;
  }, [session, guestBypass, isAdminMode, isUserKavipriyan, dbUserRole, loggedInMember, adminUserIds]);

  const isPrimaryAdmin = isUserKavipriyan || (!session && guestBypass && isAdminMode);

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
    setGuestBypass(false);
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



  // Activity Audit Logger Helper
  const logUserActivity = (actionType, category, title, details, targetDate = selectedDateStr) => {
    const newLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      actorCode: currentMember.code,
      isAdmin,
      actionType,
      category,
      title,
      details,
      targetDate,
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // Date selection handler ensuring target day is covered in configuration
  const handleSelectDate = (dateStr) => {
    setDaysConfig(prev => ensureDaysCoverDate(prev, dateStr));
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
    setMembers(prev =>
      prev.map(m => (m.id === targetMemberId ? { ...m, role: newRole } : m))
    );

    // 2. Save directly to the role column in the Supabase members table
    await supabaseService.updateMemberRole(targetMemberId, newRole);

    // 3. Save adminUserIds into application_settings
    await supabaseService.saveAdminUserIds(updatedAdminIds);

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
  const syncAttendanceAndWasher = async (dateStr, meal, isProvided, eaters, washersCount, nextDaysConfig) => {
    try {
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
          const { assigned1, assigned2, updatedQueue } = assignLunchPair(queueForMeal, activeEaterList);
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
          const { assignedId, updatedQueue } = assignSlot(queueForMeal, activeEaterList);
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
    } catch (err) {
      console.warn('Failed to sync attendance/washer to Supabase:', err);
    }
  };

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
      markedBy: markedBy || (status === 'present' ? `${slot.assignedMemberName} (Self)` : 'System'),
      remarks: remarks || (status === 'present' ? 'Washed successfully' : 'Marked absent'),
    };

    // Remove existing log for this slot if any and add new
    const updated = attendanceLogs.filter(l => l.slotId !== slot.id);
    const nextLogs = [newRecord, ...updated];
    setAttendanceLogs(nextLogs);
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

  const handleUpdateEaters = (meal, eaterIds) => {
    const updatedDays = daysConfig.map(day => {
      if (day.date !== selectedDateStr) return day;
      return {
        ...day,
        [meal === 'lunch' ? 'lunchEaters' : 'dinnerEaters']: eaterIds,
      };
    });
    setDaysConfig(updatedDays);

    const currentDay = updatedDays.find(d => d.date === selectedDateStr);
    const isProvided = meal === 'lunch' ? Boolean(currentDay?.lunchProvided) : Boolean(currentDay?.dinnerProvided);
    const washersCount = meal === 'lunch' ? (Number(currentDay?.lunchWashers) === 2 ? 2 : 1) : 1;

    syncAttendanceAndWasher(selectedDateStr, meal, isProvided, eaterIds, washersCount, updatedDays);

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
    const updatedDays = daysConfig.map(day => {
      if (day.date !== selectedDateStr) return day;
      return {
        ...day,
        [meal === 'lunch' ? 'lunchProvided' : 'dinnerProvided']: provided,
      };
    });
    setDaysConfig(updatedDays);

    const currentDay = updatedDays.find(d => d.date === selectedDateStr);
    const eaterIds = meal === 'lunch' ? (currentDay?.lunchEaters || []) : (currentDay?.dinnerEaters || []);
    const washersCount = meal === 'lunch' ? (Number(currentDay?.lunchWashers) === 2 ? 2 : 1) : 1;

    syncAttendanceAndWasher(selectedDateStr, meal, provided, eaterIds, washersCount, updatedDays);

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
    const updatedDays = daysConfig.map(day => {
      if (day.date !== selectedDateStr) return day;
      return {
        ...day,
        lunchWashers: washersCount,
      };
    });
    setDaysConfig(updatedDays);

    const currentDay = updatedDays.find(d => d.date === selectedDateStr);
    const isProvided = Boolean(currentDay?.lunchProvided);
    const eaterIds = currentDay?.lunchEaters || [];

    syncAttendanceAndWasher(selectedDateStr, 'lunch', isProvided, eaterIds, washersCount, updatedDays);

    logUserActivity(
      'MEAL_TOGGLE',
      'meal_status',
      `Lunch Washer Count: ${washersCount}`,
      `Lunch washer requirement changed to ${washersCount} person(s) by ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleAddMember = async ({ name, code, status }) => {
    if (!isAdmin) return;
    const tempId = `m${Date.now()}`;
    const newMember = {
      id: tempId,
      code: code || `M${members.length + 1}`,
      name,
      status: status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedQueue = insertNewMemberIntoQueue(initialQueue, tempId);
    const rotationPosition = updatedQueue.indexOf(tempId) + 1;

    // Persist new member to Supabase (omits id so Postgres auto-generates UUID)
    const dbRecord = await supabaseService.addMemberToDatabase(newMember, rotationPosition);
    const finalId = dbRecord?.id || tempId;
    newMember.id = finalId;

    const finalQueue = updatedQueue.map(id => (id === tempId ? finalId : id));
    const updatedMembers = [...members, newMember];
    setMembers(updatedMembers);
    setInitialQueue(finalQueue);

    const updatedDays = daysConfig.map(day => ({
      ...day,
      lunchEaters: day.lunchEaters ? [...day.lunchEaters, finalId] : [finalId],
      dinnerEaters: day.dinnerEaters ? [...day.dinnerEaters, finalId] : [finalId],
    }));
    setDaysConfig(updatedDays);

    await supabaseService.saveApplicationRules({
      daysConfig: updatedDays,
      initialQueue: finalQueue,
    });

    logUserActivity(
      'MEMBER_ADD',
      'member',
      `Added New Member: ${name}`,
      `${name} (${newMember.code}) was added to rotation queue at position #${rotationPosition} by Admin ${currentMember.name}.`,
      selectedDateStr
    );
  };

  const handleEditMember = async (id, newName) => {
    if (!isAdmin) return;
    const target = members.find(m => m.id === id);
    const oldName = target?.name || id;

    const updatedMembers = members.map(m =>
      m.id === id ? { ...m, name: newName, updatedAt: new Date().toISOString() } : m
    );
    setMembers(updatedMembers);

    const updatedTarget = updatedMembers.find(m => m.id === id);
    if (updatedTarget) {
      await supabaseService.updateMemberInDatabase(updatedTarget);
    }

    logUserActivity(
      'MEMBER_EDIT',
      'member',
      `Renamed Member: ${oldName} → ${newName}`,
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
    setInitialQueue(updatedQueue);
    setAdminUserIds(updatedAdmins);
    setDaysConfig(updatedDays);

    // Persist updated rules to Supabase
    await supabaseService.saveApplicationRules({
      daysConfig: updatedDays,
      initialQueue: updatedQueue,
      adminUserIds: updatedAdmins,
    });

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

  const activeMembers = members.filter(m => m.status === 'active');

  // 1. Initial Session Loading Indicator
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#ECEEF0] flex flex-col items-center justify-center p-4 selection:bg-[#A28EF9]/30">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#A28EF9] text-[#1E1E1E] flex items-center justify-center font-black text-2xl shadow-xl animate-pulse">
            VW
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-extrabold text-[#1E1E1E]">Vessel Wash System</h2>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-textSecondary font-semibold">
              <span className="w-3.5 h-3.5 border-2 border-[#1E1E1E] border-t-transparent rounded-full animate-spin" />
              <span>Verifying authentication session...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Screen (Supabase Auth Login & Sign Up)
  if (!session && !guestBypass) {
    return (
      <AuthScreen
        onAuthSuccess={(newSession) => setSession(newSession)}
        onContinueOffline={() => setGuestBypass(true)}
        members={members}
      />
    );
  }

  return (
    <div className="w-full h-screen h-[100dvh] bg-[#ECEEF0] flex justify-center selection:bg-primary-100 selection:text-primary overflow-hidden">
      {/* Responsive Container (Mobile: 430px, Tablet: md:max-w-3xl, Desktop: lg:max-w-6xl) */}
      <div className="w-full max-w-[430px] md:max-w-3xl lg:max-w-6xl h-full flex flex-col bg-[#ECEEF0] shadow-2xl relative border-x border-neutral-border/60 overflow-hidden transition-all duration-300">
        {/* Static Top App Bar & Date Bar */}
        <TopAppBar
          title="Vessel Washing"
          currentDateStr={formatHeaderDate(actualTodayDateStr)}
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          onSignOut={handleSignOut}
          onToggleAdminMode={handleToggleAdminMode}
          allMembers={members}
          adminUserIds={adminUserIds}
          onSettingsClick={() => setSettingsOpen(true)}
          isLiveConnected={isSupabaseConfigured}
        />

        {/* Main Content Area (Scrolls independently below static header) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full pb-28">
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

          {activeTab === 'activity' && (
            <ActivityScreen
              activityLogs={activityLogs}
              members={members}
              isAdmin={isAdmin}
              onClearLogs={handleClearActivityLogs}
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
              onTabChange={setActiveTab}
              todayDateStr={actualTodayDateStr}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Settings & Management Hub */}
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
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
        />
      </div>
    </div>
  );
}
