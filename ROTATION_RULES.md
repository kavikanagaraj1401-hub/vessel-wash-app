# Vessel Washing Rotation Rules & Source of Truth Specification

Derived from: `new_vessel_washing_rotation(Instructions).csv`  
Project: Vessel Washing Attendance — Mobile In-House Application  
Target Group: In-house team (~5-10 members, dynamic)  
Tracking Period: Starting September 1, 2026  

---

## 1. Core Principles & Philosophy

1. **Single Shared Queue:**
   - One unified FIFO-style queue governs all washing slots across both Lunch and Dinner.
   - Lunch is evaluated and assigned first (1 or 2 washers).
   - Dinner then picks up from the queue state as it stands after lunch.
   - Rationale: Ensures total workload is distributed evenly without locking members into perpetual lunch or dinner duty.

2. **Fairness from Queue, Not Hard Equalization:**
   - "No equalising: Totals are never forced to match. Uneven counts are the correct outcome — fairness comes from the queue, not the totals."

3. **No Make-Up Debt:**
   - "Being absent never creates a debt. Someone away all month simply never washes."

---

## 2. Members & Queue Initialization

1. **Initial Roster:**
   - Default source members from Excel:
     - **M1:** Kavipriyan (Initial front of queue on Day 1: 01-Sep-2026)
     - **M2:** Marudhu
     - **M3:** Perumal
     - **M4:** Ponneelan
     - **M5:** Suryakumar
   - System allows expanding up to 10+ members dynamically.
   - Initial queue order: `M1 -> M2 -> M3 -> ... -> Mn -> back to M1`.

2. **Never-Washed Priority Rule:**
   - "Anyone who has not yet washed this month sits ahead of everyone who has, in M1...Mn order."

3. **Dynamic Member Management:**
   - **Add Member:** Added to the active member pool. Enters at the appropriate queue position (or end of queue/never-washed pool) without rewriting past historical logs.
   - **Edit Member:** Safe to rename; all historical linkages persist by unique ID.
   - **Deactivate Member:** Excluded from future meal attendance and queue selection; historical attendance records remain untouched.

---

## 3. Daily Structure & Meal Conditions

Each calendar day has two potential meal slots:

### A. Lunch
- **Lunch Provided?** `Yes` / `No` (If `No`, 0 washers; queue does not advance for lunch).
- **Lunch Washers Count:** `1` or `2`
  - Heavy vessel days take `2` washers.
  - Light vessel days take `1` washer.
  - Default is `1`.

### B. Dinner
- **Dinner Provided?** `Yes` / `No` (If `No`, 0 washers; queue does not advance for dinner).
- **Dinner Washers Count:** Always `1` washer.

### Total Slots Per Day:
- Between 0 and 3 slots per day (e.g., 2 lunch washers + 1 dinner washer = 3 distinct washers).

---

## 4. Washer Selection & Queue Transition Algorithm

For each meal slot to be settled:

1. **Meal Check:**
   - If meal was not provided (`Provided = false`) OR nobody ate (`Eaters = 0`), washer = `-` (unassigned/none), and queue remains unchanged.

2. **Eater Eligibility Filter:**
   - Only members marked as having eaten that meal are eligible to wash.
   - If exactly 1 person ate that meal, that person washes it.
   - If 2 people ate and 2 washers required, both wash.
   - If only 1 person ate and 2 washers were configured, Washer 1 is assigned that person, and Washer 2 shows `-` (no debt carried forward).

3. **Selection from Queue:**
   - **Washer 1:** The eligible eater closest to the front of the active queue.
   - **Washer 2 (if Lunch has 2 washers):** The next eligible eater in the queue after Washer 1.

4. **Queue Updates (Rotation):**
   - The member who washes moves to the very back of the queue.
   - If 2 lunch washers wash, Washer 1 moves to the back first, followed immediately by Washer 2, maintaining their relative order.
   - **Absence Defers Turn:** Members ahead in the queue who did *not* eat are skipped for this meal, but **keep their place at the front of the queue**. They will wash at the next meal they eat.
   - **Skipping Does Not Repeat:** The stand-in who washed in their place moves to the back; the skipped member is up next once they eat.

---

## 5. Attendance Statuses & Marking Behavior

1. **Statuses for Assigned Washer:**
   - **Pending:** Scheduled/assigned, waiting for attendance marking.
   - **Present:** Washed the vessels. Confirmed with timestamp.
   - **Absent:** Assigned washer did not wash / was absent.
     - Confirmation modal prompt.
     - Stand-in assignment: If absent, the next eligible person in queue is selected as replacement, or marked as absent with audit log.

2. **Eater Attendance:**
   - Quick one-tap toggles for who ate Lunch and who ate Dinner.
   - By default on a work day, all active members can be pre-selected as eaters (with quick toggle off for absentees).

---

## 6. Audit & History

- Historical records store:
  - Date
  - Meal (Lunch slot 1, Lunch slot 2, Dinner)
  - Assigned Member ID & Name
  - Attendance Status (Present / Absent)
  - Marked timestamp
  - Remarks (if any)
- Historical records are immutable upon confirmation and persist even if a member is later deactivated.
