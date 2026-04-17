import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

export default function Viewer() {
  const router = useRouter();
  const { url, title, content, type } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If it's a circular/text content, we wrap it in a styled HTML template
  const getHtmlContent = (body: string, heading: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body { 
          font-family: -apple-system, sans-serif; 
          padding: 24px; 
          line-height: 1.6; 
          color: #1e293b;
          margin: 0;
          background-color: #fff;
        }
        h1 { font-size: 22px; color: #0f172a; margin-bottom: 8px; }
        .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
        .content { font-size: 16px; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <h1>${heading}</h1>
      <div class="meta">Posted by Admin</div>
      <div class="content">${body}</div>
    </body>
    </html>
  `;

  // Determine source
  const source = content 
    ? { html: getHtmlContent(content.toString(), title?.toString() || 'Notice') }
    : { uri: (Platform.OS === 'android' && url?.toString().toLowerCase().endsWith('.pdf'))
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url.toString())}`
        : url?.toString() };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

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
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Document Viewer'}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* WebView */}
      <View style={styles.webContainer}>
        {loading && !error && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loaderText}>Loading document...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView 
            source={source}
            key={content ? 'html' : source.uri} // Force re-render on source change
            style={[styles.webview, loading && { opacity: 0 }]}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
              setError('Failed to load document. Please check your internet connection.');
              setLoading(false);
            }}
            scalesPageToFit={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingBottom: 15,
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  webContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#64748b',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
