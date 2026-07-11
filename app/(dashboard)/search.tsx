import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Search as SearchIcon, 
  ArrowLeft, 
  X, 
  Clock, 
  GraduationCap, 
  ClipboardList, 
  TrendingUp, 
  Calendar, 
  Bell, 
  Bookmark, 
  FileText,
  ChevronRight,
  Info
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import BottomNav from '../../components/BottomNav';

// Feature Registry with Keywords for Smart Search
const APP_FEATURES = [
  { 
    name: 'Timetable', 
    route: '/(dashboard)/timetable', 
    icon: Clock, 
    color: '#0284c7', 
    keywords: ['schedule', 'class', 'time', 'period', 'routine'] 
  },
  { 
    name: 'Academic Results', 
    route: '/(dashboard)/results', 
    icon: TrendingUp, 
    color: '#4f46e5', 
    keywords: ['marks', 'score', 'exam', 'report', 'card', 'test', 'percentage'] 
  },
  { 
    name: 'Attendance', 
    route: '/(dashboard)/attendance', 
    icon: ClipboardList, 
    color: '#d97706', 
    keywords: ['presence', 'leave', 'absent', 'percentage'] 
  },
  { 
    name: 'Calendar & Holidays', 
    route: '/(dashboard)/calendar', 
    icon: Calendar, 
    color: '#f43f5e', 
    keywords: ['date', 'event', 'holiday', 'vacation', 'sunday', 'festival'] 
  },
  { 
    name: 'Notice Board / Circulars', 
    route: '/(dashboard)/circulars', 
    icon: Bell, 
    color: '#d97706', 
    keywords: ['notice', 'news', 'update', 'school', 'admin', 'important'] 
  },
  { 
    name: 'Homework', 
    route: '/(dashboard)/homework', 
    icon: Bookmark, 
    color: '#db2777', 
    keywords: ['assignment', 'task', 'home', 'work', 'study'] 
  },
  { 
    name: 'My Subjects', 
    route: '/(dashboard)/subjects', 
    icon: GraduationCap, 
    color: '#059669', 
    keywords: ['book', 'teacher', 'syllabus', 'course'] 
  },
  { 
    name: 'School Fees', 
    route: '/(dashboard)/fees', 
    icon: FileText, 
    color: '#6366f1', 
    keywords: ['money', 'payment', 'due', 'receipt', 'bank'] 
  },
  { 
    name: 'My Profile', 
    route: '/(dashboard)/profile', 
    icon: GraduationCap, 
    color: '#4f46e5', 
    keywords: ['id', 'details', 'name', 'father', 'address', 'bio'] 
  }
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [featureResults, setFeatureResults] = useState<any[]>([]);
  const [circularResults, setCircularResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus search input on mount
    const timer = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (query.trim().length > 1) {
      handleSearch();
    } else {
      setFeatureResults([]);
      setCircularResults([]);
    }
  }, [query]);

  const handleSearch = async () => {
    const q = query.toLowerCase().trim();
    
    // 1. Search Features Local
    const matchedFeatures = APP_FEATURES.filter(f => 
      f.name.toLowerCase().includes(q) || 
      f.keywords.some(k => k.includes(q))
    );
    setFeatureResults(matchedFeatures);

    // 2. Search Circulars via API
    try {
      setLoading(true);
      const response = await api.get('/students/circulars');
      const allCirculars = response.data.data.data || [];
      const matchedCirculars = allCirculars.filter((c: any) => 
        c.title.toLowerCase().includes(q) || 
        (c.description && c.description.toLowerCase().includes(q))
      );
      setCircularResults(matchedCirculars);
    } catch (e) {
      console.error('Search API fail', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setFeatureResults([]);
    setCircularResults([]);
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Search Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft stroke="#1e293b" size={24} />
          </TouchableOpacity>
          
          <View style={styles.searchBar}>
            <SearchIcon stroke="#94a3b8" size={20} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Search features, notices, results..."
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <X stroke="#94a3b8" size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          style={styles.resultsContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading && (
            <ActivityIndicator color="#4f46e5" style={{ marginVertical: 20 }} />
          )}

          {/* Features Section */}
          {featureResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>App Features</Text>
              {featureResults.map((item, idx) => (
                <Animated.View key={`feat-${idx}`} entering={FadeInUp.delay(idx * 50)} layout={Layout}>
                  <TouchableOpacity 
                    style={styles.resultItem}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                      <item.icon size={20} stroke={item.color} />
                    </View>
                    <View style={styles.resultText}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultMeta}>App Module</Text>
                    </View>
                    <ChevronRight size={16} stroke="#cbd5e1" />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Circulars Section */}
          {circularResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notices & Circulars</Text>
              {circularResults.map((item, idx) => (
                <Animated.View key={`circ-${idx}`} entering={FadeInUp.delay(idx * 50)} layout={Layout}>
                  <TouchableOpacity 
                    style={styles.resultItem}
                    onPress={() => router.push({
                      pathname: '/(dashboard)/viewer',
                      params: { 
                        type: 'circular',
                        id: item.id,
                        title: item.title,
                        content: item.description,
                        date: item.published_at
                      }
                    })}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#f59e0b15' }]}>
                      <Bell size={20} stroke="#f59e0b" />
                    </View>
                    <View style={styles.resultText}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.resultMeta}>Notice • {new Date(item.published_at).toLocaleDateString()}</Text>
                    </View>
                    <ChevronRight size={16} stroke="#cbd5e1" />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {query.length > 1 && !loading && featureResults.length === 0 && circularResults.length === 0 && (
            <View style={styles.emptyContainer}>
              <Info size={50} stroke="#cbd5e1" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Try searching for "marks", "timetable", or "holiday"</Text>
            </View>
          )}

          {/* Initial State / Suggestions */}
          {query.length <= 1 && (
            <View style={styles.suggestionSection}>
              <Text style={styles.sectionTitle}>Try Searching for...</Text>
              <View style={styles.tagCloud}>
                {['Exam Marks', 'Holiday', 'Time Table', 'Fees Due', 'Academic Results'].map((tag) => (
                  <TouchableOpacity 
                    key={tag} 
                    style={styles.tag}
                    onPress={() => setQuery(tag)}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    marginRight: 15,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#1e293b',
  },
  resultsContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 15,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1e293b',
  },
  resultMeta: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#475569',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  suggestionSection: {
    marginTop: 30,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Inter_500Medium',
  },
});
