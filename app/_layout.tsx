import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { NativeModules, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import RNCallKeep from 'react-native-callkeep';
import 'react-native-reanimated';
import './globals.css';

import ProfileSetup from '@/components/ProfileSetup';
import { ThemeProvider as CustomThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserProfile, saveUserProfile, UserProfile } from '@/utils/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const segments = useSegments();

  const checkSetup = useCallback(async () => {
    const profile = await getUserProfile();
    setIsSetupComplete(profile !== null);
  }, []);

  useEffect(() => {
    // Check if user has completed setup
    checkSetup();
  }, [checkSetup]);

  useEffect(() => {
    // Re-check when navigation changes (e.g., logout)
    checkSetup();
  }, [checkSetup, segments]);

  useEffect(() => {
    if (typeof globalThis === 'undefined') return;
    const prevHandler = (globalThis as any).onunhandledrejection;
    (globalThis as any).onunhandledrejection = (event: any) => {
      const reason = event?.reason;
      if (reason?.message?.includes('keep awake')) {
        return;
      }
      if (typeof prevHandler === 'function') {
        prevHandler(event);
      }
    };
    return () => {
      (globalThis as any).onunhandledrejection = prevHandler;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!NativeModules?.RNCallKeep || !RNCallKeep?.setup || !RNCallKeep?.setAvailable) {
      return;
    }
    const setupCallKeep = async () => {
      try {
        await RNCallKeep.setup({
          ios: {
            appName: 'IntroVerse',
          },
          android: {
            alertTitle: 'Phone account permission',
            alertDescription: 'Allow IntroVerse to show incoming reminder calls.',
            cancelButton: 'Cancel',
            okButton: 'Allow',
            foregroundService: {
              channelId: 'reminder-calls',
              channelName: 'Reminder calls',
            },
          },
        });
        await RNCallKeep.setAvailable(true);
      } catch (error) {
        console.warn('CallKeep setup failed', error);
      }
    };
    void setupCallKeep();
  }, []);

  const handleSetupComplete = async (profileData: UserProfile) => {
    await saveUserProfile(profileData);
    setIsSetupComplete(true);
  };

  const renderContent = () => {
    // Show loading state while checking setup status
    if (isSetupComplete === null) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    // Show profile setup if not completed
    if (!isSetupComplete) {
      return <ProfileSetup onComplete={handleSetupComplete} />;
    }

    return (
      <CustomThemeProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </CustomThemeProvider>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' },
        ]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        {renderContent()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
  },
  safeArea: {
    flex: 1,
  },
});
