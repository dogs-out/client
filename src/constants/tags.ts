export const DOG_PERSONALITY_TAGS = [
  'Goofy', 'Independent', 'Velcro dog', 'Couch potato',
  'Zoomies champion', 'Gentle giant', 'Drama queen', 'Shy',
];

export const DOG_PLAY_TAGS = [
  'Fetch obsessed', 'Loves to swim', 'Sniff-first explorer',
  'Wrestler', 'Chaser', 'Cuddler not a fighter',
];

export const DOG_SOCIAL_TAGS = [
  'Dog park regular', 'Life of the party', 'One dog at a time', 'Good with puppies', 'Good with cats',
];

export const ALL_DOG_TAGS = [...DOG_PERSONALITY_TAGS, ...DOG_PLAY_TAGS, ...DOG_SOCIAL_TAGS];

export const LOVES_OPTIONS = [
  'Fetch / ball games', 'Swimming', 'Sniffing everything',
  'Cuddles', 'Treats', 'Other dogs', 'Belly rubs', 'Running', 'Napping'
];

export const SOCIAL_BEHAVIOR_OPTIONS = [
  'Instant best friends',
  'Cautious but warms up',
  'Prefers to observe first',
  'Can be reactive/needs space',
];

export const OFF_LEASH_OPTIONS = [
  'Yes, fully reliable',
  'Only in fenced areas',
  'Working on it',
  'No, always on leash',
];

// ─── Owners ───────────────────────────────────────────────────────────────────
export const OWNER_LIFESTYLE_TAGS = [
  'Early bird walks', 'Night owl walks', 'Weekend warrior',
  'Hiking buddy wanted', 'Café-with-dog person', 'Beach walker',
];

export const OWNER_PERSONALITY_TAGS = [
  'Dog mom/dad energy', 'Treat negotiator', 'Professional ball-thrower',
  'Responsible pup parent', 'Will talk about my dog for hours',
];

// ─── Sitters ──────────────────────────────────────────────────────────────────
// Everything above is written from a dog owner's side — "my dog does this". A
// sitter without a dog of their own had nothing honest to pick, which left the
// half of the app that exists for them unable to say anything about themselves.
// These two lists are the same idea, phrased about the person instead.

export const SITTER_LIFESTYLE_TAGS = [
  'Early riser', 'Free in the evenings', 'Weekends free', 'Works from home',
  'Hiking enthusiast', 'Café regular',
];

export const SITTER_PERSONALITY_TAGS = [
  'Calm and patient', 'Active and outdoorsy', 'Reliable and punctual',
  'Good with anxious dogs', 'Would adopt them all',
];

/** What a sitter offers, shown on their profile and in the Dogsitting list. */
export const SITTER_TAGS = [
  'Dog trainer', 'Certified sitter', 'Multiple dogs OK', 'Puppy experience',
  'Senior dog experience', 'Has a yard', 'Can give medication', 'Overnight stays OK',
  'Grew up with dogs', 'Comes to your home', 'Can host at my place',
  'Reactive dogs welcome', 'Happy with long walks', 'Flexible at short notice',
  'Has a car',
];

export const WEEKDAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

export const RELATIONSHIP_STATUS_OPTIONS = [
  'Single', 'In a relationship', 'Married', "It's complicated", 'Prefer not to say',
];