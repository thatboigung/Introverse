import { useTheme } from '@/contexts/ThemeContext';
import { getUserProfile, UserProfile } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { MessageSquare, Mic, Phone, Plus, Search, Settings, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface Contact {
  id: string;
  name: string;
  phoneNumber?: string;
  profilePicture?: string;
  isLabel?: boolean;
}

export default function Contacts() {
  const { theme } = useTheme();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(() => {
    // Initialize with data from localStorage immediately (fast, synchronous)
    const initialContacts: Contact[] = [];
    
    if (typeof window !== 'undefined' && window.localStorage) {
      // Add user profile
      const data = localStorage.getItem('userProfile');
      if (data) {
        const profile = JSON.parse(data);
        initialContacts.push({
          id: '1',
          name: profile.name,
          phoneNumber: profile.phoneNumber,
          profilePicture: undefined, // Will be loaded from IndexedDB
          isLabel: false,
        });
      }
    }
    
    return initialContacts;
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load profile picture from IndexedDB (slower, but not blocking)
  useEffect(() => {
    const loadProfilePicture = async () => {
      const updatedContacts: Contact[] = [];
      
      // Load user profile with picture
      const profile = await getUserProfile();
      if (profile) {
        updatedContacts.push({
          id: '1',
          name: profile.name,
          phoneNumber: profile.phoneNumber,
          profilePicture: profile.profilePicture,
          isLabel: false,
        });
      }
      
      if (profile) {
        setUserProfile(profile);
        setContacts(updatedContacts);
      }
    };
    loadProfilePicture();
  }, []);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const handleContactPress = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleClose = () => {
    setSelectedContact(null);
  };

  const handleCall = () => {
    if (selectedContact?.phoneNumber) {
      // Store the call info including contact name for direct call initiation
      if (typeof window !== 'undefined') {
        localStorage.setItem('callContactName', selectedContact.name);
        localStorage.setItem('callContactNumber', selectedContact.phoneNumber);
        localStorage.setItem('initiateCall', 'true');
      }
      // Navigate to Call tab (index)
      router.push('/');
    }
    handleClose();
  };

  const handleMessage = () => {
    console.log('Message', selectedContact?.name);
    // Implement message functionality
    handleClose();
  };

  const handleRecord = () => {
    console.log('Record', selectedContact?.name);
    // Implement record functionality
    handleClose();
  };

  const handleAddContact = () => {
    setShowAddModal(true);
  };

  const handleSaveContact = () => {
    // Show the styled popup instead of browser alert
    setShowAddModal(false);
    setShowAlertPopup(true);
    
    // Reset form
    setNewContactName('');
    setNewContactPhone('');
  };

  const handleCancelAdd = () => {
    setNewContactName('');
    setNewContactPhone('');
    setShowAddModal(false);
  };

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Status Bar Area */}
      <div className="h-12"></div>

      {/* Top Bar */}
      <div className={`px-4 py-2 h-14 flex items-center justify-between fixed top-12 left-0 right-0 ${theme === 'dark' ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl z-50`}>
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Contacts</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddContact}
              className={`p-2 ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'} rounded-full transition-colors active:scale-95`}
            >
              <Plus size={22} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
            </button>
            <button
              onClick={() => router.push('/settings')}
              className={`p-2 ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'} rounded-full transition-colors active:scale-95`}
            >
              <Settings size={22} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed top bar */}
      <div className="h-14"></div>

      {/* Search Box */}
      <div className={`sticky top-26 px-4 pt-4 pb-2 ${theme === 'dark' ? 'bg-black' : 'bg-white'} z-40`}>
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search"
              className={`w-full pl-10 pr-4 py-2.5 ${theme === 'dark' ? 'bg-gray-900/20' : 'bg-gray-100'} backdrop-blur-md rounded-3xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-32 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-2xl mx-auto">
          {contacts.length === 0 ? (
            <div className="text-center py-20">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'} flex items-center justify-center`}>
                <User size={32} className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} />
              </div>
              <p className={`text-base ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>No contacts</p>
            </div>
          ) : (
            <div className="space-y-1">
              {contacts.map((contact) => (
                <div key={contact.id}>
                  <button
                    onClick={() => handleContactPress(contact)}
                    className="w-full p-4 hover:bg-gray-900/20 active:bg-gray-900/30 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div
                        className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-light text-white overflow-hidden"
                        style={{
                          background: contact.profilePicture ? 'transparent' : 'linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(99, 102, 241, 0.6))',
                        }}
                      >
                        {contact.profilePicture ? (
                          <img
                            src={contact.profilePicture}
                            alt={contact.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(contact.name)
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-base mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {contact.name}
                        </div>
                        {contact.phoneNumber && (
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {contact.phoneNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Actions Panel - shows below contact when selected */}
                  {selectedContact?.id === contact.id && (
                    <div className="px-4 pb-4 animate-slide-down">
                      <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800/50' : 'bg-gray-50 border-gray-200'} backdrop-blur-xl rounded-2xl p-4 border`}>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={handleCall}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-800/50 active:bg-gray-700/50 transition-all group"
                          >
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                              <Phone size={22} className="text-green-400" />
                            </div>
                            <span className="text-xs font-medium text-white">Call</span>
                          </button>

                          <button
                            onClick={handleMessage}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-800/50 active:bg-gray-700/50 transition-all group"
                          >
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                              <MessageSquare size={22} className="text-blue-400" />
                            </div>
                            <span className="text-xs font-medium text-white">Message</span>
                          </button>

                          <button
                            onClick={handleRecord}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-800/50 active:bg-gray-700/50 transition-all group"
                          >
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
                              <Mic size={22} className="text-purple-400" />
                            </div>
                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Record</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-3xl max-w-md w-full p-6 border`}>
            <h2 className={`text-xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Add New Contact</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Enter name"
                  className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'} rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Phone Number</label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'} rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelAdd}
                className="flex-1 py-3 rounded-xl bg-gray-800/50 text-white font-medium hover:bg-gray-800/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Alert Popup */}
      {showAlertPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-xl rounded-3xl max-w-sm w-full p-8 border border-purple-500/30 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <User size={32} className="text-purple-400" />
              </div>
              
              <h3 className={`text-2xl font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-white'}`}>Trust Yourself, You are the only one You need</h3>
              
              <p className={`text-base leading-relaxed mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-300'}`}>
                This space is designed for dialogue with yourself. You are the only contact you need.
              </p>
              
              <button
                onClick={() => setShowAlertPopup(false)}
                className="w-full py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors active:scale-95"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
