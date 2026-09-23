/**
 * Authentication and User Helpers for Supabase Auth
 */

/**
 * Extracts the exact username portion before '@' (e.g. "kavipriyan" from "kavipriyan@gmail.com").
 * 
 * @param {string} email
 * @returns {string}
 */
export function extractUsername(email = '') {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return 'member';
  }
  return email.split('@')[0].trim();
}

/**
 * Extracts a clean, human-readable name from an email address (everything before '@').
 * e.g.:
 *  'kavipriyan@gmail.com' -> 'Kavipriyan'
 *  'kavi.priyan@company.com' -> 'Kavi Priyan'
 *  'arun_kumar@example.com' -> 'Arun Kumar'
 *  'marudhu1401@gmail.com' -> 'Marudhu'
 * 
 * @param {string} email
 * @returns {string}
 */
export function extractNameFromEmail(email = '') {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return 'Member';
  }

  // 1. Get portion before '@'
  let raw = email.split('@')[0].trim();

  // 2. Strip trailing numbers if preceded by letters (e.g. 'kavipriyan1401' -> 'kavipriyan')
  raw = raw.replace(/([a-zA-Z]+)\d+$/g, '$1');

  // 3. Replace separators (., _, -, +) with spaces
  const withSpaces = raw.replace(/[._\-+]+/g, ' ').trim();

  // 4. Capitalize each word
  const words = withSpaces.split(/\s+/).filter(Boolean);
  if (!words.length) return 'Member';

  const capitalized = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return capitalized || 'Member';
}

/**
 * Checks whether the email belongs to Kavipriyan (Primary Administrator).
 * 
 * @param {string} email
 * @returns {boolean}
 */
export function isKavipriyanEmail(email = '') {
  if (!email || typeof email !== 'string') return false;
  const lower = email.toLowerCase().trim();
  return (
    lower.includes('kavipriyan') ||
    lower.includes('kavikanagaraj') ||
    lower.startsWith('kavi')
  );
}
