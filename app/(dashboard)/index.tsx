import React, { useEffect, useState } from 'react';
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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
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
  UserCircle,
  FileText
} from 'lucide-react-native';
import { getUser, clearAuth } from '../../utils/auth';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import DashboardHeader from '../../components/DashboardHeader';
import BottomNav from '../../components/BottomNav';

import { registerForPushNotificationsAsync, setupNotificationHandlers } from '../../utils/notifications';

export default function Dashboard() {
  const [student, setStudent] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
    
    // Register for push notifications
    const setupNotifications = async () => {
      setupNotificationHandlers();
      await registerForPushNotificationsAsync();
    };
    setupNotifications();
  }, []);

  const loadDashboardData = async () => {
    try {
      const userData = await getUser();
      if (userData) {
        setStudent(userData);
        fetchTimetable(userData.school_class_id);

        try {
          const profileResponse = await api.get('/students/profile');
          const fullStudent = profileResponse.data.data.student;
          if (fullStudent) {
            setStudent(fullStudent);
            if (fullStudent.current_record?.school_class_id !== userData.school_class_id) {
               fetchTimetable(fullStudent.current_record?.school_class_id);
            }
          }
        } catch (profileErr) {
          console.error('Profile hydration failed', profileErr);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (classId: number) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const response = await api.get('/students/timetable', {
        params: {
          date: today
        }
      });
      // The backend returns { entries: [...] } in the daily mode
      setTimetable(response.data.data.entries || []);
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
    { name: 'Timetable', icon: Calendar, color: '#e0f2fe', iconColor: '#0284c7', route: '/(dashboard)/timetable' },
    { name: 'My Subjects', icon: GraduationCap, color: '#d1fae5', iconColor: '#059669', route: '/(dashboard)/subjects' },
    { name: 'Attendance', icon: ClipboardList, color: '#fef3c7', iconColor: '#d97706', route: '/(dashboard)/attendance' },
    { name: 'Homework', icon: Bookmark, color: '#fce7f3', iconColor: '#db2777', route: '/(dashboard)/homework' },
    { name: 'Assignment', icon: ClipboardList, color: '#e0e7ff', iconColor: '#4f46e5', route: '/(dashboard)/assignments' },
    { name: 'Circulars', icon: Bell, color: '#fef3c7', iconColor: '#d97706', route: '/(dashboard)/circulars' },
    { name: 'Documents', icon: FileText, color: '#f3f4f6', iconColor: '#6366f1', route: '/(dashboard)/documents' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <DashboardHeader student={student} />

      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
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
              entering={FadeInUp.delay(index * 100)}
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
    padding: 6,
  },
  gridItem: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 8,
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
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridLabel: {
    fontSize: 12,
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
});
