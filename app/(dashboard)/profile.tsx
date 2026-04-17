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
  GraduationCap
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import ProfileAvatar from '../../components/ProfileAvatar';
import BottomNav from '../../components/BottomNav';
import { clearAuth } from '../../utils/auth';

export default function Profile() {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/students/profile');
      setProfileData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch profile', error);
    } finally {
      setLoading(false);
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

  const student = profileData?.student;

  if (loading || !student) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        {!loading && <Text style={{ marginTop: 10, color: '#64748b' }}>Profile not found</Text>}
      </View>
    );
  }

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
            <Text style={styles.studentId}>Admission ID: {student?.admission_number}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200)}>
          {/* Academic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Academic Information</Text>
            <View style={styles.card}>
              <InfoRow icon={GraduationCap} label="Current Class" value={`${student?.current_record?.school_class?.grade?.name || 'N/A'} - ${student?.current_record?.section?.name || 'N/A'}`} />
              <InfoRow icon={Calendar} label="Admission Date" value={student?.admission_date} title={student?.admission_date}/>
              <InfoRow icon={ShieldCheck} label="Academic Session" value={student?.school?.current_session} />
            </View>
          </View>

          {/* Personal Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <View style={styles.card}>
              <InfoRow icon={Mail} label="Email Address" value={student?.email} />
              <InfoRow icon={Phone} label="Phone Number" value={student?.phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={student?.date_of_birth} />
              <InfoRow icon={User} label="Gender" value={student?.gender?.toUpperCase()} />
              <InfoRow icon={MapPin} label="Residential Address" value={student?.address} />
            </View>
          </View>

          {/* Parent Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parent / Guardian Details</Text>
            <View style={styles.card}>
              <InfoRow icon={Users} label="Parent Name" value={student?.parent_name} />
              <InfoRow icon={Phone} label="Parent Phone" value={student?.parent_phone} />
              <InfoRow icon={Briefcase} label="Parent Occupation" value={student?.parent_occupation} />
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
