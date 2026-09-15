import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

interface Options {
  /**
   * Everything the form is holding, as one string. Compared against what it held
   * once loading finished, so only real edits count as changes.
   */
  fingerprint: string;
  /** True once the form has its initial values; before that there is nothing to compare. */
  ready: boolean;
  /** Runs when the person chooses to save on the way out. */
  onSave: () => void | Promise<unknown>;
}

/**
 * Stops a form being left with unsaved edits without asking.
 *
 * <p>Several testers reported losing a photo or a rewritten bio. The cause was
 * ordinary — they had not pressed save — but "the user did it wrong" is rarely
 * the end of the story: the button sits below a long form, and nothing marked
 * the work as unsaved. This asks on the way out instead.
 *
 * <p>Deliberately not autosave. A bio or a name is visible to everyone the moment
 * it is stored, so a half-typed one should not be; and a deletion that saves
 * itself has no undo. Saving stays a decision — the app just stops letting it be
 * forgotten.
 *
 * <p>One listener covers every exit: the screen's own back button goes through
 * goBack, as do the Android hardware button and the iOS swipe.
 */
export function useUnsavedChanges({ fingerprint, ready, onSave }: Options) {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const baseline = useRef<string | null>(null);
  const latest = useRef({ fingerprint, onSave });
  latest.current = { fingerprint, onSave };

  useEffect(() => {
    if (ready && baseline.current === null) baseline.current = fingerprint;
  }, [ready, fingerprint]);

  /** Call after a successful save, so leaving afterwards asks nothing. */
  const markSaved = useCallback(() => {
    baseline.current = latest.current.fingerprint;
  }, []);

  useEffect(() => {
    // Registered once and reading through a ref: re-subscribing on every
    // keystroke would be a listener churn for no benefit.
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: {
      preventDefault: () => void;
      data: { action: Readonly<{ type: string }> };
    }) => {
      const dirty = baseline.current !== null && latest.current.fingerprint !== baseline.current;
      if (!dirty) return;

      e.preventDefault();
      Alert.alert(
        t('unsaved.title'),
        t('unsaved.body'),
        [
          { text: t('unsaved.keepEditing'), style: 'cancel' },
          {
            text: t('unsaved.discard'),
            style: 'destructive',
            onPress: () => {
              // Clearing the baseline first, or the listener stops this again.
              baseline.current = latest.current.fingerprint;
              navigation.dispatch(e.data.action);
            },
          },
          {
            text: t('unsaved.save'),
            onPress: () => {
              // The save navigates on success by itself; nothing to dispatch.
              baseline.current = latest.current.fingerprint;
              void latest.current.onSave();
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, t]);

  return { markSaved };
}
