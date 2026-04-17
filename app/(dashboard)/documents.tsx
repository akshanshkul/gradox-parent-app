import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  Clock,
  ExternalLink,
  AlertCircle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import api from '../../utils/api';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/students/profile');
      const student = response.data.data.student;
      setDocuments(student?.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents', error);
      Alert.alert('Error', 'Unable to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = (url: string, title: string) => {
    if (!url) return;
    router.push({
      pathname: '/(dashboard)/viewer',
      params: { url, title }
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

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
            <Text style={styles.headerTitle}>My Documents</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerSubtitle}>View and manage your submitted verifications</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{documents.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{documents.filter(d => d.status === 'verified').length}</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{documents.filter(d => d.status !== 'verified').length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        <Animated.View entering={FadeInUp.delay(200)}>
          {documents.length > 0 ? (
            documents.map((doc, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.docCard}
                onPress={() => handleOpenDocument(doc.file_path, doc.type?.name)}
                activeOpacity={0.7}
              >
                <View style={styles.docIconContainer}>
                  <View style={[styles.docIconBox, { backgroundColor: doc.status === 'verified' ? '#ecfdf5' : '#fff7ed' }]}>
                    <FileText size={24} stroke={doc.status === 'verified' ? '#059669' : '#d97706'} />
                  </View>
                </View>

                <View style={styles.docDetails}>
                  <Text style={styles.docName}>{doc.type?.name || 'Document'}</Text>
                  <Text style={styles.docType}>File Type: {doc.file_type?.toUpperCase() || 'UNKNOWN'}</Text>
                  
                  <View style={styles.statusRow}>
                    {doc.status === 'verified' ? (
                      <View style={styles.statusBadgeSuccess}>
                        <ShieldCheck size={12} stroke="#059669" />
                        <Text style={styles.statusTextSuccess}>Verified</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgePending}>
                        <Clock size={12} stroke="#d97706" />
                        <Text style={styles.statusTextPending}>In Review</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.actionContainer}>
                  <View style={styles.viewButton}>
                     <ExternalLink size={18} stroke="#6366f1" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <AlertCircle size={40} stroke="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Documents Found</Text>
              <Text style={styles.emptyText}>You haven't submitted any documents for verification yet.</Text>
            </View>
          )}

          <View style={styles.noticeCard}>
            <AlertCircle size={20} stroke="#6366f1" />
            <Text style={styles.noticeText}>
              Need to update a document? Please contact the school administration office.
            </Text>
          </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingBottom: 40,
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
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  headerContent: {
    paddingHorizontal: 25,
    marginTop: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    marginTop: 2,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  scrollPadding: {
    paddingBottom: 40,
  },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  docIconContainer: {
    marginRight: 16,
  },
  docIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  docName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  docType: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusTextSuccess: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#059669',
  },
  statusTextPending: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#d97706',
  },
  actionContainer: {
    paddingLeft: 10,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#334155',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    alignItems: 'center',
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
});
