import { isMyJobStillListed } from '../jobVisibility';
import type { SittingRequest } from '../../../services/sitterService';

/**
 * Which of an owner's own requests stay on their dogsitting tab.
 *
 * <p>This predicate has already been wrong once in a way nobody could see from
 * the screen: closing a request removed the row locally and the reload put it
 * straight back, because the check for "still open" had been dropped when the
 * rating case was added. Local state and the list that comes back from the
 * server disagreed, which reads as the Close button not working.
 */
function job(over: Partial<SittingRequest>): SittingRequest {
  return {
    id: 1, ownerId: 1, ownerName: 'Mara', ownerProfilePicture: null,
    startsAt: '', endsAt: '', dogs: [], dogIds: [], note: null,
    status: 'OPEN', mine: true,
    sitterId: null, sitterName: null, sitterProfilePicture: null,
    over: false, canEdit: true, awaitingReview: false, distanceKm: -1,
    todoList: null, emergencyPhone: null, addressLabel: null,
    addressLatitude: null, addressLongitude: null, detailsShared: false,
    ...over,
  };
}

describe('an owner’s own sitting requests', () => {
  it('keeps one that is open and still to come', () => {
    expect(isMyJobStillListed(job({ status: 'OPEN' }))).toBe(true);
  });

  it('keeps one that has been taken, so the owner sees who is coming', () => {
    expect(isMyJobStillListed(job({ status: 'CLOSED', sitterId: 7 }))).toBe(true);
  });

  it('drops one the owner closed without finding anybody', () => {
    // The regression: this returned true, so Close appeared to do nothing.
    expect(isMyJobStillListed(job({ status: 'CLOSED', sitterId: null }))).toBe(false);
  });

  it('drops one whose window has passed with nobody to rate', () => {
    expect(isMyJobStillListed(job({ over: true, sitterId: null }))).toBe(false);
  });

  it('keeps a finished one that still owes a rating', () => {
    expect(isMyJobStillListed(job({
      over: true, status: 'CLOSED', sitterId: 7, awaitingReview: true,
    }))).toBe(true);
  });

  it('drops a finished one once it has been rated', () => {
    expect(isMyJobStillListed(job({
      over: true, status: 'CLOSED', sitterId: 7, awaitingReview: false,
    }))).toBe(false);
  });

  it('drops an open one whose window has simply passed', () => {
    // Nobody took it and it can no longer be taken; there is nothing left to do.
    expect(isMyJobStillListed(job({ status: 'OPEN', over: true }))).toBe(false);
  });
});
