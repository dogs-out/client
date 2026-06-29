import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { DogForm } from './DogForm';

type Props = NativeStackScreenProps<RootStackParamList, 'EditDog'>;

export default function EditDogScreen({ navigation, route }: Props) {
  return (
    <DogForm
      dogId={route.params.dogId}
      onSaved={() => navigation.goBack()}
      onBack={() => navigation.goBack()}
    />
  );
}