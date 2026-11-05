import { useState } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';

type Props = {
  children: string;
  lines?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Text cut to a few lines with "More" to read the rest. The link only appears when
 * the text really is longer than that — a short note with a "More" under it that
 * changes nothing reads as broken.
 */
export function ExpandableText({ children, lines = 3, style, containerStyle, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  return (
    <View style={containerStyle}>
      <Text
        style={style}
        numberOfLines={expanded ? undefined : lines}
        // Measured while collapsed: past `lines` means there is more to show.
        onTextLayout={e => { if (!expanded && e.nativeEvent.lines.length > lines) setOverflows(true); }}
        testID={testID}
      >
        {children}
      </Text>
      {/* Laid out once without a limit so onTextLayout sees every line. */}
      {!overflows && !expanded && (
        <Text
          style={[style, styles.measure]}
          onTextLayout={e => { if (e.nativeEvent.lines.length > lines) setOverflows(true); }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {children}
        </Text>
      )}
      {overflows && (
        <TouchableOpacity onPress={() => setExpanded(v => !v)} hitSlop={8} testID={testID ? `${testID}-toggle` : undefined}>
          <Text style={styles.toggle}>{t(expanded ? 'common.showLess' : 'common.showMore')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Off-screen copy, only there to be measured.
  measure: { position: 'absolute', opacity: 0, left: 0, right: 0 },
  toggle: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginTop: 4 },
});
