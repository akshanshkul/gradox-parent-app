import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { UserCheck } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { APP_CONFIG } from '../../constants';

const { width } = Dimensions.get('window');

export default function WelcomeTwo() {
  const router = useRouter();

  const handleGetStarted = () => {
    if (APP_CONFIG.isGlobalApp) {
      router.replace('/select-school');
    } else {
      router.replace({
        pathname: "/(auth)/login",
        params: { 
          schoolId: APP_CONFIG.defaultSchool.id,
          schoolSlug: APP_CONFIG.defaultSchool.slug,
          schoolName: APP_CONFIG.defaultSchool.name,
          logoPath: APP_CONFIG.defaultSchool.logo
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4f46e5', '#3730a3']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <Animated.View 
            entering={FadeInUp.delay(200).duration(1000)}
            style={styles.illustrationContainer}
          >
            <View style={styles.iconCircle}>
              <Image 
                source={require('../../assets/logo/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <View style={styles.content}>
            <Animated.Text 
              entering={FadeInDown.delay(400).duration(1000)}
              style={styles.title}
            >
              Stay Connected with Teachers
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(600).duration(1000)}
              style={styles.subtitle}
            >
              Get real-time notifications about your progress and school events.
            </Animated.Text>
          </View>

          <Animated.View 
            entering={FadeInUp.delay(800).duration(1000)}
            style={styles.footer}
          >
            <View style={styles.dots}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.activeDot]} />
            </View>
            <TouchableOpacity 
              style={styles.getStartedButton}
              onPress={handleGetStarted}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  content: {
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 8,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#fff',
  },
  getStartedButton: {
    paddingHorizontal: 30,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: {
    color: '#3730a3',
    fontSize: 18,
    fontWeight: '700',
  },
});
