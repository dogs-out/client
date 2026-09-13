import { WalkStatus } from '../../services/userService';

/**
 * One icon per status, shared by the editor and the status bar.
 *
 * <p>Kept in one place because the two were drifting: the bar showed a walking
 * figure whatever the status said, so "At home" came with someone striding along
 * beside it.
 */
export const STATUS_ICONS: Record<WalkStatus, string> = {
  WALKING:     'walk-outline',
  AT_THE_PARK: 'leaf-outline',
  SITTING:     'paw-outline',
  AT_HOME:     'home-outline',
  ON_VACATION: 'airplane-outline',
  BUSY:        'time-outline',
};
