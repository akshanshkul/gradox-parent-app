import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, GraduationCap, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { FadeInUp } from 'react-native-reanimated';
import BottomNav from '../../components/BottomNav';
import { clearAuth } from '../../utils/auth';
import { Alert } from 'react-native';

export default function Subjects() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/students/subjects');
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch subjects', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubjects();
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
            <Text style={styles.headerTitle} numberOfLines={1}>My Subjects</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.headerSummary}>
            <View style={styles.iconContainer}>
              <BookOpen size={30} stroke="#fff" />
            </View>
            <Text style={styles.summaryTitle}>{subjects.length} Subjects</Text>
            <Text style={styles.summarySubtitle}>Academic Year 2024-25</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
        }
      >
        <Animated.View entering={FadeInUp.delay(200)} style={styles.listContainer}>
          {subjects.map((item, index) => (
            <TouchableOpacity key={item.id} style={styles.subjectCard}>
              <View style={[styles.colorStrip, { backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5] }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.subjectName}>{item.name}</Text>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                </View>
                
                <View style={styles.cardFooter}>
                  <View style={styles.metaInfo}>
                    <Clock size={14} stroke="#64748b" />
                    <Text style={styles.metaText}>{item.pivot?.periods_per_week || 0} Periods/Week</Text>
                  </View>
                  <View style={styles.metaInfo}>
                    <GraduationCap size={14} stroke="#64748b" />
                    <Text style={styles.metaText}>Curriculum v1.0</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {subjects.length === 0 && (
            <View style={styles.emptyContainer}>
              <BookOpen size={50} stroke="#cbd5e1" />
              <Text style={styles.emptyText}>No subjects assigned yet</Text>
            </View>
          )}
        </Animated.View>
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
    paddingBottom: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
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
  headerSummary: {
    alignItems: 'center',
    marginTop: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  summarySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter_400Regular',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    marginTop: 20,
    paddingBottom: 100,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 15,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  colorStrip: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    flex: 1,
    marginRight: 10,
  },
  codeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 15,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
});
