import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Info
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { apiCache } from '../../utils/cache';
import api from '../../utils/api';

const { width } = Dimensions.get('window');

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Attendance() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [attendanceData, setAttendanceData] = useState<any>({});
  const [summary, setSummary] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async (force = false) => {
    const cacheKey = 'student_attendance_report';
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // 1. Check In-Memory Cache first
    const cached = force ? null : apiCache.get(cacheKey);
    if (cached) {
      setAttendanceData(cached.map);
      setSummary(cached.summary);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // 2. Check Persistent Storage if not forcing
    if (!force) {
      try {
        const stored = await AsyncStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setAttendanceData(parsed.map);
          setSummary(parsed.summary);
          apiCache.set(cacheKey, parsed); // Sync to memory
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to read attendance cache', err);
      }
    }

    try {
      const response: any = await api.get('/students/attendance/report');
      const { summary, records } = response;
      
      const dateMap = records.reduce((acc: any, rec: any) => {
        acc[rec.date] = rec.status;
        return acc;
      }, {});

      setAttendanceData(dateMap);
      setSummary(summary);
      
      const dataToCache = { map: dateMap, summary };
      apiCache.set(cacheKey, dataToCache);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Failed to fetch attendance', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance(true);
  };

  // Calendar Logic
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Fill previous month days (empty slots)
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({
        day: i,
        date: dateStr,
        status: attendanceData[dateStr] || 'none'
      });
    }

    // NEW: Pad the end of the month to complete the row
    const remainingSlots = 7 - (days.length % 7);
    if (remainingSlots < 7) {
      for (let i = 0; i < remainingSlots; i++) {
        days.push({ day: null, date: null });
      }
    }
    
    return days;
  }, [currentDate, attendanceData]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Stats Logic
  const stats = useMemo(() => {
    if (summary) {
      return {
        present: summary.present + summary.late, // Grouping for UI
        absent: summary.absent,
        percentage: summary.percentage
      };
    }
    
    // Fallback/Loading state
    return { present: 0, absent: 0, percentage: 0 };
  }, [summary]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayStatus = attendanceData[todayStr] || 'none';
  const isTodayPresent = todayStatus === 'present' || todayStatus === 'late';
  const isTodayMarked = todayStatus !== 'none';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Attendance History</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Today Status Card */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.statusCard}>
            <View style={[
              styles.statusIconBox, 
              { backgroundColor: !isTodayMarked ? '#f1f5f9' : (isTodayPresent ? '#dcfce7' : '#fee2e2') }
            ]}>
              {!isTodayMarked ? (
                <Clock size={24} stroke="#94a3b8" />
              ) : (isTodayPresent ? (
                <CheckCircle2 size={24} stroke="#10b981" />
              ) : (
                <XCircle size={24} stroke="#ef4444" />
              ))}
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusLabel}>Today's Status</Text>
              <Text style={[
                styles.statusValue, 
                { color: !isTodayMarked ? '#94a3b8' : (isTodayPresent ? '#10b981' : '#ef4444') }
              ]}>
                {!isTodayMarked ? 'Not Marked' : (isTodayPresent ? 'Present' : 'Absent')}
              </Text>
            </View>
            {isTodayMarked && (
                <View style={styles.statusTime}>
                    <Clock size={14} stroke="#94a3b8" />
                    <Text style={styles.statusTimeText}>Recorded</Text>
                </View>
            )}
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
        }
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.statVal, { color: '#10b981' }]}>{stats.present}</Text>
            </View>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.statVal, { color: '#ef4444' }]}>{stats.absent}</Text>
            </View>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#eef2ff' }]}>
              <Text style={[styles.statVal, { color: '#4f46e5' }]}>{stats.percentage}%</Text>
            </View>
            <Text style={styles.statLabel}>Avg Rate</Text>
          </View>
        </View>

        {/* Calendar Section */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <View>
              <Text style={styles.monthName}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
              <Text style={{ fontSize: 10, color: '#4f46e5', fontWeight: 'bold' }}>Sync-Fix-Active</Text>
            </View>
            <View style={styles.navButtons}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                <ChevronLeft size={20} stroke="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                <ChevronRight size={20} stroke="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.daysHeader}>
            {DAYS.map(day => (
              <Text key={day} style={styles.dayLabel}>{day}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {(() => {
              const rows = [];
              for (let i = 0; i < monthData.length; i += 7) {
                rows.push(monthData.slice(i, i + 7));
              }
              return rows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.calendarRow}>
                  {row.map((item, index) => (
                    <View key={`day-${index}`} style={styles.dayCell}>
                      {item.day && (
                        <>
                          <Text style={[
                            styles.dayText,
                            item.date === todayStr && styles.todayText
                          ]}>
                            {item.day}
                          </Text>
                          {item.status !== 'none' && (
                            <View style={[
                              styles.statusDot,
                              { 
                                backgroundColor: (item.status === 'present' || item.status === 'late') ? '#10b981' : 
                                                (item.status === 'half_day' ? '#6366f1' : '#ef4444') 
                              }
                            ]} />
                          )}
                        </>
                      )}
                    </View>
                  ))}
                </View>
              ));
            })()}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.statusDot, { backgroundColor: '#10b981', position: 'relative', marginTop: 0 }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.statusDot, { backgroundColor: '#ef4444', position: 'relative', marginTop: 0 }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.statusDot, { backgroundColor: '#cbd5e1', position: 'relative', marginTop: 0 }]} />
              <Text style={styles.legendText}>Rest Day</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.infoCard}>
          <Info size={18} stroke="#4f46e5" />
          <Text style={styles.infoText}>
            Maintaining over 75% attendance is mandatory for academic eligibility.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 25,
    marginTop: 20,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  statusIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
  },
  statusValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  statusTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusTimeText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Inter_600SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
    width: (width - 70) / 3,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statVal: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 15,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  dayLabel: {
    width: '14%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#94a3b8',
  },
   daysGrid: {
    width: '100%',
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  dayCell: {
    width: '14%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#334155',
  },
  todayText: {
    color: '#4f46e5',
    fontFamily: 'Inter_700Bold',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 18,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#4f46e5',
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
});
