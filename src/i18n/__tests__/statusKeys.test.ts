import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
// Not `it`: that name is Jest's test function, and the import silently wins.
import italian from '../locales/it.json';
import { STATUS_SHARES_LOCATION, WalkStatus } from '../../services/userService';

const LOCALES = { en, de, fr, it: italian } as const;
const ALL_STATUSES = Object.keys(STATUS_SHARES_LOCATION) as WalkStatus[];

/**
 * Statuses arrive from the server as enum names and are rendered by looking up a
 * translation key built from them. A status with no key renders as its own key
 * path — which is how a tester read "whosOutside.line.AT_HOME" in her friends
 * list after the server started sending a status her build predated.
 *
 * <p>Adding a status is therefore never a server-only change.
 */
describe('every status can be written in every language', () => {
  for (const [name, messages] of Object.entries(LOCALES)) {
    const whosOutside = (messages as typeof en).whosOutside;

    it(`${name} words every status three ways`, () => {
      for (const status of ALL_STATUSES) {
        // The chip in the status bar and the editor.
        expect(whosOutside.status).toHaveProperty(status);
        // A friend's row.
        expect(whosOutside.line).toHaveProperty(status);
        // My own row, written in the second person.
        expect(whosOutside.mine).toHaveProperty(status);
      }
    });

    it(`${name} names the person in every friend line`, () => {
      for (const status of ALL_STATUSES) {
        expect((whosOutside.line as Record<string, string>)[status]).toContain('{{name}}');
      }
    });

    it(`${name} leaves no status wording empty`, () => {
      for (const status of ALL_STATUSES) {
        for (const group of ['status', 'line', 'mine'] as const) {
          expect((whosOutside[group] as Record<string, string>)[status].trim().length).toBeGreaterThan(0);
        }
      }
    });
  }
});
