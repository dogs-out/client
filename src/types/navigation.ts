import type { PlaceResult } from '../services/playdateService';
import { SittingRequest } from '../services/sitterService';

export type RootStackParamList = {
  Login: undefined;
  Register: { prefillEmail?: string; prefillPassword?: string } | undefined;
  AcceptTerms: { next?: 'MainTabs' | 'ProfileSetup' } | undefined;
  VerifyEmail: { email: string; name?: string; password?: string; emailFailed?: boolean };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  ProfileSetup: undefined;
  MainTabs: undefined;
  EditProfile: undefined;
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
  LocationSettings: undefined;
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
  CreatePlaydate: { playdateId?: number; pickedPark?: PlaceResult } | undefined;
  ParkPicker: {
    initialLat?: number;
    initialLng?: number;
    /** Which screen the pick goes back to. Defaults to CreatePlaydate. */
    returnTo?: 'CreatePlaydate' | 'SetStatus' | 'SittingDetails';
  } | undefined;
  PlaydateDetail: { playdateId: number };
  PlaydateChat: { playdateId: number; title: string };
  SetStatus: { pickedPlace?: PlaceResult } | undefined;
};
