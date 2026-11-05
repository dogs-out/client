import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { DogDetailsPrompt, needsDetails } from '../DogDetailsPrompt';
import { dogService } from '../../services/dogService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../services/dogService', () => ({
  dogService: { getMyDogs: jest.fn(), updateDog: jest.fn() },
}));

jest.mock('../GlassButton', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    GlassButton: ({ onPress, children, testID }: { onPress: () => void; children: React.ReactNode; testID?: string }) =>
      React.createElement(TouchableOpacity, { onPress, testID }, children),
  };
});

const getMyDogs = dogService.getMyDogs as jest.Mock;
const updateDog = dogService.updateDog as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  updateDog.mockResolvedValue({});
});

describe('needsDetails', () => {
  it('flags dogs missing either answer', () => {
    expect(needsDetails({ sex: 'MALE', neutered: null })).toBe(true);
    expect(needsDetails({ sex: null, neutered: true })).toBe(true);
    expect(needsDetails({ sex: 'FEMALE', neutered: false })).toBe(false);
  });
});

describe('DogDetailsPrompt', () => {
  it('stays hidden when every dog is complete', async () => {
    getMyDogs.mockResolvedValue([{ id: 1, name: 'Luna', sex: 'FEMALE', neutered: true }]);
    await render(<DogDetailsPrompt />);
    await waitFor(() => expect(getMyDogs).toHaveBeenCalled());
    expect(screen.queryByText('dogs.detailsPrompt.title')).toBeNull();
  });

  it('only asks for neutered when the sex is already known', async () => {
    getMyDogs.mockResolvedValue([{ id: 1, name: 'Luna', sex: 'FEMALE', neutered: null }]);
    await render(<DogDetailsPrompt />);
    await screen.findByText('dogs.detailsPrompt.title');
    expect(screen.queryByTestId('details-sex-1-MALE')).toBeNull();

    await fireEvent.press(screen.getByTestId('details-neutered-1-yes'));
    await fireEvent.press(screen.getByTestId('details-save'));

    await waitFor(() => expect(updateDog).toHaveBeenCalledWith(1, { name: 'Luna', sex: 'FEMALE', neutered: true }));
    await waitFor(() => expect(screen.queryByText('dogs.detailsPrompt.title')).toBeNull());
  });

  it('asks for sex too on older dogs and will not save half an answer', async () => {
    getMyDogs.mockResolvedValue([{ id: 2, name: 'Rex', sex: null, neutered: null }]);
    await render(<DogDetailsPrompt />);
    await screen.findByText('dogs.detailsPrompt.title');

    await fireEvent.press(screen.getByTestId('details-neutered-2-no'));
    await fireEvent.press(screen.getByTestId('details-save'));
    expect(screen.getByText('dogs.detailsPrompt.incomplete')).toBeTruthy();
    expect(updateDog).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('details-sex-2-MALE'));
    await fireEvent.press(screen.getByTestId('details-save'));
    await waitFor(() => expect(updateDog).toHaveBeenCalledWith(2, { name: 'Rex', sex: 'MALE', neutered: false }));
  });
});
