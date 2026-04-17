import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, Calendar, Bookmark, UserCircle, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BottomNavProps {
  onLogout: () => void;
}

export default function BottomNav({ onLogout }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: Home, route: '/(dashboard)', label: 'Home' },
    { icon: Calendar, route: '/(dashboard)/attendance', label: 'Attendance' },
    { icon: Bookmark, route: '/(dashboard)/homework', label: 'Homework' },
    { icon: UserCircle, route: '/(dashboard)/profile', label: 'Profile' },
  ];

  return (
    <View style={styles.bottomNavContainer}>
      <View style={styles.bottomNav}>
        {navItems.map((item, index) => {
          const isActive = pathname === item.route;
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.navItem} 
              onPress={() => router.push(item.route as any)}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#4f46e5', '#6366f1']}
                  style={styles.activeTab}
                >
                  <item.icon stroke="#fff" size={20} />
                  <Text style={styles.activeText}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <item.icon stroke="#94a3b8" size={22} />
              )}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.navItem} onPress={onLogout}>
          <LogOut stroke="#ef4444" size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
  },
  bottomNav: {
    backgroundColor: '#fff',
    height: 65,
    borderRadius: 32.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
    gap: 6,
  },
  activeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
});
