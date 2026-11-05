import { render, screen } from '@testing-library/react-native';
import { EventCard, formatEventTime } from '../EventCard';
import type { SchoolEvent } from '../../../services/schoolService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key), i18n: { language: 'en' } }),
}));
jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));

const event = (over: Partial<SchoolEvent> = {}): SchoolEvent => ({
  id: 1, schoolId: 2, schoolName: 'Pfote', schoolLogo: null, title: 'Puppy class', description: null,
  startsAt: '2026-11-07T09:00:00Z', endsAt: '2026-11-07T10:30:00Z', placeName: null, address: null,
  latitude: 47.4, longitude: 8.5, priceRappen: 4500, maxParticipants: 6, participantCount: 2,
  joined: false, mine: false, cancelled: false, distanceKm: 3, photos: [], ...over,
});

describe('formatEventTime', () => {
  it('shows the day and the time range', () => {
    const text = formatEventTime('2026-11-07T09:00:00Z', '2026-11-07T10:30:00Z', 'en');
    expect(text).toMatch(/Nov/);
    expect(text).toContain('–');
  });
});

describe('EventCard', () => {
  it('shows price and school', async () => {
    await render(<EventCard event={event()} onPress={jest.fn()} />);
    expect(screen.getByText('CHF 45')).toBeTruthy();
    expect(screen.getByText('Pfote')).toBeTruthy();
  });

  it('says when it is full, unless you are already in', async () => {
    const { rerender } = await render(<EventCard event={event({ participantCount: 6 })} onPress={jest.fn()} />);
    expect(screen.getByText('school.event.full')).toBeTruthy();
    await rerender(<EventCard event={event({ participantCount: 6, joined: true })} onPress={jest.fn()} />);
    expect(screen.queryByText('school.event.full')).toBeNull();
    expect(screen.getByText('school.event.signedUp')).toBeTruthy();
  });
});

describe('a weekly course', () => {
  it('shows its days and the next class', async () => {
    await render(<EventCard event={event({
      repeatWeekdays: ['TUESDAY', 'FRIDAY'], occurrenceMinutes: 60,
      endsAt: '2026-12-11T13:00:00Z', nextStartsAt: '2026-11-06T12:00:00Z',
    })} onPress={jest.fn()} />);
    expect(screen.getByText(/sitter.window.every/)).toBeTruthy();
    expect(screen.getByText(/school.event.nextClass/)).toBeTruthy();
  });
});
