import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpFaq'>;

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How does matching work?',
    a: 'In Discover you see dogs (and their owners) near you. Swipe right or tap the bone to give a treat, swipe left to pass. When you both give each other a treat, it\'s a match — you can then chat and plan a walk together.',
  },
  {
    q: 'Why can\'t I see anyone in Discover?',
    a: 'Discover only shows people within your distance setting who match your filters. Try increasing the maximum distance or widening the age filters under Settings → Discovery preferences. Your own location must be set for distance matching to work.',
  },
  {
    q: 'How do I add or edit my dogs?',
    a: 'Go to your Profile tab. There you can add a new dog or tap an existing one to edit its photos, breed, bio, personality, and tags.',
  },
  {
    q: 'How do I report or block someone?',
    a: 'Open the chat with that person and tap the ••• menu in the top right. You can view their profile, report them (with a reason — our team reviews every report), block them, or unmatch. Blocked users can be managed under Settings → Blocked users.',
  },
  {
    q: 'Are my messages private?',
    a: 'Messages are only visible to you and your match. If a chat is reported, the conversation is shared with our moderation team to review the report.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Settings → Delete account. This permanently removes your profile, dogs, matches, and messages. It cannot be undone.',
  },
];

export default function HelpFaqScreen({ navigation }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {FAQS.map((faq, i) => {
          const expanded = open === i;
          return (
            <GlassCard key={faq.q} padding={0} style={styles.card}>
              <TouchableOpacity style={styles.question} onPress={() => setOpen(expanded ? null : i)}>
                <Text style={styles.questionText}>{faq.q}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              {expanded && <Text style={styles.answer}>{faq.a}</Text>}
            </GlassCard>
          );
        })}

        <Text style={styles.contact}>
          Still stuck? Write to us at support@dogsout.app 🐾
        </Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card:   { marginBottom: 12 },

  question:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  questionText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  answer:       { paddingHorizontal: 16, paddingBottom: 14, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  contact: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
});
