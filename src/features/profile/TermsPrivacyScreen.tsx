import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsPrivacy'>;

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Who can use Dogs Out',
    body: 'You must be at least 18 years old to create an account. You are responsible for the accuracy of your profile and for keeping your login credentials safe.',
  },
  {
    title: '2. Your content & behaviour',
    body: 'Be kind. Content that is abusive, discriminatory, sexually explicit, misleading, or unrelated to meeting other dog owners is not allowed. We filter obvious profanity automatically and review every user report. We may remove content or suspend accounts that violate these rules. You can report or block any user from your chat with them.',
  },
  {
    title: '3. Meeting in person',
    body: 'Dogs Out helps you meet other dog owners, but meetings happen at your own responsibility. Meet in public places like parks, and make sure your dog is comfortable around other dogs.',
  },
  {
    title: '4. What data we store',
    body: 'Your account (name, email, date of birth), your profile and dog profiles including photos, your approximate location (used only for distance-based matching — other users never see your exact position), your matches and chat messages, and your notification preferences.',
  },
  {
    title: '5. How your data is used',
    body: 'Your data is used solely to run Dogs Out: showing your profile to nearby users, delivering messages, and sending push notifications you can switch off at any time. We do not sell your data or share it with advertisers. Reported chats are reviewed by our moderation team.',
  },
  {
    title: '6. Deleting your data',
    body: 'Settings → Delete account permanently removes your profile, photos, dogs, matches, messages, and blocks. This is immediate and cannot be undone.',
  },
  {
    title: '7. Contact',
    body: 'Questions about these terms or your data? Contact us at support@dogsout.app.',
  },
];

export default function TermsPrivacyScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: July 2026</Text>
        {SECTIONS.map(section => (
          <GlassCard key={section.title} padding={0} style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          </GlassCard>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll:  { paddingHorizontal: 20, paddingTop: 4 },
  updated: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, marginLeft: 4 },
  card:    { marginBottom: 12 },
  cardInner: { paddingHorizontal: 16, paddingVertical: 14 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  sectionBody:  { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
