// Utility functions for IndexedDB and LocalStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const USER_PROFILE_KEY = 'userProfile';
const USER_PROFILE_PICTURE_KEY = 'userProfilePicture';
const RECORDINGS_KEY = 'recordings';
const CHAT_MESSAGES_KEY = 'chatMessages';
const CALLS_KEY = 'calls';
const CONTACTS_KEY = 'contacts';

export interface Recording {
  id: string;
  timestamp: number;
  audioData: string; // Base64 encoded
  duration: number;
  internalPart?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  text: string;
  timestamp: number;
  isSelf?: boolean;
  audioData?: string; // Base64 encoded audio
  isAudio?: boolean;
  replyTo?: string; // ID of message being replied to
  isRead?: boolean; // Whether message has been read
  reminderAt?: number; // Scheduled reminder time (ms)
}

export interface Call {
  id: string;
  number: string;
  timestamp: number;
  duration: number;
  type: 'outgoing' | 'incoming';
  internalPart?: string;
  hasRecording: boolean;
  recordingId?: string;
}

export interface StoredContact {
  id: string;
  name: string;
  phoneNumber: string;
  description: string;
  profilePicture?: string;
}

// Initialize IndexedDB
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open('InroCallDB', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('recordings')) {
        db.createObjectStore('recordings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chatMessages')) {
        db.createObjectStore('chatMessages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('calls')) {
        db.createObjectStore('calls', { keyPath: 'id' });
      }
    };
  });
}

async function readAsyncList<T>(key: string): Promise<T[]> {
  const data = await AsyncStorage.getItem(key);
  return data ? (JSON.parse(data) as T[]) : [];
}

async function writeAsyncList<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

// Save recording to IndexedDB
export async function saveRecording(recording: Recording): Promise<void> {
  if (Platform.OS !== 'web') {
    const recordings = await readAsyncList<Recording>(RECORDINGS_KEY);
    recordings.push(recording);
    await writeAsyncList(RECORDINGS_KEY, recordings);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recordings'], 'readwrite');
    const store = transaction.objectStore('recordings');
    const request = store.add(recording);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all recordings from IndexedDB
export async function getAllRecordings(): Promise<Recording[]> {
  try {
    if (Platform.OS !== 'web') {
      return await readAsyncList<Recording>(RECORDINGS_KEY);
    }
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['recordings'], 'readonly');
      const store = transaction.objectStore('recordings');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting recordings:', error);
    return [];
  }
}

// Get a specific recording by ID
export async function getRecordingById(id: string): Promise<Recording | null> {
  try {
    if (Platform.OS !== 'web') {
      const recordings = await readAsyncList<Recording>(RECORDINGS_KEY);
      return recordings.find((rec) => rec.id === id) || null;
    }
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['recordings'], 'readonly');
      const store = transaction.objectStore('recordings');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting recording:', error);
    return null;
  }
}

// Delete a recording
export async function deleteRecording(id: string): Promise<void> {
  if (Platform.OS !== 'web') {
    const recordings = await readAsyncList<Recording>(RECORDINGS_KEY);
    const toDelete = recordings.find((rec) => rec.id === id);
    if (toDelete?.audioData && toDelete.audioData.startsWith('file://')) {
      try {
        await FileSystem.deleteAsync(toDelete.audioData, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete recording file', error);
      }
    }
    const filtered = recordings.filter((rec) => rec.id !== id);
    await writeAsyncList(RECORDINGS_KEY, filtered);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recordings'], 'readwrite');
    const store = transaction.objectStore('recordings');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Save chat message
export async function saveChatMessage(message: ChatMessage): Promise<void> {
  if (Platform.OS !== 'web') {
    const messages = await readAsyncList<ChatMessage>(CHAT_MESSAGES_KEY);
    messages.push(message);
    await writeAsyncList(CHAT_MESSAGES_KEY, messages);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chatMessages'], 'readwrite');
    const store = transaction.objectStore('chatMessages');
    const request = store.add(message);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all chat messages
export async function getAllChatMessages(): Promise<ChatMessage[]> {
  try {
    if (Platform.OS !== 'web') {
      const messages = await readAsyncList<ChatMessage>(CHAT_MESSAGES_KEY);
      return messages.sort((a, b) => a.timestamp - b.timestamp);
    }
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['chatMessages'], 'readonly');
      const store = transaction.objectStore('chatMessages');
      const request = store.getAll();

      request.onsuccess = () => {
        const messages = request.result || [];
        resolve(messages.sort((a, b) => a.timestamp - b.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return [];
  }
}

// Get messages for a specific conversation
export async function getChatMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
  try {
    if (Platform.OS !== 'web') {
      const messages = await readAsyncList<ChatMessage>(CHAT_MESSAGES_KEY);
      return messages
        .filter((msg) => msg.conversationId === conversationId)
        .sort((a, b) => a.timestamp - b.timestamp);
    }
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['chatMessages'], 'readonly');
      const store = transaction.objectStore('chatMessages');
      const request = store.getAll();

      request.onsuccess = () => {
        const messages = (request.result || []).filter(
          (msg: ChatMessage) => msg.conversationId === conversationId
        );
        resolve(messages.sort((a, b) => a.timestamp - b.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    return [];
  }
}

// Get conversation preview (last message and timestamp)
export async function getConversationPreview(conversationId: string): Promise<{ lastMessage?: ChatMessage; unreadCount: number }> {
  try {
    const messages = await getChatMessagesByConversation(conversationId);
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
    
    // Count unread messages (messages where isSelf is false/undefined and isRead is false/undefined)
    const unreadCount = messages.filter(msg => !msg.isSelf && !msg.isRead).length;
    
    return {
      lastMessage,
      unreadCount,
    };
  } catch (error) {
    console.error('Error getting conversation preview:', error);
    return { unreadCount: 0 };
  }
}

// Mark all messages in a conversation as read
export async function markConversationAsRead(conversationId: string): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      const messages = await readAsyncList<ChatMessage>(CHAT_MESSAGES_KEY);
      const updated = messages.map((message) =>
        message.conversationId === conversationId && !message.isSelf
          ? { ...message, isRead: true }
          : message
      );
      await writeAsyncList(CHAT_MESSAGES_KEY, updated);
      return;
    }
    const db = await initDB();
    const messages = await getChatMessagesByConversation(conversationId);
    
    const transaction = db.transaction(['chatMessages'], 'readwrite');
    const store = transaction.objectStore('chatMessages');
    
    // Mark all received messages (not sent by self) as read
    for (const message of messages) {
      if (!message.isSelf) {
        const updatedMessage = { ...message, isRead: true };
        store.put(updatedMessage);
      }
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
  }
}

// Save call to IndexedDB
export async function saveCall(call: Call): Promise<void> {
  if (Platform.OS !== 'web') {
    const calls = await readAsyncList<Call>(CALLS_KEY);
    calls.push(call);
    await writeAsyncList(CALLS_KEY, calls);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['calls'], 'readwrite');
    const store = transaction.objectStore('calls');
    const request = store.add(call);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all calls from IndexedDB
export async function getAllCalls(): Promise<Call[]> {
  try {
    if (Platform.OS !== 'web') {
      return await readAsyncList<Call>(CALLS_KEY);
    }
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['calls'], 'readonly');
      const store = transaction.objectStore('calls');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting calls:', error);
    return [];
  }
}

// Delete a call
export async function deleteCall(id: string): Promise<void> {
  if (Platform.OS !== 'web') {
    const calls = await readAsyncList<Call>(CALLS_KEY);
    const filtered = calls.filter((call) => call.id !== id);
    await writeAsyncList(CALLS_KEY, filtered);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['calls'], 'readwrite');
    const store = transaction.objectStore('calls');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Update call with internal part
export async function updateCallInternalPart(id: string, internalPart: string): Promise<void> {
  if (Platform.OS !== 'web') {
    const calls = await readAsyncList<Call>(CALLS_KEY);
    const updated = calls.map((call) => (call.id === id ? { ...call, internalPart } : call));
    await writeAsyncList(CALLS_KEY, updated);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['calls'], 'readwrite');
    const store = transaction.objectStore('calls');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const call = getRequest.result;
      if (call) {
        call.internalPart = internalPart;
        const putRequest = store.put(call);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Clear all data
export async function clearAllData(): Promise<void> {
  if (Platform.OS !== 'web') {
    const recordings = await readAsyncList<Recording>(RECORDINGS_KEY);
    await Promise.all(
      recordings
        .filter((rec) => rec.audioData?.startsWith('file://'))
        .map((rec) => FileSystem.deleteAsync(rec.audioData, { idempotent: true }))
    );
    await AsyncStorage.multiRemove([RECORDINGS_KEY, CHAT_MESSAGES_KEY, CALLS_KEY]);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recordings', 'chatMessages', 'calls'], 'readwrite');
    const recordingsStore = transaction.objectStore('recordings');
    const chatStore = transaction.objectStore('chatMessages');
    const callsStore = transaction.objectStore('calls');
    
    const recordingsRequest = recordingsStore.clear();
    const chatRequest = chatStore.clear();
    const callsRequest = callsStore.clear();

    let completed = 0;
    const checkComplete = () => {
      completed++;
      if (completed === 3) resolve();
    };

    recordingsRequest.onsuccess = checkComplete;
    chatRequest.onsuccess = checkComplete;
    callsRequest.onsuccess = checkComplete;
    recordingsRequest.onerror = () => reject(recordingsRequest.error);
    chatRequest.onerror = () => reject(chatRequest.error);
    callsRequest.onerror = () => reject(callsRequest.error);
  });
}

// Clear all user data including profile/session
export async function clearAllUserData(): Promise<void> {
  if (Platform.OS !== 'web') {
    const recordings = await readAsyncList<Recording>(RECORDINGS_KEY);
    await Promise.all(
      recordings
        .filter((rec) => rec.audioData?.startsWith('file://'))
        .map((rec) => FileSystem.deleteAsync(rec.audioData, { idempotent: true }))
    );
    await AsyncStorage.multiRemove([
      RECORDINGS_KEY,
      CHAT_MESSAGES_KEY,
      CALLS_KEY,
      CONTACTS_KEY,
      USER_PROFILE_KEY,
      USER_PROFILE_PICTURE_KEY,
    ]);
    return;
  }
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    globalThis.localStorage.clear();
  }
  if (typeof globalThis !== 'undefined' && 'indexedDB' in globalThis) {
    globalThis.indexedDB.deleteDatabase('InroCallDB');
  }
}

export async function getContacts(): Promise<StoredContact[]> {
  try {
    if (Platform.OS !== 'web') {
      return await readAsyncList<StoredContact>(CONTACTS_KEY);
    }
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const data = globalThis.localStorage.getItem(CONTACTS_KEY);
      return data ? (JSON.parse(data) as StoredContact[]) : [];
    }
    return [];
  } catch (error) {
    console.error('Error getting contacts:', error);
    return [];
  }
}

export async function saveContact(contact: StoredContact): Promise<void> {
  if (Platform.OS !== 'web') {
    const contacts = await readAsyncList<StoredContact>(CONTACTS_KEY);
    contacts.push(contact);
    await writeAsyncList(CONTACTS_KEY, contacts);
    return;
  }
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    const data = globalThis.localStorage.getItem(CONTACTS_KEY);
    const contacts = data ? (JSON.parse(data) as StoredContact[]) : [];
    contacts.push(contact);
    globalThis.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }
}

// Get internal parts from localStorage
export function getInternalParts(): string[] {
  if (Platform.OS !== 'web' || typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return ['Anxious Self', 'Future Self', 'Confident Self'];
  }
  const parts = globalThis.localStorage.getItem('internalParts');
  return parts ? JSON.parse(parts) : ['Anxious Self', 'Future Self', 'Confident Self'];
}

// Generate 3-digit code for each label
export function getLabelContacts(): Array<{ id: string; name: string; phoneNumber: string; label: string }> {
  const parts = getInternalParts();
  return parts.map((part, index) => ({
    id: `label-${index}`,
    name: part,
    phoneNumber: `${100 + index}`, // 100, 101, 102, etc.
    label: part,
  }));
}

// Save internal parts to localStorage
export function saveInternalParts(parts: string[]): void {
  if (Platform.OS !== 'web' || typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return;
  }
  globalThis.localStorage.setItem('internalParts', JSON.stringify(parts));
}

// Update recording with internal part
export async function updateRecordingInternalPart(id: string, internalPart: string): Promise<void> {
  if (Platform.OS !== 'web') {
    const recordings = await readAsyncList<Recording>(RECORDINGS_KEY);
    const updated = recordings.map((rec) => (rec.id === id ? { ...rec, internalPart } : rec));
    await writeAsyncList(RECORDINGS_KEY, updated);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recordings'], 'readwrite');
    const store = transaction.objectStore('recordings');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const recording = getRequest.result;
      if (recording) {
        recording.internalPart = internalPart;
        const putRequest = store.put(recording);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// User Profile Management
export interface UserProfile {
  name: string;
  bio: string;
  phoneNumber: string;
  profilePicture?: string;
}

// Save profile picture to IndexedDB (larger storage quota)
async function saveProfilePicture(picture: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await AsyncStorage.setItem(USER_PROFILE_PICTURE_KEY, picture);
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recordings'], 'readwrite');
    const store = transaction.objectStore('recordings');
    const putRequest = store.put({ id: 'userProfilePicture', data: picture });
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error);
  });
}

// Get profile picture from IndexedDB
async function getProfilePicture(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      return await AsyncStorage.getItem(USER_PROFILE_PICTURE_KEY);
    }
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['recordings'], 'readonly');
      const store = transaction.objectStore('recordings');
      const getRequest = store.get('userProfilePicture');
      getRequest.onsuccess = () => {
        resolve(getRequest.result?.data || null);
      };
      getRequest.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (Platform.OS !== 'web') {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    return;
  }
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    if (profile.profilePicture) {
      try {
        await saveProfilePicture(profile.profilePicture);
      } catch (error) {
        console.error('Failed to save profile picture:', error);
      }
    }

    const basicProfile = {
      name: profile.name,
      bio: profile.bio,
      phoneNumber: profile.phoneNumber,
    };
    globalThis.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(basicProfile));
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  if (Platform.OS !== 'web') {
    const data = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  }
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    const data = globalThis.localStorage.getItem(USER_PROFILE_KEY);
    if (data) {
      const basicProfile = JSON.parse(data);
      // Try to get profile picture from IndexedDB
      const profilePicture = await getProfilePicture();
      return {
        ...basicProfile,
        profilePicture: profilePicture || undefined,
      };
    }
  }
  return null;
}

export function hasCompletedSetup(): boolean {
  if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return globalThis.localStorage.getItem(USER_PROFILE_KEY) !== null;
  }
  return false;
}

// Migrate existing calls to chat messages
export async function migrateCallsToChat(): Promise<number> {
  try {
    const profile = await getUserProfile();
    if (!profile) return 0;

    const normalizePhone = (phone: string) => phone.replace(/[\s\-()]/g, '');
    const normalizedUser = normalizePhone(profile.phoneNumber);
    
    const allCalls = await getAllCalls();
    let migratedCount = 0;

    for (const call of allCalls) {
      const normalizedCallNumber = normalizePhone(call.number);
      
      // Only migrate calls to own number
      if (normalizedCallNumber === normalizedUser) {
        // Check if recording exists
        if (call.hasRecording && call.recordingId) {
          const recording = await getRecordingById(call.recordingId);
          if (recording) {
            // Save to 'you' conversation (Gavena - received)
            const chatMessage1: ChatMessage = {
              id: `migrated-${call.id}-you`,
              conversationId: 'you',
              text: 'Voice message',
              timestamp: call.timestamp,
              isSelf: false,
              audioData: recording.audioData,
              isAudio: true,
            };
            await saveChatMessage(chatMessage1);
            
            // Save to 'you2' conversation (You 🖤 - sent)
            const chatMessage2: ChatMessage = {
              id: `migrated-${call.id}-you2`,
              conversationId: 'you2',
              text: 'Voice message',
              timestamp: call.timestamp,
              isSelf: true,
              audioData: recording.audioData,
              isAudio: true,
            };
            await saveChatMessage(chatMessage2);
            migratedCount++;
          }
        } else {
          // Create text message for calls without recording
          const messageText = `Call ended - Duration: ${call.duration > 0 ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'No answer'}`;
          
          const chatMessage1: ChatMessage = {
            id: `migrated-${call.id}-you`,
            conversationId: 'you',
            text: messageText,
            timestamp: call.timestamp,
            isSelf: false,
            isAudio: false,
          };
          await saveChatMessage(chatMessage1);
          
          const chatMessage2: ChatMessage = {
            id: `migrated-${call.id}-you2`,
            conversationId: 'you2',
            text: messageText,
            timestamp: call.timestamp,
            isSelf: true,
            isAudio: false,
          };
          await saveChatMessage(chatMessage2);
          migratedCount++;
        }
      }
    }

    return migratedCount;
  } catch (error) {
    console.error('Error migrating calls:', error);
    return 0;
  }
}

// Sync messages from 'you' to 'you2' conversation
export async function syncMessagesToYou2(): Promise<number> {
  try {
    const youMessages = await getChatMessagesByConversation('you');
    const you2Messages = await getChatMessagesByConversation('you2');
    
    // Get existing you2 message IDs for comparison
    const you2MessageIds = new Set(you2Messages.map(m => m.id.replace('-you2', '-you')));
    
    let syncedCount = 0;
    
    for (const message of youMessages) {
      // Check if this message already exists in you2
      const baseId = message.id.replace('-you', '');
      if (!you2MessageIds.has(baseId) && !you2MessageIds.has(message.id)) {
        // Create corresponding message in you2 (reverse isSelf)
        const you2Message: ChatMessage = {
          ...message,
          id: message.id.includes('-you') ? message.id.replace('-you', '-you2') : `${message.id}-you2`,
          conversationId: 'you2',
          isSelf: message.isSelf !== undefined ? !message.isSelf : false,
        };
        await saveChatMessage(you2Message);
        syncedCount++;
      }
    }
    
    return syncedCount;
  } catch (error) {
    console.error('Error syncing messages to you2:', error);
    return 0;
  }
}

// Fix isSelf values for existing messages
export async function fixMessageOrientation(): Promise<number> {
  try {
    if (Platform.OS !== 'web') {
      const messages = await readAsyncList<ChatMessage>(CHAT_MESSAGES_KEY);
      let fixedCount = 0;

      const updatedMessages = messages.map((message) => {
        let needsUpdate = false;
        let newIsSelf = message.isSelf;

        if (message.conversationId === 'you' && message.isAudio && message.isSelf === true) {
          newIsSelf = false;
          needsUpdate = true;
        }

        if (message.conversationId === 'you2' && message.isAudio && message.isSelf === false) {
          newIsSelf = true;
          needsUpdate = true;
        }

        if (message.text?.includes('Call ended')) {
          if (message.conversationId === 'you' && message.isSelf === true) {
            newIsSelf = false;
            needsUpdate = true;
          }
          if (message.conversationId === 'you2' && message.isSelf === false) {
            newIsSelf = true;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          fixedCount++;
          return { ...message, isSelf: newIsSelf };
        }
        return message;
      });

      if (fixedCount > 0) {
        await writeAsyncList(CHAT_MESSAGES_KEY, updatedMessages);
      }
      return fixedCount;
    }
    const db = await initDB();
    const transaction = db.transaction(['chatMessages'], 'readwrite');
    const store = transaction.objectStore('chatMessages');
    const allMessages = await new Promise<ChatMessage[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    let fixedCount = 0;

    for (const message of allMessages) {
      let needsUpdate = false;
      let newIsSelf = message.isSelf;

      // For 'you' conversation (Gavena), calls should be received (isSelf: false)
      if (message.conversationId === 'you' && message.isAudio && message.isSelf === true) {
        newIsSelf = false;
        needsUpdate = true;
      }

      // For 'you2' conversation (You 🖤), calls should be sent (isSelf: true)
      if (message.conversationId === 'you2' && message.isAudio && message.isSelf === false) {
        newIsSelf = true;
        needsUpdate = true;
      }

      // Also fix text call messages
      if (message.text?.includes('Call ended')) {
        if (message.conversationId === 'you' && message.isSelf === true) {
          newIsSelf = false;
          needsUpdate = true;
        }
        if (message.conversationId === 'you2' && message.isSelf === false) {
          newIsSelf = true;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const updateTransaction = db.transaction(['chatMessages'], 'readwrite');
        const updateStore = updateTransaction.objectStore('chatMessages');
        const updatedMessage = { ...message, isSelf: newIsSelf };
        await new Promise<void>((resolve, reject) => {
          const putRequest = updateStore.put(updatedMessage);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        });
        fixedCount++;
      }
    }

    return fixedCount;
  } catch (error) {
    console.error('Error fixing message orientation:', error);
    return 0;
  }
}
