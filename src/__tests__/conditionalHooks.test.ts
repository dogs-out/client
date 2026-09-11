import { execFileSync } from 'child_process';
import path from 'path';

/**
 * No hook may sit after a top-level return in a component.
 *
 * <p>This is not a style rule. React counts hooks per render, so a hook below an
 * early return runs on some renders and not others, and the render where the
 * count changes throws "Rendered more hooks than during the previous render" —
 * a hard crash, not a warning. It shipped twice: the playdate detail screen
 * crashed the moment the playdate loaded, and Discover the moment its lock
 * lifted. Both looked like data bugs and were nothing of the kind.
 */
describe('hook placement', () => {
  it('has no hook below an early return', () => {
    const script = path.join(__dirname, '..', '..', 'scripts', 'findConditionalHooks.js');
    const output = execFileSync('node', [script], {
      cwd: path.join(__dirname, '..', '..'),
      encoding: 'utf8',
    });
    expect(output.trim()).toContain('No conditional hooks found.');
  }, 60_000);
});
