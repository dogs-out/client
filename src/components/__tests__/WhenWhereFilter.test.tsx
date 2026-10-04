import { fireEvent, render, screen } from '@testing-library/react-native';
import { WhenWhereFilter } from '../WhenWhereFilter';

const base = {
  weekdays: [] as string[],
  timeSlots: [] as string[],
  radiusKm: 20,
  onRadiusChange: () => {},
  onRadiusCommit: () => {},
};

describe('WhenWhereFilter', () => {
  it('renders nothing when neither filter applies', async () => {
    await render(
      <WhenWhereFilter {...base} showWhen={false} showRadius={false}
        onWeekdaysChange={() => {}} onTimeSlotsChange={() => {}} />,
    );
    expect(screen.queryByText('sitter.jobs.anyDay')).toBeNull();
  });

  it('adds a tapped day and a tapped time of day', async () => {
    const onDays = jest.fn();
    const onSlots = jest.fn();
    await render(
      <WhenWhereFilter {...base} showWhen showRadius onWeekdaysChange={onDays} onTimeSlotsChange={onSlots} />,
    );

    await fireEvent.press(screen.getByText('sitter.jobs.anyDay'));
    await fireEvent.press(screen.getByText('Saturday'));
    expect(onDays).toHaveBeenCalledWith(['Saturday']);

    await fireEvent.press(screen.getByText('Evening'));
    expect(onSlots).toHaveBeenCalledWith(['Evening']);
  });

  it('clears both lists with "any day, any time"', async () => {
    const onDays = jest.fn();
    const onSlots = jest.fn();
    await render(
      <WhenWhereFilter {...base} weekdays={['Monday']} timeSlots={['Morning']} showWhen showRadius={false}
        onWeekdaysChange={onDays} onTimeSlotsChange={onSlots} />,
    );

    await fireEvent.press(screen.getByText('Monday · sitter.jobs.slotShort.Morning'));
    await fireEvent.press(screen.getByText('sitter.jobs.anyTime'));
    expect(onDays).toHaveBeenCalledWith([]);
    expect(onSlots).toHaveBeenCalledWith([]);
  });
});
