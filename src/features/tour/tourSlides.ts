export type TourVariant = 'owner' | 'sitter' | 'neither';

export interface TourSlide {
  /** i18n key under tour.slides — the title is `.title`, the text `.body`. */
  key: string;
  emoji: string;
}

/**
 * Which tour someone gets. A dog decides it first — an owner who also sits still
 * lives in Discover — then the sitter role. Everyone else is "neither": usually a
 * family looking for a sitter, or someone without a dog yet.
 */
export function tourVariant(user: { hasDog?: boolean | null; isSitter?: boolean | null }): TourVariant {
  if (user.hasDog !== false) return 'owner';
  if (user.isSitter) return 'sitter';
  return 'neither';
}

/**
 * The slides for each variant. Only what that person can actually use: an owner
 * is not told about sitting jobs, a sitter without a dog is not shown a swipe deck
 * they cannot open, and SOS appears either as "if yours gets lost" or "help find one".
 */
export function tourSlides(variant: TourVariant): TourSlide[] {
  switch (variant) {
    case 'owner':
      return [
        { key: 'welcome', emoji: '🐾' },
        { key: 'discover', emoji: '💚' },
        { key: 'playdates', emoji: '🌳' },
        { key: 'status', emoji: '🚶' },
        { key: 'walk', emoji: '💬' },
        { key: 'findSitter', emoji: '🏡' },
        { key: 'sosOwner', emoji: '🚨' },
        { key: 'done', emoji: '🎉' },
      ];
    case 'sitter':
      return [
        { key: 'welcome', emoji: '🐾' },
        { key: 'sittingJobs', emoji: '🏡' },
        { key: 'sittingStatus', emoji: '🦮' },
        { key: 'playdatesSitter', emoji: '🌳' },
        { key: 'sosHelp', emoji: '🚨' },
        { key: 'shelters', emoji: '🏠' },
        { key: 'done', emoji: '🎉' },
      ];
    case 'neither':
      return [
        { key: 'welcome', emoji: '🐾' },
        { key: 'findSitter', emoji: '🏡' },
        { key: 'sosHelp', emoji: '🚨' },
        { key: 'shelters', emoji: '🏠' },
        { key: 'addDog', emoji: '🐶' },
        { key: 'done', emoji: '🎉' },
      ];
  }
}
