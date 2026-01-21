import { useTheme } from '@/contexts/ThemeContext';
import { ChatMessage, fixMessageOrientation, getConversationPreview, getUserProfile, migrateCallsToChat, syncMessagesToYou2 } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, MessageSquare, Search, Settings, StickyNote } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Conversation {
  id: string;
  name: string;
  lastMessage?: ChatMessage;
  lastMessageTime?: number;
  unreadCount?: number;
  isLabel?: boolean;
}

interface MessagesListProps {
  onSelectConversation: (conversationId: string) => void;
}

export default function MessagesList({ onSelectConversation }: MessagesListProps) {
  const { theme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userProfilePic, setUserProfilePic] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const hasMigratedRef = useRef(false);

  useEffect(() => {
    // Run migration once when component mounts
    const runMigration = async () => {
      if (!hasMigratedRef.current) {
        hasMigratedRef.current = true;
        const migratedCount = await migrateCallsToChat();
        if (migratedCount > 0) {
          console.log(`Migrated ${migratedCount} calls to You chat`);
        }
      }
      // Always fix message orientation
      const fixedCount = await fixMessageOrientation();
      if (fixedCount > 0) {
        console.log(`Fixed ${fixedCount} message orientations`);
      }
      // Always sync messages to you2 (it checks for duplicates)
      const syncedCount = await syncMessagesToYou2();
      if (syncedCount > 0) {
        console.log(`Synced ${syncedCount} messages to You 🖤 chat`);
      }
      // Reload conversations after all operations
      if (fixedCount > 0 || syncedCount > 0) {
        loadConversations();
      }
    };
    runMigration();
    loadConversations();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const loadConversations = async () => {
    // Get user's name and profile picture
    const profile = await getUserProfile();
    const userName = profile?.name || 'You';
    
    // Load profile picture from IndexedDB
    if (profile?.profilePicture) {
      setUserProfilePic(profile.profilePicture);
    }

    const predefinedConversations: Conversation[] = [
      { id: 'you', name: userName, isLabel: false },
      { id: 'you2', name: 'You', isLabel: false },
      { id: 'notes', name: 'Notes', isLabel: false },
      { id: 'reminders', name: 'Reminders', isLabel: false },
    ];

    // Load previews for each conversation
    const conversationsWithPreviews = await Promise.all(
      predefinedConversations.map(async (conv) => {
        const preview = await getConversationPreview(conv.id);
        return {
          ...conv,
          lastMessage: preview.lastMessage,
          lastMessageTime: preview.lastMessage?.timestamp,
          unreadCount: preview.unreadCount,
        };
      })
    );

    // Sort by last message time (most recent first)
    conversationsWithPreviews.sort((a, b) => {
      const timeA = a.lastMessageTime || 0;
      const timeB = b.lastMessageTime || 0;
      return timeB - timeA;
    });

    setConversations(conversationsWithPreviews);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Status Bar Area */}
      <div className="h-12"></div>

      {/* Top Bar */}
      <div className={`px-4 py-2 h-14 flex items-center justify-between fixed top-12 left-0 right-0 ${theme === 'dark' ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl z-50`}>
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Messages</h1>
          <button
            onClick={() => router.push('/settings')}
            className={`p-2 ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'} rounded-full transition-colors active:scale-95`}
          >
            <Settings size={22} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
          </button>
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
          {conversations.length === 0 ? (
            <div className="text-center py-20">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'} flex items-center justify-center`}>
                <MessageSquare size={32} className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} />
              </div>
              <p className={`text-base ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>No conversations</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className="w-full p-4 hover:bg-gray-900/20 active:bg-gray-900/30 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    {conversation.id === 'you' && userProfilePic ? (
                      <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden">
                        <img
                          src={userProfilePic}
                          alt={conversation.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : conversation.id === 'you2' ? (
                      <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <span className="text-3xl">🖤</span>
                      </div>
                    ) : conversation.id === 'notes' ? (
                      <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                        <StickyNote size={24} className="text-yellow-400" />
                      </div>
                    ) : conversation.id === 'reminders' ? (
                      <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                        <Bell size={24} className="text-blue-400" />
                      </div>
                    ) : (
                      <div
                        className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-light text-white"
                        style={{
                          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(99, 102, 241, 0.6))',
                        }}
                      >
                        {getInitials(conversation.name)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className={`font-medium text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {conversation.name}
                        </div>
                        {conversation.lastMessageTime && (
                          <div className="text-gray-500 text-sm flex-shrink-0">
                            {formatTime(conversation.lastMessageTime)}
                          </div>
                        )}
                      </div>
                      {conversation.lastMessage ? (
                        <div className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {conversation.lastMessage.text}
                        </div>
                      ) : (
                        <div className={`text-sm italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                          No messages yet
                        </div>
                      )}
                    </div>

                    {/* Unread Badge */}
                    {(conversation.unreadCount ?? 0) > 0 && (
                      <div className="flex-shrink-0 min-w-[24px] h-6 px-2 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {conversation.unreadCount! > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      </div>
                    )}

                    {/* Chevron */}
                    <ChevronRight size={20} className="text-gray-600 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
