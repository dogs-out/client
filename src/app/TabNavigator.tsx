import { Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
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

const TAB_ITEMS: { name: keyof MainTabParamList; label: string; icon: string; iconActive: string }[] = [
  { name: 'Discover', label: 'Discover', icon: 'paw-outline',       iconActive: 'paw' },
  { name: 'Chats',    label: 'Chats',    icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { name: 'Profile',  label: 'Profile',  icon: 'person-outline',     iconActive: 'person' },
];

function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <BlurView intensity={60} tint="light" style={styles.blur}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const item = TAB_ITEMS.find(t => t.name === route.name)!;
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel?.toString() ?? item.label;

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

