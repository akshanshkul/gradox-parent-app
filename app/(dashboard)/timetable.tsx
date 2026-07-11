import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Calendar, Clock, User, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import BottomNav from '../../components/BottomNav';
import { clearAuth } from '../../utils/auth';
import { apiCache } from '../../utils/cache';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Timetable() {
  const [schedule, setSchedule] = useState<any>({});
  const [currentDay, setCurrentDay] = useState<string>('monday');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const scrollToDay = (dayKey: string) => {
    const dayIndex = DAYS.findIndex(d => d.toLowerCase() === dayKey);
    if (dayIndex !== -1 && scrollRef.current) {
      // item width is 60, gap is 15. Scroll to appropriate offset.
      const offset = dayIndex * 75; 
      scrollRef.current.scrollTo({ x: offset, animated: true });
    }
  };

  const fetchTimetable = async (force = false) => {
    const cacheKey = 'weekly_timetable';
    
    // Check cache
    const cached = force ? null : apiCache.get(cacheKey);
    if (cached) {
      setSchedule(cached.schedule || {});
      if (cached.current_day) {
        const dayKey = cached.current_day.toLowerCase();
        setCurrentDay(dayKey);
        setTimeout(() => scrollToDay(dayKey), 100);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response: any = await api.get('/students/timetable');
      const data = response;
      
      setSchedule(data.schedule || {});
      apiCache.set(cacheKey, data);
      
      if (data.current_day) {
        const dayKey = data.current_day.toLowerCase();
        setCurrentDay(dayKey);
        setTimeout(() => scrollToDay(dayKey), 100);
      }
    } catch (error) {
      console.error('Failed to fetch timetable', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTimetable();
    }, [])
  );


  const onRefresh = () => {
    setRefreshing(true);
    fetchTimetable(true);
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

  const currentEntries = schedule[currentDay] || [];

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>Class Timetable</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView 
            ref={scrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayPicker}
          >
            {DAYS.map((day) => {
              const dayKey = day.toLowerCase();
              const isActive = currentDay === dayKey;
              return (
                <TouchableOpacity 
                  key={day} 
                  style={[styles.dayItem, isActive && styles.dayItemActive]}
                  onPress={() => setCurrentDay(dayKey)}
                >
                  <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                    {day.substring(0, 3)}
                  </Text>
                  {isActive && <View style={styles.dot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
        }
      >
        <View style={styles.timelineContainer}>
          {currentEntries.length > 0 ? (
            currentEntries.map((item: any, index: number) => (
              <Animated.View 
                key={item.id} 
                entering={FadeInRight.delay(index * 100)}
                style={styles.timeRow}
              >
                <View style={styles.timeColumn}>
                  <Text style={styles.startTime}>{item.start_time.substring(0, 5)}</Text>
                  <Text style={styles.endTime}>{item.end_time.substring(0, 5)}</Text>
                </View>
                
                <View style={styles.indicatorColumn}>
                  <View style={[styles.circle, { backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5] }]} />
                  {index < currentEntries.length - 1 && <View style={styles.line} />}
                </View>

                <View style={styles.cardColumn}>
                  <View style={styles.subjectCard}>
                    <Text style={styles.subjectName}>{item.subject?.name}</Text>
                    <View style={styles.detailsRow}>
                      <TouchableOpacity 
                        style={styles.detailItem}
                        onPress={() => router.push({
                          pathname: '/(dashboard)/teacher-profile',
                          params: { id: item.teacher?.id }
                        })}
                      >
                        <User size={12} stroke="#64748b" />
                        <Text style={[styles.detailText, styles.teacherLinkText]}>{item.teacher?.name || 'Faculty'}</Text>
                      </TouchableOpacity>
                      <View style={styles.detailItem}>
                        <MapPin size={12} stroke="#64748b" />
                        <Text style={styles.detailText}>{item.classroom?.name || 'Room A1'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={60} stroke="#cbd5e1" />
              <Text style={styles.emptyText}>No classes scheduled for {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}</Text>
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
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    textAlign: 'center',
  },
  dayPicker: {
    paddingHorizontal: 20,
    gap: 15,
    paddingBottom: 10,
  },
  dayItem: {
    width: 60,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayItemActive: {
    backgroundColor: '#fff',
  },
  dayText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
  },
  dayTextActive: {
    color: '#4f46e5',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4f46e5',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  timelineContainer: {
    marginTop: 30,
    paddingBottom: 120,
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: 5,
    minHeight: 100,
  },
  timeColumn: {
    width: 50,
    alignItems: 'flex-end',
    paddingTop: 5,
  },
  startTime: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
  },
  endTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
  },
  indicatorColumn: {
    width: 40,
    alignItems: 'center',
    paddingTop: 10,
  },
  circle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: -5,
  },
  cardColumn: {
    flex: 1,
    paddingBottom: 25,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  subjectName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
  teacherLinkText: {
    color: '#6366f1',
    textDecorationLine: 'underline',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 15,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
});
