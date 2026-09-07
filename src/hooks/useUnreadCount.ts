import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { chatService } from '../services/chatService';
import { chatSocket } from '../services/socket';
import { unreadStore } from '../services/unreadStore';

/**
 * Total unread direct messages, for the badge on the Chats tab.
 *
 * <p>Derived from the match list rather than a dedicated endpoint: the server
 * already returns a per-conversation `unreadCount` there, and summing it avoids a
 * second source of truth that could disagree with what the Chats screen shows.
 *
 * <p>Playdate group chats are deliberately not counted — they carry no read
 * tracking at all, so any number here would be invented.
 *
 * <p>Three things move the number: a message arriving (socket), the app coming
 * back to the foreground, and the user reading a chat — the last of which the
 * server never announces to the reader, hence `unreadStore`.
 */
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    chatService.getMatches()
      .then(matches => setCount(matches.reduce((total, m) => total + (m.unreadCount ?? 0), 0)))
      .catch(() => { /* leave the previous count rather than flashing zero */ });
  }, []);

  // A message arriving, or one being read on the chat screen, both change the
  // total — the socket fires on either, so a single subscription covers both.
  useEffect(() => {
    refresh();
    const unsubscribeSocket = chatSocket.subscribe(refresh);
    const unsubscribeReads = unreadStore.subscribe(refresh);
    const appState = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    return () => { unsubscribeSocket(); unsubscribeReads(); appState.remove(); };
  }, [refresh]);

  return count;
}
