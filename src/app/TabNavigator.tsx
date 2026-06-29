import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import DiscoverScreen from '../features/matching/DiscoverScreen';
import ChatsScreen from '../features/chat/ChatsScreen';
import HomeScreen from '../screens/HomeScreen';
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
    <View style={styles.tabBarWrapper}>
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

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  blur: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 0 : 8,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.glass.overlay,
  },
  tab:            { flex: 1, alignItems: 'center' },
  tabInner:       { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, gap: 3 },
  tabInnerActive: { backgroundColor: 'rgba(46,158,107,0.12)' },
  tabLabel:       { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  tabLabelActive: { color: Colors.primary },
});
