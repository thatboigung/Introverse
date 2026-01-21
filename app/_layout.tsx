import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    // Check if user has completed setup
    const checkSetup = async () => {
      const profile = await getUserProfile();
      setIsSetupComplete(profile !== null);
    };
    checkSetup();
  }, []);

  const handleSetupComplete = async (profileData: UserProfile) => {
    await saveUserProfile(profileData);
    setIsSetupComplete(true);
  };

  // Show loading state while checking setup status
  if (isSetupComplete === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
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
}
