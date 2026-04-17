import React, { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Calendar, Info, Users, Clock, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { FadeInUp } from 'react-native-reanimated';
import BottomNav from '../../components/BottomNav';
import { clearAuth } from '../../utils/auth';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

const TYPE_CONFIG: any = {
  circular: { icon: Info, color: '#4f46e5', label: 'Circular' },
  ptm: { icon: Users, color: '#10b981', label: 'PTM' },
  event: { icon: Calendar, color: '#f59e0b', label: 'Event' },
  notice: { icon: Bell, color: '#ef4444', label: 'Notice' },
  personal: { icon: Users, color: '#8b5cf6', label: 'Personal' },
};

export default function Circulars() {
  const [circulars, setCirculars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchCirculars = async () => {
    try {
      const response = await api.get('/students/circulars');
      setCirculars(response.data.data.data || []);
      
      // Mark as read after a short delay
      setTimeout(async () => {
        try {
          await api.post('/students/notifications/read');
        } catch (e) {
          console.error('Failed to mark notifications as read', e);
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to fetch circulars', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCirculars();
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
            <Text style={styles.headerTitle}>School Circulars</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.headerCount}>
            <Text style={styles.countText}>{circulars.length} Notices Available</Text>
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
          {circulars.map((item, index) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.notice;
            const Icon = config.icon;
            
            return (
              <TouchableOpacity 
                key={item.id} 
                style={styles.card}
                onPress={() => router.push({
                  pathname: '/(dashboard)/viewer',
                  params: { 
                    type: 'circular',
                    id: item.id,
                    title: item.title,
                    content: item.description,
                    date: item.published_at
                  }
                })}
              >
                <View style={[styles.iconBox, { backgroundColor: config.color + '15' }]}>
                  <Icon size={24} stroke={config.color} />
                </View>
                
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.typeBadge, { color: config.color }]}>{config.label}</Text>
                    <Text style={styles.dateText}>{new Date(item.published_at).toLocaleDateString()}</Text>
                  </View>
                  
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                  
                  <View style={styles.footer}>
                    <View style={styles.creatorInfo}>
                      <Clock size={12} stroke="#94a3b8" />
                      <Text style={styles.footerText}>{item.creator?.name || 'Admin'}</Text>
                    </View>
                    <ChevronRight size={16} stroke="#cbd5e1" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {circulars.length === 0 && (
            <View style={styles.emptyContainer}>
              <Bell size={60} stroke="#cbd5e1" />
              <Text style={styles.emptyText}>No circulars found</Text>
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
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  headerCount: {
    alignItems: 'center',
    marginTop: 10,
  },
  countText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter_500Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    marginTop: 20,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter_500Medium',
  },
});
