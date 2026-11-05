import api from './api';
import { BoneStatus } from './boneService';

/** Today's news for the daily card. */
export interface DailyDigest {
  /** People who joined this week and are in your deck. */
  newNearby: number;
  /** Everyone waiting in your deck. */
  deckSize: number;
  bones: BoneStatus;
  /** Dog owners can host playdates. */
  canHost: boolean;
}

export const dailyService = {
  today: (): Promise<DailyDigest> => api.get<DailyDigest>('/daily').then(r => r.data),
};
