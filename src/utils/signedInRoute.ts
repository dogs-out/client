import { userService } from '../services/userService';

type Home = 'MainTabs' | 'ProfileSetup';

export type SignedInRoute =
  | { name: Home }
  | { name: 'AcceptTerms'; params: { next: Home } };

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
  const home: Home = user.dateOfBirth ? 'MainTabs' : 'ProfileSetup';
  // The terms come before everything, including finishing a profile — otherwise
  // someone types their name and date of birth into an app whose terms they have
  // not been shown.
  return user.termsAccepted ? { name: home } : { name: 'AcceptTerms', params: { next: home } };
}
