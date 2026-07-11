import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, StatusBar,
  ScrollView, RefreshControl, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ClipboardList, Calendar, User, CheckCircle2,
  AlertCircle, Award, Eye, Download,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import api from '../../utils/api';

/**
 * Parent-facing Assignments screen — read-only mirror of the
 * student's Assignments screen.
 *
 * The parent CANNOT submit on behalf of their child (submission is
 * the student's responsibility), but they CAN:
 *   - See assignment briefs, due dates, and overdue state
 *   - See whether the child has submitted (and when)
 *   - View / download the child's already-submitted PDF
 *   - See marks + feedback once the teacher has graded
 *
 * MIRROR: when you edit this file, mirror non-upload changes in
 * `react-native/app/(dashboard)/assignments.tsx`. Keep the upload
 * button OFF here on purpose.
 */

type Submission = {
  id: number;
  file_url?: string;
  file_name?: string;
  submitted_at?: string;
  marks?: number | string | null;
  feedback?: string | null;
  graded_at?: string | null;
};

type Row = {
  id: number;
  kind?: 'homework' | 'assignment' | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  for_date?: string | null;
  subject?: string | null;
  teacher_name?: string | null;
  is_overdue?: boolean;
  submission?: Submission | null;
};

export default function Assignments() {
  const router = useRouter();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res: any = await api.get('/students/homework');
      const list = Array.isArray(res?.homework) ? res.homework : [];
      setItems(list);
    } catch (err: any) {
      console.warn('Failed to fetch assignments', err?.response?.status, err?.response?.data?.message);
      if (items.length === 0) {
        Alert.alert('Could not load assignments', 'Please check your connection and pull down to retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const assignments = useMemo(
    () => items.filter(i => i.kind === 'assignment'),
    [items]
  );

  const todo = assignments.filter(a => !a.submission).length;
  const graded = assignments.filter(a => !!a.submission?.graded_at).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Child's Assignments</Text>
            <View style={{ width: 40 }} />
          </View>

          <Animated.View entering={FadeInDown.duration(280)} style={styles.summaryCard}>
            <View style={styles.summaryIconWrap}>
              <ClipboardList stroke="#fff" size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={styles.summaryValue}>{todo}</Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>Graded</Text>
              <Text style={styles.summaryValue}>{graded}</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollPad}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#4f46e5" />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : assignments.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(80)} style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <ClipboardList size={42} stroke="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No assignments yet</Text>
            <Text style={styles.emptySub}>
              When teachers post a PDF assignment for your child's class, you'll see it here along with their submission status.
            </Text>
          </Animated.View>
        ) : assignments.map((a, i) => {
          const sub = a.submission;
          const overdue = a.is_overdue && !sub;
          return (
            <Animated.View
              key={a.id}
              entering={FadeInRight.delay(Math.min(i * 50, 250)).springify().damping(15)}
              layout={Layout.springify().damping(16)}
              style={[styles.card, overdue && styles.cardOverdue]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{a.title}</Text>
                  {!!a.subject && <Text style={styles.cardSubject}>{a.subject}</Text>}
                </View>
                {sub?.graded_at ? (
                  <View style={[styles.statusPill, styles.pillGreen]}>
                    <Award size={11} stroke="#047857" />
                    <Text style={[styles.statusPillText, { color: '#047857' }]}>Graded</Text>
                  </View>
                ) : sub ? (
                  <View style={[styles.statusPill, styles.pillBlue]}>
                    <CheckCircle2 size={11} stroke="#1d4ed8" />
                    <Text style={[styles.statusPillText, { color: '#1d4ed8' }]}>Submitted</Text>
                  </View>
                ) : overdue ? (
                  <View style={[styles.statusPill, styles.pillRed]}>
                    <AlertCircle size={11} stroke="#b91c1c" />
                    <Text style={[styles.statusPillText, { color: '#b91c1c' }]}>Overdue</Text>
                  </View>
                ) : (
                  <View style={[styles.statusPill, styles.pillAmber]}>
                    <Text style={[styles.statusPillText, { color: '#b45309' }]}>To do</Text>
                  </View>
                )}
              </View>

              {!!a.description && (
                <Text style={styles.cardDesc} numberOfLines={4}>{a.description}</Text>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.meta}>
                  <Calendar size={12} stroke="#64748b" />
                  <Text style={[styles.metaText, overdue && { color: '#b91c1c' }]}>
                    Due {a.due_date || '—'}
                  </Text>
                </View>
                {!!a.teacher_name && (
                  <View style={styles.meta}>
                    <User size={12} stroke="#64748b" />
                    <Text style={styles.metaText} numberOfLines={1}>{a.teacher_name}</Text>
                  </View>
                )}
              </View>

              {/* Grade + feedback — visible once teacher has graded. */}
              {sub?.graded_at && (
                <View style={styles.gradeBox}>
                  <View style={styles.gradeRow}>
                    <Text style={styles.gradeLabel}>Marks</Text>
                    <Text style={styles.gradeValue}>{sub.marks != null ? String(sub.marks) : '—'}</Text>
                  </View>
                  {!!sub.feedback && (
                    <>
                      <Text style={styles.gradeLabel}>Feedback</Text>
                      <Text style={styles.gradeFeedback}>{sub.feedback}</Text>
                    </>
                  )}
                </View>
              )}

              {/* Read-only action row — only shown when child has
                  submitted. Parents can View/Download but never upload. */}
              {sub ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionPrimary}
                    onPress={() => sub.file_url && router.push({
                      pathname: '/(dashboard)/viewer',
                      params: { url: sub.file_url, title: sub.file_name || a.title },
                    })}
                    activeOpacity={0.7}
                  >
                    <Eye size={12} stroke="#fff" />
                    <Text style={styles.actionPrimaryText}>View submission</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionSecondary}
                    onPress={() => sub.file_url && Linking.openURL(sub.file_url).catch(() => Alert.alert('Open failed', 'Cannot open this file.'))}
                    activeOpacity={0.7}
                  >
                    <Download size={12} stroke="#4f46e5" />
                    <Text style={styles.actionSecondaryText}>Download</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.parentHint}>
                  Submission is on the student's app. Ask your child to upload from their account.
                </Text>
              )}
            </Animated.View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { paddingBottom: 36, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, marginBottom: 12,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', flex: 1, textAlign: 'center' },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, padding: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  summaryIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase' },
  summaryValue: { fontSize: 20, color: '#fff', fontFamily: 'Inter_800ExtraBold', marginTop: 1 },

  content: { flex: 1, marginTop: -10 },
  scrollPad: { paddingHorizontal: 20, paddingTop: 22 },
  centered: { paddingVertical: 80, alignItems: 'center' },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  emptyIcon: {
    width: 84, height: 84, borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: '#1e293b' },
  emptySub: { fontSize: 13, color: '#64748b', fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 19, maxWidth: 280 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardOverdue: { borderWidth: 1, borderColor: '#fecaca' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1e293b' },
  cardSubject: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#4f46e5', marginTop: 2, letterSpacing: 0.4, textTransform: 'uppercase' },
  cardDesc: { fontSize: 12.5, color: '#475569', fontFamily: 'Inter_500Medium', lineHeight: 18, marginTop: 4, marginBottom: 10 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 8,
    paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  metaText: { fontSize: 11, color: '#64748b', fontFamily: 'Inter_600SemiBold' },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase', letterSpacing: 0.6 },
  pillBlue: { backgroundColor: '#dbeafe' },
  pillGreen: { backgroundColor: '#d1fae5' },
  pillAmber: { backgroundColor: '#fef3c7' },
  pillRed: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },

  gradeBox: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 4,
  },
  gradeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gradeLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  gradeValue: { fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: '#047857' },
  gradeFeedback: { fontSize: 12, color: '#475569', fontFamily: 'Inter_500Medium', marginTop: 4, lineHeight: 17 },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    justifyContent: 'center',
  },
  actionPrimaryText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  actionSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
  },
  actionSecondaryText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#4f46e5' },

  parentHint: {
    marginTop: 12, fontSize: 11, color: '#94a3b8', fontStyle: 'italic',
    fontFamily: 'Inter_500Medium', lineHeight: 16,
  },
});
