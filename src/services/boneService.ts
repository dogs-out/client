import api from './api';
import { setPremium } from '../utils/premium';

/** The bone counter: every swipe, treat or pass, costs one. */
export interface BoneStatus {
  /** Left right now: the rest of today's allowance plus any extra bones. */
  remaining: number;
  /** 10 a day, 20 with Premium. */
  dailyAllowance: number;
  /** Extra bones from ads or purchases, already counted in remaining. */
  bonus: number;
  /** Next midnight in Switzerland, ISO. */
  refillsAt: string;
  premium: boolean;
  /** How many more bones an ad can earn today. */
  adRewardsLeft: number;
}

/** The reason the server gives when a swipe is refused for lack of bones. */
export const OUT_OF_BONES = 'OUT_OF_BONES';

export const boneService = {
  getStatus: (): Promise<BoneStatus> =>
    api.get<BoneStatus>('/bones').then(r => { setPremium(r.data.premium); return r.data; }),
};
