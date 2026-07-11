import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, StatusBar,
  ScrollView, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, BookOpenCheck, Calendar, User, ClipboardList,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import api from '../../utils/api';

/**
 * Parent-facing Homework screen — text-only daily notes grouped
 * day-wise by `for_date`. Mirror of the student app's homework
 * screen with the same two-bucket model:
 *
 *   - Homework   → text-only daily class notes (shown here)
 *   - Assignment → PDF-submission briefs (shown on the Assignments
 *                  screen as read-only — parents see status, not the
 *                  upload button)
 *
 * Both screens share /students/homework. The parent's auth header
 * already scopes the response to the currently-selected child.
 *
 * MIRROR: when you edit this file, mirror the change in
 * `react-native/app/(dashboard)/homework.tsx`. The only intentional
 * divergence is that the parent app uses Alert.alert for errors (no
 * ToastContext).
 */

type Row = {
  id: number;
  kind?: 'homework' | 'assignment' | null;
  title: string;
  description?: string | null;
  for_date?: string | null;
  due_date?: string | null;
  subject?: string | null;
  teacher_name?: string | null;
};

export default function Homework() {
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
      console.warn('Failed to fetch homework', err?.response?.status, err?.response?.data?.message);
      if (items.length === 0) {
        Alert.alert('Could not load homework', 'Please check your connection and pull down to retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const homework = useMemo(
    () => items.filter(i => (i.kind ?? 'homework') === 'homework'),
    [items]
  );
  const assignmentCount = useMemo(
    () => items.filter(i => i.kind === 'assignment').length,
    [items]
  );

  const groups = useMemo(() => groupByDay(homework), [homework]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Child's Homework</Text>
            <View style={{ width: 40 }} />
          </View>

          <Animated.View entering={FadeInDown.duration(280)} style={styles.summaryCard}>
            <View style={styles.summaryIconWrap}>
              <BookOpenCheck stroke="#fff" size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Today's classwork</Text>
              <Text style={styles.summaryValue}>{homework.length}</Text>
            </View>
            <TouchableOpacity
              style={styles.assignmentsLink}
              onPress={() => router.push('/(dashboard)/assignments')}
              activeOpacity={0.7}
            >
              <ClipboardList size={14} stroke="#fff" />
              <Text style={styles.assignmentsLinkText}>Assignments{assignmentCount > 0 ? ` (${assignmentCount})` : ''}</Text>
            </TouchableOpacity>
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
        ) : groups.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(80)} style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <BookOpenCheck size={42} stroke="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No homework yet</Text>
            <Text style={styles.emptySub}>
              When teachers post homework for your child's class, it'll show up here grouped by day. Pull down to refresh.
            </Text>
          </Animated.View>
        ) : (
          groups.map((group, gi) => (
            <View key={group.key} style={{ marginBottom: 8 }}>
              <Animated.View entering={FadeInDown.delay(gi * 40)} style={styles.groupHeader}>
                <Calendar size={14} stroke="#475569" />
                <Text style={styles.groupHeaderText}>{group.label}</Text>
                <View style={styles.groupDot} />
                <Text style={styles.groupCount}>{group.items.length} item{group.items.length === 1 ? '' : 's'}</Text>
              </Animated.View>

              {group.items.map((item, i) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInRight.delay(Math.min(i * 40, 240)).springify().damping(16)}
                  layout={Layout.springify().damping(16)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                      {!!item.subject && (
                        <Text style={styles.cardSubject}>{item.subject}</Text>
                      )}
                    </View>
                  </View>

                  {!!item.description && (
                    <Text style={styles.cardDesc} numberOfLines={4}>{item.description}</Text>
                  )}

                  {!!item.teacher_name && (
                    <View style={styles.cardFooter}>
                      <View style={styles.meta}>
                        <User size={12} stroke="#64748b" />
                        <Text style={styles.metaText} numberOfLines={1}>{item.teacher_name}</Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ---- helpers ---- (mirror of the student app; keep in sync)

function isoDayOnly(d: Date) { return d.toISOString().slice(0, 10); }

function groupByDay(rows: Row[]): Array<{ key: string; label: string; items: Row[] }> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const todayIso = isoDayOnly(today);
  const tomorrowIso = isoDayOnly(tomorrow);
  const yesterdayIso = isoDayOnly(yesterday);

  const buckets: Record<string, Row[]> = {};
  for (const r of rows) {
    const key = (r.for_date || '').slice(0, 10) || 'undated';
    (buckets[key] ||= []).push(r);
  }

  const allKeys = Object.keys(buckets);
  allKeys.sort((a, b) => {
    if (a === todayIso) return -1;
    if (b === todayIso) return 1;
    if (a === tomorrowIso) return -1;
    if (b === tomorrowIso) return 1;
    if (a === 'undated') return 1;
    if (b === 'undated') return -1;
    const aPast = a < todayIso, bPast = b < todayIso;
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;
    return aPast ? b.localeCompare(a) : a.localeCompare(b);
  });

  return allKeys.map(key => ({
    key,
    label: labelForKey(key, todayIso, tomorrowIso, yesterdayIso),
    items: buckets[key],
  }));
}

function labelForKey(key: string, todayIso: string, tomorrowIso: string, yesterdayIso: string): string {
  if (key === 'undated') return 'No date set';
  if (key === todayIso) return 'Today';
  if (key === tomorrowIso) return 'Tomorrow';
  if (key === yesterdayIso) return 'Yesterday';
  try {
    return new Date(key + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch {
    return key;
  }
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
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
  assignmentsLink: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
  },
  assignmentsLinkText: { fontSize: 11, color: '#fff', fontFamily: 'Inter_700Bold' },

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

  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, marginBottom: 8, paddingHorizontal: 4,
  },
  groupHeaderText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#1e293b', letterSpacing: 0.4, textTransform: 'uppercase' },
  groupDot: { width: 3, height: 3, borderRadius: 999, backgroundColor: '#cbd5e1' },
  groupCount: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#64748b' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1e293b' },
  cardSubject: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#4f46e5', marginTop: 2, letterSpacing: 0.4, textTransform: 'uppercase' },
  cardDesc: { fontSize: 12.5, color: '#475569', fontFamily: 'Inter_500Medium', lineHeight: 18, marginTop: 4 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center',
    flexWrap: 'wrap', gap: 8,
    paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, color: '#64748b', fontFamily: 'Inter_600SemiBold' },
});
