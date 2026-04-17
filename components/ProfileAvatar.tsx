import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { User } from 'lucide-react-native';

interface ProfileAvatarProps {
  uri?: string;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  fallbackIconSize?: number;
  fallbackIconColor?: string;
}

export default function ProfileAvatar({ 
  uri, 
  size = 45, 
  style, 
  imageStyle,
  fallbackIconSize = 24,
  fallbackIconColor = '#4f46e5'
}: ProfileAvatarProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...styles.container,
    ...style,
  };

  return (
    <View style={containerStyle}>
      {uri ? (
        <Image 
          source={{ uri }} 
          style={[styles.image, { borderRadius: size / 2 }, imageStyle]} 
          resizeMode="cover"
        />
      ) : (
        <View style={styles.fallback}>
          <User size={fallbackIconSize} stroke={fallbackIconColor} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
