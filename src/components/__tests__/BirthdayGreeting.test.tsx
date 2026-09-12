import { cleanup, render, screen } from '@testing-library/react-native';
import { BirthdayGreeting } from '../BirthdayGreeting';
import { appPrefs } from '../../utils/appPrefs';
import { celebration } from '../../utils/celebration';
import en from '../../i18n/locales/en.json';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// i18n is not initialised under test, so t() would return bare keys. Interpolate
// the name in, which is the part the component actually decides.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: { dog?: string }) => (vars?.dog ? `${key}|${vars.dog}` : key),
  }),
}));

const YEAR = new Date().getFullYear();

describe('BirthdayGreeting', () => {
  afterEach(() => {
    cleanup();
    celebration.clear();
    appPrefs.set('birthdayGreetedYear', 0);
  });

  it('says nothing on an ordinary day', async () => {
    await render(<BirthdayGreeting />);
    expect(screen.toJSON()).toBeNull();
  });

  it('greets the person on their own birthday', async () => {
    celebration.set({ own: true, dogNames: [] });
    await render(<BirthdayGreeting />);
    expect(screen.getByText('birthday.ownTitle')).toBeTruthy();
    expect(screen.getByText('birthday.ownBody')).toBeTruthy();
  });

  it('names the dog when it is the dog having the birthday', async () => {
    celebration.set({ own: false, dogNames: ['Maylie'] });
    await render(<BirthdayGreeting />);
    expect(screen.getByText('birthday.dogTitle|Maylie')).toBeTruthy();
  });

  it('names both dogs when two share the day', async () => {
    celebration.set({ own: false, dogNames: ['Maylie', 'Luna'] });
    await render(<BirthdayGreeting />);
    expect(screen.getByText('birthday.dogTitle|Maylie & Luna')).toBeTruthy();
  });

  it('says so when the person and their dog share a birthday', async () => {
    celebration.set({ own: true, dogNames: ['Maylie'] });
    await render(<BirthdayGreeting />);
    expect(screen.getByText('birthday.bothTitle|Maylie')).toBeTruthy();
  });

  it('stays on screen after recording the year', async () => {
    // The bug this pins: stamping the year is what stops the greeting coming
    // back, so deriving visibility from that same value hid it in the very
    // render that recorded it — a popup that flashed and vanished.
    celebration.set({ own: true, dogNames: [] });
    await render(<BirthdayGreeting />);
    expect(appPrefs.get().birthdayGreetedYear).toBe(YEAR);
    expect(screen.getByText('birthday.ownTitle')).toBeTruthy();
  });

  it('shows once a year, not once a launch', async () => {
    appPrefs.set('birthdayGreetedYear', YEAR);
    celebration.set({ own: true, dogNames: [] });
    await render(<BirthdayGreeting />);
    expect(screen.toJSON()).toBeNull();
  });

  it('greets again the following year', async () => {
    appPrefs.set('birthdayGreetedYear', YEAR - 1);
    celebration.set({ own: true, dogNames: [] });
    await render(<BirthdayGreeting />);
    expect(screen.getByText('birthday.ownTitle')).toBeTruthy();
  });
});

describe('the greeting itself', () => {
  it('says what it was asked to say', () => {
    // The wording is the whole point of the feature, so it is pinned rather than
    // left to whatever a future edit does to the file.
    expect(en.birthday.ownTitle).toMatch(/woof woof/i);
    expect(en.birthday.ownBody).toContain('The entire DogsOut team');
    expect(en.birthday.ownBody).toContain('treats and zoomies');
    expect(en.birthday.ownBody).toContain('wonderful day');
  });

  it('greets a dog by name in every language', () => {
    for (const locale of ['en', 'de', 'fr', 'it'] as const) {
      const messages = require(`../../i18n/locales/${locale}.json`);
      expect(messages.birthday.dogTitle).toContain('{{dog}}');
      expect(messages.birthday.dogBody).toContain('{{dog}}');
      expect(messages.birthday.bothTitle).toContain('{{dog}}');
    }
  });

  it('talks to the owner about the dog, never to the dog', () => {
    // The dog is not the one holding the phone. Addressing it made the reader
    // work out who was being spoken to, which is a strange way to open a card.
    expect(en.birthday.dogTitle).not.toMatch(/happy birthday, /i);
    expect(en.birthday.dogTitle).toContain("{{dog}}'s birthday");
    expect(en.birthday.dogBody).toContain('wishes {{dog}}');
  });
});
