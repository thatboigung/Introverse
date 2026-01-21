import { useTheme } from '@/contexts/ThemeContext';
import { Tabs } from 'expo-router';
import { Clock, MessageSquare, Phone, User } from 'lucide-react';
import React from 'react';

export default function TabLayout() {
  const { theme } = useTheme();
  const handleCallTabPress = () => {
    // Set flag to load last number when tab becomes focused
    if (typeof window !== 'undefined') {
      localStorage.setItem('loadLastNumber', 'true');
    }
  };

  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme === 'dark' ? '#FFFFFF' : '#000000',
        tabBarInactiveTintColor: theme === 'dark' ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: theme === 'dark' ? '#000000' : '#FFFFFF',
          height: isSmallScreen ? 80 : 90,
          paddingBottom: isSmallScreen ? 20 : 25,
          paddingTop: 10,
          position: 'fixed',
          bottom: isSmallScreen ? 0 : 20,
          left: '50%',
          transform: 'translateX(-50%)',
          borderTop: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
          borderRaidius: isSmallScreen ? '0' : '30px',
          paddingLeft: isSmallScreen ? 10 : 30,
          paddingRight: isSmallScreen ? 10 : 30,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          justifyContent: 'center',
          width: '90%',
          maxWidth: isSmallScreen ? '100%' : '600px',
          boxShadow: isSmallScreen 
            ? 'none' 
            : theme === 'dark' 
              ? '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
              : '0 10px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
          display: isSmallScreen ? 'none' : 'flex',
        },
        tabBarItemStyle: {
          flex: 1,
          minHeight: 50,
          paddingVertical: 8,
          gap: 4,
          borderRadius: 16,
          marginHorizontal: 4,
          transition: 'all 0.2s ease',
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Call',
          tabBarIcon: ({ color, focused }) => (
            <Phone 
              size={24} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
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
            <Clock 
              size={24} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, focused }) => (
            <User 
              size={24} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <MessageSquare 
              size={24} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
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
