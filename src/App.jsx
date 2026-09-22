import React, { useState, useMemo, useEffect } from 'react';
import { TopAppBar } from './components/navigation/TopAppBar';
import { BottomNav } from './components/navigation/BottomNav';
import { SettingsModal } from './components/common/SettingsModal';

import { TodayScreen } from './screens/TodayScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { HistoryScreen } from './screens/HistoryScreen';

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

  // Admin Mode state (Default: true for Admin Kavipriyan)
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

  // Active User Profile for Role-Based Access Control
  const currentUserId = isAdminMode ? 'm1' : 'member';

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

  // Current logged in member representation
  const currentMember = useMemo(() => {
    if (isAdminMode) {
      return members.find(m => m.id === 'm1') || {
        id: 'm1',
        name: 'Kavipriyan',
        code: 'M1',
      };
    }
    return {
      id: 'guest',
      name: 'Standard Member',
      code: 'MB',
    };
  }, [members, isAdminMode]);

  // Primary Admin: Kavipriyan is permanent administrator
  const isPrimaryAdmin = isAdminMode;

  // Admin access control: Kavipriyan + designated co-admins
  const isAdmin = isAdminMode;

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

  // Supabase Initial Remote Data Sync & Realtime Subscription
  useEffect(() => {
    let isMounted = true;

    async function initSupabaseData() {
      try {
        const remote = await supabaseService.fetchInitialData();
        if (remote.success && isMounted) {
          if (remote.members && remote.members.length > 0) {
            setMembers(
              remote.members.map(m => ({
                id: m.id,
                name: m.name,
                code: m.code,
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
            if (refreshed.success && refreshed.members && isMounted) {
              setMembers(refreshed.members);
              setInitialQueue(refreshed.members.map(m => m.id));
            }
          }
        }
      } catch (err) {
        console.warn('Supabase initial fetch failed, using local cache:', err);
      }
    }

    initSupabaseData();

    // Subscribe to Realtime postgres changes across tables
    const unsubscribe = supabaseService.subscribeToRosterRealtime((table, payload) => {
      if (!isMounted) return;

      if (table === 'attendance_history') {
        const rec = payload.new;
        if (!rec || !rec.date || !rec.meal) return;
        setDaysConfig(prev =>
          prev.map(d => {
            if (d.date !== rec.date) return d;
            return {
              ...d,
              [rec.meal === 'lunch' ? 'lunchProvided' : 'dinnerProvided']: Boolean(rec.is_provided),
              [rec.meal === 'lunch' ? 'lunchEaters' : 'dinnerEaters']: rec.eaters || [],
              ...(rec.meal === 'lunch' && rec.washers_count ? { lunchWashers: rec.washers_count } : {}),
            };
          })
        );
      } else if (table === 'members') {
        if (payload.eventType === 'INSERT') {
          const m = payload.new;
          setMembers(prev => {
            if (prev.some(existing => existing.id === m.id)) return prev;
            return [
              ...prev,
              {
                id: m.id,
                name: m.full_name || m.name,
                code: `M${m.rotation_order || prev.length + 1}`,
                status: m.is_active !== undefined ? (m.is_active ? 'active' : 'inactive') : 'active',
                createdAt: m.created_at,
                updatedAt: m.updated_at,
              },
            ];
          });
        } else if (payload.eventType === 'UPDATE') {
          const m = payload.new;
          setMembers(prev =>
            prev.map(existing =>
              existing.id === m.id
                ? {
                    ...existing,
                    name: m.full_name || m.name || existing.name,
                    status:
                      m.is_active !== undefined
                        ? m.is_active
                          ? 'active'
                          : 'inactive'
                        : existing.status,
                    updatedAt: m.updated_at || new Date().toISOString(),
                  }
                : existing
            )
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
        }
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

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

  // Admin delegation handler (allows designated admins, protects Kavipriyan)
  const handleToggleAdminRole = async (targetMemberId) => {
    if (!isAdmin) return;
    const target = members.find(m => m.id === targetMemberId);
    if (!target) return;

    // Kavipriyan is permanent Primary Administrator
    if (target.id === 'm1' || target.name.trim().toLowerCase().includes('kavipriyan')) {
      alert('Kavipriyan is the Primary Administrator and cannot be demoted.');
      return;
    }

    const isCurrentlyAdmin = adminUserIds.includes(targetMemberId);

    // Enforce Maximum 2 Admins constraint (Kavipriyan + 1 Co-Admin)
    if (!isCurrentlyAdmin && adminUserIds.length >= 2) {
      alert('Only two members can have an admin role. Please remove the existing Co-Admin before designating a new one.');
      return;
    }

    const updatedAdminIds = isCurrentlyAdmin
      ? adminUserIds.filter(id => id !== targetMemberId)
      : [...adminUserIds, targetMemberId];

    setAdminUserIds(updatedAdminIds);
    storage.saveAdminUserIds(updatedAdminIds);

    await supabaseService.saveAdminUserIds(updatedAdminIds);

    logUserActivity(
      'ADMIN_ROLE_CHANGE',
      'admin',
      isCurrentlyAdmin ? `Removed ${target.name} from Admin` : `Designated ${target.name} as Co-Admin`,
      `${currentMember.name} ${isCurrentlyAdmin ? 'removed admin privileges from' : 'delegated Co-Admin privileges to'} ${target.name}. (Total Admins: ${updatedAdminIds.length}/2)`,
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
    setAttendanceLogs([newRecord, ...updated]);

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
    setAttendanceLogs(attendanceLogs.filter(l => l.slotId !== slotId));

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

  return (
    <div className="w-full h-screen h-[100dvh] bg-[#ECEEF0] flex justify-center selection:bg-primary-100 selection:text-primary overflow-hidden">
      {/* Responsive Container (Mobile: 430px, Tablet: md:max-w-3xl, Desktop: lg:max-w-6xl) */}
      <div className="w-full max-w-[430px] md:max-w-3xl lg:max-w-6xl h-full flex flex-col bg-[#ECEEF0] shadow-2xl relative border-x border-neutral-border/60 overflow-hidden transition-all duration-300">
        {/* Static Top App Bar & Date Bar */}
        <TopAppBar
          title="Vessel Washing"
          currentDateStr={formatHeaderDate(actualTodayDateStr)}
          isAdmin={isAdmin}
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
          onImportExcel={handleImportExcel}
          onResetData={handleResetData}
        />
      </div>
    </div>
  );
}
