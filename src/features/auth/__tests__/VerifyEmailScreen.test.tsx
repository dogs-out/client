import { act, fireEvent, render, screen } from '@testing-library/react-native';
import VerifyEmailScreen from '../VerifyEmailScreen';
import { authService } from '../../../services/authService';

jest.mock('react-native-keyboard-controller', () => {
  const { View } = jest.requireActual('react-native');
  return { KeyboardAvoidingView: View };
});
jest.mock('../../../components/FloatingBackground', () => ({ FloatingBackground: () => null }));
jest.mock('../../../services/authService', () => ({
  authService: { verifyEmail: jest.fn(() => Promise.resolve({ token: 't' })), register: jest.fn() },
}));
jest.mock('../../../utils/tokenStorage', () => ({ tokenStorage: { set: jest.fn(() => Promise.resolve()) } }));
jest.mock('../../../utils/signedInRoute', () => ({ signedInRoute: () => Promise.resolve({ name: 'MainTabs' }) }));

const navigation = { reset: jest.fn(), goBack: jest.fn() };
const route = { params: { email: 'gioia@example.com' } };

async function renderScreen() {
  await render(<VerifyEmailScreen navigation={navigation as never} route={route as never} />);
}

describe('VerifyEmailScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('confirms by itself once all six digits are in — no button needed', async () => {
    await renderScreen();
    await act(async () => { fireEvent.changeText(screen.getByPlaceholderText('000000'), '702797'); });
    expect(authService.verifyEmail).toHaveBeenCalledWith('gioia@example.com', '702797');
    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'MainTabs' }] });
  });

  it('waits while the code is incomplete', async () => {
    await renderScreen();
    await act(async () => { fireEvent.changeText(screen.getByPlaceholderText('000000'), '70279'); });
    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });

  it('keeps digits only, e.g. from a pasted "702 797"', async () => {
    await renderScreen();
    await act(async () => { fireEvent.changeText(screen.getByPlaceholderText('000000'), '702 797'); });
    expect(authService.verifyEmail).toHaveBeenCalledWith('gioia@example.com', '702797');
  });
});
