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
  Linking,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  User, 
  Award, 
  ShieldCheck, 
  MessageCircle,
  Clock,
  BookOpen
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { FadeInUp, FadeInRight, FadeInDown } from 'react-native-reanimated';
import ProfileAvatar from '../../components/ProfileAvatar';
import BottomNav from '../../components/BottomNav';
import { clearAuth } from '../../utils/auth';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

export default function TeacherProfile() {
  const { id } = useLocalSearchParams();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchTeacherProfile();
    }
  }, [id]);

  const fetchTeacherProfile = async () => {
    try {
      const response = await api.get(`/students/teachers/${id}`);
      setTeacher(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch teacher profile', error);
      const msg = error.response?.data?.message || 'Unable to load teacher information.';
      Alert.alert('Profile Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (teacher?.phone) {
      Linking.openURL(`tel:${teacher.phone}`);
    }
  };

  const handleEmail = () => {
    if (teacher?.email) {
      Linking.openURL(`mailto:${teacher.email}`);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        try { await api.post('/students/logout'); } catch {}
        await clearAuth(); router.replace('/(auth)/select-school');
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const isClassTeacher = teacher?.managedClasses && teacher.managedClasses.length > 0;
  const managedClass = isClassTeacher ? teacher.managedClasses[0] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft stroke="#fff" size={24} />
          </TouchableOpacity>
        </SafeAreaView>
        
        <View style={styles.headerAvatarContainer}>
          <Animated.View entering={FadeInDown.delay(100)}>
            <ProfileAvatar uri={teacher?.photo_path} size={100} />
            {isClassTeacher && (
              <View style={styles.badgeOverlay}>
                <Award size={14} stroke="#fff" />
              </View>
            )}
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(200)} style={styles.headerInfo}>
            <Text style={styles.teacherName}>{teacher?.name}</Text>
            <Text style={styles.teacherBio}>{teacher?.specialization || 'Subject Specialist'}</Text>
          </Animated.View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Animated.View entering={FadeInUp.delay(300)}>
          {/* Quick Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <View style={[styles.actionIconBox, { backgroundColor: '#e0f2fe' }]}>
                <Phone size={20} stroke="#0284c7" />
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn} onPress={handleEmail}>
              <View style={[styles.actionIconBox, { backgroundColor: '#f0fdf4' }]}>
                <Mail size={20} stroke="#16a34a" />
              </View>
              <Text style={styles.actionLabel}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Notice', 'Direct Chat is not enabled for students at this moment.')}>
              <View style={[styles.actionIconBox, { backgroundColor: '#f5f3ff' }]}>
                <MessageCircle size={20} stroke="#7c3aed" />
              </View>
              <Text style={styles.actionLabel}>Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Expertise Information */}
          {(teacher?.primary_subjects?.length > 0 || teacher?.secondary_subjects?.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Teaching Expertise</Text>
              <View style={styles.card}>
                {teacher?.primary_subjects?.length > 0 && (
                  <View style={{ marginBottom: teacher?.secondary_subjects?.length > 0 ? 15 : 0 }}>
                    <Text style={styles.expertLabel}>Primary Subjects</Text>
                    <View style={styles.expertiseCloud}>
                      {teacher.primary_subjects.map((sub: string, i: number) => (
                        <View key={`p-${i}`} style={[styles.expertTag, { backgroundColor: '#eef2ff' }]}>
                          <Text style={[styles.expertTagText, { color: '#4f46e5' }]}>{sub}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {teacher?.secondary_subjects?.length > 0 && (
                  <View>
                    <Text style={styles.expertLabel}>Secondary Subjects</Text>
                    <View style={styles.expertiseCloud}>
                      {teacher.secondary_subjects.map((sub: string, i: number) => (
                        <View key={`s-${i}`} style={[styles.expertTag, { backgroundColor: '#f8fafc' }]}>
                          <Text style={[styles.expertTagText, { color: '#64748b' }]}>{sub}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Mail size={18} stroke="#4f46e5" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{teacher?.email || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Phone size={18} stroke="#4f46e5" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Mobile Number</Text>
                  <Text style={styles.infoValue}>{teacher?.phone || 'Hidden by School'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Designation Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Status</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Award size={18} stroke="#4f46e5" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Classteacher Status</Text>
                  <Text style={[styles.infoValue, { color: isClassTeacher ? '#16a34a' : '#94a3b8' }]}>
                    {isClassTeacher ? `Yes (Class ${managedClass?.grade?.name}-${managedClass?.section?.name})` : 'No'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <BookOpen size={18} stroke="#4f46e5" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Primary Subjects</Text>
                  <Text style={styles.infoValue}>{teacher?.bio || 'Academic Expert'}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
        
        <View style={{ height: 100 }} />
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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    padding: 15,
    marginTop: 10,
  },
  headerAvatarContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#4f46e5',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  teacherName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  teacherBio: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  actionBtn: {
    backgroundColor: '#fff',
    width: width * 0.25,
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#475569',
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 15,
  },
  expertLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#475569',
    marginBottom: 8,
  },
  expertiseCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expertTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  expertTagText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
