import { clampScale, maxOffset, pinchScale, touchDistance } from '../pinch';

describe('touchDistance', () => {
  it('measures between the first two touches', () => {
    expect(touchDistance([{ pageX: 0, pageY: 0 }, { pageX: 3, pageY: 4 }])).toBe(5);
  });

  it('needs two touches', () => {
    expect(touchDistance([{ pageX: 0, pageY: 0 }])).toBeNull();
    expect(touchDistance([])).toBeNull();
    expect(touchDistance(undefined)).toBeNull();
  });

  it('falls back to location coordinates when page coordinates are missing', () => {
    // This is the shape that broke it: a touch object without pageX produced NaN,
    // NaN reached the Animated transform, and the photo silently stopped moving.
    expect(touchDistance([{ locationX: 0, locationY: 0 }, { locationX: 6, locationY: 8 }])).toBe(10);
  });

  it('reports nothing rather than NaN when a coordinate is unusable', () => {
    expect(touchDistance([{ pageX: 0 }, { pageX: 3, pageY: 4 }])).toBeNull();
    expect(touchDistance([{ pageX: NaN, pageY: 0 }, { pageX: 3, pageY: 4 }])).toBeNull();
    expect(touchDistance([{ pageX: 1, pageY: 1 }, { pageX: 1, pageY: 1 }])).toBeNull();
  });
});

describe('pinchScale', () => {
  it('scales by how much the fingers spread', () => {
    expect(pinchScale(1, 100, 200, 1, 4)).toBe(2);
    expect(pinchScale(2, 100, 50, 1, 4)).toBe(1);
  });

  it('stays inside the range', () => {
    expect(pinchScale(1, 100, 9999, 1, 4)).toBe(4);
    expect(pinchScale(1, 100, 1, 1, 4)).toBe(1);
  });

  it('holds the current scale when a reading is missing, instead of going NaN', () => {
    // The old code multiplied by distance/startDistance unguarded. One absent
    // reading poisoned the scale permanently: NaN clamps to NaN, and every later
    // frame started from NaN, so the pinch never recovered.
    expect(pinchScale(2, null, 150, 1, 4)).toBe(2);
    expect(pinchScale(2, 100, null, 1, 4)).toBe(2);
    expect(pinchScale(2, 0, 150, 1, 4)).toBe(2);
    // An unusable starting scale recovers to the minimum and still tracks the
    // spread, rather than freezing: 1 x (150/100).
    expect(pinchScale(NaN, 100, 150, 1, 4)).toBe(1.5);
  });

  it('never returns a non-finite number, whatever it is given', () => {
    const odd = [NaN, Infinity, -Infinity, 0, -5, null];
    for (const a of odd) {
      for (const b of odd) {
        const result = pinchScale(2, a as number, b as number, 1, 4);
        expect(Number.isFinite(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('clampScale', () => {
  it('falls back rather than passing NaN on', () => {
    expect(clampScale(NaN, 1, 4, 2)).toBe(2);
    expect(clampScale(3, 1, 4, 2)).toBe(3);
    expect(clampScale(9, 1, 4, 2)).toBe(4);
  });
});

describe('maxOffset', () => {
  it('is zero until the photo is zoomed past the frame', () => {
    // Why dragging does nothing at scale 1: the photo already exactly covers it.
    expect(maxOffset(300, 1)).toBe(0);
    expect(maxOffset(300, 2)).toBe(150);
  });

  it('never goes negative or non-finite', () => {
    expect(maxOffset(300, 0.5)).toBe(0);
    expect(maxOffset(NaN, 2)).toBe(0);
    expect(maxOffset(300, NaN)).toBe(0);
  });
});
