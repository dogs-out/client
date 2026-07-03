// Lets DiscoverScreen know the filters were changed while it stayed mounted,
// so it can reload the feed on next focus instead of showing the stale deck.
let version = 0;

export const bumpDiscoverFiltersVersion = () => { version++; };
export const getDiscoverFiltersVersion = () => version;
