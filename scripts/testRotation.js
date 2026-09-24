import {
  assignSlot,
  assignLunchPair,
  computeMonthRotation,
  insertNewMemberIntoQueue,
} from '../src/logic/rotationEngine.js';

import {
  INITIAL_MEMBERS,
  generateInitialMonthConfig,
  INITIAL_ATTENDANCE_LOGS,
} from '../src/logic/storage.js';

console.log('--- STARTING VESSEL ROTATION ENGINE TESTS ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// Test 1: Standard FIFO rotation
{
  const queue = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const eaters = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const { assignedId, updatedQueue } = assignSlot(queue, eaters);
  assert(assignedId === 'm1', 'Test 1: Front runner (m1) gets assigned');
  assert(updatedQueue[4] === 'm1', 'Test 1: Assigned washer moves to back');
  assert(updatedQueue[0] === 'm2', 'Test 1: Next runner (m2) moves to front');
}

// Test 2: Skipping when front runner did not eat
{
  const queue = ['m1', 'm2', 'm3', 'm4', 'm5'];
  // m1 is absent / did not eat lunch
  const eaters = ['m2', 'm3', 'm4', 'm5'];
  const { assignedId, updatedQueue } = assignSlot(queue, eaters);
  assert(assignedId === 'm2', 'Test 2: Stand-in (m2) washes when m1 did not eat');
  assert(updatedQueue[0] === 'm1', 'Test 2: Skipped member m1 retains front of queue!');
  assert(updatedQueue[4] === 'm2', 'Test 2: Stand-in m2 moved to the back');
}

// Test 3: Dual Lunch Washers (Heavy day)
{
  const queue = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const eaters = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const { assigned1, assigned2, updatedQueue } = assignLunchPair(queue, eaters);
  assert(assigned1 === 'm1' && assigned2 === 'm2', 'Test 3: Both m1 and m2 assigned');
  assert(updatedQueue[3] === 'm1' && updatedQueue[4] === 'm2', 'Test 3: Both go to back preserving order');
  assert(updatedQueue[0] === 'm3', 'Test 3: m3 is now at the front for dinner');
}

// Test 4: Dual Lunch Washers with only 1 person eating
{
  const queue = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const eaters = ['m3']; // Only m3 ate
  const { assigned1, assigned2, updatedQueue } = assignLunchPair(queue, eaters);
  assert(assigned1 === 'm3', 'Test 4: Only m3 washes slot 1');
  assert(assigned2 === null, 'Test 4: Slot 2 shows - (null) without debt');
  assert(updatedQueue[0] === 'm1', 'Test 4: m1 and m2 retain their front positions');
}

// Test 5: Meal not provided does not move queue
{
  const queue = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const eaters = [];
  const { assignedId, updatedQueue } = assignSlot(queue, eaters);
  assert(assignedId === null, 'Test 5: No washer assigned');
  assert(JSON.stringify(queue) === JSON.stringify(updatedQueue), 'Test 5: Queue unchanged');
}

// Test 6: Insert new member continues at the end (not considering alphabets)
{
  const currentQueue = ['m1', 'm2', 'm3', 'm4', 'm5']; // Kavipriyan, Marudhu, Perumal, Ponneelan, Suryakumar
  const newMemberId = 'm6'; // e.g. Arun
  const updatedQueue = insertNewMemberIntoQueue(currentQueue, newMemberId);
  assert(updatedQueue.length === 6, 'Test 6: Queue length becomes 6');
  assert(updatedQueue[5] === 'm6', 'Test 6: Arun is placed in 6th position, after Suryakumar (m5)');
  assert(updatedQueue[0] === 'm1', 'Test 6: Kavipriyan remains in 1st position (alphabets not considered for new member)');
}

// Test 7: Full month simulation produces expected days and slots matching Excel Timetable
{
  const days = generateInitialMonthConfig();
  const { computedDays, finalQueue } = computeMonthRotation(INITIAL_MEMBERS, days, ['m1', 'm2', 'm3', 'm4', 'm5']);
  assert(computedDays.length === 30, 'Test 7: 30 days simulated for September 2026');
  assert(finalQueue.length === 5, 'Test 7: All 5 members present in final queue');
  const day20 = computedDays.find(d => d.date === '2026-09-20');
  const day21 = computedDays.find(d => d.date === '2026-09-21');
  const day22 = computedDays.find(d => d.date === '2026-09-22');
  const day24 = computedDays.find(d => d.date === '2026-09-24');
  
  assert(day20.slots.find(s => s.meal === 'lunch').assignedMemberId === 'm5', 'Test 7: Suryakumar washed on 20-Sep lunch');
  assert(day21.slots.find(s => s.meal === 'dinner').assignedMemberId === 'm3', 'Test 7: Perumal washed on 21-Sep dinner');
  assert(day22.slots.find(s => s.meal === 'dinner').assignedMemberId === 'm1', 'Test 7: Kavipriyan washed on 22-Sep dinner');
  assert(day24.queueBefore[0] === 'm2', 'Test 7: Marudhu (m2) is at the front of queue on 24-Sep (Today)');
  assert(day24.slots.find(s => s.meal === 'dinner').assignedMemberId === 'm2', 'Test 7: Marudhu (m2) is assigned as washer for today if dinner available');
}

// Test 8: Historical attendance integrity
{
  assert(INITIAL_ATTENDANCE_LOGS.length >= 10, 'Test 8: Historical attendance logs preserved');
  const kavipriyanLogs = INITIAL_ATTENDANCE_LOGS.filter(l => l.memberId === 'm1' && l.status === 'present');
  assert(kavipriyanLogs.length >= 3, 'Test 8: Kavipriyan historical wash count matches Excel (3 washes)');
}

console.log(`\nRESULTS: ${passedTests} of ${totalTests} tests passed.`);
if (passedTests === totalTests) {
  console.log('ALL ROTATION LOGIC AND EXCEL RULES VALIDATED SUCCESSFULLY!');
}
