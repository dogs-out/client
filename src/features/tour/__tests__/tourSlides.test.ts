import { tourSlides, tourVariant } from '../tourSlides';

describe('tourVariant', () => {
  it('treats anyone with a dog as an owner, sitter or not', () => {
    expect(tourVariant({ hasDog: true, isSitter: true })).toBe('owner');
  });

  it('treats accounts from before the flag existed as owners', () => {
    expect(tourVariant({ hasDog: null })).toBe('owner');
  });

  it('gives a dogless sitter the sitter tour', () => {
    expect(tourVariant({ hasDog: false, isSitter: true })).toBe('sitter');
  });

  it('gives everyone else the third tour', () => {
    expect(tourVariant({ hasDog: false, isSitter: false })).toBe('neither');
  });
});

describe('tourSlides', () => {
  const keys = (v: Parameters<typeof tourSlides>[0]) => tourSlides(v).map(s => s.key);

  it('opens with a welcome and ends with the send-off in every variant', () => {
    for (const v of ['owner', 'sitter', 'neither'] as const) {
      expect(keys(v)[0]).toBe('welcome');
      expect(keys(v).at(-1)).toBe('done');
    }
  });

  it('shows Discover only to owners, who are the only ones who can open it', () => {
    expect(keys('owner')).toContain('discover');
    expect(keys('sitter')).not.toContain('discover');
    expect(keys('neither')).not.toContain('discover');
  });

  it('frames SOS for your own dog or for helping, never both', () => {
    expect(keys('owner')).toContain('sosOwner');
    expect(keys('owner')).not.toContain('sosHelp');
    expect(keys('sitter')).toContain('sosHelp');
  });

  it('offers "Show me" for every feature slide, and not for the welcome or the send-off', () => {
    for (const v of ['owner', 'sitter', 'neither'] as const) {
      for (const slide of tourSlides(v)) {
        if (slide.key === 'welcome' || slide.key === 'done' || slide.key === 'sosHelp') {
          expect(slide.target).toBeUndefined();
        } else {
          expect(slide.target).toBeDefined();
        }
      }
    }
  });
});
