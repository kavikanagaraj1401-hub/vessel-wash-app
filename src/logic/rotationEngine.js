/**
 * Pure Rotation Engine
 * Derived strictly from `new_vessel_washing_rotation(Instructions).csv`
 */

/**
 * Calculates a single slot assignment from the current queue and eligible eaters.
 * If any eligible eater is a Temporary member, that temporary member is assigned
 * as the vessel washer for that present date, without consuming the regular rotation queue.
 * @param {string[]} queue - Current queue of active member IDs
 * @param {string[]} eligibleEaters - Member IDs who ate this meal and are active
 * @param {Array<{id: string, memberType?: string}> | Set<string>} [temporaryMembersOrSet]
 * @returns {{ assignedId: string | null, updatedQueue: string[] }}
 */
export function assignSlot(queue, eligibleEaters, temporaryMembersOrSet) {
  if (!eligibleEaters || eligibleEaters.length === 0) {
    return { assignedId: null, updatedQueue: [...queue] };
  }

  // Check if any eligible eater is a Temporary member
  let tempIds = new Set();
  if (temporaryMembersOrSet instanceof Set) {
    tempIds = temporaryMembersOrSet;
  } else if (Array.isArray(temporaryMembersOrSet)) {
    temporaryMembersOrSet.forEach(m => {
      if (m && (m.memberType === 'temporary' || m.member_type === 'temporary' || m.isTemporary === true)) {
        tempIds.add(m.id);
      }
    });
  }

  // Temporary member priority: Whenever marked present in attendance, assign as vessel washer for that date
  const tempEater = eligibleEaters.find(id => tempIds.has(id));
  if (tempEater) {
    // Temporary member is assigned! Regular queue order remains untouched.
    return { assignedId: tempEater, updatedQueue: [...queue] };
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
 * If temporary members are present, they are assigned to wash slots first.
 * @param {string[]} queue - Current queue
 * @param {string[]} eligibleEaters - Member IDs who ate lunch
 * @param {Array<{id: string, memberType?: string}> | Set<string>} [temporaryMembersOrSet]
 * @returns {{ assigned1: string | null, assigned2: string | null, updatedQueue: string[] }}
 */
export function assignLunchPair(queue, eligibleEaters, temporaryMembersOrSet) {
  if (!eligibleEaters || eligibleEaters.length === 0) {
    return { assigned1: null, assigned2: null, updatedQueue: [...queue] };
  }

  let tempIds = new Set();
  if (temporaryMembersOrSet instanceof Set) {
    tempIds = temporaryMembersOrSet;
  } else if (Array.isArray(temporaryMembersOrSet)) {
    temporaryMembersOrSet.forEach(m => {
      if (m && (m.memberType === 'temporary' || m.member_type === 'temporary' || m.isTemporary === true)) {
        tempIds.add(m.id);
      }
    });
  }

  const tempEaters = eligibleEaters.filter(id => tempIds.has(id));

  if (tempEaters.length >= 2) {
    // Both washers are temporary members! Regular queue remains untouched.
    return { assigned1: tempEaters[0], assigned2: tempEaters[1], updatedQueue: [...queue] };
  } else if (tempEaters.length === 1) {
    // Washer 1 is the temporary member; Washer 2 is assigned from queue
    const assigned1 = tempEaters[0];
    const remainingEaters = eligibleEaters.filter(id => id !== assigned1);
    const assigned2 = queue.find(id => remainingEaters.includes(id)) || null;
    let updatedQueue = [...queue];
    if (assigned2) {
      updatedQueue = queue.filter(id => id !== assigned2);
      updatedQueue.push(assigned2);
    }
    return { assigned1, assigned2, updatedQueue };
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
 * @param {Array<{id: string, name: string, status: string, memberType?: string}>} members
 * @param {Array<any>} daysConfig - Config per day (eaters, provided, etc.)
 * @param {string[]} initialQueueOrder - Initial order of member IDs
 * @returns {Array<any>} Computed days with assigned washers and queue state before/after
 */
export function computeMonthRotation(members, daysConfig, initialQueueOrder, anchorDate = null) {
  const activeMembers = members.filter(m => m.status === 'active');
  const activeIds = new Set(activeMembers.map(m => m.id));

  // Distinguish temporary members from permanent members
  const tempMembers = activeMembers.filter(m => m.memberType === 'temporary' || m.member_type === 'temporary' || m.isTemporary === true);
  const tempIds = new Set(tempMembers.map(m => m.id));

  const permanentMembers = activeMembers.filter(m => !tempIds.has(m.id));
  const permanentIds = new Set(permanentMembers.map(m => m.id));

  // Initialize queue ensuring only permanent active members are present, preserving initialQueueOrder
  let currentQueue = initialQueueOrder.filter(id => permanentIds.has(id));
  
  // Append any permanent active member missing from initialQueueOrder to end
  permanentMembers.forEach(m => {
    if (!currentQueue.includes(m.id)) {
      currentQueue.push(m.id);
    }
  });

  const memberMap = new Map(members.map(m => [m.id, m]));

  const computedDays = [];

  for (const day of daysConfig) {
    // 1. Skip pause period (September 23 through November 17, 2026) completely in rotation calculations
    // No shifts are scheduled or counted; queue remains unchanged
    if (day.date >= '2026-09-23' && day.date <= '2026-11-17') {
      computedDays.push({
        ...day,
        queueBefore: [...currentQueue],
        queueAfter: [...currentQueue],
        slots: [],
      });
      continue;
    }

    // 2. Anchor schedule resumption on November 18, 2026
    if (day.date === '2026-11-18') {
      const baseSequence = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
      const filteredBase = baseSequence.filter(id => permanentIds.has(id));
      const remainingPermanent = permanentMembers
        .map(m => m.id)
        .filter(id => !filteredBase.includes(id));
      currentQueue = [...filteredBase, ...remainingPermanent];
    }

    // 3. Anchor November 23, 2026 to Perumal (m3 / M3)
    if (day.date === '2026-11-23') {
      const perumalSequence = ['m3', 'm4', 'm5', 'm6', 'm1', 'm2'];
      const filteredPerumal = perumalSequence.filter(id => permanentIds.has(id));
      const remainingPermanent = permanentMembers
        .map(m => m.id)
        .filter(id => !filteredPerumal.includes(id));
      currentQueue = [...filteredPerumal, ...remainingPermanent];
    }

    // 4. Ensure November 24, 2026 is NOT assigned to anyone (pause / skipped day)
    if (day.date === '2026-11-24') {
      computedDays.push({
        ...day,
        queueBefore: [...currentQueue],
        queueAfter: [...currentQueue],
        slots: [
          {
            id: `${day.date}-lunch-1`,
            date: day.date,
            meal: 'lunch',
            slotIndex: 1,
            provided: false,
            assignedMemberId: null,
            assignedMemberName: '-',
          },
          {
            id: `${day.date}-dinner-1`,
            date: day.date,
            meal: 'dinner',
            slotIndex: 1,
            provided: false,
            assignedMemberId: null,
            assignedMemberName: '-',
          },
        ],
      });
      continue;
    }

    // 5. Anchor November 25, 2026 (yesterday) to Ponnelan (m4)
    // Ponnelan washes Nov 25 -> Queue rotates to Suryakumar (m5) for today (Nov 26) -> Arun (m6) next for Nov 27...
    if (day.date === '2026-11-25' || (anchorDate && day.date === anchorDate)) {
      const ponnelanSequence = ['m4', 'm5', 'm6', 'm1', 'm2', 'm3'];
      const filteredPonnelan = ponnelanSequence.filter(id => permanentIds.has(id));
      const remainingPermanent = permanentMembers
        .map(m => m.id)
        .filter(id => !filteredPonnelan.includes(id));
      currentQueue = [...filteredPonnelan, ...remainingPermanent];
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
        const { assigned1, assigned2, updatedQueue } = assignLunchPair(currentQueue, lunchEaters, tempIds);
        lunchSlot1 = assigned1;
        lunchSlot2 = assigned2;
        currentQueue = updatedQueue;
      } else {
        const { assignedId, updatedQueue } = assignSlot(currentQueue, lunchEaters, tempIds);
        lunchSlot1 = assignedId;
        currentQueue = updatedQueue;
      }
    }

    // 2. Process Dinner (picks up queue as it stands after lunch)
    if (day.dinnerProvided) {
      const { assignedId, updatedQueue } = assignSlot(currentQueue, dinnerEaters, tempIds);
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
export function insertNewMemberIntoQueue(currentQueue, newMemberId, memberType = 'permanent') {
  if (memberType === 'temporary') {
    return [...currentQueue];
  }
  const newQueue = [...currentQueue];
  if (!newQueue.includes(newMemberId)) {
    newQueue.push(newMemberId);
  }
  return newQueue;
}
