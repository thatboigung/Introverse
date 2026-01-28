import { useTheme } from '@/contexts/ThemeContext';
import { clearAllUserData, getUserProfile, saveUserProfile } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { Bell, BellOff, Camera, ChevronRight, Info, LogOut, Shield, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showRemoveAds, setShowRemoveAds] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDescription, setCouponDescription] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfile();
    loadSettings();
  }, []);

  const loadProfile = async () => {
    const profile = await getUserProfile();
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
      setPhoneNumber(profile.phoneNumber || '');
      setProfilePicture(profile.profilePicture || null);
    }
  };

  const loadSettings = () => {
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const notifications = globalThis.localStorage.getItem('notificationsEnabled');
      setNotificationsEnabled(notifications !== 'false');
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Compress image
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setProfilePicture(compressed);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const pickNativeImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset.base64) {
      setProfilePicture(`data:image/jpeg;base64,${asset.base64}`);
    } else if (asset.uri) {
      setProfilePicture(asset.uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setSuccessMessage('Please enter your name');
      setShowSuccess(true);
      return;
    }

    await saveUserProfile({
      name: name.trim(),
      bio: bio.trim(),
      phoneNumber,
      profilePicture: profilePicture || undefined,
    });

    setSuccessMessage('Profile updated successfully');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleToggleNotifications = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.setItem('notificationsEnabled', String(newValue));
    }
  };

  const performLogout = async () => {
    await clearAllUserData();
    setShowLogoutConfirm(false);
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'location' in globalThis) {
      globalThis.location.href = '/';
      return;
    }
    router.replace('/');
  };

  const handleLogout = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Logout', 'This will clear all data on this device.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: performLogout },
      ]);
      return;
    }
    if (showLogoutConfirm) {
      void performLogout();
    } else {
      setShowLogoutConfirm(true);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <Pressable onPress={handleSaveProfile}>
            <Text style={styles.link}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Pressable style={styles.avatarButton} onPress={pickNativeImage}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Feather name="user" size={32} color="#fff" />
              </View>
            )}
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </Pressable>

          <Text style={styles.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Your name" placeholderTextColor="#6b7280" />

          <Text style={styles.label}>Bio</Text>
          <TextInput value={bio} onChangeText={setBio} style={[styles.input, styles.textarea]} placeholder="Tell us about yourself" placeholderTextColor="#6b7280" multiline />

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.readonly}>
            <Text style={styles.readonlyText}>{phoneNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <Pressable style={styles.row} onPress={handleToggleNotifications}>
            <Text style={styles.rowText}>Notifications</Text>
            <View style={[styles.toggle, notificationsEnabled ? styles.toggleOn : null]} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <Pressable style={styles.row} onPress={() => setShowAbout(true)}>
            <Text style={styles.rowText}>About IntroVerse</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => setShowLegal(true)}>
            <Text style={styles.rowText}>Legal</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Pressable style={styles.row} onPress={() => setShowRemoveAds(true)}>
            <Text style={styles.rowText}>Remove ads forever • $1</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => setShowCoupon(true)}>
            <Text style={styles.rowText}>Already purchased</Text>
          </Pressable>
        </View>

        <Pressable style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <Modal visible={showAbout} transparent animationType="fade" onRequestClose={() => setShowAbout(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>About IntroVerse</Text>
              <Text style={styles.modalText}>
                IntroVerse helps you explore internal dialogues with yourself.
              </Text>
              <Text style={styles.modalText}>
                Build habits through reminders, reflect on recordings, and organize conversations with different
                parts of yourself in a safe, personal space.
              </Text>
              <Text style={styles.modalText}>Version 1.0.0</Text>
              <Pressable style={styles.modalButton} onPress={() => setShowAbout(false)}>
                <Text style={styles.modalButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showLegal} transparent animationType="fade" onRequestClose={() => setShowLegal(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Legal</Text>
              <Text style={styles.modalText}>All data is stored locally on your device.</Text>
              <Text style={styles.modalText}>
                We do not collect, transmit, or sell your personal information. Deleting the app removes your data.
              </Text>
              <Text style={styles.modalText}>
                IntroVerse is for personal reflection and is not a substitute for professional mental health care.
              </Text>
              <Pressable style={styles.modalButton} onPress={() => setShowLegal(false)}>
                <Text style={styles.modalButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showRemoveAds} transparent animationType="fade" onRequestClose={() => setShowRemoveAds(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Remove Ads Forever • $1</Text>
              <Text style={styles.modalText}>
                Enjoy a cleaner experience with no interruptions. Removing ads keeps your focus on your reflections
                and makes the app feel smoother and more personal.
              </Text>
              <Pressable style={styles.modalButton} onPress={() => setShowRemoveAds(false)}>
                <Text style={styles.modalButtonText}>Ok</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showCoupon} transparent animationType="fade" onRequestClose={() => setShowCoupon(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Already purchased</Text>
              <Text style={styles.modalText}>
                Enter the coupon code sent to your email to restore your purchase.
              </Text>
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Coupon code"
                placeholderTextColor="#6b7280"
                style={styles.modalInput}
                autoCapitalize="characters"
              />
              <TextInput
                value={couponDescription}
                onChangeText={setCouponDescription}
                placeholder="Description (optional)"
                placeholderTextColor="#6b7280"
                style={[styles.modalInput, styles.textarea]}
                multiline
              />
              <Pressable style={styles.modalButton} onPress={() => setShowCoupon(false)}>
                <Text style={styles.modalButtonText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => setShowSuccess(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Feather name="check" size={22} color="#0f172a" />
              </View>
              <Text style={styles.successTitle}>Saved</Text>
              <Text style={styles.successText}>{successMessage}</Text>
              <Pressable style={styles.successButton} onPress={() => setShowSuccess(false)}>
                <Text style={styles.successButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-white'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Status Bar Area */}
      <div className="h-12"></div>

      {/* Top Bar */}
      <div className={`px-4 py-2 h-14 flex items-center fixed top-12 left-0 right-0 ${theme === 'dark' ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl z-50`}>
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-400 text-base font-medium"
          >
            ← Back
          </button>
          <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} absolute left-1/2 transform -translate-x-1/2`}>
            Settings
          </h1>
          <button
            onClick={handleSaveProfile}
            className="text-blue-500 hover:text-blue-400 text-base font-medium"
          >
            Save
          </button>
        </div>
      </div>

      {/* Spacer for fixed top bar */}
      <div className="h-14"></div>

      <div className="flex-1 px-4 pt-6 pb-32 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-2xl mx-auto">
          {/* Profile Section */}
          <div className="p-6 mb-4">
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Profile</h2>

            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-6">
              <div
                onClick={handleImageClick}
                className="relative w-28 h-28 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  background: profilePicture
                    ? 'transparent'
                    : 'linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(99, 102, 241, 0.6))',
                }}
              >
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={48} className="text-white/70" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera size={32} className="text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <p className="text-gray-500 text-sm mt-3">Tap to change photo</p>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={`w-full ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-xl px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
                }}
              />
            </div>

            {/* Bio */}
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={3}
                className={`w-full ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-xl px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none`}
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
                }}
              />
            </div>

            {/* Phone Number (Read-only) */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Phone Number</label>
              <div
                className={`w-full ${theme === 'dark' ? 'bg-gray-800/40' : 'bg-gray-50'} border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-xl px-4 py-3 text-gray-500`}
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : undefined,
                }}
              >
                {phoneNumber}
              </div>
              <p className="text-gray-600 text-xs mt-2">Phone number cannot be changed</p>
            </div>
          </div>

          {/* App Settings */}
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} px-6 pt-6 pb-3`}>App Settings</h2>

            {/* Notifications Toggle */}
            <button
              onClick={handleToggleNotifications}
              className={`w-full px-6 py-4 flex items-center justify-between ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'} active:bg-white/10 transition-colors`}
            >
              <div className="flex items-center gap-3">
                {notificationsEnabled ? (
                  <Bell size={20} className="text-purple-400" />
                ) : (
                  <BellOff size={20} className="text-gray-500" />
                )}
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Notifications</span>
              </div>
              <div
                className={`w-12 h-7 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full mt-1 transition-transform ${
                    notificationsEnabled ? 'ml-6' : 'ml-1'
                  }`}
                ></div>
              </div>
            </button>

          </div>

          {/* Information */}
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} px-6 pt-6 pb-3`}>Information</h2>

            {/* About IntroVerse */}
            <button
              onClick={() => setShowAbout(!showAbout)}
              className={`w-full px-6 py-4 flex items-center justify-between ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'} active:bg-white/10 transition-colors`}
            >
              <div className="flex items-center gap-3">
                <Info size={20} className="text-purple-400" />
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>About IntroVerse</span>
              </div>
              <ChevronRight size={20} className="text-gray-600" />
            </button>

            {/* Legal */}
            <button
              onClick={() => setShowLegal(!showLegal)}
              className={`w-full px-6 py-4 flex items-center justify-between ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'} active:bg-white/10 transition-colors border-t ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-purple-400" />
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Legal</span>
              </div>
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Support */}
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} px-6 pt-6 pb-3`}>Support</h2>
            <button
              onClick={() => setShowRemoveAds(true)}
              className={`w-full px-6 py-4 flex items-center justify-between ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'} active:bg-white/10 transition-colors`}
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-blue-400" />
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Remove ads forever • $1</span>
              </div>
              <ChevronRight size={20} className="text-gray-600" />
            </button>
            <button
              onClick={() => setShowCoupon(true)}
              className={`w-full px-6 py-4 flex items-center justify-between ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'} active:bg-white/10 transition-colors border-t ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-blue-400" />
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Already purchased</span>
              </div>
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full px-6 py-4 flex items-center justify-center gap-3 transition-all ${
              showLogoutConfirm
                ? 'bg-red-600 hover:bg-red-500 rounded-3xl'
                : 'hover:bg-red-600/20'
            }`}
          >
            <LogOut size={20} className={showLogoutConfirm ? 'text-white' : 'text-red-400'} />
            <span className={showLogoutConfirm ? 'text-white font-semibold' : 'text-red-400'}>
              {showLogoutConfirm ? 'Confirm Logout' : 'Logout'}
            </span>
          </button>
          {showLogoutConfirm && (
            <p className="text-center text-gray-500 text-sm mt-2">
              Tap again to confirm. This will clear all data.
            </p>
          )}
        </div>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAbout(false)}
        >
          <div
            className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} rounded-3xl p-6 max-w-md w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>About IntroVerse</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              IntroVerse is a unique communication app designed to help you explore and understand the different
              parts of yourself. Through internal dialogues and reflective calls, you can connect with your
              conscious mind, subconscious, and various internal parts.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Use reminders to stay consistent, save recordings to revisit insights, and keep your self-talk
              organized by context and intention.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Version 1.0.0
            </p>
            <button
              onClick={() => setShowAbout(false)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Legal Modal */}
      {showLegal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowLegal(false)}
        >
          <div
            className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Legal</h3>
            
            <div className="mb-6">
              <h4 className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold mb-2`}>Privacy Policy</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                All your data is stored locally on your device. We do not collect, transmit, or store any personal
                information on external servers.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed mt-2">
                Deleting the app removes your local data. You are responsible for any backups you choose to make.
              </p>
            </div>

            <div className="mb-6">
              <h4 className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold mb-2`}>Terms of Service</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                IntroVerse is provided as-is for personal use. This app is not a substitute for professional mental
                health services. If you need support, please contact a licensed professional.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed mt-2">
                By using this app, you agree to use it responsibly and keep your device secure.
              </p>
            </div>

            <button
              onClick={() => setShowLegal(false)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showRemoveAds && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowRemoveAds(false)}
        >
          <div
            className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} rounded-3xl p-6 max-w-md w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Remove Ads Forever • $1</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Enjoy a cleaner experience with no interruptions. Removing ads keeps your focus on your reflections
              and makes the app feel smoother and more personal.
            </p>
            <button
              onClick={() => setShowRemoveAds(false)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl transition-colors"
            >
              Ok
            </button>
          </div>
        </div>
      )}

      {showCoupon && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCoupon(false)}
        >
          <div
            className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} rounded-3xl p-6 max-w-md w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Already purchased</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Enter the coupon code sent to your email to restore your purchase.
            </p>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon code"
              className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'} rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-3`}
            />
            <textarea
              value={couponDescription}
              onChange={(e) => setCouponDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'} rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-6`}
            />
            <button
              onClick={() => setShowCoupon(false)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div
            className="bg-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm"
            style={{
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#3b82f6',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  avatarButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(147, 51, 234, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 8,
  },
  label: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    marginBottom: 12,
  },
  textarea: {
    minHeight: 80,
  },
  readonly: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: {
    color: '#9ca3af',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowText: {
    color: '#fff',
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#374151',
  },
  toggleOn: {
    backgroundColor: '#2563eb',
  },
  logout: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutText: {
    color: '#f87171',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalText: {
    color: '#cbd5f5',
    fontSize: 13,
    marginBottom: 12,
  },
  modalButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  successCard: {
    width: '86%',
    maxWidth: 320,
    alignSelf: 'center',
    backgroundColor: '#0b0b0b',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#60a5fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  successText: {
    color: '#cbd5f5',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  successButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
