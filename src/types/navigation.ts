export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string; name?: string; password?: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  Home: undefined;
  ProfileSetup: undefined;
  AddDog: { fromOnboarding?: boolean };
};