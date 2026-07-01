import { Filter } from 'bad-words';

const GERMAN_WORDS = [
  'fick', 'ficken', 'gefickt', 'vogeln', 'gevogelt',
  'scheisse', 'scheiss', 'scheisskopf',
  'arsch', 'arschloch',
  'wichser', 'wichse', 'wichsen', 'wixer',
  'hure', 'hurensohn', 'hurentochter', 'hurenbock', 'nutte',
  'fotze', 'votze',
  'schlampe',
  'drecksau', 'schweinhund',
  'schwuchtel', 'spasti',
  'pisser', 'kacke', 'kacken', 'bumsen',
];

// Explicit English list used for substring matching (bad-words handles word-split coverage)
const ENGLISH_WORDS = [
  'fuck', 'fucker', 'fucking', 'fucked',
  'shit', 'shitting', 'shitty',
  'ass', 'asshole', 'arsehole',
  'bitch', 'bastard', 'cunt', 'dick', 'cock', 'pussy',
  'whore', 'slut',
  'nigger', 'nigga',
  'faggot', 'fag', 'kike',
  'retard', 'retarded',
  'twat', 'wanker', 'wank', 'prick',
  'motherfucker', 'bullshit', 'bollocks',
];

const ALL_WORDS = [...ENGLISH_WORDS, ...GERMAN_WORDS];

const filter = new Filter();
filter.addWords(...GERMAN_WORDS);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

export function containsProfanity(text: string): boolean {
  if (!text.trim()) return false;
  try {
    const normalized = normalize(text);
    // bad-words catches spaced/punctuated usage; substring scan catches concatenations
    return filter.isProfane(normalized) || ALL_WORDS.some(w => normalized.includes(w));
  } catch {
    return false;
  }
}
