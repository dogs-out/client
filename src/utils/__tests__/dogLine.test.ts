import { breedAndSex } from '../dogLine';

const t = ((key: string) => key) as never;

describe('breedAndSex', () => {
  it('joins breed and sex', () => {
    expect(breedAndSex({ breed: null, sex: 'FEMALE' }, t, 'en')).toBe('♀ dogs.sex.FEMALE');
    expect(breedAndSex({ breed: null, sex: 'MALE' }, t, 'en')).toBe('♂ dogs.sex.MALE');
  });

  it('is empty when neither is known, as for dogs saved before sex was asked', () => {
    expect(breedAndSex({ breed: null, sex: null }, t, 'en')).toBe('');
  });

  it('adds the neutered status when the owner has said', () => {
    expect(breedAndSex({ breed: null, sex: 'MALE', neutered: true }, t, 'en')).toBe('♂ dogs.sex.MALE · dogs.neutered.yes');
    expect(breedAndSex({ breed: null, sex: 'FEMALE', neutered: false }, t, 'en')).toBe('♀ dogs.sex.FEMALE · dogs.neutered.no');
  });

  it('leaves the neutered status out for dogs saved before it was asked', () => {
    expect(breedAndSex({ breed: null, sex: 'MALE', neutered: null }, t, 'en')).toBe('♂ dogs.sex.MALE');
  });
});
