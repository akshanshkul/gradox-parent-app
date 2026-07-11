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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, User, GraduationCap, ChevronRight } from 'lucide-react-native';
import api from '../../utils/api';
import { saveToken, saveUser, getParentToken } from '../../utils/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

export default function SelectStudent() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const [loading, setLoading] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [studentList, setStudentList] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    console.log('SelectStudent params:', params);
    try {
      if (params.students) {
        const parsed = JSON.parse(params.students as string);
        setStudentList(parsed);
      } else {
        fetchStudents();
      }
    } catch (e) {
      console.error('Failed to parse students param', e);
      fetchStudents();
    }
  }, [params.students]);

  const fetchStudents = async () => {
    if (!email) return;
    setFetching(true);
    try {
      // The server now requires the OTP-issued parent_token on every
      // /parents/students hit — without it the endpoint 401s.
      const parentToken = await getParentToken();
      if (!parentToken) {
        Alert.alert('Session expired', 'Please verify OTP again.');
        return;
      }
      const response: any = await api.get(
        `/parents/students?email=${encodeURIComponent(email)}&parent_token=${encodeURIComponent(parentToken)}`
      );
      setStudentList(response.students || []);
    } catch (error) {
      console.error('Failed to fetch students fallback', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSelect = async (student: any) => {
    setLoading(student.id);
    try {
      const parentToken = await getParentToken();
      if (!parentToken) {
        Alert.alert('Session expired', 'Please verify OTP again.');
        setLoading(null);
        return;
      }
      const response = await api.post('/parents/login-as-student', {
        email: email,
        student_id: student.id,
        parent_token: parentToken,
      });

      const { token, student: studentData }: any = response;
      
      await saveToken(token);
      
      // Store user data in a format compatible with the existing dashboard
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
        is_parent_login: true, // Tag it as a parent login
        parent_email: email
      });
      
      Alert.alert('Success', `Logged in as ${studentData.name}`);
      router.replace('/(dashboard)');
    } catch (error: any) {
      console.error('Student selection failed', error);
      Alert.alert('Selection Failed', error.response?.data?.message || 'Failed to switch to this profile.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366f1', '#4f46e5']}
        style={styles.headerBackground}
      >
        <SafeAreaView>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft stroke="#fff" size={24} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Select Profile</Text>
            <Text style={styles.subtitle}>Choose which student profile to view</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <Animated.View 
        entering={FadeInUp.delay(200)}
        style={styles.formContainer}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={fetching}
              onRefresh={fetchStudents}
              colors={['#4f46e5']}
            />
          }
        >
          {fetching ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
        ) : studentList.length > 0 ? (
          studentList.map((student: any, index: number) => (
              <Animated.View 
                key={student.id}
                entering={FadeInDown.delay(300 + index * 100)}
              >
                <TouchableOpacity 
                  style={styles.studentCard}
                  onPress={() => handleSelect(student)}
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
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentDetails}>
                      ID: {student.admission_number} • Class: {student.current_record?.school_class?.grade?.name || 'N/A'}-{student.current_record?.school_class?.section?.name || ''}
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
              <View style={styles.emptyIconContainer}>
                <User size={40} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Profiles Found</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find any student profiles linked to {email}. Please contact the school to link your email.
              </Text>
              <TouchableOpacity 
                style={styles.backButtonSecondary}
                onPress={() => router.back()}
              >
                <Text style={styles.backButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackground: {
    height: 200,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 10,
    marginTop: 10,
  },
  headerContent: {
    marginTop: 10,
    paddingHorizontal: 10,
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
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
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
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  backButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
