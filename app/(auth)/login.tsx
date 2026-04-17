import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  Alert,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lock, User, ArrowLeft, Eye, EyeOff, Mail, School as SchoolIcon } from 'lucide-react-native';
import api from '../../utils/api';
import { saveToken, saveUser, getSchoolData } from '../../utils/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { APP_CONFIG } from '../../constants';

export default function Login() {
  const params = useLocalSearchParams();
  
  const [cachedSchool, setCachedSchool] = useState<any>(null);

  useEffect(() => {
    async function fetchBranding() {
      const data = await getSchoolData();
      if (data) setCachedSchool(data);
    }
    fetchBranding();
  }, []);

  // Use params from navigation, fallback to cached data, then to APP_CONFIG
  const schoolId = params.schoolId || cachedSchool?.id || APP_CONFIG.defaultSchool.id;
  const schoolSlug = params.schoolSlug || cachedSchool?.slug || APP_CONFIG.defaultSchool.slug;
  const schoolName = params.schoolName || cachedSchool?.name || APP_CONFIG.defaultSchool.name;
  const logoPath = params.logoPath || cachedSchool?.logo || APP_CONFIG.defaultSchool.logo;
  
  const [admissionId, setAdmissionId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!admissionId || !email || !password) {
      Alert.alert('Error', 'Please enter Admission ID, Email, and Password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/students/login', {
        school_id: schoolId,
        school_slug:schoolSlug,
        admission_id: admissionId,
        email: email,
        password: password,
      });

      const { token, student, school } = response.data.data;
      
      await saveToken(token);
      
      // Store minimized user data - handle missing 'school' gracefully
      await saveUser({ 
        id: student.id,
        name: student.name,
        admission_number: student.admission_number,
        email: student.email,
        photo_path: student.photo_path,
        school_id: school?.id || student.school_id || schoolId,
        school_slug: school?.slug || schoolSlug,
        school_name: school?.name || schoolName,
        school_logo: school?.logo || logoPath,
        current_session: school?.current_session || student.current_record?.session || '2024-25',
        school_class_id: student.current_record?.school_class_id
      });
      
      Alert.alert('Success', 'Login Successful');
      router.replace('/(dashboard)');
    } catch (error: any) {
      console.error('Login failed', error);
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid credentials or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
              <View style={styles.schoolHeaderInfo}>
                <View style={styles.schoolLogoContainer}>
                  {logoPath ? (
                    <Image source={{ uri: logoPath as string }} style={styles.schoolLogo} />
                  ) : (
                    <SchoolIcon stroke="#fff" size={24} />
                  )}
                </View>
                <View>
                  <Text style={styles.welcomeText}>Welcome Back!</Text>
                  <Text style={styles.schoolText}>{schoolName}</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <Animated.View 
          entering={FadeInUp.delay(200)}
          style={styles.formContainer}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={styles.form}>
              <View style={styles.titleContainer}>
                <Image 
                  source={require('../../assets/logo.png')} 
                  style={styles.formLogo}
                  resizeMode="contain"
                />
                <Text style={styles.formTitle}>Student Login</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Admission ID</Text>
                <View style={styles.inputWrapper}>
                  <User stroke="#64748b" size={20} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your ID"
                    value={admissionId}
                    onChangeText={setAdmissionId}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail stroke="#64748b" size={20} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock stroke="#64748b" size={20} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff stroke="#94a3b8" size={20} /> : <Eye stroke="#94a3b8" size={20} />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => router.push({
                  pathname: '/forgot-password',
                  params: { schoolId, schoolName }
                })}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackground: {
    height: 250,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 10,
    marginTop: 10,
  },
  headerContent: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  schoolText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  schoolHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  schoolLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  schoolLogo: {
    width: '100%',
    height: '100%',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -40,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  form: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 12,
  },
  formLogo: {
    width: 40,
    height: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#4f46e5',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
