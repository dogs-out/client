import api from './api';

export const feedbackService = {
  submit: (message: string): Promise<void> =>
    api.post('/feedback', { message }).then(() => {}),
};
