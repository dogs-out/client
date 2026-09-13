import i18next from 'i18next';

/**
 * How a lookup behaves when the key is not there.
 *
 * <p>Both halves matter and they pull against each other. A key with nothing
 * behind it must not render its own path — a tester read
 * "whosOutside.line.AT_HOME" in her friends list. But parseMissingKeyHandler
 * *overrides* defaultValue rather than running after it, and tags rely on that
 * default: there is no `tags` block in English at all, because a tag is stored
 * as its own English text. Ignoring the default emptied every chip in the app.
 */
describe('missing translation keys', () => {
  const handler = (key: string, defaultValue?: string) => defaultValue ?? '';

  let i18n: typeof i18next;
  beforeAll(async () => {
    i18n = i18next.createInstance();
    await i18n.init({
      lng: 'en',
      resources: { en: { translation: { greeting: 'Hi' } } },
      parseMissingKeyHandler: handler,
    });
  });

  it('still translates what it has', () => {
    expect(i18n.t('greeting')).toBe('Hi');
  });

  it('renders nothing rather than the key path', () => {
    expect(i18n.t('whosOutside.line.SOMETHING_NEW')).toBe('');
  });

  it('keeps the default when one is given, which is how tags are shown', () => {
    expect(i18n.t('tags.Zoomies champion', { defaultValue: 'Zoomies champion' }))
      .toBe('Zoomies champion');
  });

  it('matches what translateTag asks for', () => {
    // translateTag passes the tag itself as the default, for every tag, always.
    for (const tag of ['Fetch obsessed', 'Couch potato', 'Monday', 'Prefer not to say']) {
      expect(i18n.t(`tags.${tag}`, { defaultValue: tag })).toBe(tag);
    }
  });
});
