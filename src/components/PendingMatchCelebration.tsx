import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { chatService, MatchSummary } from '../services/chatService';
import { userService } from '../services/userService';
import { chatSocket } from '../services/socket';
import { RootStackParamList } from '../types/navigation';
import { MatchOverlay } from './MatchOverlay';

/**
 * Shows "It's a Match!" to the person who liked first.
 *
 * <p>Only the second swiper sees the match screen in Discover, at the moment it
 * happens. Whoever liked first used to find out from a push or a new row in
 * Chats, which made matching look broken to them. The server keeps a flag per
 * match until that person has seen it; this checks for those when the app opens,
 * when it comes back to the foreground, and when a match arrives over the socket,
 * and shows them one after another.
 *
 * <p>Mounted with the main tabs, so it only runs for a signed-in user.
 */
export function PendingMatchCelebration() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [queue, setQueue] = useState<MatchSummary[]>([]);
  const [myPicture, setMyPicture] = useState<string | null>(null);
  const checking = useRef(false);

  const check = useCallback(() => {
    if (checking.current) return;
    checking.current = true;
    chatService.getUncelebratedMatches()
      .then(found => {
        if (found.length === 0) return;
        setQueue(prev => [...prev, ...found.filter(m => !prev.some(p => p.matchId === m.matchId))]);
        userService.getMe().then(me => setMyPicture(me.profilePicture ?? null)).catch(() => {});
      })
      .catch(() => {})
      .finally(() => { checking.current = false; });
  }, []);

  useEffect(() => {
    check();
    // Socket only while in the foreground, like the connection TabNavigator holds.
    let unsubscribe: (() => void) | null = null;
    const listen = () => {
      unsubscribe ??= chatSocket.subscribe(event => { if (event.type === 'NEW_MATCH') check(); });
    };
    listen();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { listen(); check(); } else { unsubscribe?.(); unsubscribe = null; }
    });
    return () => { sub.remove(); unsubscribe?.(); };
  }, [check]);

  const current = queue[0];

  // Marked as soon as it is on screen: seen is seen, whichever button follows.
  useEffect(() => {
    if (current) chatService.markMatchCelebrated(current.matchId).catch(() => {});
  }, [current]);

  if (!current) return null;

  const next = () => setQueue(prev => prev.slice(1));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={next}>
      <MatchOverlay
        key={current.matchId}
        name={current.otherUserName}
        picture={current.otherUserProfilePicture}
        myPicture={myPicture}
        onDismiss={next}
        onChat={() => {
          next();
          navigation.navigate('ChatDetail', {
            matchId: current.matchId,
            otherUserId: current.otherUserId,
            name: current.otherUserName,
            profilePicture: current.otherUserProfilePicture,
          });
        }}
      />
    </Modal>
  );
}
