/**
 * The password rules the server actually enforces, so the app can say the same
 * thing while someone types instead of after they press the button.
 *
 * Mirrors `RegisterRequest`/`ResetPasswordRequest` on the server:
 * `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])[^\s]{8,50}$`
 * Keep the two in step — a rule only here is a password the server will reject
 * anyway, and a rule only there is the problem this file exists to solve.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 50;

export type PasswordRuleId = 'length' | 'lower' | 'upper' | 'digit' | 'special' | 'noSpace';

const RULES: { id: PasswordRuleId; passes: (pwd: string) => boolean }[] = [
  { id: 'length',  passes: p => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { id: 'lower',   passes: p => /[a-z]/.test(p) },
  { id: 'upper',   passes: p => /[A-Z]/.test(p) },
  { id: 'digit',   passes: p => /\d/.test(p) },
  { id: 'special', passes: p => /[^a-zA-Z\d\s]/.test(p) },
  { id: 'noSpace', passes: p => !/\s/.test(p) },
];

export interface PasswordRuleState { id: PasswordRuleId; met: boolean; }

/** Every rule with its current state — for a live checklist under the field. */
export function passwordRuleStates(password: string): PasswordRuleState[] {
  return RULES.map(rule => ({ id: rule.id, met: rule.passes(password) }));
}

export function isPasswordValid(password: string): boolean {
  return RULES.every(rule => rule.passes(password));
}
