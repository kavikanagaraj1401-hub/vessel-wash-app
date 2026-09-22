/**
 * LocalStorage and Data Persistence for Vessel Washing App
 * Seeded with source of truth data from `new_vessel_washing_rotation(Timetable).csv`
 */

export const INITIAL_MEMBERS = [
  {
    id: 'm1',
    code: 'M1',
    name: 'Kavipriyan',
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'm2',
    code: 'M2',
    name: 'Marudhu',
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'm3',
    code: 'M3',
    name: 'Perumal',
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'm4',
    code: 'M4',
    name: 'Ponneelan',
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'm5',
    code: 'M5',
    name: 'Suryakumar',
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

/**
 * Generates days configuration for September 2026 (30 days)
 * Populated with historical data from `new_vessel_washing_rotation(Timetable).csv` (Sep 1 to Sep 16).
 * Sep 17 and Sep 18 (Today) onwards are clean and ready for live continuation.
 */
export function generateInitialMonthConfig() {
  const days = [];

  for (let day = 1; day <= 30; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `2026-09-${dayStr}`;
    const dateObj = new Date(2026, 8, day); // 8 is Sept

    // Default: Both lunch and dinner are UNAVAILABLE
    let lunchProvided = false;
    let dinnerProvided = false;
    let lunchWashers = 1;
    let lunchEaters = [];
    let dinnerEaters = [];

    // Historical records from `new_vessel_washing_rotation(Timetable).csv`
    if (day === 1) {
      // 01-Sep: Dinner came from hotel, no vessels
      dinnerProvided = true;
      dinnerEaters = [];
    } else if (day === 4) {
      // 04-Sep: Lunch (2 washers), all 5 ate
      lunchProvided = true;
      lunchWashers = 2;
      lunchEaters = ['m1', 'm2', 'm3', 'm4', 'm5'];
    } else if (day === 6) {
      // 06-Sep: Lunch (1 washer), Kavipriyan, Ponneelan, Suryakumar
      lunchProvided = true;
      lunchWashers = 1;
      lunchEaters = ['m1', 'm4', 'm5'];
    } else if (day === 8) {
      // 08-Sep: Dinner (1 washer), all 5 ate
      dinnerProvided = true;
      dinnerEaters = ['m1', 'm2', 'm3', 'm4', 'm5'];
    } else if (day === 9) {
      // 09-Sep: Dinner (1 washer), all 5 ate
      dinnerProvided = true;
      dinnerEaters = ['m1', 'm2', 'm3', 'm4', 'm5'];
    } else if (day === 10) {
      // 10-Sep: Dinner (1 washer), all 5 ate
      dinnerProvided = true;
      dinnerEaters = ['m1', 'm2', 'm3', 'm4', 'm5'];
    } else if (day === 15) {
      // 15-Sep: Lunch (1 washer), Kavipriyan, Marudhu, Ponneelan
      lunchProvided = true;
      lunchWashers = 1;
      lunchEaters = ['m1', 'm2', 'm4'];
    } else if (day === 16) {
      // 16-Sep: Dinner (1 washer), Kavipriyan, Ponneelan, Suryakumar
      dinnerProvided = true;
      dinnerEaters = ['m1', 'm4', 'm5'];
    }

    days.push({
      date: dateStr,
      dayNumber: day,
      dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      lunchProvided,
      lunchWashers,
      dinnerProvided,
      lunchEaters,
      dinnerEaters,
    });
  }

  return days;
}

// Initial Attendance Logs from `new_vessel_washing_rotation(Timetable).csv`
export const INITIAL_ATTENDANCE_LOGS = [
  {
    id: 'att-2026-09-04-lunch-1',
    slotId: '2026-09-04-lunch-1',
    date: '2026-09-04',
    meal: 'lunch',
    slotIndex: 1,
    memberId: 'm1',
    memberName: 'Kavipriyan',
    status: 'present',
    markedAt: '2026-09-04T13:30:00.000Z',
    remarks: 'Lunch Washer 1',
  },
  {
    id: 'att-2026-09-04-lunch-2',
    slotId: '2026-09-04-lunch-2',
    date: '2026-09-04',
    meal: 'lunch',
    slotIndex: 2,
    memberId: 'm2',
    memberName: 'Marudhu',
    status: 'present',
    markedAt: '2026-09-04T13:32:00.000Z',
    remarks: 'Instead of Marudhu -> Suryakumar Washed',
  },
  {
    id: 'att-2026-09-06-lunch-1',
    slotId: '2026-09-06-lunch-1',
    date: '2026-09-06',
    meal: 'lunch',
    slotIndex: 1,
    memberId: 'm4',
    memberName: 'Ponneelan',
    status: 'present',
    markedAt: '2026-09-06T13:45:00.000Z',
    remarks: 'Instead of Ponneelan -> Suryakumar Washed',
  },
  {
    id: 'att-2026-09-08-dinner-1',
    slotId: '2026-09-08-dinner-1',
    date: '2026-09-08',
    meal: 'dinner',
    slotIndex: 1,
    memberId: 'm3',
    memberName: 'Perumal',
    status: 'present',
    markedAt: '2026-09-08T20:45:00.000Z',
    remarks: 'Dinner Washer',
  },
  {
    id: 'att-2026-09-09-dinner-1',
    slotId: '2026-09-09-dinner-1',
    date: '2026-09-09',
    meal: 'dinner',
    slotIndex: 1,
    memberId: 'm5',
    memberName: 'Suryakumar',
    status: 'present',
    markedAt: '2026-09-09T20:50:00.000Z',
    remarks: 'Instead of Suryakumar -> Marudhu Washed',
  },
  {
    id: 'att-2026-09-10-dinner-1',
    slotId: '2026-09-10-dinner-1',
    date: '2026-09-10',
    meal: 'dinner',
    slotIndex: 1,
    memberId: 'm1',
    memberName: 'Kavipriyan',
    status: 'present',
    markedAt: '2026-09-10T20:40:00.000Z',
    remarks: 'Dinner Washer',
  },
  {
    id: 'att-2026-09-15-lunch-1',
    slotId: '2026-09-15-lunch-1',
    date: '2026-09-15',
    meal: 'lunch',
    slotIndex: 1,
    memberId: 'm2',
    memberName: 'Marudhu',
    status: 'present',
    markedAt: '2026-09-15T13:40:00.000Z',
    remarks: 'Lunch Washer',
  },
  {
    id: 'att-2026-09-16-dinner-1',
    slotId: '2026-09-16-dinner-1',
    date: '2026-09-16',
    meal: 'dinner',
    slotIndex: 1,
    memberId: 'm4',
    memberName: 'Ponneelan',
    status: 'present',
    markedAt: '2026-09-16T20:30:00.000Z',
    remarks: 'Dinner Washer',
  },
];

export const INITIAL_ACTIVITY_LOGS = [
  {
    id: 'act-init-1',
    timestamp: '2026-09-01T09:00:00.000Z',
    actorId: 'm1',
    actorName: 'Kavipriyan',
    actorCode: 'M1',
    isAdmin: true,
    actionType: 'SYSTEM_SETUP',
    category: 'system',
    title: 'Rotation System Initialized',
    details: 'Initial queue configured in alphabetical order: Kavipriyan, Marudhu, Perumal, Ponneelan, Suryakumar.',
    targetDate: '2026-09-01',
  },
  {
    id: 'act-init-2',
    timestamp: '2026-09-16T21:00:00.000Z',
    actorId: 'm1',
    actorName: 'Kavipriyan',
    actorCode: 'M1',
    isAdmin: true,
    actionType: 'TIMETABLE_IMPORT',
    category: 'system',
    title: 'Historical Rotation Data Imported',
    details: 'Verified attendance from Excel Timetable (1-Sep to 16-Sep) imported successfully.',
    targetDate: '2026-09-16',
  },
  {
    id: 'act-init-3',
    timestamp: '2026-09-21T09:30:00.000Z',
    actorId: 'm1',
    actorName: 'Kavipriyan',
    actorCode: 'M1',
    isAdmin: true,
    actionType: 'ADMIN_ASSIGNED',
    category: 'member',
    title: 'Admin Role Assigned',
    details: 'Kavipriyan (Member 1) designated as Admin with exclusive edit and management permissions.',
    targetDate: '2026-09-21',
  },
];

const STORAGE_KEYS = {
  MEMBERS: 'vw_app_members_v4',
  DAYS_CONFIG: 'vw_app_days_config_v4',
  ATTENDANCE: 'vw_app_attendance_logs_v4',
  INITIAL_QUEUE: 'vw_app_initial_queue_v4',
  ACTIVITY_LOGS: 'vw_app_activity_logs_v4',
};

export const storage = {
  getMembers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      return data ? JSON.parse(data) : INITIAL_MEMBERS;
    } catch (e) {
      return INITIAL_MEMBERS;
    }
  },
  saveMembers(members) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  },

  getDaysConfig() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAYS_CONFIG);
      return data ? JSON.parse(data) : generateInitialMonthConfig();
    } catch (e) {
      return generateInitialMonthConfig();
    }
  },
  saveDaysConfig(days) {
    localStorage.setItem(STORAGE_KEYS.DAYS_CONFIG, JSON.stringify(days));
  },

  getAttendanceLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : INITIAL_ATTENDANCE_LOGS;
    } catch (e) {
      return INITIAL_ATTENDANCE_LOGS;
    }
  },
  saveAttendanceLogs(logs) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(logs));
  },

  getInitialQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INITIAL_QUEUE);
      return data ? JSON.parse(data) : INITIAL_MEMBERS.map(m => m.id);
    } catch (e) {
      return INITIAL_MEMBERS.map(m => m.id);
    }
  },
  saveInitialQueue(queue) {
    localStorage.setItem(STORAGE_KEYS.INITIAL_QUEUE, JSON.stringify(queue));
  },

  getActivityLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
      return data ? JSON.parse(data) : INITIAL_ACTIVITY_LOGS;
    } catch (e) {
      return INITIAL_ACTIVITY_LOGS;
    }
  },
  saveActivityLogs(logs) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  },

  resetToDefault() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('vw_app_members_v3');
    localStorage.removeItem('vw_app_days_config_v3');
    localStorage.removeItem('vw_app_attendance_logs_v3');
    localStorage.removeItem('vw_app_initial_queue_v3');
    localStorage.removeItem('vw_app_members_v2');
    localStorage.removeItem('vw_app_days_config_v2');
    localStorage.removeItem('vw_app_attendance_logs_v2');
    localStorage.removeItem('vw_app_initial_queue_v2');
  },
};
