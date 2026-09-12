import { useEffect } from 'react';
import { AppState, Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { notificationService } from '../services/notificationService';
import { chatSocket } from '../services/socket';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DiscoverScreen from '../features/matching/DiscoverScreen';
import FindSitterScreen from '../features/sitter/FindSitterScreen';
import PlaydatesScreen from '../features/playdates/PlaydatesScreen';
import ChatsScreen from '../features/chat/ChatsScreen';
import HomeScreen from '../screens/HomeScreen';
import { glassTabBarStyles as styles, TAB_ICON_SIZE, WRAPPER_PAD_B } from '../components/GlassTabBar';
import { useHasDog } from '../hooks/useHasDog';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { Colors } from '../constants/colors';

export type MainTabParamList = {
  Discover: undefined;
  FindSitter: undefined;
  Playdates: undefined;
  Chats: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ITEMS: { name: keyof MainTabParamList; labelKey: string; icon: string; iconActive: string }[] = [
  { name: 'Discover',   labelKey: 'matching.discover.headerTitle', icon: 'paw-outline',       iconActive: 'paw' },
  { name: 'FindSitter', labelKey: 'sitter.tabTitle',                icon: 'people-outline',     iconActive: 'people' },
  { name: 'Playdates',  labelKey: 'playdates.tabTitle',             icon: 'calendar-outline',   iconActive: 'calendar' },
  { name: 'Chats',      labelKey: 'chat.chatsScreen.headerTitle',  icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { name: 'Profile',    labelKey: 'home.profileTab',                icon: 'person-outline',     iconActive: 'person' },
];

function GlassTabBar({ state, descriptors, navigation }: Readonly<BottomTabBarProps>) {
  const { t } = useTranslation();
  const unread = useUnreadCount();
  // Whatever the system reserves at the bottom — nothing on an iPhone beyond the
  // home indicator, a few points for gesture navigation, and around 48 for the
  // Android three-button bar, which is what this bar was sitting underneath.
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { paddingBottom: WRAPPER_PAD_B + insets.bottom }]}>
      <BlurView intensity={60} tint="light" style={styles.blur}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const item = TAB_ITEMS.find(t => t.name === route.name)!;
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel?.toString() ?? t(item.labelKey);

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tab}
                activeOpacity={0.7}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              >
                <View style={[styles.tabInner, focused && styles.tabInnerActive]}>
                  <View>
                    <Ionicons
                      name={(focused ? item.iconActive : item.icon) as any}
                      size={TAB_ICON_SIZE}
                      color={focused ? Colors.primary : Colors.textSecondary}
                    />
                    {route.name === 'Chats' && unread > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText} numberOfLines={1}>
                          {unread > 99 ? '99+' : unread}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.tabLabel, focused && styles.tabLabelActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    maxFontSizeMultiplier={1.2}
                  >
                    {label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabNavigator() {
  // The user is authenticated once the main tabs mount — register this device for push
  useEffect(() => { notificationService.register(); }, []);

  // Hold the socket open for as long as the app is in the foreground.
  //
  // The server only sends a push when the recipient is *not* connected, and until
  // now the socket lived only while a chat or playdate screen was mounted — so
  // someone swiping in Discover counted as away and got pushed about a match they
  // were watching happen on screen, which then surfaced when they came back to the
  // app. Anchoring the connection to the app's foreground state instead makes
  // "online" mean what the server assumes it means. Backgrounding closes it, so
  // push still reaches people who really have left.
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    // A listener that does nothing on purpose: screens subscribe for their own
    // updates, this one exists only to keep the connection alive.
    const open = () => { unsubscribe ??= chatSocket.subscribe(() => {}); };
    const close = () => { unsubscribe?.(); unsubscribe = null; };

    open();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') open(); else close();
    });
    return () => { sub.remove(); close(); };
  }, []);

  // The tab stays whether or not there is a dog. Removing it made the app change
  // shape under someone who had just deleted their last dog, with no explanation;
  // the screen itself now says why it is closed and how to open it.
  const hasDog = useHasDog();

  return (
    <Tab.Navigator
      tabBar={props => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName={hasDog === false ? 'FindSitter' : 'Discover'}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="FindSitter" component={FindSitterScreen} />
      <Tab.Screen name="Playdates"  component={PlaydatesScreen} />
      <Tab.Screen name="Chats"      component={ChatsScreen} />
      <Tab.Screen name="Profile"  component={HomeScreen} />
    </Tab.Navigator>
  );
}

