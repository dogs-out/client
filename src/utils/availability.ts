import { TIME_SLOTS, WEEKDAYS } from '../constants/tags';

/** A grid cell, stored as "Day:Slot", e.g. "Monday:Morning". */
export const pair = (day: string, slot: string) => `${day}:${slot}`;

/**
 * The grid to show for a sitter. Their saved grid if they have one; otherwise it is
 * rebuilt from the two old lists, so nobody's availability disappears when the grid
 * arrives: days without times mean all times on those days, and the reverse.
 */
export function availabilityGrid(user: {
  sitterAvailability?: string[] | null;
  sitterWeekdays?: string[] | null;
  sitterTimeSlots?: string[] | null;
}): string[] {
  if (user.sitterAvailability?.length) return user.sitterAvailability;
  const days = user.sitterWeekdays ?? [];
  const slots = user.sitterTimeSlots ?? [];
  if (days.length === 0 && slots.length === 0) return [];
  const ds = days.length ? days : WEEKDAYS;
  const ss = slots.length ? slots : TIME_SLOTS;
  return ds.flatMap(d => ss.map(s => pair(d, s)));
}
