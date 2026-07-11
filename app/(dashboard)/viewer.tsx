import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * In-app document viewer (parent app twin of the student viewer).
 *
 * Renders one of three things, picked from query params:
 *   1. content (plain text / HTML) → wrapped in a styled HTML shell
 *      (used by circulars + notices)
 *   2. url pointing at a PDF → rendered through Google Docs viewer
 *      embed on Android (RN's WebView can't open PDFs natively on
 *      Android); rendered directly on iOS (Safari's PDF view does)
 *   3. url pointing at anything else (DOCX / XLSX / image / web page) →
 *      rendered directly in the WebView. DOCX/XLSX fall back to the
 *      Google Docs viewer too so they actually preview instead of
 *      triggering a raw download dialog.
 *
 * The header always exposes a Download button when there's a URL —
 * tapping it hands the URL to the OS (Linking.openURL) which triggers
 * the platform download manager (Android) or Safari's Save-to-Files
 * sheet (iOS). This is the no-new-native-deps way to "download": the
 * parent doesn't need expo-file-system + storage permissions.
 *
 * NOTE: the student app has the same screen — when you edit this file,
 * mirror the change in `react-native/app/(dashboard)/viewer.tsx` (the
 * only intentional divergence is that the student app uses ToastContext
 * for inline errors while this one falls back to Alert.alert because
 * the parent app doesn't ship the toast provider yet).
 */
export default function Viewer() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    url?: string;
    title?: string;
    content?: string;
    imageUrl?: string;
    fileUrl?: string;
  }>();

  const url = typeof params.url === 'string' ? params.url : '';
  const title = typeof params.title === 'string' ? params.title : '';
  const content = typeof params.content === 'string' ? params.content : '';
  const imageUrl = typeof params.imageUrl === 'string' ? params.imageUrl : '';
  const fileUrl = typeof params.fileUrl === 'string' ? params.fileUrl : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lowerUrl = url.toLowerCase();
  const isPdf = lowerUrl.endsWith('.pdf');
  const isOfficeDoc =
    lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx') ||
    lowerUrl.endsWith('.xls') || lowerUrl.endsWith('.xlsx') ||
    lowerUrl.endsWith('.ppt') || lowerUrl.endsWith('.pptx');

  // For PDFs on Android and Office docs everywhere, route through
  // Google's gview embed. iOS Safari handles PDFs natively so we
  // leave those alone for a faster native preview.
  const previewUrl = useMemo(() => {
    if (!url) return '';
    if (isOfficeDoc) {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
    }
    if (isPdf && Platform.OS === 'android') {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
    }
    return url;
  }, [url, isPdf, isOfficeDoc]);

  const getHtmlContent = (body: string, heading: string, img?: string, file?: string) => `
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
      ${img ? `<div style="margin-top: 24px;"><img src="${img}" style="width: 100%; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" /></div>` : ''}
      ${file ? `<div style="margin-top: 24px;"><a href="${file}" style="display: block; background: #6366f1; color: white; text-align: center; padding: 15px; border-radius: 14px; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);">View PDF Attachment</a></div>` : ''}
    </body>
    </html>
  `;

  const source = content
    ? { html: getHtmlContent(content, title || 'Notice', imageUrl, fileUrl) }
    : { uri: previewUrl };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  // "Download" actually means "hand the URL to the OS so it can save
  // it." On Android that's the system Download Manager; on iOS that's
  // Safari with Save-to-Files in the share sheet. Avoids needing
  // expo-file-system + runtime storage permissions.
  const handleDownload = async () => {
    const target = url || fileUrl;
    if (!target) {
      Alert.alert('Download', 'No file available to download.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(target);
      if (!supported) {
        Alert.alert('Download', 'Cannot open this file on this device.');
        return;
      }
      await Linking.openURL(target);
    } catch {
      Alert.alert('Download', 'Could not start the download.');
    }
  };

  const canDownload = !!(url || fileUrl);

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
            {canDownload ? (
              <TouchableOpacity
                onPress={handleDownload}
                style={styles.downloadButton}
                activeOpacity={0.7}
                accessibilityLabel="Download file"
              >
                <Download stroke="#fff" size={20} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
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
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
              {canDownload ? (
                <TouchableOpacity style={styles.openExtButton} onPress={handleDownload}>
                  <ExternalLink size={14} stroke="#4f46e5" />
                  <Text style={styles.openExtText}>Open externally</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : (
          <WebView
            source={source}
            key={content ? 'html' : (source as any).uri}
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
            startInLoadingState
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
    paddingHorizontal: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  downloadButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: 4,
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
  openExtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
  },
  openExtText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#4f46e5',
  },
});
