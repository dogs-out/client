import { fireEvent, render, screen } from '@testing-library/react-native';
import { PasswordInput } from '../PasswordInput';

describe('PasswordInput', () => {
  it('masks the input by default and reveals it via the eye toggle', async () => {
    await render(<PasswordInput placeholder="pw" value="secret" onChangeText={() => {}} />);

    expect(screen.getByPlaceholderText('pw').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByTestId('password-visibility-toggle'));
    expect(screen.getByPlaceholderText('pw').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByTestId('password-visibility-toggle'));
    expect(screen.getByPlaceholderText('pw').props.secureTextEntry).toBe(true);
  });
});
