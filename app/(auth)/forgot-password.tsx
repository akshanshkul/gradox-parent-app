import React, { useState } from 'react';
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
import { ArrowLeft, Mail, User } from 'lucide-react-native';
import api from '../../utils/api';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function ForgotPassword() {
  const { schoolId, schoolName } = useLocalSearchParams();
  const [admissionId, setAdmissionId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestOtp = async () => {
    if (!admissionId || !email) {
      Alert.alert('Error', 'Please enter your Admission ID and Email');
      return;
    }

    setLoading(true);
    try {
      await api.post('/students/forgot-password', {
        school_id: schoolId,
        admission_id: admissionId,
        email: email
      });
      
      Alert.alert('OTP Sent', 'A verification code has been sent to your email.');
      router.push({
        pathname: '/verify-otp',
        params: { schoolId, email }
      });
    } catch (error: any) {
      console.error('OTP Request failed', error);
      Alert.alert('Request Failed', error.response?.data?.message || 'Failed to send OTP. Please check your details.');
    } finally {
      setLoading(false);
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
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>{schoolName}</Text>
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
          <Text style={styles.instructionText}>
            Enter your details below to receive a 6-digit verification code on your registered email.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Admission ID</Text>
            <View style={styles.inputWrapper}>
              <User stroke="#64748b" size={20} />
              <TextInput
                style={styles.input}
                placeholder="Enter your Student ID"
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
                placeholder="Enter registered email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRequestOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Send Verification Code</Text>
            )}
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
    fontSize: 16,
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
  },
  instructionText: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 30,
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
  actionButton: {
    backgroundColor: '#4f46e5',
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
});
