import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { MainTabParamList } from '../app/TabNavigator';
import { Colors } from '../constants/colors';

type Tab = { name: keyof MainTabParamList; label: string; icon: string; iconActive: string };

const TABS: Tab[] = [
  { name: 'Discover', label: 'Discover', icon: 'paw-outline',        iconActive: 'paw' },
  { name: 'Chats',    label: 'Chats',    icon: 'chatbubble-outline',  iconActive: 'chatbubble' },
  { name: 'Profile',  label: 'Profile',  icon: 'person-outline',      iconActive: 'person' },
];

type Props = { activeTab?: keyof MainTabParamList };

export function GlassTabBar({ activeTab }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={glassTabBarStyles.wrapper} pointerEvents="box-none">
      <BlurView intensity={60} tint="light" style={glassTabBarStyles.blur}>
        <View style={glassTabBarStyles.tabBar}>
          {TABS.map(tab => {
            const focused = tab.name === activeTab;
            return (
              <TouchableOpacity
                key={tab.name}
                style={glassTabBarStyles.tab}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MainTabs', { screen: tab.name } as any)}
              >
                <View style={[glassTabBarStyles.tabInner, focused && glassTabBarStyles.tabInnerActive]}>
                  <Ionicons
                    name={(focused ? tab.iconActive : tab.icon) as any}
                    size={22}
                    color={focused ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[glassTabBarStyles.tabLabel, focused && glassTabBarStyles.tabLabelActive]}>
                    {tab.label}
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

export const glassTabBarStyles = StyleSheet.create({
  wrapper: {
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
