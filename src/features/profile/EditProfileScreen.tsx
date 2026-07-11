import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { ProfileForm } from './ProfileForm';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  return (
    <ProfileForm
      title={t('profile.editProfile.title')}
      subtitle={t('profile.editProfile.subtitle')}
      submitLabel={t('dogs.form.saveChanges')}
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.goBack()}
    />
  );
}
