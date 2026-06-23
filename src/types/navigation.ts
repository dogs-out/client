export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string; name?: string; password?: string };
  ForgotPassword: undefined;
  Home: undefined;
  ProfileSetup: undefined;
};