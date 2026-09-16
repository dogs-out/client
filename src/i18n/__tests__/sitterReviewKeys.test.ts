import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
// Not `it`: that name is Jest's test function, and the import silently wins.
import italian from '../locales/it.json';
import { REVIEW_REPORT_REASONS } from '../../services/moderationService';

const LOCALES = { en, de, fr, it: italian } as const;

/**
 * The highlight tags the server will accept, copied deliberately rather than
 * imported: the server owns this list, and a copy that has drifted is exactly
 * what this test should catch. Keep it in step with SitterReview.ALLOWED_TAGS.
 */
const HIGHLIGHT_TAGS = [
  'Great communication',
  'Dog loved the sitter',
  'Punctual',
  'Sent photo updates',
  'Followed instructions',
  'Went the extra mile',
  'Flexible with timing',
  'Dog came back happy and tired',
] as const;

/**
 * Tags travel as their English string and are translated at display time, so a
 * tag with no entry renders as raw English in the middle of a German sentence —
 * or, when the entry exists but is empty, as nothing at all. Both have shipped
 * before: a tester read "whosOutside.line.AT_HOME" in her friends list.
 *
 * <p>English is null throughout tags.* on purpose. The canonical value is the
 * English string and translateTag falls back to it, so a null there is correct
 * and an empty string is not.
 */
describe('every sitter review tag can be written in every language', () => {
  const translatable = [...HIGHLIGHT_TAGS, ...REVIEW_REPORT_REASONS.filter(r => r !== 'Other' && r !== 'Spam')];

  for (const [name, messages] of Object.entries(LOCALES)) {
    const tags = (messages as typeof en).tags as Record<string, string | null>;

    it(`${name} has an entry for every tag`, () => {
      for (const tag of translatable) {
        expect(Object.hasOwn(tags, tag)).toBe(true);
      }
    });

    if (name === 'en') {
      it('en leaves them null, so translateTag falls back to the tag itself', () => {
        for (const tag of translatable) {
          expect(tags[tag]).toBeNull();
        }
      });
    } else {
      it(`${name} actually translates them`, () => {
        for (const tag of translatable) {
          expect(tags[tag]).toBeTruthy();
          expect(String(tags[tag]).trim()).not.toBe('');
        }
      });
    }
  }
});

describe('the rating screens are worded in every language', () => {
  for (const [name, messages] of Object.entries(LOCALES)) {
    const sitter = (messages as typeof en).sitter;

    it(`${name} words the rating screen`, () => {
      for (const key of ['title', 'subtitle', 'submit', 'later', 'pickStars',
                         'highlightsLabel', 'highlightsHint', 'commentLabel'] as const) {
        expect(sitter.rate[key]).toBeTruthy();
      }
    });

    it(`${name} words the offer bubble`, () => {
      for (const key of ['label', 'accept', 'accepted', 'wentToSomeoneElse', 'expired'] as const) {
        expect(sitter.offer[key]).toBeTruthy();
      }
    });

    it(`${name} keeps the placeholders that carry the numbers`, () => {
      // A hint that drops {{count}} tells the reader nothing about the limit.
      expect(sitter.rate.highlightsHint).toContain('{{count}}');
      expect(sitter.reviews.count).toContain('{{count}}');
      expect(sitter.reviews.title).toContain('{{name}}');
      expect(sitter.jobs.sittingBy).toContain('{{name}}');
    });
  }
});
