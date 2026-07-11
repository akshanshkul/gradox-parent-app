import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import api from '../../utils/api';
import { saveParentToken } from '../../utils/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function VerifyOtp() {
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const isGlobalApp = process.env.EXPO_PUBLIC_IS_GLOBAL_APP === 'true';
  const schoolName = isGlobalApp ? 'Gradox Parent' : (process.env.EXPO_PUBLIC_SCHOOL_NAME || 'Our School');
  const schoolLogo = isGlobalApp ? null : process.env.EXPO_PUBLIC_SCHOOL_LOGO;
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);
  const router = useRouter();

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/parents/verify-otp', {
        email: email,
        otp: code
      });
      
      const result: any = response;
      const students = result?.students || [];

      // Persist the short-lived parent session token. The backend requires it
      // on every subsequent /parents/* call (login-as-student, students). The
      // server-side cache expires it after 30 minutes; we keep it on the
      // device until logout / next OTP cycle.
      if (result?.parent_token) {
        await saveParentToken(result.parent_token);
      }

      Alert.alert('Success', result?.message || 'Code verified successfully.');

      // Navigate to student selection screen
      router.push({
        pathname: '/select-student',
        params: { email: email as string, students: JSON.stringify(students) }
      });
    } catch (error: any) {
      console.error('OTP Verification failed', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Verification failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/parents/send-otp', {
        email: email,
      });
      Alert.alert('Resent', 'A new OTP has been sent to your email.');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
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
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Sent to {email}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <Animated.View 
        entering={FadeInUp.delay(200)}
        style={styles.formContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.form}
        >
          <View style={styles.iconContainer}>
            <ShieldCheck size={60} stroke="#4f46e5" />
          </View>

          <Text style={styles.instructionText}>
            Please enter the 6-digit security code we sent to your email address.
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputs.current[index] = ref; }}
                style={styles.otpInput}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resendButton}
            onPress={handleResend}
            disabled={resending}
          >
            <Text style={styles.resendText}>
              Didn't receive code? <Text style={styles.resendLink}>Resend</Text>
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  form: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 40,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  otpInput: {
    width: 45,
    height: 55,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#4f46e5',
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    marginTop: 30,
  },
  resendText: {
    fontSize: 14,
    color: '#64748b',
  },
  resendLink: {
    color: '#4f46e5',
    fontWeight: '700',
  },
});
