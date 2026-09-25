// Activity Logger Utility for Vessel Wash System
// Provides safe, error-tolerant activity logging across components.

import { storage } from './storage';

/**
 * Creates a formatted activity log record
 */
export function createActivityLogRecord({
  actor = {},
  actionType = 'USER_ACTION',
  category = 'general',
  title = 'Activity Logged',
  details = '',
  targetDate = new Date().toISOString().split('T')[0],
  isAdmin = false,
}) {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorId: actor?.id || 'system',
    actorName: actor?.name || 'User',
    actorCode: actor?.code || '',
    isAdmin: Boolean(isAdmin || actor?.isAdmin),
    actionType: actionType || 'USER_ACTION',
    category: category || 'general',
    title: title || 'Activity Logged',
    details: details || '',
    targetDate: targetDate || new Date().toISOString().split('T')[0],
  };
}

/**
 * Safe activity logger function that persists to storage and never throws errors.
 * Accepts flexible parameters:
 *   logActivityAction(title, details, category, actionType, options)
 *   OR logActivityAction({ title, details, category, ... })
 */
export function logActivityAction(titleOrConfig, details = '', category = 'general', actionType = 'USER_ACTION', options = {}) {
  try {
    let logRecord;
    if (typeof titleOrConfig === 'object' && titleOrConfig !== null) {
      logRecord = createActivityLogRecord(titleOrConfig);
    } else {
      const title = titleOrConfig || 'Activity Logged';
      const safeActionType = actionType || (category ? `${String(category).toUpperCase()}_ACTION` : 'USER_ACTION');
      logRecord = createActivityLogRecord({
        actor: {
          id: options.actorId,
          name: options.actorName,
          code: options.actorCode,
        },
        isAdmin: options.isAdmin,
        actionType: safeActionType,
        category: category || 'general',
        title,
        details: String(details || ''),
        targetDate: options.targetDate,
      });
    }

    // Persist to local storage if available
    try {
      const existingLogs = storage.getActivityLogs() || [];
      const updated = [logRecord, ...existingLogs];
      storage.saveActivityLogs(updated);
    } catch (storageErr) {
      console.warn('[ActivityLogger] Failed to persist activity log to storage:', storageErr);
    }

    return logRecord;
  } catch (err) {
    console.warn('[ActivityLogger] Safe logActivityAction encountered an error:', err);
    return null;
  }
}

/**
 * Wraps an activity action in a safe try-catch handler to prevent uncaught runtime exceptions
 */
export async function safeLogActivity(logFn, fallbackMessage = 'Activity logging skipped') {
  try {
    if (typeof logFn === 'function') {
      return await logFn();
    }
  } catch (err) {
    console.warn(`[ActivityLogger] ${fallbackMessage}:`, err);
    return null;
  }
}

export default {
  createActivityLogRecord,
  logActivityAction,
  safeLogActivity,
};
