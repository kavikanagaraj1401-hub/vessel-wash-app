/**
 * Pure Rotation Engine
 * Derived strictly from `new_vessel_washing_rotation(Instructions).csv`
 */

/**
 * Calculates a single slot assignment from the current queue and eligible eaters.
 * @param {string[]} queue - Current queue of active member IDs
 * @param {string[]} eligibleEaters - Member IDs who ate this meal and are active
 * @returns {{ assignedId: string | null, updatedQueue: string[] }}
 */
export function assignSlot(queue, eligibleEaters) {
  if (!eligibleEaters || eligibleEaters.length === 0) {
    return { assignedId: null, updatedQueue: [...queue] };
  }

  // Find the person nearest the front of the queue who ate that meal
  const assignedId = queue.find(id => eligibleEaters.includes(id)) || null;

  if (!assignedId) {
    return { assignedId: null, updatedQueue: [...queue] };
  }

  // After washing, that person goes to the back of the queue.
  // Skipped members (who didn't eat) keep their place at the front.
  const updatedQueue = queue.filter(id => id !== assignedId);
  updatedQueue.push(assignedId);

  return { assignedId, updatedQueue };
}

/**
 * Assigns two slots for lunch (Lunch Washer 1 and Lunch Washer 2).
 * Both go to the back in order: Washer 1 first, then Washer 2.
 * @param {string[]} queue - Current queue
 * @param {string[]} eligibleEaters - Member IDs who ate lunch
 * @returns {{ assigned1: string | null, assigned2: string | null, updatedQueue: string[] }}
 */
export function assignLunchPair(queue, eligibleEaters) {
  if (!eligibleEaters || eligibleEaters.length === 0) {
    return { assigned1: null, assigned2: null, updatedQueue: [...queue] };
  }

  // Washer 1 is person nearest front of queue who ate lunch
  const assigned1 = queue.find(id => eligibleEaters.includes(id)) || null;
  if (!assigned1) {
    return { assigned1: null, assigned2: null, updatedQueue: [...queue] };
  }

  // Washer 2 is next one after them who also ate lunch
  const remainingEaters = eligibleEaters.filter(id => id !== assigned1);
  let assigned2 = null;

  if (remainingEaters.length > 0) {
    assigned2 = queue.find(id => remainingEaters.includes(id)) || null;
  }

  // Queue transition:
  // Both go to the back: Washer 1 first, then Washer 2, so their relative order is preserved
  let updatedQueue = queue.filter(id => id !== assigned1 && id !== assigned2);
  updatedQueue.push(assigned1);
  if (assigned2) {
    updatedQueue.push(assigned2);
  }

  return { assigned1, assigned2, updatedQueue };
}

/**
 * Simulates daily rotation given members, days configuration, and attendance logs.
 * @param {Array<{id: string, name: string, status: string}>} members
 * @param {Array<any>} daysConfig - Config per day (eaters, provided, etc.)
 * @param {string[]} initialQueueOrder - Initial order of member IDs
 * @returns {Array<any>} Computed days with assigned washers and queue state before/after
 */
export function computeMonthRotation(members, daysConfig, initialQueueOrder, anchorDate = '2026-09-21') {
  const activeMembers = members.filter(m => m.status === 'active');
  const activeIds = new Set(activeMembers.map(m => m.id));

  // Initialize queue ensuring only active members are present, preserving initialQueueOrder
  let currentQueue = initialQueueOrder.filter(id => activeIds.has(id));
  
  // Append any active member missing from initialQueueOrder to end
  activeMembers.forEach(m => {
    if (!currentQueue.includes(m.id)) {
      currentQueue.push(m.id);
    }
  });

  const memberMap = new Map(members.map(m => [m.id, m]));

  const computedDays = [];

  for (const day of daysConfig) {
    // When reaching anchor date (2026-09-21), start with the requested rotation order:
    // 1. Kavipriyan 2. Marudhu 3. Perumal 4. Ponneelan 5. Suryakumar
    if (day.date === anchorDate) {
      currentQueue = initialQueueOrder.filter(id => activeIds.has(id));
      activeMembers.forEach(m => {
        if (!currentQueue.includes(m.id)) {
          currentQueue.push(m.id);
        }
      });
    }

    const queueBefore = [...currentQueue];

    // Filter eaters to active members only
    const lunchEaters = (day.lunchEaters || []).filter(id => activeIds.has(id));
    const dinnerEaters = (day.dinnerEaters || []).filter(id => activeIds.has(id));

    let lunchSlot1 = null;
    let lunchSlot2 = null;
    let dinnerSlot = null;

    // 1. Process Lunch
    if (day.lunchProvided) {
      if (day.lunchWashers === 2) {
        const { assigned1, assigned2, updatedQueue } = assignLunchPair(currentQueue, lunchEaters);
        lunchSlot1 = assigned1;
        lunchSlot2 = assigned2;
        currentQueue = updatedQueue;
      } else {
        const { assignedId, updatedQueue } = assignSlot(currentQueue, lunchEaters);
        lunchSlot1 = assignedId;
        currentQueue = updatedQueue;
      }
    }

    // 2. Process Dinner (picks up queue as it stands after lunch)
    if (day.dinnerProvided) {
      const { assignedId, updatedQueue } = assignSlot(currentQueue, dinnerEaters);
      dinnerSlot = assignedId;
      currentQueue = updatedQueue;
    }

    const queueAfter = [...currentQueue];

    computedDays.push({
      ...day,
      queueBefore,
      queueAfter,
      slots: [
        {
          id: `${day.date}-lunch-1`,
          date: day.date,
          meal: 'lunch',
          slotIndex: 1,
          provided: day.lunchProvided,
          assignedMemberId: lunchSlot1,
          assignedMemberName: lunchSlot1 ? memberMap.get(lunchSlot1)?.name || 'Unknown' : '-',
        },
        ...(day.lunchWashers === 2
          ? [
              {
                id: `${day.date}-lunch-2`,
                date: day.date,
                meal: 'lunch',
                slotIndex: 2,
                provided: day.lunchProvided,
                assignedMemberId: lunchSlot2,
                assignedMemberName: lunchSlot2 ? memberMap.get(lunchSlot2)?.name || 'Unknown' : '-',
              },
            ]
          : []),
        {
          id: `${day.date}-dinner-1`,
          date: day.date,
          meal: 'dinner',
          slotIndex: 1,
          provided: day.dinnerProvided,
          assignedMemberId: dinnerSlot,
          assignedMemberName: dinnerSlot ? memberMap.get(dinnerSlot)?.name || 'Unknown' : '-',
        },
      ],
    });
  }

  return {
    computedDays,
    finalQueue: currentQueue,
  };
}

/**
 * Appends a newly added member to the queue (continuing after existing members).
 * Does not consider alphabets; new persons always join at the end of the queue.
 * E.g. Arun joins in 6th position, after Suryakumar.
 * @param {string[]} currentQueue
 * @param {string} newMemberId
 * @returns {string[]} Updated queue
 */
export function insertNewMemberIntoQueue(currentQueue, newMemberId) {
  const newQueue = [...currentQueue];
  if (!newQueue.includes(newMemberId)) {
    newQueue.push(newMemberId);
  }
  return newQueue;
}
