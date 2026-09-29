import { signedInRoute } from '../signedInRoute';
import { userService } from '../../services/userService';

jest.mock('../../services/userService', () => ({ userService: { getMe: jest.fn() } }));

const getMe = userService.getMe as jest.Mock;

describe('signedInRoute', () => {
  it('sends someone who has not accepted the terms to the gate, then on to the app', async () => {
    getMe.mockResolvedValue({ termsAccepted: false, dateOfBirth: '1990-01-01' });
    expect(await signedInRoute()).toEqual({ name: 'AcceptTerms', params: { next: 'MainTabs' } });
  });

  it('puts the terms before profile setup for an unfinished profile', async () => {
    getMe.mockResolvedValue({ termsAccepted: false, dateOfBirth: null });
    expect(await signedInRoute()).toEqual({ name: 'AcceptTerms', params: { next: 'ProfileSetup' } });
  });

  it('sends an unfinished profile that has accepted the terms to setup', async () => {
    getMe.mockResolvedValue({ termsAccepted: true, dateOfBirth: null });
    expect(await signedInRoute()).toEqual({ name: 'ProfileSetup' });
  });

  it('lets everyone else straight into the app', async () => {
    getMe.mockResolvedValue({ termsAccepted: true, dateOfBirth: '1990-01-01' });
    expect(await signedInRoute()).toEqual({ name: 'MainTabs' });
  });
});
