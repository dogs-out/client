import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from './api';

// Show pushes as banners even while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface PushData {
  type?: 'NEW_MESSAGE' | 'NEW_MATCH';
  matchId?: number;
  otherUserId?: number;
  name?: string;
}

export const notificationService = {
  /**
   * Best effort: asks for permission, fetches the Expo push token and stores
   * it server-side. Silently does nothing where push can't work (simulator,
   * Expo Go since SDK 53, permission denied).
   */
  register: async (): Promise<void> => {
    try {
      if (!Device.isDevice) return;
      if (Constants.appOwnership === 'expo') return; // Expo Go can't receive remote pushes

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Dogs Out',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted'
        || (await Notifications.requestPermissionsAsync()).status === 'granted';
      if (!granted) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const { data: token } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      await api.put('/users/me/push-token', { token });
    } catch {
      // push is optional — never break the app over it
    }
  },

  /** Remove the device token server-side (call on sign out). */
  unregister: async (): Promise<void> => {
    try {
      await api.put('/users/me/push-token', { token: null });
    } catch {
      // best effort
    }
  },

  setEnabled: (enabled: boolean): Promise<void> =>
    api.put('/users/me/notifications', { enabled }).then(() => {}),

  /** Fires when the user taps a notification; returns an unsubscribe. */
  onNotificationTap: (handler: (data: PushData) => void): (() => void) => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      handler((response.notification.request.content.data ?? {}) as PushData);
    });
    return () => sub.remove();
  },
};
