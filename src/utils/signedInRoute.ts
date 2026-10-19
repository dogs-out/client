import { userService } from '../services/userService';
import { TERMS_EFFECTIVE_FROM } from '../constants/terms';

type Home = 'MainTabs' | 'ProfileSetup';

export type SignedInRoute =
  | { name: Home }
  | { name: 'AcceptTerms'; params: { next: Home; updated?: boolean } };

/**
 * Where a signed-in user belongs: the terms first if they have not accepted them,
 * then profile setup if their profile is unfinished, else the app.
 *
 * <p>Every way into the app goes through here — cold start, all three sign-in
 * methods, email verification — because the terms gate used to sit only on the
 * cold-start path, and anyone who signed in fresh walked straight past it.
 */
export async function signedInRoute(): Promise<SignedInRoute> {
  const user = await userService.getMe();
  // A profile without a location sees nobody nearby and is found by nobody, so it
  // is as unfinished as one without a date of birth.
  const home: Home = user.dateOfBirth && user.latitude != null ? 'MainTabs' : 'ProfileSetup';
  // The terms come before everything, including finishing a profile — otherwise
  // someone types their name and date of birth into an app whose terms they have
  // not been shown.
  if (!user.termsAccepted) return { name: 'AcceptTerms', params: { next: home } };
  // Accepted, but an older version: once more, saying what changed. A server that
  // does not report the date yet counts as current, so nobody is asked in a loop.
  const outdated = !!user.termsAcceptedAt
    && new Date(user.termsAcceptedAt).getTime() < new Date(TERMS_EFFECTIVE_FROM).getTime();
  return outdated ? { name: 'AcceptTerms', params: { next: home, updated: true } } : { name: home };
}
