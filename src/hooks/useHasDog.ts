import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { userService } from '../services/userService';

/**
 * Whether the signed-in user owns a dog, refreshed whenever the calling screen
 * regains focus (the flag changes in EditProfile, so a mount-only fetch goes stale).
 *
 * Starts as `null` while unknown. Callers that gate UI on this should treat `null`
 * as "assume owner" — owners are the common case, so defaulting the other way
 * makes the tab bar visibly reshuffle on every launch.
 */
export function useHasDog(): boolean | null {
  const [hasDog, setHasDog] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      userService.getMe()
        .then(u => { if (!cancelled) setHasDog(u.hasDog ?? true); })
        .catch(() => { if (!cancelled) setHasDog(true); });
      return () => { cancelled = true; };
    }, [])
  );

  return hasDog;
}
