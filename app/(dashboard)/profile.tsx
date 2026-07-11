import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image,
  StatusBar,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Briefcase, 
  FileText, 
  ShieldCheck, 
  Clock,
  ChevronRight,
  GraduationCap,
  TrendingUp,
  Activity,
  Users as UsersIcon,
  RefreshCw
} from 'lucide-react-native';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import ProfileAvatar from '../../components/ProfileAvatar';
import BottomNav from '../../components/BottomNav';
import { clearAuth } from '../../utils/auth';
import { apiCache } from '../../utils/cache';

export default function Profile() {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { getUser } = await import('../../utils/auth');
    const data = await getUser();
    setUserData(data);
  };

  const fetchProfile = async (force = false, retryCount = 0) => {
    // 1. Always try to load from cache first for instant UI
    const cached = apiCache.get('student_profile');
    if (cached && !profileData) {
      setProfileData({ student: cached });
      if (!force) setLoading(false);
    }

    try {
      const response: any = await api.get('/students/profile');
      if (response && response.student) {
        setProfileData(response);
        apiCache.set('student_profile', response.student);
      }
    } catch (error: any) {
      console.error(`Profile fetch failed (attempt ${retryCount + 1})`, error);
      
      // Auto-retry once if it's a network error
      if (retryCount < 1) {
        setTimeout(() => fetchProfile(force, retryCount + 1), 1000);
        return;
      }

      // If we have no data at all and all retries fail, show alert
      if (!profileData && !cached) {
         Alert.alert('Connection Error', 'Could not load profile. Please check your internet.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile(true);
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
              router.replace('/(auth)/login');
            }
          }
        },
      ],
      { cancelable: true }
    );
  };

  const handleSwitchProfile = () => {
    router.push('/(dashboard)/switch-profile');
  };

  const student = profileData?.student;

  if (loading || !student) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        {!loading && <Text style={{ marginTop: 10, color: '#64748b' }}>Profile not found</Text>}
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not Provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const InfoRow = ({ icon: Icon, label, value }: any) => (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}>
        <Icon size={18} stroke="#6366f1" />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not Provided'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>My Profile</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.profileSummary}>
            <View style={styles.avatarContainer}>
              <ProfileAvatar 
                uri={student?.photo_path} 
                size={80} 
                fallbackIconSize={40}
              />
            </View>
            <Text style={styles.studentName}>{student?.name}</Text>
            <Text style={styles.studentId}>Adm Number: {student?.admission_number}</Text>
            
            {userData?.is_parent_login && (
              <TouchableOpacity 
                style={styles.switchButton}
                onPress={handleSwitchProfile}
              >
                <RefreshCw size={14} color="#fff" strokeWidth={2.5} />
                <Text style={styles.switchButtonText}>Switch Profile</Text>
              </TouchableOpacity>
            )}
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
        <Animated.View entering={FadeInUp.delay(200)}>
          {/* Academic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Academic Information</Text>
            <View style={styles.card}>
              <InfoRow icon={GraduationCap} label="Current Class" value={`${student?.current_record?.school_class?.grade?.name || 'N/A'} - ${student?.current_record?.school_class?.section?.name || 'N/A'}`} />
              <InfoRow icon={Calendar} label="Admission Date" value={formatDate(student?.admission_date)} />
              <InfoRow icon={ShieldCheck} label="Academic Session" value={student?.school?.current_session} />
            </View>
          </View>

          {/* Personal Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <View style={styles.card}>
              <InfoRow icon={Mail} label="Email Address" value={student?.email} />
              <InfoRow icon={Phone} label="Phone Number" value={student?.phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(student?.date_of_birth)} />
              <InfoRow icon={User} label="Gender" value={student?.gender?.toUpperCase()} />
              <InfoRow icon={MapPin} label="Residential Address" value={student?.address} />
            </View>
          </View>

          {/* Parent Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parent / Guardian Details</Text>
            <View style={styles.card}>
              <InfoRow icon={Users} label="Parent Name" value={student?.parent_name} />
              <InfoRow icon={Mail} label="Parent Email" value={student?.parent_email} />
              <InfoRow icon={Phone} label="Parent Phone" value={student?.parent_phone} />
              <InfoRow icon={Briefcase} label="Parent Occupation" value={student?.parent_occupation} />
              <InfoRow icon={MapPin} label="Home Address" value={student?.address} />
            </View>
          </View>

          {/* Support Notice */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            <View style={styles.noticeCard}>
              <View style={styles.iconBox}>
                <Clock size={18} stroke="#6366f1" />
              </View>
              <Text style={styles.noticeText}>
                To update your documents or profile information, please contact the school administration office.
              </Text>
            </View>
          </View>
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
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  profileSummary: {
    alignItems: 'center',
    marginTop: 10,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    padding: 3,
    marginBottom: 15,
  },
  avatar: {
    flex: 1,
    backgroundColor: '#eef2ff',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  studentId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 12,
    marginLeft: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: 'Inter_400Regular',
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 15,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#6366f1',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
});
