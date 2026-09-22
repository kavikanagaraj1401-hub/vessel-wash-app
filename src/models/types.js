/**
 * Data Model Schemas for Vessel Washing Attendance Application
 */

/**
 * @typedef {Object} Member
 * @property {string} id - Unique identifier (e.g. 'm1', 'm2')
 * @property {string} code - Display code (e.g. 'M1', 'M2')
 * @property {string} name - Full member name
 * @property {'active' | 'inactive'} status - Active participation status
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 */

/**
 * @typedef {Object} DailySlot
 * @property {string} id - Unique slot ID ('2026-09-18-lunch-1')
 * @property {string} date - 'YYYY-MM-DD'
 * @property {'lunch' | 'dinner'} meal
 * @property {number} slotIndex - 1 or 2
 * @property {string | null} assignedMemberId
 * @property {string | null} assignedMemberName
 * @property {'pending' | 'present' | 'absent' | 'not_provided' | 'no_eaters'} status
 * @property {string | null} markedAt
 * @property {string | null} remarks
 */

/**
 * @typedef {Object} DayPlan
 * @property {string} date - 'YYYY-MM-DD'
 * @property {boolean} lunchProvided
 * @property {number} lunchWashers - 1 or 2
 * @property {boolean} dinnerProvided
 * @property {string[]} lunchEaters - array of member IDs who ate lunch
 * @property {string[]} dinnerEaters - array of member IDs who ate dinner
 * @property {DailySlot[]} slots
 * @property {string[]} queueBefore
 * @property {string[]} queueAfter
 */

/**
 * @typedef {Object} AttendanceRecord
 * @property {string} id
 * @property {string} slotId
 * @property {string} date
 * @property {'lunch' | 'dinner'} meal
 * @property {number} slotIndex
 * @property {string} memberId
 * @property {string} memberName
 * @property {'present' | 'absent'} status
 * @property {string} markedAt
 * @property {string} [remarks]
 */

export const SlotStatus = {
  PENDING: 'pending',
  PRESENT: 'present',
  ABSENT: 'absent',
  NOT_PROVIDED: 'not_provided',
  NO_EATERS: 'no_eaters',
};

export const MemberStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};
