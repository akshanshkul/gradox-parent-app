import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, BookOpen, FileText,
  Check, Clock, CircleDashed, Eye, Download, GraduationCap,
  ClipboardList, Calendar, AlertCircle, CheckCircle2, Award,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';
import BottomNav from '../../components/BottomNav';
import api from '../../utils/api';
import { clearAuth } from '../../utils/auth';

/**
 * Subject Detail screen — parent app twin of the student screen.
 *
 * Two tabs — Syllabus and Materials — let the parent see what's been
 * published for the child's subject. Lesson Plan is intentionally NOT
 * surfaced: it's a teacher planning document, not parent-facing
 * content (same rule as the student app).
 *
 *   - Syllabus: ordered chapter/topic list with status pill (pending /
 *     in-progress / completed), plus a thin progress bar at the top
 *     so the parent sees where the class is heading.
 *   - Materials: title + description card per item with two actions:
 *       View   → opens the file inside the in-app WebView viewer
 *                (PDFs + Office docs preview via Google's gview embed)
 *       Download → hands the URL to the OS so it saves to device
 *                  (Android Download Manager / iOS Save-to-Files)
 *
 * MIRROR: when you edit this file, mirror the change in the student
 * app's `react-native/app/(dashboard)/subject-detail.tsx`. The only
 * intentional divergence is the toast vs Alert error fallback (the
 * parent app doesn't have a ToastContext yet).
 */
type Subject = {
  id: number
  name: string
  code?: string
  pivot?: {
    id?: number
    periods_per_week?: number
    teacher_id?: number
    teacher_name?: string
    // lesson_plan is intentionally omitted from the parent-facing type —
    // the backend includes it on the payload but we never render it.
    syllabus?: Array<{ id: number; topic: string; description?: string; status?: string }>
    notes?: Array<{ id: number; title: string; description?: string; file_url?: string; created_at?: string }>
  }
}

export default function SubjectDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string; teacher_name?: string }>();

  // Parse the JSON blob the list view passed via navigation — used as
  // INITIAL display data so the screen doesn't flash blank during the
  // fetch. The authoritative copy comes from the network fetch below.
  const initial: Subject | null = useMemo(() => {
    try {
      if (typeof params.subject === 'string') return JSON.parse(params.subject) as Subject;
    } catch (_) {}
    return null;
  }, [params.subject]);

  // Authoritative copy of the subject. Seeded from the param so the
  // tabs render immediately, then OVERWRITTEN by a fresh fetch on mount.
  // This is the fix for "lesson plan / notes added in admin don't show
  // up in the parent app" — the previous version always rendered from
  // the cached list payload, which could be 10 minutes stale.
  const [subject, setSubject] = useState<Subject | null>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'syllabus' | 'materials' | 'homework' | 'assignments'>('syllabus');

  // Per-subject homework + assignments feed — mirror of the student
  // app. The parent app is read-only for assignments (no upload UI);
  // we surface status, dates, and the child's submitted PDF when
  // available so the parent can see whether the work was done.
  type HwRow = {
    id: number;
    kind?: 'homework' | 'assignment' | null;
    title: string;
    description?: string | null;
    for_date?: string | null;
    due_date?: string | null;
    subject_id?: number | null;
    teacher_name?: string | null;
    is_overdue?: boolean;
    submission?: { id: number; file_url?: string; file_name?: string; marks?: any; feedback?: string | null; graded_at?: string | null; submitted_at?: string } | null;
  };
  const [hwRows, setHwRows] = useState<HwRow[]>([]);
  const [hwLoading, setHwLoading] = useState(false);

  const refreshHomework = useCallback(async () => {
    if (!initial?.id) return;
    setHwLoading(true);
    try {
      const res: any = await api.get('/students/homework');
      const raw = res?.data ?? res;
      const list = Array.isArray(raw?.homework) ? raw.homework : [];
      setHwRows(list as HwRow[]);
    } catch (err) {
      // Silent — secondary data, don't block primary syllabus view.
    } finally {
      setHwLoading(false);
    }
  }, [initial?.id]);

  useEffect(() => { refreshHomework(); }, [refreshHomework]);

  // Fetch fresh subject data on mount AND on pull-to-refresh. We always
  // re-fetch on mount because the user just navigated into the detail
  // screen — they implicitly expect the latest content.
  const refreshSubject = useCallback(async () => {
    if (!initial?.id) return;
    try {
      const res: any = await api.get('/students/subjects');
      const raw = res?.data ?? res;
      const list = Array.isArray(raw?.subjects) ? raw.subjects : Array.isArray(raw) ? raw : [];
      const fresh = list.find((s: any) => Number(s.id) === Number(initial.id));
      if (fresh) setSubject(fresh as Subject);
    } catch (err) {
      // Silent — initial data already on screen, no point alarming the user.
    } finally {
      setRefreshing(false);
    }
  }, [initial?.id]);

  useEffect(() => { refreshSubject(); }, [refreshSubject]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try { await api.post('/students/logout'); } catch {}
          await clearAuth();
          router.replace('/(auth)/select-school');
        },
      },
    ]);
  };

  if (!subject) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Subject not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const syllabus = subject.pivot?.syllabus || [];
  const notes = subject.pivot?.notes || [];
  const completedCount = syllabus.filter(s => s.status === 'completed').length;
  const progress = syllabus.length > 0 ? Math.round((completedCount / syllabus.length) * 100) : 0;

  // Per-subject homework + assignment slice. Same filter rule as the
  // student app — only rows tagged to THIS subject's id.
  const subjectHomework = useMemo(
    () => hwRows
      .filter(r => (r.kind ?? 'homework') === 'homework' && Number(r.subject_id) === Number(subject.id))
      .sort((a, b) => String(b.for_date || '').localeCompare(String(a.for_date || ''))),
    [hwRows, subject.id]
  );
  const subjectAssignments = useMemo(
    () => hwRows
      .filter(r => r.kind === 'assignment' && Number(r.subject_id) === Number(subject.id))
      .sort((a, b) => String(b.due_date || '').localeCompare(String(a.due_date || ''))),
    [hwRows, subject.id]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{subject.name}</Text>
            <View style={{ width: 44 }} />
          </View>

          <Animated.View entering={FadeInUp.delay(150)} style={styles.summaryCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Subject</Text>
              <Text style={styles.summaryValue}>{subject.name}{subject.code ? ` · ${subject.code}` : ''}</Text>
              {subject.pivot?.teacher_name ? (
                <View style={styles.teacherRow}>
                  <GraduationCap size={12} stroke="rgba(255,255,255,0.85)" />
                  <Text style={styles.summaryMeta}>Taught by {subject.pivot.teacher_name}</Text>
                </View>
              ) : null}
              <View style={styles.teacherRow}>
                <Clock size={12} stroke="rgba(255,255,255,0.85)" />
                <Text style={styles.summaryMeta}>{subject.pivot?.periods_per_week || 0} periods / week</Text>
              </View>
            </View>
            <BookOpen size={48} stroke="rgba(255,255,255,0.25)" />
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Tab bar */}
      <View style={styles.tabWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          {[
            { id: 'syllabus', label: `Syllabus${syllabus.length ? ` (${syllabus.length})` : ''}`, icon: BookOpen },
            { id: 'materials', label: `Materials${notes.length ? ` (${notes.length})` : ''}`, icon: FileText },
            { id: 'homework', label: `Homework${subjectHomework.length ? ` (${subjectHomework.length})` : ''}`, icon: BookOpen },
            { id: 'assignments', label: `Assignments${subjectAssignments.length ? ` (${subjectAssignments.length})` : ''}`, icon: ClipboardList },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={[styles.tabItem, active && styles.activeTabItem]}
              >
                <Icon size={12} stroke={active ? '#fff' : '#64748b'} />
                <Text style={[styles.tabItemText, active && styles.activeTabItemText]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); refreshSubject(); refreshHomework(); }}
            tintColor="#4f46e5"
          />
        }
      >
        {activeTab === 'syllabus' && (
          <View style={styles.section}>
            {syllabus.length === 0 ? (
              <EmptyState icon={BookOpen} text="The teacher hasn't published the syllabus for this subject yet." />
            ) : (
              <>
                <View style={styles.progressCard}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Curriculum Progress</Text>
                    <Text style={styles.progressValue}>{progress}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressMeta}>
                    {completedCount} of {syllabus.length} chapter{syllabus.length === 1 ? '' : 's'} completed
                  </Text>
                </View>

                {syllabus.map((s, idx) => {
                  const status = (s.status || 'pending').toLowerCase();
                  const tone =
                    status === 'completed' ? { bg: '#d1fae5', fg: '#047857', Icon: Check } :
                    status === 'in-progress' ? { bg: '#dbeafe', fg: '#1d4ed8', Icon: Clock } :
                    { bg: '#f1f5f9', fg: '#64748b', Icon: CircleDashed };
                  const Icon = tone.Icon;
                  return (
                    <Animated.View key={s.id} entering={FadeInRight.delay(idx * 60)} style={styles.chapterCard}>
                      <View style={[styles.statusCircle, { backgroundColor: tone.bg }]}>
                        <Icon size={14} stroke={tone.fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.chapterTopic} numberOfLines={2}>{s.topic}</Text>
                        {s.description ? (
                          <Text style={styles.chapterDesc} numberOfLines={3}>{s.description}</Text>
                        ) : null}
                        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.statusPillText, { color: tone.fg }]}>
                            {status.replace('-', ' ')}
                          </Text>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {activeTab === 'materials' && (
          <View style={styles.section}>
            {notes.length === 0 ? (
              <EmptyState icon={FileText} text="No notes or study materials have been shared yet." />
            ) : (
              notes.map((n, idx) => (
                <Animated.View key={n.id} entering={FadeInRight.delay(idx * 60)} style={styles.materialCard}>
                  <View style={styles.materialIcon}>
                    <FileText size={20} stroke="#4f46e5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.materialTitle}>{n.title}</Text>
                    {n.description ? <Text style={styles.materialDesc}>{n.description}</Text> : null}
                    {n.file_url ? (
                      <View style={styles.materialActionRow}>
                        {/* "View" opens our in-app WebView viewer, which
                            previews PDFs / Office docs via Google's
                            gview embed. The viewer header also exposes
                            its own Download button for save-to-device. */}
                        <TouchableOpacity
                          onPress={() => router.push({
                            pathname: '/(dashboard)/viewer',
                            params: { url: n.file_url!, title: n.title || 'Material' },
                          })}
                          style={[styles.materialLink, styles.materialPrimary]}
                          activeOpacity={0.7}
                        >
                          <Eye size={12} stroke="#fff" />
                          <Text style={[styles.materialLinkText, { color: '#fff' }]}>View</Text>
                        </TouchableOpacity>
                        {/* Quick-download shortcut hands the URL to the
                            OS (Download Manager on Android, Safari's
                            Save-to-Files on iOS). Same behaviour as
                            the in-viewer download button. */}
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              const ok = await Linking.canOpenURL(n.file_url!);
                              if (!ok) return Alert.alert('Download', 'Cannot open this file.');
                              await Linking.openURL(n.file_url!);
                            } catch {
                              Alert.alert('Download', 'Could not start the download.');
                            }
                          }}
                          style={styles.materialLink}
                          activeOpacity={0.7}
                        >
                          <Download size={12} stroke="#4f46e5" />
                          <Text style={styles.materialLinkText}>Download</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.materialDescDim}>(No file attached)</Text>
                    )}
                  </View>
                </Animated.View>
              ))
            )}
          </View>
        )}

        {activeTab === 'homework' && (
          <View style={styles.section}>
            {hwLoading && subjectHomework.length === 0 ? (
              <Text style={styles.loadingText}>Loading homework…</Text>
            ) : subjectHomework.length === 0 ? (
              <EmptyState icon={BookOpen} text="No homework posted for this subject yet. Pull down to refresh." />
            ) : (
              subjectHomework.map((h, idx) => (
                <Animated.View key={h.id} entering={FadeInRight.delay(idx * 60)} style={styles.hwCard}>
                  <View style={styles.hwHeader}>
                    <Text style={styles.hwTitle} numberOfLines={2}>{h.title}</Text>
                    {h.for_date ? (
                      <View style={styles.hwDateChip}>
                        <Calendar size={10} stroke="#1d4ed8" />
                        <Text style={styles.hwDateText}>{h.for_date}</Text>
                      </View>
                    ) : null}
                  </View>
                  {h.description ? (
                    <Text style={styles.hwDesc} numberOfLines={5}>{h.description}</Text>
                  ) : null}
                  {h.teacher_name ? (
                    <Text style={styles.hwTeacher}>— {h.teacher_name}</Text>
                  ) : null}
                </Animated.View>
              ))
            )}
          </View>
        )}

        {activeTab === 'assignments' && (
          <View style={styles.section}>
            {hwLoading && subjectAssignments.length === 0 ? (
              <Text style={styles.loadingText}>Loading assignments…</Text>
            ) : subjectAssignments.length === 0 ? (
              <EmptyState icon={ClipboardList} text="No assignments posted for this subject yet. Pull down to refresh." />
            ) : (
              subjectAssignments.map((a, idx) => {
                const sub = a.submission;
                const overdue = a.is_overdue && !sub;
                return (
                  <Animated.View key={a.id} entering={FadeInRight.delay(idx * 60)} style={[styles.hwCard, overdue && styles.hwCardOverdue]}>
                    <View style={styles.hwHeader}>
                      <Text style={styles.hwTitle} numberOfLines={2}>{a.title}</Text>
                      {sub?.graded_at ? (
                        <View style={[styles.assignPill, styles.pillGreen]}>
                          <Award size={10} stroke="#047857" />
                          <Text style={[styles.assignPillText, { color: '#047857' }]}>Graded</Text>
                        </View>
                      ) : sub ? (
                        <View style={[styles.assignPill, styles.pillBlue]}>
                          <CheckCircle2 size={10} stroke="#1d4ed8" />
                          <Text style={[styles.assignPillText, { color: '#1d4ed8' }]}>Submitted</Text>
                        </View>
                      ) : overdue ? (
                        <View style={[styles.assignPill, styles.pillRed]}>
                          <AlertCircle size={10} stroke="#b91c1c" />
                          <Text style={[styles.assignPillText, { color: '#b91c1c' }]}>Overdue</Text>
                        </View>
                      ) : (
                        <View style={[styles.assignPill, styles.pillAmber]}>
                          <Text style={[styles.assignPillText, { color: '#b45309' }]}>To do</Text>
                        </View>
                      )}
                    </View>
                    {a.description ? (
                      <Text style={styles.hwDesc} numberOfLines={5}>{a.description}</Text>
                    ) : null}
                    <View style={styles.hwMetaRow}>
                      <Calendar size={11} stroke="#64748b" />
                      <Text style={[styles.hwMetaText, overdue && { color: '#b91c1c' }]}>Due {a.due_date || '—'}</Text>
                      {a.teacher_name ? (
                        <Text style={styles.hwMetaText}> · {a.teacher_name}</Text>
                      ) : null}
                    </View>

                    {sub?.graded_at ? (
                      <View style={styles.gradeBox}>
                        <Text style={styles.gradeLabel}>Marks</Text>
                        <Text style={styles.gradeValue}>{sub.marks != null ? String(sub.marks) : '—'}</Text>
                        {sub.feedback ? (
                          <Text style={styles.gradeFeedback}>{sub.feedback}</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Parent-side: NO upload button. We surface
                        view+download when the child has submitted,
                        and otherwise a hint that submission lives on
                        the student app. */}
                    {sub ? (
                      <View style={styles.assignActionRow}>
                        <TouchableOpacity
                          style={styles.materialLink}
                          onPress={() => sub.file_url && router.push({
                            pathname: '/(dashboard)/viewer',
                            params: { url: sub.file_url, title: sub.file_name || a.title },
                          })}
                          activeOpacity={0.7}
                        >
                          <Eye size={11} stroke="#4f46e5" />
                          <Text style={styles.materialLinkText}>View submission</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.materialLink}
                          onPress={() => sub.file_url && Linking.openURL(sub.file_url).catch(() => Alert.alert('Open failed', 'Cannot open this file.'))}
                          activeOpacity={0.7}
                        >
                          <Download size={11} stroke="#4f46e5" />
                          <Text style={styles.materialLinkText}>Download</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.parentHint}>Submission is on the student's app.</Text>
                    )}
                  </Animated.View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav onLogout={handleLogout} />
    </View>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.emptyContainer}>
      <Icon size={42} stroke="#cbd5e1" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  backLink: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#4f46e5' },
  backLinkText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },

  header: { paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginBottom: 12 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', flex: 1, textAlign: 'center' },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, color: '#fff', fontFamily: 'Inter_700Bold', marginTop: 4 },
  summaryMeta: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_500Medium' },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },

  tabWrapper: {
    marginTop: -22,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 5,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  tabsScrollContent: { paddingHorizontal: 2, gap: 6 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: '#f8fafc',
  },
  activeTabItem: { backgroundColor: '#4f46e5' },
  tabItemText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#64748b', letterSpacing: 0.3 },
  activeTabItemText: { color: '#fff' },

  content: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 22 },

  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  progressValue: { fontSize: 18, color: '#4f46e5', fontFamily: 'Inter_800ExtraBold' },
  progressTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 999 },
  progressMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Inter_500Medium', marginTop: 8 },

  chapterCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statusCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  chapterTopic: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e293b' },
  chapterDesc: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#64748b', marginTop: 4 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 8 },
  statusPillText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase', letterSpacing: 0.8 },

  materialCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  materialIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  materialTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e293b' },
  materialDesc: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#64748b', marginTop: 3 },
  materialDescDim: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#94a3b8', marginTop: 6, fontStyle: 'italic' },
  materialActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  materialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  materialPrimary: { backgroundColor: '#4f46e5' },
  materialLinkText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#4f46e5' },

  // Homework / Assignment per-subject card. Mirror of the student
  // app's styles — keep in sync.
  hwCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  hwCardOverdue: { borderWidth: 1, borderColor: '#fecaca' },
  hwHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  hwTitle: { flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e293b' },
  hwDesc: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#475569', lineHeight: 17, marginTop: 2 },
  hwTeacher: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#94a3b8', marginTop: 8, fontStyle: 'italic' },
  hwDateChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: '#dbeafe' },
  hwDateText: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', color: '#1d4ed8', letterSpacing: 0.3 },
  hwMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  hwMetaText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#64748b' },

  assignPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  assignPillText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillBlue: { backgroundColor: '#dbeafe' },
  pillGreen: { backgroundColor: '#d1fae5' },
  pillAmber: { backgroundColor: '#fef3c7' },
  pillRed: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },

  assignActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },

  gradeBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginTop: 10 },
  gradeLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  gradeValue: { fontSize: 14, fontFamily: 'Inter_800ExtraBold', color: '#047857', marginTop: 2 },
  gradeFeedback: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#475569', marginTop: 4, lineHeight: 16 },

  loadingText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Inter_500Medium', textAlign: 'center', paddingVertical: 30, fontStyle: 'italic' },
  parentHint: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', fontFamily: 'Inter_500Medium', marginTop: 10 },

  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontFamily: 'Inter_500Medium', textAlign: 'center', maxWidth: 260 },
});
