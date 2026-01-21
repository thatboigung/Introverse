// Utility functions for IndexedDB and LocalStorage

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

// Save recording to IndexedDB
export async function saveRecording(recording: Recording): Promise<void> {
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

// Get internal parts from localStorage
export function getInternalParts(): string[] {
  if (typeof window === 'undefined') return [];
  const parts = localStorage.getItem('internalParts');
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
  if (typeof window === 'undefined') return;
  localStorage.setItem('internalParts', JSON.stringify(parts));
}

// Update recording with internal part
export async function updateRecordingInternalPart(id: string, internalPart: string): Promise<void> {
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
  if (typeof window !== 'undefined' && window.localStorage) {
    // Save profile picture to IndexedDB if present
    if (profile.profilePicture) {
      try {
        await saveProfilePicture(profile.profilePicture);
      } catch (error) {
        console.error('Failed to save profile picture:', error);
      }
    }
    
    // Save basic info to localStorage (without picture)
    const basicProfile = {
      name: profile.name,
      bio: profile.bio,
      phoneNumber: profile.phoneNumber,
    };
    localStorage.setItem('userProfile', JSON.stringify(basicProfile));
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const data = localStorage.getItem('userProfile');
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
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('userProfile') !== null;
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
