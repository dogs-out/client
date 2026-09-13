import { statusesFor } from '../SetStatusScreen';
import {
  DEFAULT_STATUS, STATUS_EXPIRES, STATUS_IS_OUT, STATUS_SHARES_LOCATION, WalkStatus,
} from '../../../services/userService';
import { STATUS_DURATIONS } from '../../../utils/statusDuration';

const ALL = Object.keys(STATUS_SHARES_LOCATION) as WalkStatus[];
const SHAPES: [boolean, boolean][] = [[true, true], [true, false], [false, true], [false, false]];

describe('which statuses a person is offered', () => {
  it('offers an owner walking, and a sitter sitting instead', () => {
    // Someone with no dog cannot be walking theirs; the status borrows one.
    expect(statusesFor(true, false)).toContain('WALKING');
    expect(statusesFor(true, false)).not.toContain('SITTING');
    expect(statusesFor(false, true)).toContain('SITTING');
    expect(statusesFor(false, true)).not.toContain('WALKING');
  });

  it('offers both to someone who owns a dog and sits for others', () => {
    const both = statusesFor(true, true);
    expect(both).toContain('WALKING');
    expect(both).toContain('SITTING');
  });

  it('always leaves a way to say where you are', () => {
    for (const [hasDog, isSitter] of SHAPES) {
      const options = statusesFor(hasDog, isSitter);
      expect(options).toContain('AT_THE_PARK');
      expect(options).toContain(DEFAULT_STATUS);
      expect(options.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('never offers the same status twice', () => {
    for (const [hasDog, isSitter] of SHAPES) {
      const options = statusesFor(hasDog, isSitter);
      expect(new Set(options).size).toBe(options.length);
    }
  });
});

describe('at home, the resting state', () => {
  it('is where everyone starts', () => {
    expect(DEFAULT_STATUS).toBe('AT_HOME');
  });

  it('does not run out, while every other status does', () => {
    expect(STATUS_EXPIRES.AT_HOME).toBe(false);
    for (const status of ALL.filter(s => s !== 'AT_HOME')) {
      expect(STATUS_EXPIRES[status]).toBe(true);
    }
  });

  it('carries no place, so nobody broadcasts their address by resting', () => {
    expect(STATUS_SHARES_LOCATION.AT_HOME).toBe(false);
  });

  it('is not being out, so the default puts nobody on the outside list', () => {
    // Everyone defaulting to a status must not mean everyone appearing as out.
    expect(STATUS_IS_OUT[DEFAULT_STATUS]).toBe(false);
  });
});

describe('the client and server agree about statuses', () => {
  it('gives every status a duration range, expiring or not', () => {
    for (const status of ALL) {
      expect(STATUS_DURATIONS[status].length).toBeGreaterThan(0);
    }
  });

  it('only lets a status share a place if being there is the point', () => {
    // Home and busy are about availability, not somewhere to be joined.
    expect(STATUS_SHARES_LOCATION.BUSY).toBe(false);
    expect(STATUS_SHARES_LOCATION.WALKING).toBe(true);
    expect(STATUS_SHARES_LOCATION.AT_THE_PARK).toBe(true);
    expect(STATUS_SHARES_LOCATION.SITTING).toBe(true);
    expect(STATUS_SHARES_LOCATION.ON_VACATION).toBe(true);
  });

  it('keeps being out narrower than having a place', () => {
    // A holiday has coordinates but is not an invitation to come and find you.
    for (const status of ALL) {
      if (STATUS_IS_OUT[status]) expect(STATUS_SHARES_LOCATION[status]).toBe(true);
    }
    expect(STATUS_IS_OUT.ON_VACATION).toBe(false);
  });
});

describe('what a row says about a shared place', () => {
  // The rule the screen follows, stated once. Reading "did they share a place?"
  // off the distance was wrong twice: the distance is -1 whenever EITHER side
  // lacks coordinates, and my own row has no meaningful distance to itself.
  const subtitle = (status: WalkStatus, hasPoint: boolean, distanceKm: number, isMine: boolean) => {
    if (!STATUS_SHARES_LOCATION[status]) return null;
    if (!hasPoint) return isMine ? 'mineNoPoint' : 'noPoint';
    if (isMine) return 'mineShared';
    return distanceKm >= 0 ? 'distance' : 'pointShared';
  };

  it('says a place is shared even when the distance is unknown', () => {
    // A viewer who never set a profile location cannot be measured from, and
    // used to be told nobody was sharing anything.
    expect(subtitle('WALKING', true, -1, false)).toBe('pointShared');
  });

  it('shows the distance when both ends have coordinates', () => {
    expect(subtitle('WALKING', true, 3, false)).toBe('distance');
  });

  it('never claims my own picked place is unshared', () => {
    // Distance to yourself is meaningless, so the row carried -1 and said "no
    // place shared" about a park the user had just chosen.
    expect(subtitle('AT_THE_PARK', true, -1, true)).toBe('mineShared');
  });

  it('says nothing at all about a place for statuses that have none', () => {
    // "Out somewhere, no place shared" under "Hanna is at home" contradicts the
    // line above it, and being at home is not a place anyone is withholding.
    expect(subtitle('AT_HOME', false, -1, false)).toBeNull();
    expect(subtitle('AT_HOME', false, -1, true)).toBeNull();
    expect(subtitle('BUSY', false, -1, false)).toBeNull();
  });

  it('still says so when there really is no place', () => {
    expect(subtitle('WALKING', false, -1, false)).toBe('noPoint');
    expect(subtitle('WALKING', false, -1, true)).toBe('mineNoPoint');
  });
});
