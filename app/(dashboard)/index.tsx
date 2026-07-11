import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  Image,
  ScrollView,
  Dimensions,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  ChevronRight,
  LogOut, 
  User, 
  BookOpen, 
  GraduationCap, 
  School as SchoolIcon,
  Search,
  Bell,
  Calendar,
  Wallet,
  ClipboardList,
  Clock,
  Home,
  Bookmark,
  TrendingUp,
  UserCircle,
  FileText,
  Activity,
  Award} from 'lucide-react-native';
import { getUser, clearAuth, getFullProfile, saveFullProfile } from '../../utils/auth';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { 
  FadeInUp, 
  FadeInRight, 
  useAnimatedProps, 
  useSharedValue, 
  withTiming 
} from 'react-native-reanimated';
import DashboardHeader from '../../components/DashboardHeader';
import BottomNav from '../../components/BottomNav';
import Svg, { Circle, G } from 'react-native-svg';
import { registerForPushNotificationsAsync, setupNotificationHandlers } from '../../utils/notifications';
import { apiCache } from '../../utils/cache';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CircularProgress = ({ size, strokeWidth, progress, color, label }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 1500 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (animatedProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: size * 0.18, fontFamily: 'Inter_700Bold', color: '#1e293b' }}>{progress}%</Text>
          <Text style={{ fontSize: size * 0.1, color: '#94a3b8', fontFamily: 'Inter_500Medium' }}>{label}</Text>
        </View>
      </View>
    </View>
  );
};


export default function Dashboard() {
  const [student, setStudent] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  useEffect(() => {
    // Register for push notifications
    let responseListener: any;

    const setupNotifications = async () => {
      setupNotificationHandlers();
      await registerForPushNotificationsAsync();

      // Handle notification clicks
      const Notifications = require('expo-notifications');
      responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'fee_payment') {
          router.push('/(dashboard)/fees');
        }
      });
    };
    
    setupNotifications();

    return () => {
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Clear specific caches for a full refresh
    apiCache.invalidate('student_attendance_report');
    apiCache.invalidate('unread_count');
    
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('student_attendance_report');
      await AsyncStorage.removeItem('last_fcm_sync_time'); // Force FCM re-sync on refresh too
    } catch (e) {}

    loadDashboardData(true);
  };

  const loadDashboardData = async (force = false) => {
    try {
      // 1. Check local persistent auth storage
      const userData = await getUser();
      if (!userData) return;

      // 2. Load Persistent Full Profile (Instant UI)
      const persistentProfile = await getFullProfile();
      if (persistentProfile) {
        setStudent(persistentProfile);
      } else {
        setStudent(userData); // Fallback to basic data
      }

      // 3. Small initial delay to avoid collision with other startup requests
      await new Promise(resolve => setTimeout(resolve, 300));

      // 4. Check profile cache (In-memory, 10 mins)
      const cachedProfile = force ? null : apiCache.get('student_profile');
      
      let currentStudent = persistentProfile || userData;

      if (!cachedProfile) {
        // Fetch fresh profile
        try {
          const fullStudent: any = await api.get('/students/profile');
          if (fullStudent?.student) {
            currentStudent = fullStudent.student;
            setStudent(currentStudent);
            apiCache.set('student_profile', currentStudent);
            await saveFullProfile(currentStudent); // Save to persistent storage
          }
        } catch (profileErr) {
          console.error('Profile fetch failed', profileErr);
        }
      } else {
        currentStudent = cachedProfile;
        setStudent(currentStudent);
      }

      // 5. Sequential Timetable fetch (Space out requests for single-threaded PHP server)
      await new Promise(resolve => setTimeout(resolve, 600));
      const classId = currentStudent.current_record?.school_class_id || currentStudent.school_class_id;
      if (classId) {
        fetchTimetable(classId, force);
      }

    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTimetable = async (classId: number, force = false) => {
    if (!classId) return;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const cacheKey = `dashboard_timetable_${classId}_${today}`;
    
    // Check cache
    const cached = force ? null : apiCache.get(cacheKey);
    if (cached) {
      setTimetable(cached);
      return;
    }

    try {
      const response: any = await api.get('/students/timetable', {
        params: { date: today }
      });
      const entries = response?.entries || [];
      setTimetable(entries);
      apiCache.set(cacheKey, entries);
    } catch (err) {
      console.error('Timetable fetch failed', err);
      setTimetable([]);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/students/logout');
            } catch (error) {
              console.error('Logout failed on server', error);
            } finally {
              await clearAuth();
              router.replace('/(auth)/select-school');
            }
          }
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const favourites = [
    { name: 'Timetable', icon: Clock, color: '#e0f2fe', iconColor: '#0284c7', route: '/(dashboard)/timetable' },
    { name: 'My Subjects', icon: GraduationCap, color: '#d1fae5', iconColor: '#059669', route: '/(dashboard)/subjects' },
    { name: 'Attendance', icon: ClipboardList, color: '#fef3c7', iconColor: '#d97706', route: '/(dashboard)/attendance' },
    { name: 'Homework', icon: Bookmark, color: '#fce7f3', iconColor: '#db2777', route: '/(dashboard)/homework' },
    { name: 'Results', icon: TrendingUp, color: '#f5f3ff', iconColor: '#4f46e5', route: '/(dashboard)/results' },
    { name: 'Calendar', icon: Calendar, color: '#fff1f2', iconColor: '#f43f5e', route: '/(dashboard)/calendar' },
    { name: 'Assignment', icon: ClipboardList, color: '#e0e7ff', iconColor: '#4f46e5', route: '/(dashboard)/assignments' },
    { name: 'Fees', icon: Wallet, color: '#f0f9ff', iconColor: '#0369a1', route: '/(dashboard)/fees' },
    { name: 'Circulars', icon: Bell, color: '#fef3c7', iconColor: '#d97706', route: '/(dashboard)/circulars' },
    { name: 'Documents', icon: FileText, color: '#f3f4f6', iconColor: '#6366f1', route: '/(dashboard)/documents' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <DashboardHeader student={student} refreshing={refreshing} />

      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
        }
      >
        {/* Favourites Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Favourites</Text>
          <Text style={styles.sectionSubtitle}>Dashboards</Text>
        </View>

        <View style={styles.favoritesGrid}>
          {favourites.map((item, index) => (
            <Animated.View 
              key={index}
              entering={FadeInUp.delay(Math.floor(index / 3) * 150)}
              style={styles.gridItemContainer}
            >
              <TouchableOpacity style={styles.gridItem} onPress={() => router.push(item.route as any)}>
                <View style={[styles.gridIconBox, { backgroundColor: item.color }]}>
                  <item.icon stroke={item.iconColor} size={24} />
                </View>
                <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>{item.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Performance Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Performance</Text>
        </View>

        <Animated.View entering={FadeInUp.delay(800)} style={styles.performanceCard}>
          <View style={styles.circularCharts}>
            <CircularProgress size={100} strokeWidth={10} progress={85} color="#4f46e5" label="Overall Score" />
            <CircularProgress size={100} strokeWidth={10} progress={92} color="#10b981" label="Attendance" />
          </View>
          <TouchableOpacity 
            style={styles.viewDetailedBtn}
            onPress={() => router.push('/(dashboard)/results')}
          >
            <Text style={styles.viewDetailedText}>View Detailed Report</Text>
            <ChevronRight size={14} stroke="#4f46e5" />
          </TouchableOpacity>
        </Animated.View>

        {/* Schedule Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Schedule</Text>
        </View>

        <View style={styles.scheduleList}>
          {timetable.length > 0 ? (
            timetable.map((item, index) => (
              <Animated.View 
                key={index}
                entering={FadeInRight.delay(index * 100)}
                style={styles.scheduleItem}
              >
                <View style={styles.timeSection}>
                  <Text style={styles.timeMain}>{item.start_time.substring(0, 5)}</Text>
                  <Text style={styles.timePeriod}>am</Text>
                </View>
                <View style={styles.scheduleDivider} />
                <View style={[styles.scheduleCard, { borderLeftColor: favourites[index % favourites.length].iconColor }]}>
                  <Text style={styles.subjectName}>{item.subject?.name}</Text>
                  
                  {item.teacher && (
                    <TouchableOpacity 
                      style={styles.teacherLink}
                      onPress={() => router.push({
                        pathname: '/(dashboard)/teacher-profile',
                        params: { id: item.teacher.id }
                      })}
                    >
                      <User size={12} stroke="#64748b" />
                      <Text style={styles.teacherName}>{item.teacher.name}</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.scheduleDetails}>
                    <Clock size={12} stroke="#64748b" />
                    <Text style={styles.scheduleMeta}>{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}</Text>
                    <View style={styles.dot} />
                    <SchoolIcon size={12} stroke="#64748b" />
                    <Text style={styles.scheduleMeta}>{item.classroom?.name || 'Room A1'}</Text>
                  </View>
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptySchedule}>
              <Calendar stroke="#94a3b8" size={40} />
              <Text style={styles.emptyText}>No classes scheduled for today</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackground: {
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  userMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter_400Regular',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPadding: {
    paddingBottom: 110,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridItemContainer: {
    width: '33.33%',
    padding: 4,
  },
  gridItem: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gridIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
    textAlign: 'center',
  },
  scheduleList: {
    paddingHorizontal: 20,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeSection: {
    width: 60,
    alignItems: 'center',
  },
  timeMain: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  timePeriod: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
  },
  scheduleDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#e2e8f0',
    marginHorizontal: 15,
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  subjectName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  scheduleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleMeta: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
  },
  emptySchedule: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
  },
  bottomNav: {
    backgroundColor: '#fff',
    height: 65,
    borderRadius: 32.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
    gap: 6,
  },
  activeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  performanceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 10,
  },
  circularCharts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  viewDetailedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  viewDetailedText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#4f46e5',
  },
  teacherLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 6,
  },
  teacherName: {
    fontSize: 12,
    color: '#6366f1',
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },
});
