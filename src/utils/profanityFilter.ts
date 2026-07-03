import { Filter } from 'bad-words';

// Long, unambiguous words — matched as substrings so concatenations
// ("retardretard") and compounds ("Scheißwetter") are still caught.
const SUBSTRING_WORDS = [
  // English
  'fuck', 'fucker', 'fucking', 'fucked',
  'shitting', 'shitty', 'shithead',
  'asshole', 'arsehole',
  'bitch', 'bastard', 'cunt',
  'whore', 'nigger', 'nigga',
  'faggot', 'retard',
  'wanker', 'motherfucker', 'bullshit', 'bollocks',
  // German (umlaut-normalized: ä→ae, ö→oe, ü→ue, ß→ss)
  'ficken', 'gefickt', 'verfickt', 'gevoegelt',
  'scheiss', 'arschloch',
  'wichser', 'wichsen', 'hurensohn', 'hurentochter', 'hurenbock',
  'fotze', 'votze', 'schlampe',
  'drecksau', 'schweinhund',
  'schwuchtel', 'spasti',
];

// Short/ambiguous words — whole-word matches only, so ordinary words
// like "Wasser", "passt", "Barsch", "Cocker", "schwanken" stay clean.
const WORD_PATTERN = new RegExp(
  '\\b(ass|fag|kike|dick|cock|pussy|slut|twat|wank|prick|crap|shit|'
  + 'fick|arsch|wichse|wixer|hure|nutte|kacke|kacken|bumsen|pisser|voegeln)\\b'
);

const filter = new Filter();

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
    // bad-words covers broad English word-split matching;
    // our lists mirror the backend filter
    return (
      SUBSTRING_WORDS.some(w => normalized.includes(w)) ||
      WORD_PATTERN.test(normalized) ||
      filter.isProfane(normalized)
    );
  } catch {
    return false;
  }
}
