import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ProfileForm } from '../features/profile/ProfileForm';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation }: Props) {
  return (
    <ProfileForm
      title="Set up your profile"
      subtitle="Tell us a bit about yourself"
      submitLabel="Let's go 🐾"
      onSaved={() =>
        navigation.reset({ index: 0, routes: [{ name: 'AddDog', params: { fromOnboarding: true } }] })
      }
    />
  );
}