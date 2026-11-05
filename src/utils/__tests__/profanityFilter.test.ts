import { containsProfanity } from '../profanityFilter';

describe('containsProfanity', () => {
  it.each([
    'Hey Lust auf ein Playdate?',
    'Hast du Lust?',
    'Es ist schon hell draussen',
    'Unser Rüde ist dick geworden',
    'Er liebt Bälle und balls',
    'Sie ist ein Cocker Spaniel',
    'Das Wasser passt',
  ])('lets everyday text through: %s', text => {
    expect(containsProfanity(text)).toBe(false);
  });

  it.each(['Du Arschloch', 'fuck off', 'what a bitch', 'Scheisswetter'])('still catches %s', text => {
    expect(containsProfanity(text)).toBe(true);
  });
});
