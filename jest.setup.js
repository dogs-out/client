// React 19 requires this flag for act()-aware test rendering
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Native keyboard tracking has no JS-side implementation under Jest
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));
