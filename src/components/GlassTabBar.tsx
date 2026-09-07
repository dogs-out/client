import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types/navigation';
import { MainTabParamList } from '../app/TabNavigator';
import { useHasDog } from '../hooks/useHasDog';
import { Colors } from '../constants/colors';

type Tab = { name: keyof MainTabParamList; labelKey: string; icon: string; iconActive: string };

const TABS: Tab[] = [
  { name: 'Discover',   labelKey: 'matching.discover.headerTitle', icon: 'paw-outline',        iconActive: 'paw' },
  { name: 'FindSitter', labelKey: 'sitter.tabTitle',                icon: 'people-outline',      iconActive: 'people' },
  { name: 'Playdates',  labelKey: 'playdates.tabTitle',             icon: 'calendar-outline',    iconActive: 'calendar' },
  { name: 'Chats',      labelKey: 'chat.chatsScreen.headerTitle',  icon: 'chatbubble-outline',  iconActive: 'chatbubble' },
  { name: 'Profile',    labelKey: 'home.profileTab',               icon: 'person-outline',      iconActive: 'person' },
];

type Props = { activeTab?: keyof MainTabParamList };

export function GlassTabBar({ activeTab }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Keep in step with TabNavigator, which drops Discover for sitter-only accounts.
  const hasDog = useHasDog();
  const tabs = hasDog === false ? TABS.filter(tab => tab.name !== 'Discover') : TABS;

  return (
    <View style={glassTabBarStyles.wrapper} pointerEvents="box-none">
      <BlurView intensity={60} tint="light" style={glassTabBarStyles.blur}>
        <View style={glassTabBarStyles.tabBar}>
          {tabs.map(tab => {
            const focused = tab.name === activeTab;
            return (
              <TouchableOpacity
                key={tab.name}
                style={glassTabBarStyles.tab}
                activeOpacity={0.7}
                onPress={() => navigation.popTo('MainTabs', { screen: tab.name } as any)}
              >
                <View style={[glassTabBarStyles.tabInner, focused && glassTabBarStyles.tabInnerActive]}>
                  <Ionicons
                    name={(focused ? tab.iconActive : tab.icon) as any}
                    size={22}
                    color={focused ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[glassTabBarStyles.tabLabel, focused && glassTabBarStyles.tabLabelActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t(tab.labelKey)}
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

// ─── Geometry ─────────────────────────────────────────────────────────────────
// Named rather than inlined so TAB_BAR_HEIGHT below is computed from the very
// numbers the styles use. A hand-guessed constant is how the Discover buttons
// ended up under the bar twice.
export const TAB_ICON_SIZE = 22;
const TAB_LABEL_LINE   = 13;   // 11pt text
const TAB_INNER_PAD_V  = 6;
const TAB_INNER_GAP    = 3;
const TAB_BAR_PAD_V    = 10;
const TAB_BAR_BORDER   = 1.5;
const WRAPPER_PAD_B    = Platform.OS === 'ios' ? 24 : 8;
const BLUR_MARGIN_B    = Platform.OS === 'ios' ? 0 : 8;

/**
 * Vertical space the floating tab bar occupies, measured from the bottom of the
 * screen. Screens that place content at the bottom of a full-height layout must
 * reserve this much — less whatever the safe-area inset already gives them, and
 * plus a gap of their own — or the content sits underneath the bar.
 */
export const TAB_BAR_HEIGHT =
  TAB_INNER_PAD_V * 2 + TAB_ICON_SIZE + TAB_INNER_GAP + TAB_LABEL_LINE  // one tab
  + TAB_BAR_PAD_V * 2 + TAB_BAR_BORDER * 2                              // bar chrome
  + WRAPPER_PAD_B + BLUR_MARGIN_B;                                      // and its offset

export const glassTabBarStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: WRAPPER_PAD_B,
  },
  blur: {
    marginHorizontal: 16,
    marginBottom: BLUR_MARGIN_B,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: TAB_BAR_BORDER,
    borderColor: Colors.glass.border,
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: TAB_BAR_PAD_V,
    paddingHorizontal: 8,
    backgroundColor: Colors.glass.overlay,
  },
  tab:            { flex: 1, alignItems: 'stretch' },
  // Horizontal padding stays small so translated labels (DE/FR/IT run longer than
  // EN) keep enough width to render on one line instead of wrapping mid-word.
  tabInner:       { alignItems: 'center', paddingVertical: TAB_INNER_PAD_V, paddingHorizontal: 4, borderRadius: 16, gap: TAB_INNER_GAP },
  tabInnerActive: { backgroundColor: 'rgba(46,158,107,0.12)' },
  tabLabel:       { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  tabLabelActive: { color: Colors.primary },
});
