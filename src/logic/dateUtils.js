/**
 * Date Utilities for Vessel Washing App
 * Dynamically resolves current date, formats dates, and ensures day coverage.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 * @returns {string} e.g. '2026-09-23'
 */
export function getTodayDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD date into full readable header string.
 * e.g. '2026-09-23' -> 'Wednesday, 23 September 2026'
 * @param {string} dateStr
 * @returns {string}
 */
export function formatHeaderDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats a YYYY-MM-DD date into short format.
 * e.g. '2026-09-23' -> '23 Sep 2026'
 * @param {string} dateStr
 * @returns {string}
 */
export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats day and month for compact tags.
 * e.g. '2026-09-23' -> '23 Sep'
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDayMonth(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Ensures daysConfig includes all days up to the target date / target month.
 * If target date is beyond existing config, dynamically appends missing days.
 * @param {Array<any>} existingDays
 * @param {string} targetDateStr
 * @returns {Array<any>}
 */
export function ensureDaysCoverDate(existingDays = [], targetDateStr) {
  if (!targetDateStr || !Array.isArray(existingDays)) return existingDays;

  const existingDates = new Set(existingDays.map(d => d.date));
  if (existingDates.has(targetDateStr)) {
    return existingDays;
  }

  const [tYear, tMonth] = targetDateStr.split('-').map(Number);
  if (!tYear || !tMonth) return existingDays;

  const updated = [...existingDays];
  const daysInMonth = new Date(tYear, tMonth, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const mStr = String(tMonth).padStart(2, '0');
    const dStr = `${tYear}-${mStr}-${dayStr}`;

    if (!existingDates.has(dStr)) {
      const dateObj = new Date(tYear, tMonth - 1, day);
      updated.push({
        date: dStr,
        dayNumber: day,
        dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        lunchProvided: false,
        lunchWashers: 1,
        dinnerProvided: false,
        lunchEaters: [],
        dinnerEaters: [],
      });
      existingDates.add(dStr);
    }
  }

  updated.sort((a, b) => a.date.localeCompare(b.date));
  return updated;
}

/**
 * Ensures daysConfig covers from September 2026 continuously across the rest of the year
 * and into future years (e.g. 2027, 2028).
 * @param {Array<any>} existingDays
 * @param {string} targetDateStr
 * @returns {Array<any>}
 */
export function ensureMultiYearCoverage(existingDays = [], targetDateStr) {
  const targetYear = targetDateStr ? parseInt(targetDateStr.split('-')[0], 10) : new Date().getFullYear();
  const endYear = Math.max(targetYear + 1, 2027);

  const existingDates = new Set((existingDays || []).map(d => d.date));
  const updated = Array.isArray(existingDays) ? [...existingDays] : [];

  for (let year = 2026; year <= endYear; year++) {
    const startM = year === 2026 ? 9 : 1;
    for (let month = startM; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const mStr = String(month).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const dateKey = `${year}-${mStr}-${dStr}`;

        if (!existingDates.has(dateKey)) {
          const dateObj = new Date(year, month - 1, day);
          updated.push({
            date: dateKey,
            dayNumber: day,
            dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
            lunchProvided: false,
            lunchWashers: 1,
            dinnerProvided: false,
            lunchEaters: [],
            dinnerEaters: [],
          });
          existingDates.add(dateKey);
        }
      }
    }
  }

  updated.sort((a, b) => a.date.localeCompare(b.date));
  return updated;
}

