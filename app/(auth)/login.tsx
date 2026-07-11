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
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import api from '../../utils/api';
import { getSchoolData } from '../../utils/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { APP_CONFIG } from '../../constants';

export default function Login() {
  const [cachedSchool, setCachedSchool] = useState<any>(null);

  useEffect(() => {
    async function fetchBranding() {
      const data = await getSchoolData();
      if (data) setCachedSchool(data);
    }
    fetchBranding();
  }, []);

  const isGlobalApp = process.env.EXPO_PUBLIC_IS_GLOBAL_APP === 'true';
  const schoolName = isGlobalApp ? 'Gradox Parent' : (cachedSchool?.name || APP_CONFIG.defaultSchool.name);
  const schoolLogo = isGlobalApp ? null : (cachedSchool?.logo || APP_CONFIG.defaultSchool.logo);
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your Email Address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/parents/send-otp', {
        email: email,
      });

      Alert.alert('Success', 'OTP sent to your email');
      router.push({
        pathname: '/verify-otp',
        params: { email: email }
      });
    } catch (error: any) {
      console.error('OTP request failed', error);
      Alert.alert('Request Failed', error?.response?.data?.message || 'Email not found or server error');
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
                {!isGlobalApp && (
                  <View style={styles.schoolLogoContainer}>
                    <Image 
                      source={schoolLogo ? { uri: schoolLogo as string } : require('../../assets/logo/logo.png')} 
                      style={styles.schoolLogo} 
                      resizeMode="contain"
                    />
                  </View>
                )}
                <View>
                  <Text style={styles.welcomeText}>Welcome Parent!</Text>
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
                <Text style={styles.formTitle}>Parent Login</Text>
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

              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  We will send a 6-digit OTP to this email address for verification.
                </Text>
                {!isGlobalApp && schoolLogo && (
                  <Image
                    source={{ uri: schoolLogo }}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                )}
              </View>

              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Send OTP</Text>
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
    fontSize: 28,
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
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
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
  infoContainer: {
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
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
