// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * `react-native-maps` has no web build: it calls `codegenNativeComponent`, which
 * react-native-web does not export, and it blows up while the module graph is
 * still loading — so `expo start --web` dies before rendering anything, even on
 * screens that have nothing to do with maps.
 *
 * Resolving it to an empty module on web keeps the browser usable for checking
 * layout and flows. The two screens that actually use a map (playdate detail and
 * the park picker) are native-only in practice and will not render there, which
 * is the accepted trade for having a browser target at all.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
