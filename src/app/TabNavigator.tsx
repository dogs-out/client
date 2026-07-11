import { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { notificationService } from '../services/notificationService';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DiscoverScreen from '../features/matching/DiscoverScreen';
import ChatsScreen from '../features/chat/ChatsScreen';
import HomeScreen from '../screens/HomeScreen';
import { glassTabBarStyles as styles } from '../components/GlassTabBar';
import { Colors } from '../constants/colors';

export type MainTabParamList = {
  Discover: undefined;
  Chats: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ITEMS: { name: keyof MainTabParamList; labelKey: string; icon: string; iconActive: string }[] = [
  { name: 'Discover', labelKey: 'matching.discover.headerTitle', icon: 'paw-outline',       iconActive: 'paw' },
  { name: 'Chats',    labelKey: 'chat.chatsScreen.headerTitle',  icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { name: 'Profile',  labelKey: 'home.profileTab',                icon: 'person-outline',     iconActive: 'person' },
];

function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrapper}>
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
                  <Ionicons
                    name={(focused ? item.iconActive : item.icon) as any}
                    size={22}
                    color={focused ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
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

  return (
    <Tab.Navigator
      tabBar={props => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Chats"    component={ChatsScreen} />
      <Tab.Screen name="Profile"  component={HomeScreen} />
    </Tab.Navigator>
  );
}

