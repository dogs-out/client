import type { PlaceResult } from '../services/playdateService';
import { SittingRequest } from '../services/sitterService';

export type RootStackParamList = {
  Login: undefined;
  Register: { prefillEmail?: string; prefillPassword?: string } | undefined;
  /** updated: they had accepted an older version — say what changed. */
  AcceptTerms: { next?: 'MainTabs' | 'ProfileSetup'; updated?: boolean } | undefined;
  VerifyEmail: { email: string; name?: string; password?: string; emailFailed?: boolean };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  /** pickedPlace: a home location chosen by hand in ParkPicker (mode 'home'). */
  ProfileSetup: { pickedPlace?: PlaceResult } | undefined;
  MainTabs: undefined;
  EditProfile: { pickedPlace?: PlaceResult } | undefined;
  Settings: undefined;
  AddDog: { fromOnboarding?: boolean };
  EditDog: { dogId: number };
  SwipePreview: undefined;
  DiscoverFilters: undefined;
  ChangePassword: undefined;
  ChatDetail: { matchId: number; otherUserId: number; name: string; profilePicture: string | null };
  UserProfile: { userId: number };
  BlockedUsers: undefined;
  NotificationSettings: undefined;
  LocationSettings: { pickedPlace?: PlaceResult } | undefined;
  AppearanceSettings: undefined;
  /** No job means posting a new one; a job means editing that one in place. */
  PostSittingRequest: { job?: SittingRequest } | undefined;
  RateSitter: { job: SittingRequest };
  /** The owner's handover: to-do list, emergency number, where the sitting is. */
  SittingDetails: { job: SittingRequest; pickedPlace?: PlaceResult };
  SitterReviews: { sitterId: number; name: string };
  HelpFaq: undefined;
  TermsPrivacy: undefined;
  About: undefined;
  Feedback: undefined;
  Language: undefined;
  CreatePlaydate: {
    playdateId?: number;
    pickedPark?: PlaceResult;
    /** Walk mode: a 1:1 walk with the person in this chat, sent back into it. */
    walkWith?: RootStackParamList['ChatDetail'];
  } | undefined;
  ParkPicker: {
    initialLat?: number;
    initialLng?: number;
    /** Which screen the pick goes back to. Defaults to CreatePlaydate. */
    returnTo?: 'CreatePlaydate' | 'SetStatus' | 'SittingDetails' | 'RaiseSos'
      | 'ProfileSetup' | 'EditProfile' | 'LocationSettings';
    /** 'home': choosing your own location — towns and postcodes, never asks for GPS. */
    mode?: 'park' | 'home';
  } | undefined;
  PlaydateDetail: { playdateId: number };
  PlaydateChat: { playdateId: number; title: string };
  SetStatus: { pickedPlace?: PlaceResult } | undefined;
  RaiseSos: { dogId?: number; pickedPlace?: PlaceResult } | undefined;
  SosDetail: { alertId: number };
  Shelters: undefined;
  /** startAt: resume after a "Show me" at this slide. */
  Tour: { startAt?: number } | undefined;
};
