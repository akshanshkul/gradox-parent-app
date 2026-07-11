import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { School as SchoolIcon, Search, MapPin, ChevronRight } from 'lucide-react-native';
import api from '../../utils/api';
import Animated, { FadeIn } from 'react-native-reanimated';

interface School {
  id: number;
  name: string;
  slug: string;
  logo_path?: string;
}

export default function SelectSchool() {
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (search.length > 2) {
      const delayDebounceFn = setTimeout(() => {
        searchSchools();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSchools([]);
    }
  }, [search]);

  const searchSchools = async () => {
    setLoading(true);
    try {
      const response = await api.get('/schools/search', {
        params: { q: search }
      });
      setSchools((response as any) || []);
    } catch (error) {
      console.error('Search failed', error);
      // Fallback for demo if backend is not running
      setSchools([
        { id: 1, name: 'Sample Excellence Academy', slug: 'sample-academy' },
        { id: 2, name: 'Global International School', slug: 'global' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (school: School) => {
    router.push({
      pathname: '/login',
      params: { 
        schoolId: school.id, 
        schoolSlug: school.slug,
        schoolName: school.name,
        logoPath: school.logo_path 
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Your School</Text>
        <Text style={styles.subtitle}>Search for your institution to continue</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color="#94a3b8" size={20} />
          <TextInput
            style={styles.input}
            placeholder="Type school name..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={schools}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            search.length > 2 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No schools found</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <View style={styles.illustration}>
                   <SchoolIcon size={64} stroke="#e2e8f0" />
                </View>
                <Text style={styles.emptyText}>Start typing to search</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Animated.View entering={FadeIn}>
              <TouchableOpacity 
                style={styles.schoolCard}
                onPress={() => onSelect(item)}
              >
                <View style={styles.logoContainer}>
                  {item.logo_path ? (
                    <Image source={{ uri: item.logo_path }} style={styles.logo} />
                  ) : (
                    <SchoolIcon stroke="#6366f1" size={24} />
                  )}
                </View>
                <View style={styles.schoolInfo}>
                  <Text style={styles.schoolName}>{item.name}</Text>
                  <View style={styles.locationContainer}>
                    <MapPin size={14} color="#64748b" />
                    <Text style={styles.schoolSlug}>/{item.slug}</Text>
                  </View>
                </View>
                <ChevronRight color="#cbd5e1" size={20} />
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 30,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  schoolInfo: {
    flex: 1,
    marginLeft: 16,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolSlug: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
  },
  illustration: {
    backgroundColor: '#f1f5f9',
    padding: 30,
    borderRadius: 100,
  }
});
