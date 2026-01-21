import { useTheme } from '@/contexts/ThemeContext';
import { getUserProfile } from '@/utils/storage';
import { ChevronLeft, Phone, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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

  const handleCall = () => {
    if (number.length > 0) {
      onCall(number);
      setNumber('');
    }
  };

  const keypadLayout = [
    [{ digit: '1', letters: '' }, { digit: '2', letters: 'ABC' }, { digit: '3', letters: 'DEF' }],
    [{ digit: '4', letters: 'GHI' }, { digit: '5', letters: 'JKL' }, { digit: '6', letters: 'MNO' }],
    [{ digit: '7', letters: 'PQRS' }, { digit: '8', letters: 'TUV' }, { digit: '9', letters: 'WXYZ' }],
    [{ digit: '*', letters: '' }, { digit: '0', letters: '+' }, { digit: '#', letters: '' }],
  ];

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
              disabled={number.length === 0}
              className="w-[88px] h-[88px] rounded-full hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center relative overflow-hidden group"
              style={{
                background: number.length > 0 
                  ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' 
                  : (theme === 'dark' ? 'rgba(75, 85, 99, 0.4)' : 'rgba(156, 163, 175, 0.3)'),
                boxShadow: number.length > 0 
                  ? '0 8px 32px rgba(34, 197, 94, 0.5), 0 0 0 0 rgba(34, 197, 94, 0.3)' 
                  : 'none',
                border: number.length > 0 
                  ? '1px solid rgba(255, 255, 255, 0.2)' 
                  : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'),
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
