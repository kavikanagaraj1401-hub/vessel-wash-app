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

/**
 * Generates a clean default username from a member's name.
 * e.g., 'Arun Kumar' -> 'arun.kumar', 'Kavipriyan' -> 'kavipriyan'
 * 
 * @param {string} name
 * @returns {string}
 */
export function generateDefaultUsername(name = '') {
  if (!name || typeof name !== 'string') return 'member';
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s._-]/g, '')
    .replace(/\s+/g, '.');
  return clean || 'member';
}

/**
 * Generates a secure, human-friendly temporary password.
 * Format: Pass#<4 random digits> or Word#Year
 * 
 * @returns {string}
 */
export function generateTemporaryPassword() {
  const words = ['Vessel', 'Wash', 'Clean', 'Plate', 'Duty', 'Roster'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}#${num}`;
}
