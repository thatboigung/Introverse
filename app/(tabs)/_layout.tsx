import { useTheme } from '@/contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const handleCallTabPress = () => {
    // Set flag to load last number when tab becomes focused
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.setItem('loadLastNumber', 'true');
    }
  };

  const isFullWidth = Platform.OS !== 'web' || (typeof window !== 'undefined' && window.innerWidth < 768);
  const webTabBarStyle = {
    backgroundColor: theme === 'dark' ? '#000000' : '#FFFFFF',
    height: isFullWidth ? 80 : 90,
    paddingBottom: isFullWidth ? 20 : 25,
    paddingTop: 10,
    position: 'fixed',
    bottom: isFullWidth ? 0 : 20,
    left: isFullWidth ? 0 : '50%',
    transform: isFullWidth ? undefined : 'translateX(-50%)',
    borderTop: 'none',
    borderRadius: isFullWidth ? 0 : 30,
    paddingLeft: isFullWidth ? 10 : 30,
    paddingRight: isFullWidth ? 10 : 30,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    justifyContent: 'center',
    width: isFullWidth ? '100%' : '90%',
    maxWidth: isFullWidth ? '100%' : '600px',
    boxShadow: isFullWidth
      ? 'none'
      : theme === 'dark'
        ? '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
        : '0 10px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.08)',
  } as const;
  const nativeTabBarStyle = {
    backgroundColor: theme === 'dark' ? '#000000' : '#FFFFFF',
    height: 80,
    paddingBottom: 12 + insets.bottom,
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    borderRadius: 0,
    paddingLeft: 10,
    paddingRight: 10,
    justifyContent: 'center',
  } as const;

  return (
    <Tabs
      screenOptions={({ route }) => {
        const baseStyle = (Platform.OS === 'web' ? webTabBarStyle : nativeTabBarStyle) as any;
        const isCallScreen = route.name === 'index' && (route.params as any)?.inCall === 'true';
        return {
          headerShown: false,
          tabBarActiveTintColor: theme === 'dark' ? '#FFFFFF' : '#000000',
          tabBarInactiveTintColor: theme === 'dark' ? '#6B7280' : '#9CA3AF',
          tabBarStyle: isCallScreen ? ({ display: 'none' } as any) : baseStyle,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 4,
            display: isFullWidth ? 'none' : 'flex',
          },
          tabBarItemStyle: {
            flex: 1,
            minHeight: 50,
            paddingVertical: 8,
            gap: 4,
            borderRadius: 16,
            marginHorizontal: 4,
            ...(Platform.OS === 'web' ? { transition: 'all 0.2s ease' } : {}),
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
        };
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Call',
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="phone"
              size={24}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: handleCallTabPress,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Recents',
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="clock"
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="user"
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="message-square"
              size={24}
              color={color}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
