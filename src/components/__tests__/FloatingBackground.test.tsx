import { Animated } from 'react-native';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import { FloatingBackground } from '../FloatingBackground';
import { appPrefs } from '../../utils/appPrefs';
import { celebration } from '../../utils/celebration';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('FloatingBackground', () => {
  afterEach(() => {
    // Unmount explicitly, and before the module state is reset: without it React
    // updates the previous test's tree instead of mounting a fresh one, so the
    // effects under test never run and the assertions pass on stale output.
    // No act() here — wrapping a store write while nothing is mounted leaves the
    // renderer in a state where the next render produces an empty tree.
    cleanup();
    appPrefs.set('freezeBackground', false);
    celebration.set(false);
    jest.restoreAllMocks();
  });

  it('uses the football emoji instead of the tennis ball (renders as ball+racket on Android)', async () => {
    await render(<FloatingBackground />);
    expect(screen.queryAllByText('⚽').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('🎾')).toHaveLength(0);
  });

  it('stops the loops when the setting is switched on while the screen is open', async () => {
    // The bug this pins: the tab screens stay mounted, so their loops drifted on
    // while a freshly mounted Settings started frozen and looked correct.
    const stop = jest.fn();
    jest.spyOn(Animated, 'loop').mockReturnValue({
      start: jest.fn(), stop, reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);

    await render(<FloatingBackground />);
    expect(stop).not.toHaveBeenCalled();

    await act(async () => { appPrefs.set('freezeBackground', true); });
    expect(stop).toHaveBeenCalled();
  });

  it('never starts a loop when it is already frozen', async () => {
    appPrefs.set('freezeBackground', true);
    const loop = jest.spyOn(Animated, 'loop');

    await render(<FloatingBackground />);
    expect(loop).not.toHaveBeenCalled();
  });

  it('switches to cake on the user\'s own birthday, with no variant passed', async () => {
    celebration.set(true);

    await render(<FloatingBackground />);
    expect(screen.queryAllByText('🎂').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('⚽')).toHaveLength(0);
  });

  it('lets an explicit variant win, so a chat can celebrate someone else', async () => {
    // The chat passes 'birthday' for the other person's birthday on a day that is
    // nobody else's, so the default must not fight it in either direction.
    await render(<FloatingBackground variant="birthday" />);
    expect(screen.queryAllByText('🎂').length).toBeGreaterThan(0);
  });

  it('stays ordinary on an ordinary day', async () => {
    await render(<FloatingBackground />);
    expect(screen.queryAllByText('🎂')).toHaveLength(0);
  });
});
