import { useTheme } from '@/contexts/ThemeContext';
import { ChatMessage, getChatMessagesByConversation, markConversationAsRead, saveChatMessage } from '@/utils/storage';
import { ArrowLeft, Bell, Calendar, Check, Clock, Edit3, Mic, MoreVertical, Pause, Play, Reply, Send, Square, StickyNote, Trash2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface ChatDetailProps {
  conversationId: string;
  contactName: string;
  onBack: () => void;
  onMount?: () => void;
  onUnmount?: () => void;
}

export default function ChatDetail({ conversationId, contactName, onBack, onMount, onUnmount }: ChatDetailProps) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [longPressMessage, setLongPressMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isReminderExpanded, setIsReminderExpanded] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDescription, setReminderDescription] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
    onMount?.();
    return () => {
      onUnmount?.();
      if (streamRef) {
        streamRef.getTracks().forEach((track) => track.stop());
      }
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    const conversationMessages = await getChatMessagesByConversation(conversationId);
    setMessages(conversationMessages);
    // Mark all messages as read when opening conversation
    await markConversationAsRead(conversationId);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const db = await (window as any).indexedDB.open('InroCallDB', 2);
      const dbInstance = await new Promise<IDBDatabase>((resolve, reject) => {
        db.onsuccess = () => resolve(db.result);
        db.onerror = () => reject(db.error);
      });

      const transaction = dbInstance.transaction(['chatMessages'], 'readwrite');
      const store = transaction.objectStore('chatMessages');
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(messageId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Delete from opposite conversation too
      if (conversationId === 'you' || conversationId === 'you2') {
        const oppositeConvId = conversationId === 'you' ? 'you2' : 'you';
        const oppositeMessageId = messageId.replace(`-${conversationId}`, `-${oppositeConvId}`);
        const deleteOpposite = store.delete(oppositeMessageId);
        await new Promise<void>((resolve) => {
          deleteOpposite.onsuccess = () => resolve();
          deleteOpposite.onerror = () => resolve(); // Continue even if fails
        });
      }

      loadMessages();
      setLongPressMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleUpdateMessage = async (messageId: string, newText: string) => {
    try {
      const db = await (window as any).indexedDB.open('InroCallDB', 2);
      const dbInstance = await new Promise<IDBDatabase>((resolve, reject) => {
        db.onsuccess = () => resolve(db.result);
        db.onerror = () => reject(db.error);
      });

      const transaction = dbInstance.transaction(['chatMessages'], 'readwrite');
      const store = transaction.objectStore('chatMessages');
      
      const message = messages.find(m => m.id === messageId);
      if (message) {
        const updatedMessage = { ...message, text: newText };
        await new Promise<void>((resolve, reject) => {
          const request = store.put(updatedMessage);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // Update in opposite conversation too
        if (conversationId === 'you' || conversationId === 'you2') {
          const oppositeConvId = conversationId === 'you' ? 'you2' : 'you';
          const oppositeMessageId = messageId.replace(`-${conversationId}`, `-${oppositeConvId}`);
          const oppositeMsg = await new Promise<any>((resolve) => {
            const getReq = store.get(oppositeMessageId);
            getReq.onsuccess = () => resolve(getReq.result);
            getReq.onerror = () => resolve(null);
          });
          
          if (oppositeMsg) {
            oppositeMsg.text = newText;
            store.put(oppositeMsg);
          }
        }
      }

      loadMessages();
      setEditingMessage(null);
      setLongPressMessage(null);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleClearChat = async () => {
    try {
      const db = await (window as any).indexedDB.open('InroCallDB', 2);
      const dbInstance = await new Promise<IDBDatabase>((resolve, reject) => {
        db.onsuccess = () => resolve(db.result);
        db.onerror = () => reject(db.error);
      });

      const transaction = dbInstance.transaction(['chatMessages'], 'readwrite');
      const store = transaction.objectStore('chatMessages');
      
      // Get all messages from current conversation
      const allMessages = await new Promise<ChatMessage[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Delete messages from current conversation
      const currentConvMessages = allMessages.filter(m => m.conversationId === conversationId);
      for (const msg of currentConvMessages) {
        await new Promise<void>((resolve, reject) => {
          const deleteReq = store.delete(msg.id);
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
        });
      }

      // Also delete from opposite conversation
      if (conversationId === 'you' || conversationId === 'you2') {
        const oppositeConvId = conversationId === 'you' ? 'you2' : 'you';
        const oppositeMessages = allMessages.filter(m => m.conversationId === oppositeConvId);
        for (const msg of oppositeMessages) {
          await new Promise<void>((resolve) => {
            const deleteReq = store.delete(msg.id);
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => resolve();
          });
        }
      }

      loadMessages();
      setShowClearConfirm(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  const handleToggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedMessages(new Set());
    setShowMenu(false);
  };

  const handleToggleMessageSelection = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleDeleteSelected = async () => {
    try {
      const db = await (window as any).indexedDB.open('InroCallDB', 2);
      const dbInstance = await new Promise<IDBDatabase>((resolve, reject) => {
        db.onsuccess = () => resolve(db.result);
        db.onerror = () => reject(db.error);
      });

      const transaction = dbInstance.transaction(['chatMessages'], 'readwrite');
      const store = transaction.objectStore('chatMessages');

      for (const messageId of selectedMessages) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(messageId);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // Delete from opposite conversation too
        if (conversationId === 'you' || conversationId === 'you2') {
          const oppositeConvId = conversationId === 'you' ? 'you2' : 'you';
          const oppositeMessageId = messageId.replace(`-${conversationId}`, `-${oppositeConvId}`);
          const deleteOpposite = store.delete(oppositeMessageId);
          await new Promise<void>((resolve) => {
            deleteOpposite.onsuccess = () => resolve();
            deleteOpposite.onerror = () => resolve();
          });
        }
      }

      loadMessages();
      setIsSelectMode(false);
      setSelectedMessages(new Set());
    } catch (error) {
      console.error('Error deleting selected messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStreamRef(stream);

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const timestamp = Date.now();
          const audioMessage: ChatMessage = {
            id: `${timestamp}-${conversationId}`,
            conversationId: conversationId,
            text: '',
            timestamp: timestamp,
            isSelf: true,
            audioData: base64Audio,
            isAudio: true,
            replyTo: replyingTo?.id,
          };

          await saveChatMessage(audioMessage);
          setMessages((prev) => [...prev, audioMessage]);
          
          // Sync to opposite conversation
          if (conversationId === 'you' || conversationId === 'you2') {
            const oppositeConvId = conversationId === 'you' ? 'you2' : 'you';
            const oppositeMessage: ChatMessage = {
              id: `${timestamp}-${oppositeConvId}`,
              conversationId: oppositeConvId,
              text: '',
              timestamp: timestamp,
              isSelf: false, // Received in opposite conversation
              audioData: base64Audio,
              isAudio: true,
              replyTo: replyingTo?.id.replace(`-${conversationId}`, `-${oppositeConvId}`),
            };
            await saveChatMessage(oppositeMessage);
          }
          
          setReplyingTo(null);
          scrollToBottom();

          // Stop stream
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStreamRef(null);
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access is required for recording');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handlePlayAudio = (message: ChatMessage) => {
    if (!message.audioData) return;

    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }

    if (playingAudioId === message.id) {
      setPlayingAudioId(null);
      setAudioElement(null);
      return;
    }

    const audio = new Audio(message.audioData);
    audio.play();
    setAudioElement(audio);
    setPlayingAudioId(message.id);

    audio.onended = () => {
      setPlayingAudioId(null);
      setAudioElement(null);
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
      setAudioElement(null);
    };
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    // Handle editing
    if (editingMessage) {
      await handleUpdateMessage(editingMessage.id, inputText.trim());
      setInputText('');
      return;
    }

    const timestamp = Date.now();
    const userMessage: ChatMessage = {
      id: `${timestamp}-${conversationId}`,
      conversationId: conversationId,
      text: inputText.trim(),
      timestamp: timestamp,
      isSelf: true,
      replyTo: replyingTo?.id,
    };

    await saveChatMessage(userMessage);
    setMessages((prev) => [...prev, userMessage]);
    
    // Sync to opposite conversation
    if (conversationId === 'you' || conversationId === 'you2') {
      const oppositeConvId = conversationId === 'you' ? 'you2' : 'you';
      const oppositeMessage: ChatMessage = {
        id: `${timestamp}-${oppositeConvId}`,
        conversationId: oppositeConvId,
        text: inputText.trim(),
        timestamp: timestamp,
        isSelf: false, // Received in opposite conversation
        replyTo: replyingTo?.id.replace(`-${conversationId}`, `-${oppositeConvId}`),
      };
      await saveChatMessage(oppositeMessage);
    }
    
    setInputText('');
    setReplyingTo(null);
    setWaitingForResponse(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (conversationId === 'reminders' && !isReminderExpanded) {
        setIsReminderExpanded(true);
      } else {
        handleSend();
      }
    }
  };

  const handleInputClick = () => {
    if (conversationId === 'reminders') {
      setIsReminderExpanded(true);
    }
  };

  const handleReminderSubmit = async () => {
    if (!reminderTitle.trim()) return;

    const reminderText = `📅 ${reminderTitle}${reminderDescription ? `\n${reminderDescription}` : ''}${reminderDate || reminderTime ? `\n🕒 ${reminderDate} ${reminderTime}` : ''}`;
    
    const message: ChatMessage = {
      id: `${Date.now()}-${conversationId}`,
      conversationId,
      text: reminderText,
      timestamp: Date.now(),
      isSelf: true,
    };

    await saveChatMessage(message);
    await loadMessages();
    
    // Reset form
    setReminderTitle('');
    setReminderDescription('');
    setReminderTime('');
    setReminderDate('');
    setIsReminderExpanded(false);
  };

  const handleCancelReminder = () => {
    setReminderTitle('');
    setReminderDescription('');
    setReminderTime('');
    setReminderDate('');
    setIsReminderExpanded(false);
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Status Bar Area */}
      <div className="h-12" />

      {/* Top Bar */}
      <div className={`px-4 py-2 ${theme === 'dark' ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl flex-shrink-0 h-14 fixed top-12 left-0 right-0 z-50`}>
        <div className="max-w-3xl mx-auto flex items-center gap-3 h-full">
          <button
            onClick={isSelectMode ? handleToggleSelectMode : onBack}
            className={`p-2 -ml-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-800/50 active:bg-gray-700/50' : 'hover:bg-gray-100 active:bg-gray-200'} transition-all active:scale-95 flex-shrink-0`}
            aria-label="Go back"
          >
            <ArrowLeft size={22} className={theme === 'dark' ? 'text-white' : 'text-gray-900'} strokeWidth={2.5} />
          </button>
          
          {isSelectMode ? (
            <div className="flex-1">
              <h1 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Select chats</h1>
            </div>
          ) : (
            <>
              {/* Avatar */}
              {conversationId === 'you2' ? (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 flex-shrink-0">
                  <span className="text-2xl">🖤</span>
                </div>
              ) : conversationId === 'notes' ? (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex-shrink-0">
                  <StickyNote size={20} className="text-yellow-400" />
                </div>
              ) : conversationId === 'reminders' ? (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex-shrink-0">
                  <Bell size={20} className="text-blue-400" />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-base font-light text-white flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(99, 102, 241, 0.6))',
                  }}
                >
                  {getInitials(contactName)}
                </div>
              )}

              {/* Contact Name and Status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className={`text-lg font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{contactName}</h1>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>online</span>
                </div>
              </div>

              {/* Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-800/50 active:bg-gray-700/50' : 'hover:bg-gray-100 active:bg-gray-200'} transition-all active:scale-95`}
                  aria-label="Menu"
                >
                  <MoreVertical size={22} className={theme === 'dark' ? 'text-white' : 'text-gray-900'} strokeWidth={2.5} />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-800/50 shadow-2xl overflow-hidden z-50 animate-scale-in">
                      <button
                        onClick={handleToggleSelectMode}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 active:bg-gray-700/50 transition-colors text-left border-b border-gray-800/30"
                      >
                        <Trash2 size={18} className="text-blue-400" />
                        <span className="text-white font-medium">Delete</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowClearConfirm(true);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 active:bg-gray-700/50 transition-colors text-left"
                      >
                        <Trash2 size={18} className="text-red-400" />
                        <span className="text-white font-medium">Clear Chat</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Spacer for fixed top bar */}
      <div className="h-14"></div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 space-y-4 min-h-0 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <p className={`text-base ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>No messages yet</p>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                Start a conversation with {contactName}
              </p>
              <p className={`text-xs mt-2 px-8 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-400'}`}>
                When you send a message, you'll be prompted to respond from another part of yourself
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const repliedMessage = message.replyTo ? messages.find(m => m.id === message.replyTo) : null;
              const isSwipingThis = swipingMessageId === message.id;
              
              return (
              <div
                key={message.id}
                className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'} relative items-center gap-3`}
                onTouchStart={(e) => {
                  if (isSelectMode) return;
                  
                  // Long press detection
                  longPressTimer.current = setTimeout(() => {
                    setLongPressMessage(message);
                    setSwipingMessageId(null);
                    setSwipeOffset(0);
                  }, 500);

                  const touch = e.touches[0];
                  const startX = touch.clientX;
                  setSwipingMessageId(message.id);
                  
                  const handleMove = (moveEvent: TouchEvent) => {
                    // Cancel long press if user moves
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }

                    const currentX = moveEvent.touches[0].clientX;
                    const diff = currentX - startX;
                    
                    // Limit swipe distance
                    if (message.isSelf && diff < 0) {
                      setSwipeOffset(Math.max(diff, -80));
                    } else if (!message.isSelf && diff > 0) {
                      setSwipeOffset(Math.min(diff, 80));
                    }
                    
                    // Trigger reply at threshold
                    if ((message.isSelf && diff < -60) || (!message.isSelf && diff > 60)) {
                      setReplyingTo(message);
                      setSwipingMessageId(null);
                      setSwipeOffset(0);
                      document.removeEventListener('touchmove', handleMove);
                      document.removeEventListener('touchend', handleEnd);
                    }
                  };
                  
                  const handleEnd = () => {
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }
                    setSwipingMessageId(null);
                    setSwipeOffset(0);
                    document.removeEventListener('touchmove', handleMove);
                    document.removeEventListener('touchend', handleEnd);
                  };
                  
                  document.addEventListener('touchmove', handleMove);
                  document.addEventListener('touchend', handleEnd);
                }}
              >
                {/* Checkbox in select mode */}
                {isSelectMode && (
                  <div 
                    onClick={() => handleToggleMessageSelection(message.id)}
                    className="flex-shrink-0"
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedMessages.has(message.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-500 bg-transparent'
                    }`}>
                      {selectedMessages.has(message.id) && (
                        <Check size={16} className="text-white" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                )}
                
                {/* Reply Icon (appears during swipe) */}
                {isSwipingThis && Math.abs(swipeOffset) > 20 && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 ${
                      message.isSelf ? 'right-full mr-4' : 'left-full ml-4'
                    } transition-opacity duration-200`}
                    style={{
                      opacity: Math.min(Math.abs(swipeOffset) / 60, 1),
                    }}
                  >
                    <Reply size={20} className="text-gray-400" />
                  </div>
                )}
                
                <div
                  className={`max-w-[75%] rounded-3xl px-4 py-2.5 ${
                    message.isSelf
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : theme === 'dark' 
                        ? 'bg-gray-800/60 text-white rounded-bl-sm'
                        : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                  }`}
                  style={{
                    background: message.isSelf
                      ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                      : theme === 'dark' 
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(229, 231, 235, 1)',
                    backdropFilter: message.isSelf ? 'none' : 'blur(20px)',
                    transform: isSwipingThis ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                    transition: isSwipingThis ? 'none' : 'transform 0.3s ease-out',
                  }}
                >
                  {/* Replied Message Preview */}
                  {repliedMessage && (
                    <div 
                      className={`mb-2 pb-2 border-l-2 pl-2 ${
                        message.isSelf 
                          ? 'border-blue-300' 
                          : theme === 'dark' ? 'border-gray-500' : 'border-gray-400'
                      }`}
                    >
                      <p className={`text-xs font-medium mb-1 ${
                        message.isSelf 
                          ? 'text-blue-100' 
                          : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {repliedMessage.isSelf ? 'You' : contactName}
                      </p>
                      <p className={`text-xs opacity-75 truncate ${
                        message.isSelf 
                          ? 'text-blue-100' 
                          : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {repliedMessage.isAudio ? '🎤 Voice message' : repliedMessage.text}
                      </p>
                    </div>
                  )}
                  
                  {message.isAudio && message.audioData ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePlayAudio(message)}
                        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
                      >
                        {playingAudioId === message.id ? (
                          <Pause size={18} className="text-white" fill="white" />
                        ) : (
                          <Play size={18} className="text-white ml-0.5" fill="white" />
                        )}
                      </button>
                      <div>
                        <p className="text-sm font-medium">Voice message</p>
                        <p
                          className={`text-xs mt-0.5 ${
                            message.isSelf 
                              ? 'text-blue-100' 
                              : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                        {message.text}
                      </p>
                      <p
                        className={`text-xs mt-1.5 ${
                          message.isSelf 
                            ? 'text-blue-100' 
                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )})
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Long Press Menu */}
        {longPressMessage && (
          <div 
            className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
              theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
            }`}
            style={{ animation: 'fadeIn 0.2s ease-out' }}
            onClick={() => setLongPressMessage(null)}
          >
            <div 
              className="max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Message Preview with lift animation */}
              <div className={`flex ${longPressMessage.isSelf ? 'justify-end' : 'justify-start'} mb-3`}>
                <div
                  className={`max-w-[75%] rounded-3xl px-4 py-2.5 animate-message-lift shadow-2xl ${
                    longPressMessage.isSelf
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : theme === 'dark' 
                        ? 'bg-gray-800/60 text-white rounded-bl-sm' 
                        : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                  }`}
                  style={{
                    background: longPressMessage.isSelf
                      ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                      : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(229, 231, 235, 1)',
                    backdropFilter: longPressMessage.isSelf ? 'none' : 'blur(20px)',
                  }}
                >
                  {longPressMessage.isAudio ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Play size={18} className="text-white ml-0.5" fill="white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Voice message</p>
                        <p className={`text-xs mt-0.5 ${
                          longPressMessage.isSelf 
                            ? 'text-blue-100' 
                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {formatTime(longPressMessage.timestamp)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                        {longPressMessage.text}
                      </p>
                      <p className={`text-xs mt-1.5 ${
                        longPressMessage.isSelf 
                          ? 'text-blue-100' 
                          : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {formatTime(longPressMessage.timestamp)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Menu Options with drop animation */}
              <div className={`backdrop-blur-xl rounded-2xl overflow-hidden border shadow-2xl animate-menu-drop ${
                theme === 'dark' 
                  ? 'bg-gray-900/95 border-gray-800/50' 
                  : 'bg-white border-gray-200'
              }`}>
                <button
                  onClick={() => {
                    setReplyingTo(longPressMessage);
                    setLongPressMessage(null);
                    inputRef.current?.focus();
                  }}
                  className={`w-full px-5 py-4 flex items-center gap-3 transition-colors border-b ${
                    theme === 'dark' 
                      ? 'hover:bg-gray-800/50 active:bg-gray-700/50 border-gray-800/30' 
                      : 'hover:bg-gray-50 active:bg-gray-100 border-gray-200'
                  }`}
                >
                  <Reply size={20} className="text-blue-400" />
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Reply</span>
                </button>

                {longPressMessage.isSelf && !longPressMessage.isAudio && (
                  <button
                    onClick={() => {
                      setEditingMessage(longPressMessage);
                      setInputText(longPressMessage.text);
                      setLongPressMessage(null);
                      inputRef.current?.focus();
                    }}
                    className={`w-full px-5 py-4 flex items-center gap-3 transition-colors border-b ${
                      theme === 'dark' 
                        ? 'hover:bg-gray-800/50 active:bg-gray-700/50 border-gray-800/30' 
                        : 'hover:bg-gray-50 active:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <Edit3 size={20} className="text-green-400" />
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Edit</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteMessage(longPressMessage.id)}
                  className={`w-full px-5 py-4 flex items-center gap-3 transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-gray-800/50 active:bg-gray-700/50' 
                      : 'hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <Trash2 size={20} className="text-red-400" />
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear Chat Confirmation */}
        {showClearConfirm && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <div 
              className={`${theme === 'dark' ? 'bg-gray-900/95 border-gray-800/50' : 'bg-white border-gray-200'} backdrop-blur-xl rounded-2xl border shadow-2xl max-w-sm w-full p-6 animate-scale-in`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Clear Chat?</h2>
              </div>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                This will permanently delete all messages in this conversation. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-white font-medium transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearChat}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium transition-all active:scale-95"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className={`px-4 pb-4 pt-3 border-t ${theme === 'dark' ? 'border-gray-800/50 bg-black/95' : 'border-gray-200 bg-white/95'} backdrop-blur-xl flex-shrink-0`}>
          {isSelectMode ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Selected ({selectedMessages.size})
                </p>
              </div>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedMessages.size === 0}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:opacity-50 rounded-xl text-white font-medium transition-all active:scale-95 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          ) : conversationId === 'reminders' && isReminderExpanded ? (
            /* Expanded Reminder Form */
            <div 
              className="space-y-4"
              style={{
                animation: 'expandForm 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Bell size={20} className="text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">New Reminder</h3>
                </div>
                <button
                  onClick={handleCancelReminder}
                  className="p-2 rounded-full hover:bg-gray-700/50 transition-all active:scale-95"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="Reminder title *"
                  className="w-full px-4 py-3 bg-gray-900/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/50"
                  autoFocus
                />

                <textarea
                  value={reminderDescription}
                  onChange={(e) => setReminderDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-4 py-3 bg-gray-900/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/50 resize-none min-h-[80px]"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <Calendar size={18} className="text-blue-400" />
                    </div>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-900/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/50 cursor-pointer"
                      style={{
                        colorScheme: 'dark',
                      }}
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <Clock size={18} className="text-blue-400" />
                    </div>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-900/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/50 cursor-pointer"
                      style={{
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelReminder}
                  className="flex-1 py-3 rounded-2xl bg-gray-800/50 text-white font-medium hover:bg-gray-800/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReminderSubmit}
                  disabled={!reminderTitle.trim()}
                  className="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Bell size={18} />
                  Create
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* Edit Preview */}
          {editingMessage && (
            <div className={`mb-3 rounded-xl p-3 flex items-center gap-3 border ${
              theme === 'dark' 
                ? 'bg-green-900/30 border-green-500/30' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex-1 min-w-0">
                <p className={`text-xs mb-1 flex items-center gap-1 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`}>
                  <Edit3 size={12} />
                  Editing message
                </p>
                <p className={`text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {editingMessage.text}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setInputText('');
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  theme === 'dark' 
                    ? 'bg-gray-700/50 hover:bg-gray-600/50' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            </div>
          )}
          
          {/* Reply Preview */}
          {replyingTo && !editingMessage && (
            <div className={`mb-3 rounded-xl p-3 flex items-center gap-3 ${
              theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-100'
            }`}>
              <div className="flex-1 min-w-0">
                <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Replying to {replyingTo.isSelf ? 'yourself' : contactName}
                </p>
                <p className={`text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {replyingTo.isAudio ? '🎤 Voice message' : replyingTo.text}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  theme === 'dark' 
                    ? 'bg-gray-700/50 hover:bg-gray-600/50' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            </div>
          )}
          
          <div className="flex gap-2 items-end">
            {/* Record Button */}
            <button
              onClick={() => (isRecording ? handleStopRecording() : handleStartRecording())}
              disabled={waitingForResponse}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-400 animate-pulse'
                  : theme === 'dark' ? 'bg-gray-800/60 hover:bg-gray-700/60' : 'bg-gray-200 hover:bg-gray-300'
              }`}
              style={{
                background: isRecording
                  ? 'rgb(239, 68, 68)'
                  : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(20px)',
                boxShadow: isRecording ? '0 4px 16px rgba(239, 68, 68, 0.4)' : 'none',
              }}
            >
              {isRecording ? (
                <Square size={18} className="text-white" fill="white" />
              ) : (
                <Mic size={20} className={theme === 'dark' ? 'text-white' : 'text-gray-700'} />
              )}
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                onClick={handleInputClick}
                placeholder={waitingForResponse ? "Waiting for your inner response..." : isRecording ? "Recording..." : conversationId === 'reminders' ? "Create a reminder..." : "Message..."}
                disabled={waitingForResponse || isRecording}
                className={`w-full ${theme === 'dark' ? 'bg-gray-900/60 border-gray-800/50 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-3xl px-4 py-3 pr-12 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[3rem] max-h-32 disabled:opacity-50 text-[15px] cursor-text`}
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(249, 250, 251, 1)',
                  backdropFilter: 'blur(20px)',
                }}
                rows={1}
              />
            </div>

            {/* Send Button */}
            {!isRecording && inputText.trim() && (
              <button
                onClick={handleSend}
                disabled={waitingForResponse}
                className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center active:scale-95 flex-shrink-0"
                style={{
                  boxShadow: !waitingForResponse ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none',
                }}
              >
                <Send size={20} className="text-white" />
              </button>
            )}
          </div>
          {isRecording && (
            <div className="mt-2 text-center">
              <span className="text-red-400 text-sm flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                Recording...
              </span>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
