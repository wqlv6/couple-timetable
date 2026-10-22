import type { AppState, Course, PersonId } from '../types';

export interface FreeSlot {
  dayOfWeek: number;
  period: number;
}

/** 某人在某周、某天、某节是否有课 */
export function hasCourse(
  courses: Course[],
  personId: PersonId,
  day: number,
  period: number,
  week: number
): boolean {
  return courses.some(
    (c) =>
      c.personId === personId &&
      c.dayOfWeek === day &&
      period >= c.startPeriod &&
      period <= c.endPeriod &&
      (c.weeks.length === 0 || c.weeks.includes(week))
  );
}

/** 某人在某周的完整空闲节次 */
export function personFreeSlots(state: AppState, personId: PersonId, week: number): FreeSlot[] {
  const slots: FreeSlot[] = [];
  for (let day = 1; day <= 7; day++) {
    for (let p = 1; p <= state.periodCount; p++) {
      if (!hasCourse(state.courses, personId, day, p, week)) {
        slots.push({ dayOfWeek: day, period: p });
      }
    }
  }
  return slots;
}

/** 两人共同的空闲节次（约会同框推荐） */
export function commonFreeSlots(state: AppState, week: number): FreeSlot[] {
  const [me, partner] = state.people;
  if (!me || !partner) return [];
  const slots: FreeSlot[] = [];
  for (let day = 1; day <= 7; day++) {
    for (let p = 1; p <= state.periodCount; p++) {
      const meFree = !hasCourse(state.courses, me.id, day, p, week);
      const partnerFree = !hasCourse(state.courses, partner.id, day, p, week);
      if (meFree && partnerFree) slots.push({ dayOfWeek: day, period: p });
    }
  }
  return slots;
}

/** 把离散空闲节次合并成连续时间段，例如 [1,2,3,5,6] → [[1,3],[5,6]] */
export function mergeSlots(slots: number[]): [number, number][] {
  if (!slots.length) return [];
  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push([start, prev]);
      start = prev = sorted[i];
    }
  }
  ranges.push([start, prev]);
  return ranges;
}
