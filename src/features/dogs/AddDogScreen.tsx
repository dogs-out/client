import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { DogForm } from './DogForm';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDog'>;

export default function AddDogScreen({ navigation, route }: Props) {
  const fromOnboarding = route.params?.fromOnboarding ?? false;
  return (
    <DogForm
      fromOnboarding={fromOnboarding}
      onSaved={() => {
        if (fromOnboarding) {
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        } else {
          navigation.goBack();
        }
      }}
      onBack={fromOnboarding ? undefined : () => navigation.goBack()}
    />
  );
}