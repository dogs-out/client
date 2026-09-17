import { render, screen, cleanup } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CroppedImage } from '../ui/CroppedImage';

// RNTL keeps the previous tree otherwise, and the next render comes back empty.
afterEach(cleanup);

/**
 * The width and height props have to beat anything in the style.
 *
 * <p>This shipped wrong twice. A carousel measured its own page width and passed
 * it in, and every page still laid out at the stale constant its stylesheet
 * carried — so the pages were one width while the scroll view snapped to
 * another, and the offset drifted a little further with each photo until the
 * previous one was visible down the edge of the fifth.
 *
 * <p>What made it survive a fix is that both numbers look right in isolation:
 * the measurement was correct, the snapping was correct, and the style quietly
 * overrode the result of both.
 */
/** The outermost rendered node's flattened style — the box a pager measures. */
// `await render`, not `render`: under React 19's act environment the tree is not
// committed until the render is awaited, and `screen` stays an unimplemented stub.
function rootStyle(tree: unknown): { width?: number; height?: number; backgroundColor?: string } {
  const node = tree as { props?: { style?: unknown } } | null;
  return (StyleSheet.flatten(node?.props?.style as never) ?? {}) as never;
}

describe('CroppedImage dimensions', () => {
  const crop = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };

  it('uses the width prop when the style disagrees, uncropped', async () => {
    await render(
      <CroppedImage uri="https://example.test/a.jpg" width={331} height={400} style={{ width: 999 }} />,
    );
    expect(rootStyle(screen.toJSON()).width).toBe(331);
  });

  it('uses the width prop when the style disagrees, cropped', async () => {
    // The cropped path renders a clipping View around the image; that frame is
    // the thing a pager measures, so it is the one that must obey the prop.
    await render(
      <CroppedImage uri="https://example.test/a.jpg" width={331} height={400} crop={crop} style={{ width: 999 }} />,
    );
    expect(rootStyle(screen.toJSON()).width).toBe(331);
  });

  it('still takes cosmetics from the style', async () => {
    await render(
      <CroppedImage
        uri="https://example.test/a.jpg"
        width={331}
        height={400}
        style={{ backgroundColor: '#e6f4ec', width: 999 }}
      />,
    );
    const flat = rootStyle(screen.toJSON());
    expect(flat.backgroundColor).toBe('#e6f4ec');
    expect(flat.width).toBe(331);
  });
});
