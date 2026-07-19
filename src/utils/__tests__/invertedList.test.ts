import { invertedListCounterTransform } from '../invertedList';

describe('invertedListCounterTransform', () => {
  it('counter-flips both axes on Android (RN inverted lists use scale:-1 there)', () => {
    expect(invertedListCounterTransform('android')).toEqual([{ scale: -1 }]);
  });

  it('counter-flips only the Y axis on iOS', () => {
    expect(invertedListCounterTransform('ios')).toEqual([{ scaleY: -1 }]);
  });
});
