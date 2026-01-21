import { useTheme } from '@/contexts/ThemeContext';
import { getUserProfile, saveUserProfile } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { Bell, BellOff, Camera, ChevronRight, Info, LogOut, Moon, Shield, Sun, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
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
    if (typeof window !== 'undefined') {
      const notifications = localStorage.getItem('notificationsEnabled');
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('notificationsEnabled', String(newValue));
    }
  };

  const handleLogout = () => {
    if (showLogoutConfirm) {
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      // Clear IndexedDB
      if (typeof window !== 'undefined' && window.indexedDB) {
        indexedDB.deleteDatabase('InroCallDB');
      }
      // Redirect to profile setup (it will show since localStorage is cleared)
      window.location.href = '/';
    } else {
      setShowLogoutConfirm(true);
    }
  };

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

            {/* Dark/Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`w-full px-6 py-4 flex items-center justify-between ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'} active:bg-white/10 transition-colors border-t ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon size={20} className="text-purple-400" />
                ) : (
                  <Sun size={20} className="text-yellow-400" />
                )}
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Dark Mode</span>
              </div>
              <div
                className={`w-12 h-7 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full mt-1 transition-transform ${
                    theme === 'dark' ? 'ml-6' : 'ml-1'
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
            </div>

            <div className="mb-6">
              <h4 className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold mb-2`}>Terms of Service</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                IntroVerse is provided as-is for personal use. This app is not a substitute for professional mental
                health services. If you need support, please contact a licensed professional.
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
