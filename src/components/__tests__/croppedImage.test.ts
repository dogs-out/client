/**
 * The arithmetic behind showing a stored framing.
 *
 * <p>Blow the image up so the chosen fraction is exactly the frame's size, then
 * slide it so that fraction sits in the opening. Kept as plain numbers here
 * because getting it wrong is invisible in review and obvious to a user: a photo
 * that shows the wrong part of itself, or a blank corner.
 */
const layout = (frameW: number, frameH: number, crop: { x: number; y: number; width: number; height: number }) => {
  const scaledWidth = frameW / crop.width;
  const scaledHeight = frameH / crop.height;
  return {
    width: scaledWidth,
    height: scaledHeight,
    left: -crop.x * scaledWidth,
    top: -crop.y * scaledHeight,
  };
};

describe('showing a crop rectangle', () => {
  it('leaves a whole-image crop at the frame size', () => {
    const l = layout(300, 400, { x: 0, y: 0, width: 1, height: 1 });
    expect(l.width).toBe(300);
    expect(l.height).toBe(400);
    // toBeCloseTo, not toBe: -0 * 300 is -0, which is the same offset and a
    // different value to Object.is.
    expect(l.left).toBeCloseTo(0);
    expect(l.top).toBeCloseTo(0);
  });

  it('doubles the image to show half of it', () => {
    const l = layout(300, 400, { x: 0, y: 0, width: 0.5, height: 0.5 });
    expect(l.width).toBe(600);
    expect(l.height).toBe(800);
  });

  it('slides the chosen part into the opening', () => {
    // The middle half: twice the size, shifted by a quarter of the new size.
    const l = layout(300, 400, { x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
    expect(l.left).toBe(-150);
    expect(l.top).toBe(-200);
  });

  it('never leaves a gap at the far edge', () => {
    // A crop flush against the right and bottom must still fill the frame, or
    // the user sees blank where their photo should be.
    for (const crop of [
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
      { x: 0.8, y: 0.9, width: 0.2, height: 0.1 },
      { x: 0, y: 0.75, width: 1, height: 0.25 },
    ]) {
      const l = layout(300, 400, crop);
      expect(l.left + l.width).toBeGreaterThanOrEqual(300 - 0.001);
      expect(l.top + l.height).toBeGreaterThanOrEqual(400 - 0.001);
      expect(l.left).toBeLessThanOrEqual(0);
      expect(l.top).toBeLessThanOrEqual(0);
    }
  });
});
