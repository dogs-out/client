import { SittingRequest } from '../../services/sitterService';

/**
 * Whether one of your own sitting requests still belongs on the dogsitting tab.
 *
 * <p>Live means open for offers or already taken. A request closed without
 * finding anybody is finished with, and one whose window has passed is only kept
 * while it still owes a rating — which is what stops the list growing forever.
 *
 * <p>Extracted so it can be tested. It was inlined in the screen when the rating
 * case was added, the "still open" half was lost, and the result was invisible
 * from the screen: closing a request removed the row and the next reload put it
 * back, which reads as the Close button being broken.
 */
export function isMyJobStillListed(job: SittingRequest): boolean {
  const live = !job.over && (job.status === 'OPEN' || job.sitterId != null);
  return live || job.awaitingReview;
}
