import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, Flag, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, FadeInDown, Layout } from 'react-native-reanimated';
import BottomNav from '../../components/BottomNav';
import api from '../../utils/api';
import { clearAuth } from '../../utils/auth';
import { apiCache } from '../../utils/cache';

const { width } = Dimensions.get('window');

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const router = useRouter();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  // Calendar Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const formatDate = (d: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const fetchEvents = async (force = false) => {
    const cacheKey = `calendar_${month + 1}_${year}`;
    
    // Check Cache
    const cached = force ? null : apiCache.get(cacheKey);
    if (cached) {
      console.log(`📦 [Cache Hit] ${cacheKey}`);
      setEvents(cached.events);
      setWorkingDays(cached.working_days || []);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get('/students/calendar', {
        params: {
          month: month + 1,
          year: year
        }
      });
      if (response.data.success) {
        const data = response.data.data;
        setEvents(data.events);
        setWorkingDays(data.working_days || []);
        apiCache.set(cacheKey, data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [month, year]);

  const selectedEvent = events.find(e => e.date === selectedDate);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        try { await api.post('/students/logout'); } catch {}
        await clearAuth(); router.replace('/(auth)/select-school');
      }}
    ]);
  };

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
            <Text style={styles.headerTitle}>School Calendar</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <ChevronLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.monthDisplay}>{monthName} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <ChevronRight stroke="#fff" size={24} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar Grid */}
        <Animated.View entering={FadeInUp} style={styles.calendarCard}>
          <View style={styles.daysHeader}>
            {DAYS_SHORT.map(day => (
              <Text key={day} style={styles.dayHeaderCell}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.datesGrid}>
            {[...Array(firstDayOfMonth)].map((_, i) => (
              <View key={`empty-${i}`} style={styles.dateCell} />
            ))}
            {[...Array(daysInMonth)].map((_, i) => {
              const d = i + 1;
              const fullDate = formatDate(d);
              const isSelected = selectedDate === fullDate;
              const event = events.find(e => e.date === fullDate);
              const isToday = fullDate === todayStr;

              return (
                <TouchableOpacity 
                  key={d} 
                  style={[styles.dateCell, isSelected && styles.selectedCell]}
                  onPress={() => setSelectedDate(fullDate)}
                >
                  <Text style={[styles.dateText, isSelected && styles.selectedDateText, isToday && styles.todayText]}>
                    {d}
                  </Text>
                  {event && (
                    <View style={[styles.eventDot, { backgroundColor: event.type === 'holiday' ? '#ef4444' : '#f59e0b' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
            {/* NEW: Pad the end of the month to complete the row */}
            {[...Array((7 - (firstDayOfMonth + daysInMonth) % 7) % 7)].map((_, i) => (
              <View key={`empty-end-${i}`} style={styles.dateCell} />
            ))}
          </View>
        </Animated.View>

        {/* Event Details */}
        <Animated.View layout={Layout.springify()} entering={FadeInUp.delay(200)}>
          <Text style={styles.sectionTitle}>
            {selectedDate === '2026-04-18' ? "Today's Events" : "Event Particulars"}
          </Text>
          
          {selectedEvent ? (
            <Animated.View entering={FadeInRight} style={styles.eventDetailCard}>
              <View style={[
                styles.typeBadge, 
                { 
                  backgroundColor: selectedEvent.type === 'holiday' ? '#fef2f2' : (selectedEvent.type === 'ptm' ? '#e0e7ff' : '#fff7ed') 
                }
              ]}>
                {selectedEvent.type === 'holiday' ? (
                  <Flag size={14} stroke="#ef4444" />
                ) : selectedEvent.type === 'ptm' ? (
                  <Bell size={14} stroke="#4f46e5" />
                ) : (
                  <Bell size={14} stroke="#f59e0b" />
                )}
                <Text style={[
                  styles.typeText, 
                  { 
                    color: selectedEvent.type === 'holiday' ? '#ef4444' : (selectedEvent.type === 'ptm' ? '#4f46e5' : '#f59e0b') 
                  }
                ]}>
                  {selectedEvent.type.toUpperCase()}
                </Text>
              </View>
              
              <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
              <Text style={styles.eventDetailDesc}>{selectedEvent.description}</Text>
              
              {selectedEvent.type === 'event' && (
                <View style={styles.eventMetaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={14} stroke="#64748b" />
                    <Text style={styles.metaText}>{selectedEvent.time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MapPin size={14} stroke="#64748b" />
                    <Text style={styles.metaText}>{selectedEvent.location}</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          ) : (
            <View style={styles.emptyEvent}>
              <CalendarIcon stroke="#94a3b8" size={40} opacity={0.5} />
              <Text style={styles.emptyEventText}>No specified activities for this date</Text>
            </View>
          )}
        </Animated.View>

        <View style={{ height: 120 }} />
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
  header: {
    paddingBottom: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginTop: 10,
  },
  navBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  monthDisplay: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    minWidth: 150,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginTop: 25,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  dayHeaderCell: {
    width: '14.2%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#94a3b8',
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateCell: {
    width: '14.2%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  selectedCell: {
    backgroundColor: '#4f46e5',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#334155',
  },
  selectedDateText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  todayText: {
    color: '#4f46e5',
    fontFamily: 'Inter_700Bold',
    textDecorationLine: 'underline',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginTop: 25,
    marginBottom: 15,
  },
  eventDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  typeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  eventDetailTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  eventDetailDesc: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 15,
  },
  eventMetaRow: {
    flexDirection: 'row',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
  emptyEvent: {
    padding: 40,
    alignItems: 'center',
    opacity: 0.6,
  },
  emptyEventText: {
    marginTop: 10,
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
  },
});
