import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ProfileForm } from '../ProfileForm';
import { OWNER_LIFESTYLE_TAGS } from '../../../constants/tags';
import { Colors } from '../../../constants/colors';
import { userService } from '../../../services/userService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('../../../i18n/translateTag', () => ({
  translateTag: (tag: string) => tag,
}));

jest.mock('../../../services/userService', () => ({
  userService: {
    getMe: jest.fn(),
    addPhoto: jest.fn(),
    deletePhoto: jest.fn(),
    reorderPhotos: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const mockDateTimePicker = jest.fn((_props: { minimumDate?: Date }) => null);
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props: object) => mockDateTimePicker(props),
}));

jest.mock('../../../components/FloatingBackground', () => ({
  FloatingBackground: () => null,
}));

jest.mock('../../../components/GlassButton', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    GlassButton: ({ onPress, children }: { onPress: () => void; children: React.ReactNode }) =>
      React.createElement(TouchableOpacity, { onPress }, children),
  };
});

const getMeMock = userService.getMe as jest.Mock;

async function renderForm() {
  await render(
    <ProfileForm
      title="TITLE"
      subtitle="SUBTITLE"
      submitLabel="SUBMIT"
      onSaved={jest.fn()}
    />
  );
}

const underageDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 10);
  return d.toISOString().split('T')[0];
};

beforeEach(() => {
  jest.clearAllMocks();
  getMeMock.mockResolvedValue({});
});

describe('ProfileForm', () => {
  it('shows the under-18 error next to the submit button', async () => {
    getMeMock.mockResolvedValue({
      name: 'Joel',
      dateOfBirth: underageDob(),
      latitude: 47.4,
      longitude: 8.5,
    });
    await renderForm();
    const submit = await screen.findByText('SUBMIT');

    await fireEvent.press(submit);

    const bottomError = await screen.findByTestId('form-error-bottom');
    expect(bottomError.props.children).toBe('profile.form.tooYoung');
  });

  it('shows missing-name errors next to the submit button too', async () => {
    await renderForm();
    const submit = await screen.findByText('SUBMIT');

    await fireEvent.press(submit);

    const bottomError = await screen.findByTestId('form-error-bottom');
    expect(bottomError.props.children).toBe('profile.form.nameRequired');
  });

  it('allows at most two lifestyle tags to be selected', async () => {
    await renderForm();
    await screen.findByText('SUBMIT');
    const [first, second, third] = OWNER_LIFESTYLE_TAGS;

    await fireEvent.press(screen.getByText(first));
    await fireEvent.press(screen.getByText(second));
    await fireEvent.press(screen.getByText(third));

    expect(screen.getByText(first)).toHaveStyle({ color: Colors.primary });
    expect(screen.getByText(second)).toHaveStyle({ color: Colors.primary });
    expect(screen.getByText(third)).not.toHaveStyle({ color: Colors.primary });
  });

  it('deselecting a tag frees a slot for another', async () => {
    await renderForm();
    await screen.findByText('SUBMIT');
    const [first, second, third] = OWNER_LIFESTYLE_TAGS;

    await fireEvent.press(screen.getByText(first));
    await fireEvent.press(screen.getByText(second));
    await fireEvent.press(screen.getByText(first)); // deselect
    await fireEvent.press(screen.getByText(third));

    expect(screen.getByText(first)).not.toHaveStyle({ color: Colors.primary });
    expect(screen.getByText(second)).toHaveStyle({ color: Colors.primary });
    expect(screen.getByText(third)).toHaveStyle({ color: Colors.primary });
  });

  it('make-main moves a photo to the front and persists that order on save', async () => {
    getMeMock.mockResolvedValue({
      name: 'Joel',
      dateOfBirth: '1990-01-01',
      latitude: 47.4,
      longitude: 8.5,
      photos: [
        { id: 11, imageData: 'data:one' },
        { id: 22, imageData: 'data:two' },
      ],
    });
    (userService.updateProfile as jest.Mock).mockResolvedValue({});
    (userService.reorderPhotos as jest.Mock).mockResolvedValue(undefined);
    await renderForm();
    const submit = await screen.findByText('SUBMIT');

    await fireEvent.press(screen.getByTestId('make-main-1'));
    // the promoted photo now sits in slot 0, so its slot no longer offers make-main
    expect(screen.queryByTestId('make-main-0')).toBeNull();

    await fireEvent.press(submit);
    await waitFor(() => expect(userService.reorderPhotos).toHaveBeenCalledWith([22, 11]));
  });

  it('gives the date picker an explicit minimum well before 1970', async () => {
    await renderForm();
    await screen.findByText('SUBMIT');

    await fireEvent.press(screen.getByText('profile.form.selectDob'));
    await waitFor(() => expect(mockDateTimePicker).toHaveBeenCalled());
    const props = mockDateTimePicker.mock.calls.at(-1)![0];
    expect(props.minimumDate).toBeDefined();
    expect(props.minimumDate!.getFullYear()).toBe(1900);
  });
});
