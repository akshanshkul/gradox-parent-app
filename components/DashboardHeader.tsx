import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileAvatar from './ProfileAvatar';
import api from '../utils/api';
import { useRouter } from 'expo-router';

interface DashboardHeaderProps {
  student: any;
}

export default function DashboardHeader({ student }: DashboardHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchUnreadCount();
    // Refresh count every 2 minutes
    const interval = setInterval(fetchUnreadCount, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/students/notifications/stats');
      setUnreadCount(response.data.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  };

  return (
    <LinearGradient
      colors={['#4f46e5', '#6366f1']}
      style={styles.headerBackground}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.topBar}>
          <View style={styles.profileInfo}>
            <ProfileAvatar
              uri={student?.photo_path}
              size={45}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.userName} numberOfLines={1}>
                {student?.name || 'Student'}
              </Text>
              <Text style={styles.userMeta}>
                ID: {student?.admission_number || 'N/A'} • {student?.current_session || '2024-25'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
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
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
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
