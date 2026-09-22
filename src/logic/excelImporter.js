import * as XLSX from 'xlsx';

/**
 * Normalizes dates from various formats:
 * - Excel serial numbers (e.g. 46269)
 * - String formats (e.g. '04-Sep-2026', '9/4/26', '2026-09-04')
 */
export function normalizeExcelDate(val) {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    // Excel epoch offset
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    const year = jsDate.getUTCFullYear();
    const month = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jsDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(val).trim();
  // Try direct parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    let year = d.getFullYear();
    if (year < 2000) year += 2000;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV File and extracts:
 * - daysConfig (30 days with lunch/dinner provided, washers count, eaters)
 * - attendanceLogs (all actual recorded washes up to the last marked date)
 * - lastMarkedDate (last date with recorded wash duty)
 * - detectedMembers
 */
export async function parseExcelTimetable(file, existingMembers = []) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', raw: false });

  // Find timetable sheet (either named Timetable, or first sheet)
  const sheetName =
    workbook.SheetNames.find(s => s.toLowerCase().includes('timetable')) ||
    workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error('No valid sheet found in uploaded Excel file.');
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
  if (!rows || rows.length < 2) {
    throw new Error('The uploaded sheet is empty or contains no data rows.');
  }

  const headers = rows[0].map(h => (h ? String(h).trim() : ''));

  // Member names default order
  const defaultMemberNames = ['Kavipriyan', 'Marudhu', 'Perumal', 'Ponneelan', 'Suryakumar'];
  const memberNameToId = new Map(existingMembers.map(m => [m.name.toLowerCase(), m.id]));

  // Index mapping
  const dateIdx = headers.findIndex(h => h.toLowerCase() === 'date');
  const dayIdx = headers.findIndex(h => h.toLowerCase() === 'day');
  const lunchProvidedIdx = headers.findIndex(h => h.toLowerCase() === 'lunch?');
  const lunchWashersIdx = headers.findIndex(h => h.toLowerCase() === 'lunch washers');
  const lunchW1Idx = headers.findIndex(h => h.toLowerCase() === 'lunch washer 1');
  const lunchW2Idx = headers.findIndex(h => h.toLowerCase() === 'lunch washer 2');
  const dinnerProvidedIdx = headers.findIndex(h => h.toLowerCase() === 'dinner?');
  const dinnerWIdx = headers.findIndex(h => h.toLowerCase() === 'dinner washer');
  const remarksIdx = headers.findIndex(h => h.toLowerCase() === 'remarks');

  // Find lunch and dinner eater column ranges
  const lunchEaterCols = [];
  const dinnerEaterCols = [];

  // Lunch eaters are between Lunch Washers and Lunch Washer 1
  const startLunchEaters = lunchWashersIdx + 1;
  const endLunchEaters = lunchW1Idx > 0 ? lunchW1Idx : startLunchEaters + 5;
  for (let i = startLunchEaters; i < endLunchEaters; i++) {
    const name = headers[i];
    if (name && !name.startsWith('_')) {
      lunchEaterCols.push({ index: i, name });
    }
  }

  // Dinner eaters are between Dinner? and Dinner Washer
  const startDinnerEaters = dinnerProvidedIdx + 1;
  const endDinnerEaters = dinnerWIdx > 0 ? dinnerWIdx : startDinnerEaters + 5;
  for (let i = startDinnerEaters; i < endDinnerEaters; i++) {
    const name = headers[i];
    if (name && !name.startsWith('_')) {
      dinnerEaterCols.push({ index: i, name });
    }
  }

  const parsedDays = [];
  const parsedAttendanceLogs = [];
  let lastMarkedDate = null;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[dateIdx]) continue;

    const normalizedDate = normalizeExcelDate(row[dateIdx]);
    if (!normalizedDate) continue;

    const dayNum = parseInt(normalizedDate.split('-')[2], 10);
    const dayOfWeek = row[dayIdx] || '';

    // Lunch Config
    const lunchProvidedRaw = String(row[lunchProvidedIdx] || '').trim().toLowerCase();
    const lunchProvided = lunchProvidedRaw === 'yes' || lunchProvidedRaw === 'y' || lunchProvidedRaw === 'true';
    const lunchWashers = parseInt(row[lunchWashersIdx], 10) || 1;

    const lunchEaters = [];
    lunchEaterCols.forEach(col => {
      const val = String(row[col.index] || '').trim().toLowerCase();
      if (val === 'y' || val === 'yes' || val === '1') {
        const id = memberNameToId.get(col.name.toLowerCase()) || `m_${col.name.toLowerCase()}`;
        lunchEaters.push(id);
      }
    });

    // Dinner Config
    const dinnerProvidedRaw = String(row[dinnerProvidedIdx] || '').trim().toLowerCase();
    const dinnerProvided = dinnerProvidedRaw === 'yes' || dinnerProvidedRaw === 'y' || dinnerProvidedRaw === 'true';

    const dinnerEaters = [];
    dinnerEaterCols.forEach(col => {
      const val = String(row[col.index] || '').trim().toLowerCase();
      if (val === 'y' || val === 'yes' || val === '1') {
        const id = memberNameToId.get(col.name.toLowerCase()) || `m_${col.name.toLowerCase()}`;
        dinnerEaters.push(id);
      }
    });

    // Remarks
    const remarks = String(row[remarksIdx] || '').trim();

    parsedDays.push({
      date: normalizedDate,
      dayNumber: dayNum,
      dayOfWeek: dayOfWeek,
      lunchProvided,
      lunchWashers,
      dinnerProvided,
      lunchEaters,
      dinnerEaters,
    });

    // Extract Attendance Records
    const lunchW1 = String(row[lunchW1Idx] || '').trim();
    const lunchW2 = String(row[lunchW2Idx] || '').trim();
    const dinnerW = String(row[dinnerWIdx] || '').trim();

    const isCleanName = (n) => n && n !== '-' && n !== '—' && n !== '–' && n !== '\x97' && n !== 'NA' && n !== 'N/A';

    if (isCleanName(lunchW1)) {
      lastMarkedDate = normalizedDate;
      const memId = memberNameToId.get(lunchW1.toLowerCase()) || 'm1';
      parsedAttendanceLogs.push({
        id: `att-${normalizedDate}-lunch-1`,
        slotId: `${normalizedDate}-lunch-1`,
        date: normalizedDate,
        meal: 'lunch',
        slotIndex: 1,
        memberId: memId,
        memberName: lunchW1,
        status: 'present',
        markedAt: `${normalizedDate}T13:30:00.000Z`,
        remarks: remarks || 'Imported from Excel',
        markedBy: 'Excel Import',
      });
    }

    if (isCleanName(lunchW2)) {
      lastMarkedDate = normalizedDate;
      const memId = memberNameToId.get(lunchW2.toLowerCase()) || 'm2';
      parsedAttendanceLogs.push({
        id: `att-${normalizedDate}-lunch-2`,
        slotId: `${normalizedDate}-lunch-2`,
        date: normalizedDate,
        meal: 'lunch',
        slotIndex: 2,
        memberId: memId,
        memberName: lunchW2,
        status: 'present',
        markedAt: `${normalizedDate}T13:35:00.000Z`,
        remarks: remarks || 'Imported from Excel',
        markedBy: 'Excel Import',
      });
    }

    if (isCleanName(dinnerW)) {
      lastMarkedDate = normalizedDate;
      const memId = memberNameToId.get(dinnerW.toLowerCase()) || 'm3';
      parsedAttendanceLogs.push({
        id: `att-${normalizedDate}-dinner-1`,
        slotId: `${normalizedDate}-dinner-1`,
        date: normalizedDate,
        meal: 'dinner',
        slotIndex: 1,
        memberId: memId,
        memberName: dinnerW,
        status: 'present',
        markedAt: `${normalizedDate}T20:30:00.000Z`,
        remarks: remarks || 'Imported from Excel',
        markedBy: 'Excel Import',
      });
    }
  }

  const detectedNames = Array.from(
    new Set([...lunchEaterCols.map(c => c.name), ...dinnerEaterCols.map(c => c.name)])
  );
  const namesToUse = detectedNames.length > 0 ? detectedNames : defaultMemberNames;
  const detectedMembers = namesToUse.map((name, idx) => {
    const existing = existingMembers.find(m => m.name.toLowerCase() === name.toLowerCase());
    return (
      existing || {
        id: memberNameToId.get(name.toLowerCase()) || `m${idx + 1}`,
        name: name,
        code: `M${idx + 1}`,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  });

  return {
    sheetName,
    totalRows: parsedDays.length,
    lastMarkedDate,
    detectedMembers,
    daysConfig: parsedDays,
    attendanceLogs: parsedAttendanceLogs,
  };
}
