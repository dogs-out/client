import { render, screen } from '@testing-library/react-native';
import { FloatingBackground } from '../FloatingBackground';

describe('FloatingBackground', () => {
  it('uses the football emoji instead of the tennis ball (renders as ball+racket on Android)', async () => {
    await render(<FloatingBackground />);
    expect(screen.queryAllByText('⚽').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('🎾')).toHaveLength(0);
  });
});
