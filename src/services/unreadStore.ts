type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * A one-line pub/sub for "the unread count may have changed".
 *
 * <p>Opening a chat marks its messages read on the server, and nothing tells the
 * reader about their own read — the socket only announces other people's
 * activity. Without a nudge from that moment, the tab badge would keep showing
 * messages the user has just finished reading until something else happened.
 *
 * <p>Deliberately not a count: the number still comes from the match list, so
 * there is only ever one source of truth for it.
 */
export const unreadStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },

  changed(): void {
    listeners.forEach(listener => listener());
  },
};
