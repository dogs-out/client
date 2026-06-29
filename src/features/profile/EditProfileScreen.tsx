import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ProfileForm } from './ProfileForm';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  return (
    <ProfileForm
      title="Edit Profile"
      subtitle="Update your details"
      submitLabel="Save changes"
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.goBack()}
    />
  );
}
