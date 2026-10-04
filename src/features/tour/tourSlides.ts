export type TourVariant = 'owner' | 'sitter' | 'neither';

/** Where a slide's "Show me" goes: one of the main tabs, or a screen of its own. */
export type TourTarget =
  | { tab: 'Discover' | 'FindSitter' | 'Playdates' | 'Chats' | 'Profile' }
  | { screen: 'SetStatus' | 'Shelters' | 'AddDog' };

export interface TourSlide {
  /** i18n key under tour.slides — the title is `.title`, the text `.body`. */
  key: string;
  emoji: string;
  /** The real screen this slide is about; slides without one have no "Show me". */
  target?: TourTarget;
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
        { key: 'discover', emoji: '💚', target: { tab: 'Discover' } },
        { key: 'playdates', emoji: '🌳', target: { tab: 'Playdates' } },
        { key: 'status', emoji: '🚶', target: { screen: 'SetStatus' } },
        { key: 'walk', emoji: '💬', target: { tab: 'Chats' } },
        { key: 'findSitter', emoji: '🏡', target: { tab: 'FindSitter' } },
        { key: 'sosOwner', emoji: '🚨', target: { tab: 'Profile' } },
        { key: 'done', emoji: '🎉' },
      ];
    case 'sitter':
      return [
        { key: 'welcome', emoji: '🐾' },
        { key: 'sittingJobs', emoji: '🏡', target: { tab: 'FindSitter' } },
        { key: 'sittingStatus', emoji: '🦮', target: { screen: 'SetStatus' } },
        { key: 'playdatesSitter', emoji: '🌳', target: { tab: 'Playdates' } },
        { key: 'sosHelp', emoji: '🚨' },
        { key: 'shelters', emoji: '🏠', target: { screen: 'Shelters' } },
        { key: 'done', emoji: '🎉' },
      ];
    case 'neither':
      return [
        { key: 'welcome', emoji: '🐾' },
        { key: 'findSitter', emoji: '🏡', target: { tab: 'FindSitter' } },
        { key: 'sosHelp', emoji: '🚨' },
        { key: 'shelters', emoji: '🏠', target: { screen: 'Shelters' } },
        { key: 'addDog', emoji: '🐶', target: { screen: 'AddDog' } },
        { key: 'done', emoji: '🎉' },
      ];
  }
}
