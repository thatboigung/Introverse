import { useTheme } from '@/contexts/ThemeContext';
import { getContacts, getUserProfile, saveContact, UserProfile } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { Camera, MessageSquare, Phone, Plus, Search, Settings, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface Contact {
  id: string;
  name: string;
  phoneNumber?: string;
  description?: string;
  profilePicture?: string;
  isLabel?: boolean;
  isUserProfile?: boolean;
}

export default function Contacts() {
  const { theme } = useTheme();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactDescription, setNewContactDescription] = useState('');
  const [newContactPicture, setNewContactPicture] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contactImageInputRef = useRef<HTMLInputElement>(null);

  // Load profile picture from IndexedDB (slower, but not blocking)
  useEffect(() => {
    const loadProfilePicture = async () => {
      const updatedContacts: Contact[] = [];
      const profile = await getUserProfile();
      const storedContacts = await getContacts();
      if (profile) {
        updatedContacts.push({
          id: 'profile',
          name: profile.name,
          phoneNumber: profile.phoneNumber,
          description: profile.bio || 'Your profile',
          profilePicture: profile.profilePicture,
          isLabel: false,
          isUserProfile: true,
        });
        setUserProfile(profile);
      }
      updatedContacts.push(...storedContacts.map((contact) => ({ ...contact, isUserProfile: false })));
      setContacts(updatedContacts);
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
      if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        const storage = globalThis.localStorage;
        storage.setItem('callContactName', selectedContact.name);
        storage.setItem('callContactNumber', selectedContact.phoneNumber);
        storage.setItem('initiateCall', 'true');
        router.push('/');
      } else {
        router.push({
          pathname: '/',
          params: {
            callNumber: selectedContact.phoneNumber,
            contactName: selectedContact.name,
            autoCall: 'true',
          },
        });
      }
    }
    handleClose();
  };

  const handleMessage = () => {
    if (selectedContact) {
      router.push({ pathname: '/chat/[id]', params: { id: 'you' } });
    }
    handleClose();
  };

  const handleDeleteContact = () => {
    if (!selectedContact || selectedContact.isUserProfile) {
      handleClose();
      return;
    }
    setContacts((prev) => prev.filter((contact) => contact.id !== selectedContact.id));
    handleClose();
  };

  const handleAddContact = () => {
    setShowAddModal(true);
  };

  const normalizePhone = (value: string) => value.replace(/[^\d]/g, '');

  const handlePickContactImage = async () => {
    if (Platform.OS === 'web') {
      contactImageInputRef.current?.click();
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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
      setNewContactPicture(`data:image/jpeg;base64,${asset.base64}`);
    } else if (asset.uri) {
      setNewContactPicture(asset.uri);
    }
  };

  const handleContactImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setNewContactPicture(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveContact = async () => {
    const trimmedName = newContactName.trim();
    const trimmedPhone = newContactPhone.trim();
    const trimmedDescription = newContactDescription.trim();
    const digits = normalizePhone(trimmedPhone);

    setNameError(trimmedName ? '' : 'Name is required.');
    setPhoneError('');
    setDescriptionError(trimmedDescription ? '' : 'Description is required.');

    if (!trimmedName || !trimmedDescription) {
      return;
    }

    if (!digits || digits.length < 7) {
      setPhoneError('Enter a valid phone number.');
      return;
    }

    const duplicate = contacts.find(
      (contact) =>
        !contact.isUserProfile &&
        contact.phoneNumber &&
        normalizePhone(contact.phoneNumber) === digits
    );
    if (duplicate) {
      setPhoneError('This number already exists.');
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name: trimmedName,
      phoneNumber: trimmedPhone,
      description: trimmedDescription,
      profilePicture: newContactPicture || undefined,
    };

    await saveContact({
      id: newContact.id,
      name: newContact.name,
      phoneNumber: newContact.phoneNumber || '',
      description: newContact.description || '',
      profilePicture: newContact.profilePicture,
    });

    setContacts((prev) => {
      const profile = prev.find((contact) => contact.isUserProfile);
      const others = prev.filter((contact) => !contact.isUserProfile);
      return profile ? [profile, ...others, newContact] : [...others, newContact];
    });

    setShowAddModal(false);
    setShowAlertPopup(true);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactDescription('');
    setNewContactPicture(null);
  };

  const handleCancelAdd = () => {
    setNewContactName('');
    setNewContactPhone('');
    setNewContactDescription('');
    setNewContactPicture(null);
    setNameError('');
    setPhoneError('');
    setDescriptionError('');
    setShowAddModal(false);
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contacts</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={handleAddContact}>
              <Feather name="plus" size={18} color="#9ca3af" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/settings')}>
              <Feather name="settings" size={18} color="#9ca3af" />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={16} color="#6b7280" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
          />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {contacts.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="user" size={28} color="#6b7280" />
              <Text style={styles.emptyText}>No contacts</Text>
            </View>
          ) : (
            contacts.map((contact) => (
              <View key={contact.id}>
                <Pressable style={styles.item} onPress={() => handleContactPress(contact)}>
                  {contact.profilePicture ? (
                    <Image source={{ uri: contact.profilePicture }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
                    </View>
                  )}
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{contact.name}</Text>
                    {contact.phoneNumber ? <Text style={styles.itemSub}>{contact.phoneNumber}</Text> : null}
                    {contact.description ? <Text style={styles.itemDesc}>{contact.description}</Text> : null}
                  </View>
                </Pressable>
                {selectedContact?.id === contact.id ? (
                  <View style={styles.actionPanel}>
                    <Pressable style={styles.actionButton} onPress={handleCall}>
                      <Feather name="phone-call" size={14} color="#fff" />
                      <Text style={styles.actionText}>Call</Text>
                    </Pressable>
                    <Pressable style={styles.actionButton} onPress={handleMessage}>
                      <Feather name="message-square" size={14} color="#fff" />
                      <Text style={styles.actionText}>Message</Text>
                    </Pressable>
                    {!contact.isUserProfile ? (
                      <Pressable style={styles.actionButton} onPress={handleDeleteContact}>
                        <Feather name="trash-2" size={14} color="#fff" />
                        <Text style={styles.actionText}>Delete</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

        <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={handleCancelAdd}>
          <Pressable style={styles.modalBackdrop} onPress={handleCancelAdd}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add New Contact</Text>
              <Text style={styles.modalHint}>
                You are adding alternate versions of yourself to talk to.
              </Text>
              <Pressable style={styles.modalAvatarButton} onPress={handlePickContactImage}>
                {newContactPicture ? (
                  <Image source={{ uri: newContactPicture }} style={styles.modalAvatarImage} />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Feather name="camera" size={20} color="#fff" />
                  </View>
                )}
                <Text style={styles.modalAvatarText}>Add photo (optional)</Text>
              </Pressable>
              <TextInput
                placeholder="Name"
                placeholderTextColor="#6b7280"
                value={newContactName}
                onChangeText={setNewContactName}
                style={styles.modalInput}
              />
              {nameError ? <Text style={styles.modalErrorText}>{nameError}</Text> : null}
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor="#6b7280"
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                style={styles.modalInput}
                keyboardType="phone-pad"
              />
              {phoneError ? <Text style={styles.modalErrorText}>{phoneError}</Text> : null}
              <TextInput
                placeholder="Description"
                placeholderTextColor="#6b7280"
                value={newContactDescription}
                onChangeText={setNewContactDescription}
                style={[styles.modalInput, styles.modalTextarea]}
                multiline
              />
              {descriptionError ? <Text style={styles.modalErrorText}>{descriptionError}</Text> : null}
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalButton, styles.modalButtonSecondary]} onPress={handleCancelAdd}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSaveContact}>
                  <Text style={styles.modalButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showAlertPopup} transparent animationType="fade" onRequestClose={() => setShowAlertPopup(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAlertPopup(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Contact Added</Text>
              <Text style={styles.modalText}>Your contact was saved successfully.</Text>
              <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={() => setShowAlertPopup(false)}>
                <Text style={styles.modalButtonText}>Ok</Text>
              </Pressable>
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
                        {contact.description && (
                          <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            {contact.description}
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

                          {!contact.isUserProfile ? (
                            <button
                              onClick={handleDeleteContact}
                              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-800/50 active:bg-gray-700/50 transition-all group"
                            >
                              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-all">
                                <Feather name="trash-2" size={22} color="#f87171" />
                              </div>
                              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Delete</span>
                            </button>
                          ) : (
                            <div />
                          )}
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
            <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              You are adding alternate versions of yourself to talk to.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handlePickContactImage}
                  className="w-24 h-24 rounded-full overflow-hidden bg-gray-800/50 flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  {newContactPicture ? (
                    <img src={newContactPicture} alt="Contact" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={24} className="text-gray-300" />
                    </div>
                  )}
                </button>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Add photo (optional)</span>
                <input
                  ref={contactImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleContactImageChange}
                  className="hidden"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Enter name"
                  className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'} rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                />
                {nameError ? <p className="text-red-400 text-xs mt-2">{nameError}</p> : null}
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
                {phoneError ? <p className="text-red-400 text-xs mt-2">{phoneError}</p> : null}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
                <textarea
                  value={newContactDescription}
                  onChange={(e) => setNewContactDescription(e.target.value)}
                  placeholder="Add a short description"
                  rows={3}
                  className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'} rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                />
                {descriptionError ? <p className="text-red-400 text-xs mt-2">{descriptionError}</p> : null}
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
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAlertPopup(false)}
        >
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-xl rounded-3xl max-w-sm w-full p-8 border border-purple-500/30 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <User size={32} className="text-purple-400" />
              </div>
              
              <h3 className={`text-2xl font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-white'}`}>Contact Added</h3>
              
              <p className={`text-base leading-relaxed mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-300'}`}>
                Your contact was saved successfully.
              </p>
              
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setShowAlertPopup(false);
                }}
                className="w-full py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors active:scale-95"
              >
                Ok
              </button>
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
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  actionPanel: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 64,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(147, 51, 234, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  itemSub: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  itemDesc: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9ca3af',
    marginTop: 8,
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
    marginBottom: 12,
  },
  modalText: {
    color: '#cbd5f5',
    fontSize: 13,
    marginBottom: 12,
  },
  modalHint: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    marginBottom: 10,
  },
  modalAvatarButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  modalAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 8,
  },
  modalTextarea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalErrorText: {
    color: '#f87171',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#2563eb',
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
