import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types/navigation';
import { ProfileForm } from '../features/profile/ProfileForm';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation }: Props) {
  const { t } = useTranslation();
  return (
    <ProfileForm
      title={t('profile.setup.title')}
      subtitle={t('profile.setup.subtitle')}
      submitLabel={t('dogs.form.letsGo')}
      onSaved={() =>
        navigation.reset({ index: 0, routes: [{ name: 'AddDog', params: { fromOnboarding: true } }] })
      }
    />
  );
}