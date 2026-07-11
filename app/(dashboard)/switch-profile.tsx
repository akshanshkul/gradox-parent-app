import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Alert,
  Image,
  ScrollView,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, GraduationCap, ChevronRight, Users } from 'lucide-react-native';
import api from '../../utils/api';
import { getUser, saveToken, saveUser, clearFullProfile, getParentToken } from '../../utils/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { apiCache } from '../../utils/cache';

export default function SwitchProfile() {
  const [loading, setLoading] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setFetching(true);
    try {
      const user = await getUser();
      setCurrentUser(user);
      
      const email = user?.parent_email || user?.email;
      if (!email) {
        setFetching(false);
        return;
      }

      // Server-side parent_session token gates the lookup now. If the parent
      // hasn't completed an OTP in the last 30 minutes we route them through
      // the login flow again rather than hitting an opaque 401.
      const parentToken = await getParentToken();
      if (!parentToken) {
        Alert.alert('Session expired', 'Please log in again to switch profiles.');
        router.replace('/(auth)/login' as any);
        return;
      }

      const response: any = await api.get(
        `/parents/students?email=${encodeURIComponent(email)}&parent_token=${encodeURIComponent(parentToken)}`
      );
      setStudentList(response.students || []);
    } catch (error) {
      console.error('Failed to fetch students', error);
      Alert.alert('Error', 'Failed to load profiles. Please try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleSwitch = async (student: any) => {
    if (student.id === currentUser?.id) {
      Alert.alert('Info', 'You are already viewing this profile.');
      return;
    }

    setLoading(student.id);
    try {
      const parentToken = await getParentToken();
      if (!parentToken) {
        Alert.alert('Session expired', 'Please log in again to switch profiles.');
        router.replace('/(auth)/login' as any);
        setLoading(null);
        return;
      }
      const response: any = await api.post('/parents/login-as-student', {
        email: currentUser?.parent_email || currentUser?.email,
        student_id: student.id,
        parent_token: parentToken,
      });

      const { token, student: studentData } = response;
      
      // 1. Save new token
      await saveToken(token);
      
      // 2. Clear all dashboard caches
      apiCache.clear();
      await clearFullProfile();
      
      // 3. Store user data
      await saveUser({ 
        id: studentData.id,
        name: studentData.name,
        admission_number: studentData.admission_number,
        email: studentData.email,
        photo_path: studentData.photo_path,
        school_id: studentData.school?.id,
        school_slug: studentData.school?.slug,
        school_name: studentData.school?.name,
        school_logo: studentData.school?.logo_path,
        current_session: studentData.school?.current_session || studentData.current_record?.session || '2024-25',
        school_class_id: studentData.current_record?.school_class_id,
        is_parent_login: true,
        parent_email: currentUser?.parent_email || currentUser?.email
      });
      
      Alert.alert('Success', `Switched to ${studentData.name}`);
      
      // 4. Force reload dashboard
      router.replace('/(dashboard)');
    } catch (error: any) {
      console.error('Switch failed', error);
      Alert.alert('Switch Failed', error.response?.data?.message || 'Failed to switch to this profile.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4f46e5', '#6366f1']}
        style={styles.headerBackground}
      >
        <SafeAreaView>
          <View style={styles.topHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Switch Profile</Text>
              <Text style={styles.subtitle}>Select another student to view</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          refreshControl={
            <RefreshControl
              refreshing={fetching}
              onRefresh={loadStudents}
              colors={['#4f46e5']}
            />
          }
        >
          {fetching ? (
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
          ) : studentList.length > 0 ? (
            studentList.map((student: any, index: number) => (
              <Animated.View 
                key={student.id}
                entering={FadeInDown.delay(index * 100)}
              >
                <TouchableOpacity 
                  style={[
                    styles.studentCard,
                    student.id === currentUser?.id && styles.activeCard
                  ]}
                  onPress={() => handleSwitch(student)}
                  disabled={loading !== null}
                >
                  <View style={styles.avatarContainer}>
                    {student.photo_path ? (
                      <Image source={{ uri: student.photo_path }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <User size={30} color="#6366f1" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.studentInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      {student.id === currentUser?.id && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.studentDetails}>
                      ID: {student.admission_number} • {student.current_record?.school_class?.grade?.name || 'N/A'}-{student.current_record?.school_class?.section?.name || ''}
                    </Text>
                    <View style={styles.schoolBadge}>
                      <GraduationCap size={14} color="#64748b" />
                      <Text style={styles.schoolNameText}>{student.school?.name || 'Gradox School'}</Text>
                    </View>
                  </View>

                  {loading === student.id ? (
                    <ActivityIndicator color="#4f46e5" />
                  ) : (
                    <ChevronRight size={20} color="#cbd5e1" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Users size={60} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Other Profiles</Text>
              <Text style={styles.emptySubtitle}>We couldn't find other profiles linked to your account.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBackground: {
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    paddingLeft: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  scrollPadding: {
    paddingBottom: 40,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  activeCard: {
    borderColor: '#4f46e5',
    backgroundColor: '#f5f3ff',
    borderWidth: 1.5,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  currentBadge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  studentDetails: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  schoolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schoolNameText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
});
