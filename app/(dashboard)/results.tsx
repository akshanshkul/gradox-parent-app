import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Award, BookOpen, ChevronDown, TrendingUp, Info, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';
import BottomNav from '../../components/BottomNav';
import api from '../../utils/api';
import { clearAuth } from '../../utils/auth';

const { width } = Dimensions.get('window');

export default function Results() {
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const router = useRouter();

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/students/results');
      if (response) {
        setResults(response);
        const examKeys = Object.keys(response.exams || {});
        if (examKeys.length > 0 && !activeTab) {
          setActiveTab(examKeys[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch results', error);
      Alert.alert('Error', 'Failed to retrieve your results.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const onRefresh = React.useCallback(() => {
      setRefreshing(true);
      fetchResults();
  }, []);

  const currentData = results?.exams[activeTab] || [];
  const averageScore = results?.trends.find((t: any) => t.label === activeTab)?.average || 0;

  const getGradeColor = (grade: string) => {
    if (!grade) return '#94a3b8';
    const g = grade.toUpperCase();
    if (g.startsWith('A+')) return '#10b981';
    if (g.startsWith('A')) return '#059669';
    if (g.startsWith('B')) return '#3b82f6';
    if (g.startsWith('C')) return '#f59e0b';
    return '#ef4444';
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive',
        onPress: async () => {
          try { await api.post('/students/logout'); } catch (e) {}
          await clearAuth();
          router.replace('/(auth)/select-school');
        }
      },
    ]);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Fetching Performance Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report Card</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Score Summary Card */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryLabel}>Term Average</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.summaryValue}>{averageScore}%</Text>
                <View style={[styles.badge, { backgroundColor: averageScore >= 75 ? '#10b981' : '#f59e0b' }]}>
                  <TrendingUp size={10} stroke="#fff" />
                  <Text style={styles.badgeText}>{averageScore >= 75 ? 'Excellent' : 'Good'}</Text>
                </View>
              </View>
            </View>
            <Award size={50} stroke="rgba(255,255,255,0.25)" style={styles.awardIcon} />
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Modern Tab Bar */}
      <View style={styles.tabWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsScrollContent}
        >
          {results && Object.keys(results.exams).map((examName) => (
            <TouchableOpacity 
              key={examName}
              style={[styles.tabItem, activeTab === examName && styles.activeTabItem]} 
              onPress={() => {
                setActiveTab(examName);
                setExpandedSubject(null);
              }}
            >
              <Text style={[styles.tabItemText, activeTab === examName && styles.activeTabItemText]}>
                {examName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {/* Performance Trends Section - Horizontal Design */}
        {results?.trends && results.trends.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300)} style={styles.trendsCard}>
            <View style={styles.trendsHeader}>
              <TrendingUp size={18} stroke="#4f46e5" />
              <Text style={styles.trendsTitle}>Term-wise Comparison</Text>
            </View>
            
            <View style={styles.trendsList}>
              {results.trends.map((item: any, idx: number) => {
                const val = Math.round(item.average);
                const isActive = item.label === activeTab;
                return (
                  <View key={idx} style={styles.trendRow}>
                    <View style={styles.trendLabelRow}>
                      <Text 
                        style={[styles.trendLabel, isActive && styles.activeTrendLabel]} 
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.trendPercent}>{val}%</Text>
                    </View>
                    <View style={styles.trendTrack}>
                      <Animated.View 
                        entering={FadeInRight.delay(500 + idx * 100)}
                        style={[
                          styles.trendFill, 
                          { width: `${val}%`, backgroundColor: isActive ? '#4f46e5' : '#94a3b8' }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {currentData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Info size={48} stroke="#cbd5e1" />
            <Text style={styles.emptyText}>No results published for this term yet.</Text>
          </View>
        ) : (
          <View style={styles.subjectList}>
            {currentData.map((item: any, index: number) => (
              <Animated.View 
                key={item.id} 
                layout={Layout.springify()}
                entering={FadeInRight.delay(index * 100)}
                style={styles.subjectCard}
              >
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => setExpandedSubject(expandedSubject === item.id ? null : item.id)}
                  style={styles.cardHeader}
                >
                  <View style={styles.subjectIcon}>
                    <BookOpen size={20} stroke="#4f46e5" />
                  </View>
                  
                  <View style={styles.subjectMainInfo}>
                    <Text style={styles.subjectName}>{item.subject}</Text>
                    <Text style={styles.subjectMarks}>
                      Obtained: <Text style={{color: '#4f46e5'}}>{item.obtained}</Text> / {item.total}
                    </Text>
                  </View>

                  <View style={styles.scoreBox}>
                    <View style={[styles.gradeCircle, { borderColor: getGradeColor(item.grade) }]}>
                      <Text style={[styles.gradeValue, { color: getGradeColor(item.grade) }]}>{item.grade}</Text>
                    </View>
                    <ChevronDown size={16} stroke="#94a3b8" style={{ marginTop: 4, transform: [{ rotate: expandedSubject === item.id ? '180deg' : '0deg' }] }} />
                  </View>
                </TouchableOpacity>

                {expandedSubject === item.id && (
                  <View style={styles.cardDetails}>
                    <View style={styles.divider} />
                    
                    {/* Component Breakdown */}
                    <View style={styles.componentsGrid}>
                      {Object.entries(item.components || {}).map(([name, val]: [string, any], idx) => (
                        <View key={idx} style={styles.componentItem}>
                          <Text style={styles.componentLabel}>{name}</Text>
                          <Text style={styles.componentValue}>{val}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Performance</Text>
                        <Text style={styles.progressPercent}>{item.score}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${item.score}%`, backgroundColor: getGradeColor(item.grade) }]} />
                      </View>
                    </View>

                    <View style={styles.statsFooter}>
                      <Info size={12} stroke="#94a3b8" />
                      <Text style={styles.classAvgText}>Class Average for this subject: {item.avg}%</Text>
                    </View>
                  </View>
                )}
              </Animated.View>
            ))}
          </View>
        )}

        <View style={styles.footerSpacing} />
      </ScrollView>

      <BottomNav onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
  header: {
    paddingBottom: 45,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryLeft: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryValue: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  awardIcon: {
    opacity: 0.8,
  },
  tabWrapper: {
    marginTop: -25,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabsScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: '#f8fafc',
  },
  activeTabItem: {
    backgroundColor: '#4f46e5',
  },
  tabItemText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748b',
  },
  activeTabItemText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  trendsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginTop: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  trendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  trendsTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  trendsList: {
    gap: 16,
  },
  trendRow: {
    gap: 8,
  },
  trendLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    marginRight: 10,
  },
  activeTrendLabel: {
    color: '#4f46e5',
  },
  trendPercent: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  trendTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trendFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectList: {
    marginTop: 25,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  subjectMainInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subjectMarks: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
  scoreBox: {
    alignItems: 'center',
  },
  gradeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  gradeValue: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
  },
  cardDetails: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#fcfdff',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  componentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  componentItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  componentLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  componentValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748b',
  },
  progressPercent: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#4f46e5',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  classAvgText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  footerSpacing: {
    height: 120,
  },
});
