import { useTheme } from '@/contexts/ThemeContext';
import { getAllCalls, getUserProfile } from '@/utils/storage';
import { Feather } from '@expo/vector-icons';
import { ChevronLeft, Phone, User } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface KeypadProps {
  onCall: (number: string) => void;
  prefilledNumber?: string;
}

export default function Keypad({ onCall, prefilledNumber }: KeypadProps) {
  const { theme } = useTheme();
  const [number, setNumber] = useState('');
  const [matchedContactName, setMatchedContactName] = useState<string | null>(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getUserProfile();
      if (profile) {
        setUserPhoneNumber(profile.phoneNumber);
        setUserProfile(profile);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (prefilledNumber) {
      setNumber(prefilledNumber);
    }
  }, [prefilledNumber]);

  // Check if entered number matches user's contact
  useEffect(() => {
    const checkMatch = async () => {
      if (number && userPhoneNumber) {
        // Normalize numbers for comparison (remove spaces, dashes, parentheses)
        const normalizePhone = (phone: string) => phone.replace(/[\s\-()]/g, '');
        const normalizedInput = normalizePhone(number);
        const normalizedUser = normalizePhone(userPhoneNumber);
        
        if (normalizedInput === normalizedUser) {
          const profile = await getUserProfile();
          if (profile) {
            setMatchedContactName(profile.name);
            return;
          }
        }
      }
      setMatchedContactName(null);
    };
    checkMatch();
  }, [number, userPhoneNumber]);

  const handleNumberPress = (digit: string) => {
    setNumber((prev) => prev + digit);
  };

  const handleDelete = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  const handleLongDelete = () => {
    setNumber('');
  };

  const loadRecentCallNumber = async () => {
    const calls = await getAllCalls();
    if (calls.length === 0) return;
    const sorted = calls.sort((a, b) => b.timestamp - a.timestamp);
    const lastCall = sorted[0];
    if (lastCall?.number) {
      setNumber(lastCall.number);
    }
  };

  const handleCall = async () => {
    if (number.length > 0) {
      onCall(number);
      setNumber('');
      return;
    }
    await loadRecentCallNumber();
  };

  const keypadLayout = [
    [{ digit: '1', letters: '' }, { digit: '2', letters: 'ABC' }, { digit: '3', letters: 'DEF' }],
    [{ digit: '4', letters: 'GHI' }, { digit: '5', letters: 'JKL' }, { digit: '6', letters: 'MNO' }],
    [{ digit: '7', letters: 'PQRS' }, { digit: '8', letters: 'TUV' }, { digit: '9', letters: 'WXYZ' }],
    [{ digit: '*', letters: '' }, { digit: '0', letters: '+' }, { digit: '#', letters: '' }],
  ];

  const formattedNumber = useMemo(() => number, [number]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Call</Text>
          <Pressable style={styles.profileButton} onPress={() => setShowProfileModal(true)}>
            <Feather name="user" size={18} color="#9ca3af" />
          </Pressable>
        </View>

        <View style={styles.display}>
          <Text style={[styles.matchText, !matchedContactName ? styles.hiddenText : null]}>
            {matchedContactName || ' '}
          </Text>
          <Text style={styles.numberText}>{formattedNumber || ' '}</Text>
          <Text style={[styles.helperText, formattedNumber ? styles.hiddenText : null]}>
            {formattedNumber ? ' ' : 'Enter phone number'}
          </Text>
        </View>

        <View style={styles.keypad}>
          {keypadLayout.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((item) => (
                <Pressable
                  key={item.digit}
                  onPress={() => handleNumberPress(item.digit)}
                  style={styles.keyButton}
                >
                  <Text style={styles.keyDigit}>{item.digit}</Text>
                  {item.letters ? <Text style={styles.keyLetters}>{item.letters}</Text> : null}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleDelete}
            onLongPress={handleLongDelete}
            disabled={number.length === 0}
            style={[styles.actionButton, number.length === 0 ? styles.actionDisabled : null]}
          >
            <Feather name="delete" size={22} color="#fff" />
          </Pressable>

          <Pressable
            onPress={handleCall}
            style={styles.callButton}
          >
            <Feather name="phone-call" size={26} color="#fff" />
          </Pressable>

          <View style={styles.actionSpacer} />
        </View>

        <Modal visible={showProfileModal} transparent animationType="fade" onRequestClose={() => setShowProfileModal(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowProfileModal(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Profile</Text>
              {userProfile ? (
                <>
                  {userProfile.profilePicture ? (
                    <Image source={{ uri: userProfile.profilePicture }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      <Feather name="user" size={36} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.profileName}>{userProfile.name}</Text>
                  <Text style={styles.profilePhone}>{userProfile.phoneNumber}</Text>
                  {userProfile.bio ? <Text style={styles.profileBio}>{userProfile.bio}</Text> : null}
                </>
              ) : (
                <Text style={styles.profileBio}>No profile loaded.</Text>
              )}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Status Bar Area */}
      <div className="h-12"></div>

      {/* User Profile Icon - Top Right */}
      <div className="fixed top-14 right-4 z-40">
        <button
          onClick={() => setShowProfileModal(true)}
          className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50' : 'bg-gray-100/50 hover:bg-gray-200/50 border-gray-300/50'} flex items-center justify-center transition-all backdrop-blur-xl border`}
        >
          <User size={20} className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
        </button>
      </div>
     
      {/* Spacer for fixed top bar */}
      <div className="h-14"></div>
      
      {/* Number Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-4 pb-2">
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            {matchedContactName && (
              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                {matchedContactName}
              </div>
            )}
            <div className={`text-6xl font-extralight tracking-wide ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2 min-h-[5rem] flex items-center justify-center`}>
              {number || ''}
            </div>
            {!number && (
              <div className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-sm font-light`}>Enter phone number</div>
            )}
          </div>

          {/* Keypad */}
          <div className="space-y-3">
            {keypadLayout.map((row, rowIdx) => (
              <div key={rowIdx} className="flex justify-center gap-3">
                {row.map((item) => (
                  <button
                    key={item.digit}
                    onClick={() => handleNumberPress(item.digit)}
                    className="w-[76px] h-[76px] rounded-full hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center relative overflow-hidden group"
                    style={{
                      background: theme === 'dark' 
                        ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))'
                        : 'linear-gradient(145deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.02))',
                      backdropFilter: 'blur(20px)',
                      border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: theme === 'dark' 
                        ? '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                        : '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme === 'dark' ? 'from-white/10' : 'from-gray-900/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full`}></div>
                    <span className={`text-4xl font-light ${theme === 'dark' ? 'text-white' : 'text-gray-900'} relative z-10`}>{item.digit}</span>
                    {item.letters && (
                      <span className={`text-[9px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1 tracking-[0.15em] relative z-10`}>
                        {item.letters}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="pb-32 pt-2">
        <div className="max-w-sm mx-auto">
          <div className="flex justify-center gap-8 items-center">
            {/* Delete Button */}
            <button
              onClick={handleDelete}
              onDoubleClick={handleLongDelete}
              disabled={number.length === 0}
              className="w-16 h-16 rounded-full hover:scale-105 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center relative overflow-hidden group"
              style={{
                background: number.length > 0 
                  ? (theme === 'dark' 
                    ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))' 
                    : 'linear-gradient(145deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.04))')
                  : (theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
                backdropFilter: 'blur(20px)',
                border: theme === 'dark'
                  ? `1px solid ${number.length > 0 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`
                  : `1px solid ${number.length > 0 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)'}`,
                boxShadow: number.length > 0 ? (theme === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.08)') : 'none',
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${theme === 'dark' ? 'from-white/10' : 'from-gray-900/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full`}></div>
              <ChevronLeft size={26} className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} relative z-10`} strokeWidth={2} />
            </button>

            {/* Call Button */}
            <button
              onClick={handleCall}
              className="w-[88px] h-[88px] rounded-full hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                boxShadow: '0 8px 32px rgba(34, 197, 94, 0.5), 0 0 0 0 rgba(34, 197, 94, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full"></div>
              <Phone size={36} className="text-white relative z-10" strokeWidth={2.5} />
            </button>

            {/* Spacer for symmetry */}
            <div className="w-16 h-16"></div>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      {showProfileModal && userProfile && (
        <div
          className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-black/60'} backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in`}
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className={`${theme === 'dark' ? 'bg-gray-900/95 border-gray-800/50' : 'bg-white/95 border-gray-200/50'} backdrop-blur-xl rounded-3xl border max-w-md w-full shadow-2xl animate-slide-up`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Close Button */}
            <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-200/50'}`}>
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className={`w-8 h-8 rounded-full ${theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-100/50 hover:bg-gray-200/50'} flex items-center justify-center transition-all`}
              >
                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center mb-6">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden mb-4"
                  style={{
                    background: userProfile.profilePicture
                      ? 'transparent'
                      : 'linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(99, 102, 241, 0.6))',
                  }}
                >
                  {userProfile.profilePicture ? (
                    <img
                      src={userProfile.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={48} className="text-white/70" />
                    </div>
                  )}
                </div>
                <h3 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>{userProfile.name}</h3>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{userProfile.phoneNumber}</p>
              </div>

              {/* Bio */}
              {userProfile.bio && (
                <div className="mb-4">
                  <label className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-xs uppercase tracking-wider mb-2 block`}>Bio</label>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed`}>{userProfile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  display: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 140,
    justifyContent: 'center',
  },
  matchText: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 6,
    minHeight: 16,
  },
  numberText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '300',
    paddingTop: 20,
    paddingBottom: 20,
    minHeight: 52,
  },
  helperText: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 6,
    minHeight: 16,
  },
  hiddenText: {
    opacity: 0,
  },
  keypad: {
    paddingHorizontal: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDigit: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '300',
  },
  keyLetters: {
    color: '#9ca3af',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionSpacer: {
    width: 56,
    height: 56,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  profileImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 12,
  },
  profilePlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.4)',
    marginBottom: 12,
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  profilePhone: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 4,
  },
  profileBio: {
    color: '#cbd5f5',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
});
