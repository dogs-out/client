import { isPasswordValid, passwordRuleStates } from '../passwordRules';

/**
 * These cases mirror the server's regex
 * `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])[^\s]{8,50}$`.
 * If one side changes, this is where the two drift apart first.
 */
describe('isPasswordValid', () => {
  it('accepts a password that satisfies every server rule', () => {
    expect(isPasswordValid('DogsOut123!')).toBe(true);
  });

  it.each([
    ['too short',        'Dg1!aa'],
    ['no uppercase',     'dogsout123!'],
    ['no lowercase',     'DOGSOUT123!'],
    ['no digit',         'DogsOutAbc!'],
    ['no symbol',        'DogsOut1234'],
    ['contains a space', 'Dogs Out123!'],
  ])('rejects a password with %s', (_label, password) => {
    expect(isPasswordValid(password)).toBe(false);
  });

  it('rejects anything longer than the server accepts', () => {
    expect(isPasswordValid(`A1!${'a'.repeat(48)}`)).toBe(false);
  });
});

describe('passwordRuleStates', () => {
  it('reports every rule as unmet for an empty password', () => {
    const states = passwordRuleStates('');
    // noSpace is vacuously true on an empty string — the others are not.
    expect(states.filter(s => s.met).map(s => s.id)).toEqual(['noSpace']);
  });

  it('marks exactly the failing rule when one is missing', () => {
    const states = passwordRuleStates('dogsout123!');
    expect(states.filter(s => !s.met).map(s => s.id)).toEqual(['upper']);
  });
});
