import { availabilityGrid } from '../availability';

describe('availabilityGrid', () => {
  it('uses a saved grid as is', () => {
    expect(availabilityGrid({ sitterAvailability: ['Monday:Morning'], sitterWeekdays: ['Friday'] }))
      .toEqual(['Monday:Morning']);
  });

  it('spreads old weekdays over every time of day', () => {
    expect(availabilityGrid({ sitterWeekdays: ['Monday'] }))
      .toEqual(['Monday:Morning', 'Monday:Afternoon', 'Monday:Evening']);
  });

  it('combines old days and times', () => {
    expect(availabilityGrid({ sitterWeekdays: ['Monday', 'Friday'], sitterTimeSlots: ['Evening'] }))
      .toEqual(['Monday:Evening', 'Friday:Evening']);
  });

  it('is empty for a sitter who named nothing', () => {
    expect(availabilityGrid({})).toEqual([]);
  });
});
