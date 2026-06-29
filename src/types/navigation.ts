export type RootStackParamList = {
  Login: undefined;
  Register: { prefillEmail?: string; prefillPassword?: string } | undefined;
  VerifyEmail: { email: string; name?: string; password?: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  ProfileSetup: undefined;
  MainTabs: undefined;
  EditProfile: undefined;
  Settings: undefined;
  AddDog: { fromOnboarding?: boolean };
  EditDog: { dogId: number };
  SwipePreview: undefined;
};
