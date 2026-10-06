import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types/navigation';
import { ProfileForm } from '../features/profile/ProfileForm';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ProfileForm
      title={t('profile.setup.title')}
      subtitle={t('profile.setup.subtitle')}
      pickedPlace={route.params?.pickedPlace}
      onChooseLocation={() => navigation.navigate('ParkPicker', { mode: 'home', returnTo: 'ProfileSetup' })}
      submitLabel={t('dogs.form.letsGo')}
      onSaved={({ hasDog }) =>
        // Sitter-only accounts have no dog to introduce — go straight to the app
        navigation.reset({
          index: 0,
          routes: [hasDog ? { name: 'AddDog', params: { fromOnboarding: true } } : { name: 'MainTabs' }],
        })
      }
    />
  );
}