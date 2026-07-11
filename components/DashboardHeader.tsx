import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileAvatar from './ProfileAvatar';
import api from '../utils/api';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate,
  useDerivedValue
} from 'react-native-reanimated';

import { apiCache } from '../utils/cache';

interface DashboardHeaderProps {
  student: any;
  refreshing?: boolean;
}

export default function DashboardHeader({ student, refreshing }: DashboardHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  // Refresh Animation Logic
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1, // Infinite
        true // Reverse
      );
    } else {
      pulse.value = withTiming(0, { duration: 300 });
    }
  }, [refreshing]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: refreshing ? interpolate(pulse.value, [0, 1], [0.85, 1]) : 1,
      transform: [
        { scale: refreshing ? interpolate(pulse.value, [0, 1], [0.99, 1.01]) : 1 }
      ]
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: refreshing ? interpolate(pulse.value, [0, 1], [0.6, 1]) : 1,
    };
  });

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount(false); // Do not force, use cache
    }, [])
  );

  useEffect(() => {
    // Refresh count every 5 minutes instead of 2
    const interval = setInterval(() => fetchUnreadCount(false), 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async (force = false) => {
    // Check cache first (TTL: 5 minutes for stats unless user pulls to refresh)
    const cached = force ? null : apiCache.get('unread_count', 300000);
    if (cached !== null) {
      console.log('📦 [Cache Hit] unread_count');
      setUnreadCount(cached);
      return;
    }
    
    try {
      // Small delay to avoid collision with profile/timetable requests on single-threaded dev server
      await new Promise(resolve => setTimeout(resolve, 1200));
      const response: any = await api.get('/students/notifications/stats');
      const count = response.unread_count || 0;
      setUnreadCount(count);
      apiCache.set('unread_count', count);
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <LinearGradient
        colors={['#4f46e5', '#6366f1']}
        style={styles.headerBackground}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.topBar}>
            <View style={styles.profileInfo}>
              <Animated.View style={contentAnimatedStyle}>
                <ProfileAvatar
                  uri={student?.photo_path}
                  size={45}
                />
              </Animated.View>
              <View style={styles.nameContainer}>
                <Animated.View style={contentAnimatedStyle}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {student?.name || 'Student'}
                  </Text>
                </Animated.View>
                <Text style={styles.userMeta}>
                  Adm No: {student?.admission_number || 'N/A'} • {student?.current_session || '2024-25'}
                </Text>
              </View>
            </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/(dashboard)/search')}
            >
              <Search stroke="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(dashboard)/circulars')}
            >
              <Bell stroke="#fff" size={20} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}
              onPress={() => router.push('/(dashboard)/switch-profile')}
            >
              <Users stroke="#fff" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 10,
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
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
  },
});
