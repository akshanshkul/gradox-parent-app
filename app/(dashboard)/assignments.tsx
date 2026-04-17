import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  ClipboardList, 
  Info,
  Layers,
  FileCheck
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function Assignments() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft stroke="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Assignments</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.placeholderContainer}>
          <View style={[styles.iconCircle, { backgroundColor: '#fce7f3' }]}>
            <Layers size={48} stroke="#db2777" />
          </View>
          <Text style={styles.title}>Unit Assignments</Text>
          <Text style={styles.subtitle}>
            Submit your term papers, projects, and weekly assignments digitally from your smartphone.
          </Text>

          <View style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <FileCheck size={18} stroke="#db2777" />
              <Text style={[styles.demoHeaderText, { color: '#db2777' }]}>Digital Submission</Text>
            </View>
            <Text style={styles.demoBody}>
              Once active, you can upload PDFs Or photos of your handwritten assignments directly to the teacher's dashboard for grading.
            </Text>
          </View>

          <TouchableOpacity style={styles.backHomeButton} onPress={() => router.replace('/(dashboard)')}>
            <Text style={styles.backHomeText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
  },
  placeholderContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 35,
  },
  demoCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  demoHeaderText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#475569',
    lineHeight: 22,
  },
  backHomeButton: {
    marginTop: 40,
    backgroundColor: '#4f46e5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backHomeText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
