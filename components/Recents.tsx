import { useTheme } from '@/contexts/ThemeContext';
import { Call, deleteCall, deleteRecording, getAllCalls, getAllRecordings, getInternalParts, getUserProfile, Recording, updateCallInternalPart } from '@/utils/storage';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Audio as ExpoAudio } from 'expo-av';
import { useRouter } from 'expo-router';
import { AlertTriangle, Clock, Pause, Phone, PhoneIncoming, PhoneOutgoing, Play, Search, Tag, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Recents() {
  const { theme } = useTheme();
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const nativeSoundRef = useRef<ExpoAudio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
  const [playbackDurationMs, setPlaybackDurationMs] = useState(0);
  const [playbackBarWidth, setPlaybackBarWidth] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<string>('');  
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [userPhone, setUserPhone] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [callToDelete, setCallToDelete] = useState<string | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const deleteAnim = useRef(new Animated.Value(0)).current;
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showClearMenu, setShowClearMenu] = useState(false);
  const internalParts = getInternalParts();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCalls();
    loadRecordings();
    loadUserPhone();
  }, []);

  useEffect(() => {
    if (!showDeletePopup) {
      deleteAnim.setValue(0);
      return;
    }
    Animated.timing(deleteAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showDeletePopup, deleteAnim]);

  // Reload calls whenever the screen becomes focused
  useFocusEffect(
    useCallback(() => {
      loadCalls();
      loadRecordings();
    }, [])
  );

  const loadUserPhone = async () => {
    const profile = await getUserProfile();
    if (profile) {
      setUserPhone(profile.phoneNumber);
    }
  };

  const loadCalls = async () => {
    const allCalls = await getAllCalls();
    console.log('📞 Loaded calls:', allCalls.map(c => ({ 
      number: c.number, 
      hasRecording: c.hasRecording, 
      recordingId: c.recordingId 
    })));
    setCalls(allCalls.sort((a, b) => b.timestamp - a.timestamp));
  };

  const loadRecordings = async () => {
    const allRecordings = await getAllRecordings();
    setRecordings(allRecordings);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return 'No answer';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatPlaybackTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayRecording = (call: Call) => {
    if (!call.hasRecording || !call.recordingId) return;

    const recording = recordings.find(r => r.id === call.recordingId);
    if (!recording) return;

    if (Platform.OS !== 'web') {
      const playNative = async () => {
        if (playingId === call.recordingId && nativeSoundRef.current) {
          const status = await nativeSoundRef.current.getStatusAsync();
          if ('isLoaded' in status && status.isLoaded) {
            if (status.isPlaying) {
              await nativeSoundRef.current.pauseAsync();
              setIsPlaying(false);
            } else {
              await nativeSoundRef.current.playAsync();
              setIsPlaying(true);
            }
            return;
          }
        }

        if (nativeSoundRef.current) {
          await nativeSoundRef.current.unloadAsync();
          nativeSoundRef.current = null;
        }

        try {
          const { sound } = await ExpoAudio.Sound.createAsync(
            { uri: recording.audioData },
            { shouldPlay: true }
          );
          nativeSoundRef.current = sound;
          setPlayingId(call.recordingId ?? null);
          setIsPlaying(true);
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('isLoaded' in status && status.isLoaded) {
              setPlaybackPositionMs(status.positionMillis ?? 0);
              setPlaybackDurationMs(status.durationMillis ?? 0);
              setIsPlaying(status.isPlaying ?? false);
            }
            if ('didJustFinish' in status && status.didJustFinish) {
              setPlayingId(null);
              setIsPlaying(false);
              setPlaybackPositionMs(0);
              setPlaybackDurationMs(0);
              sound.unloadAsync();
              nativeSoundRef.current = null;
            }
          });
        } catch (error) {
          console.error('Failed to play recording', error);
          Alert.alert('Playback failed', 'Unable to play this recording.');
        }
      };
      void playNative();
      return;
    }

    if (audioElement) {
      if (playingId === call.recordingId) {
        if (audioElement.paused) {
          audioElement.play();
          setIsPlaying(true);
        } else {
          audioElement.pause();
          setIsPlaying(false);
        }
        return;
      }
      audioElement.pause();
      audioElement.src = '';
    }

    const audio = new globalThis.Audio(recording.audioData);
    audio.onloadedmetadata = () => {
      setPlaybackDurationMs(audio.duration * 1000);
    };
    audio.ontimeupdate = () => {
      setPlaybackPositionMs(audio.currentTime * 1000);
    };
    audio.play();
    setAudioElement(audio);
    setPlayingId(call.recordingId ?? null);
    setIsPlaying(true);

    audio.onended = () => {
      setPlayingId(null);
      setIsPlaying(false);
      setAudioElement(null);
      setPlaybackPositionMs(0);
      setPlaybackDurationMs(0);
    };
  };

  const handleSeek = async (ratio: number) => {
    if (playbackDurationMs <= 0) return;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const targetMs = clampedRatio * playbackDurationMs;
    setPlaybackPositionMs(targetMs);
    if (Platform.OS !== 'web' && nativeSoundRef.current && playingId) {
      try {
        await nativeSoundRef.current.setPositionAsync(targetMs);
      } catch {
        // ignore seek failure
      }
    }
    if (Platform.OS === 'web' && audioElement) {
      audioElement.currentTime = targetMs / 1000;
    }
  };

  const handleDelete = (id: string) => {
    if (Platform.OS !== 'web') {
      setCallToDelete(id);
      setShowDeletePopup(true);
      return;
    }
    setCallToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (callToDelete) {
      const call = calls.find(c => c.id === callToDelete);
      
      // Delete the call
      await deleteCall(callToDelete);
      
      // Also delete the associated recording if it exists
      if (call?.recordingId) {
        await deleteRecording(call.recordingId);
      }
      
      // Stop audio if currently playing
      if (audioElement && call?.recordingId === playingId) {
        audioElement.pause();
        setAudioElement(null);
        setPlayingId(null);
      }
      
      loadCalls();
    }
    setShowDeleteModal(false);
    setShowDeletePopup(false);
    setCallToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCallToDelete(null);
    setShowDeletePopup(false);
  };

  const handleClearAll = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Clear all calls?', 'This will delete call history and recordings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: confirmClearAll },
      ]);
      return;
    }
    setShowClearAllModal(true);
  };

  const confirmClearAll = async () => {
    // Stop any playing audio
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
      setPlayingId(null);
    }

    // Delete all calls and their recordings
    for (const call of calls) {
      await deleteCall(call.id);
      if (call.recordingId) {
        await deleteRecording(call.recordingId);
      }
    }

    // Reload calls
    loadCalls();
    setShowClearAllModal(false);
  };

  const cancelClearAll = () => {
    setShowClearAllModal(false);
  };

  const handleSavePart = async (id: string) => {
    if (selectedPart) {
      await updateCallInternalPart(id, selectedPart);
      setEditingId(null);
      setSelectedPart('');
      loadCalls();
    }
  };

  // Get initials from number
  const getInitials = (num: string) => {
    return num.slice(0, 2).toUpperCase();
  };

  // Check if number matches user's contact
  const isValidContact = (number: string) => {
    if (!userPhone) return false;
    const normalizePhone = (phone: string) => phone.replace(/[\s\-()]/g, '');
    return normalizePhone(number) === normalizePhone(userPhone);
  };

  // Group calls by date
  const groupedCalls = calls.reduce((acc, call) => {
    const dateKey = formatDate(call.timestamp);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(call);
    return acc;
  }, {} as Record<string, Call[]>);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recents</Text>
          {showClearMenu ? (
            <Pressable
              style={[styles.clearButton, calls.length === 0 ? styles.menuButtonDisabled : null]}
              onPress={() => {
                if (calls.length === 0) return;
                setShowClearMenu(false);
                confirmClearAll();
              }}
              disabled={calls.length === 0}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.menuButton, calls.length === 0 ? styles.menuButtonDisabled : null]}
              onPress={() => {
                if (calls.length === 0) return;
                setShowClearMenu(true);
              }}
              disabled={calls.length === 0}
            >
              <Feather name="more-vertical" size={18} color={calls.length === 0 ? '#4b5563' : '#f87171'} />
            </Pressable>
          )}
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={16} color="#6b7280" />
          <TextInput placeholder="Search" placeholderTextColor="#6b7280" style={styles.searchInput} />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {calls.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="phone" size={28} color="#6b7280" />
              <Text style={styles.emptyText}>No recent calls</Text>
            </View>
          ) : (
            calls.map((call) => (
              <View key={call.id}>
                <Pressable
                  style={styles.card}
                  onPress={() => setSelectedCall(selectedCall?.id === call.id ? null : call)}
                >
                  <Text style={styles.cardTitle}>{call.number}</Text>
                  <Text style={styles.cardMeta}>
                    {formatTime(call.timestamp)} • {formatDuration(call.duration)}
                  </Text>
                  {call.internalPart ? <Text style={styles.cardLabel}>{call.internalPart}</Text> : null}
                </Pressable>
                {selectedCall?.id === call.id ? (
                  <View style={styles.actionPanel}>
                    {call.hasRecording ? (
                      <Pressable style={styles.actionButton} onPress={() => handlePlayRecording(call)}>
                        <Feather name={playingId === call.recordingId && isPlaying ? 'pause' : 'play'} size={14} color="#fff" />
                        <Text style={styles.actionText}>{playingId === call.recordingId && isPlaying ? 'Pause' : 'Play'}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable style={styles.actionButton} onPress={() => router.push('/')}>
                      <Feather name="phone-call" size={14} color="#fff" />
                      <Text style={styles.actionText}>Call</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(call.id)}>
                      <Feather name="trash-2" size={14} color="#fff" />
                      <Text style={styles.actionText}>Delete</Text>
                    </Pressable>
                  </View>
                ) : null}
                {selectedCall?.id === call.id && playingId === call.recordingId ? (
                  <View style={styles.playbackMeter}>
                    <Pressable
                      style={styles.playbackBar}
                      onLayout={(event) => setPlaybackBarWidth(event.nativeEvent.layout.width)}
                      onPress={(event) => {
                        if (playbackBarWidth <= 0) return;
                        const ratio = event.nativeEvent.locationX / playbackBarWidth;
                        void handleSeek(ratio);
                      }}
                    >
                      <View
                        style={[
                          styles.playbackProgress,
                          {
                            width:
                              playbackDurationMs > 0
                                ? `${Math.min(100, (playbackPositionMs / playbackDurationMs) * 100)}%`
                                : '0%',
                          },
                        ]}
                      />
                    </Pressable>
                    <View style={styles.playbackTimes}>
                      <Text style={styles.playbackText}>{formatPlaybackTime(playbackPositionMs)}</Text>
                      <Text style={styles.playbackText}>{formatPlaybackTime(playbackDurationMs)}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

        <Modal transparent visible={showDeletePopup} animationType="none" onRequestClose={cancelDelete}>
          <Pressable style={styles.popupBackdrop} onPress={cancelDelete}>
            <Animated.View
              style={[
                styles.popupCard,
                {
                  opacity: deleteAnim,
                  transform: [
                    {
                      scale: deleteAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.popupTitle}>Delete Call</Text>
              <Text style={styles.popupMessage}>Are you sure you want to delete this call?</Text>
              <Text style={styles.popupSub}>This action cannot be undone.</Text>
              <View style={styles.popupActions}>
                <Pressable style={[styles.popupButton, styles.popupSecondary]} onPress={cancelDelete}>
                  <Text style={styles.popupButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.popupButton, styles.popupDanger]}
                  onPress={confirmDelete}
                >
                  <Text style={styles.popupButtonText}>Delete</Text>
                </Pressable>
              </View>
            </Animated.View>
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
          <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recents</h1>
          {calls.length > 0 && (
            <button
              onClick={handleClearAll}
              className={`px-3 py-1.5 ${theme === 'dark' ? 'hover:bg-gray-800/30' : 'hover:bg-gray-100'} rounded-lg text-red-400 text-sm font-medium transition-all`}
            >
              Clear All
            </button>
          )}
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
          {calls.length === 0 ? (
            <div className="text-center py-20">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'} flex items-center justify-center`}>
                <Phone size={32} className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} />
              </div>
              <p className={`text-base ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>No recent calls</p>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>Your call history will appear here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedCalls).map(([date, dateCalls]) => (
                <div key={date}>
                  <div className={`text-sm font-medium px-2 mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>{date}</div>
                  <div className="space-y-1">
                    {dateCalls.map((call) => (
                      <div key={call.id}>
                        <button
                          onClick={() => setSelectedCall(selectedCall?.id === call.id ? null : call)}
                          className={`w-full p-4 ${theme === 'dark' ? 'hover:bg-gray-900/20 active:bg-gray-900/30' : 'hover:bg-gray-100 active:bg-gray-200'} transition-all text-left`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div
                              className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-light text-white"
                              style={{
                                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(99, 102, 241, 0.6))',
                              }}
                            >
                              {getInitials(call.number)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className={`font-medium text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {call.number}
                                </div>
                                {call.type === 'outgoing' ? (
                                  <PhoneOutgoing size={14} className="text-blue-400" />
                                ) : (
                                  <PhoneIncoming size={14} className="text-green-400" />
                                )}
                              </div>
                              <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                <span>{formatTime(call.timestamp)}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatDuration(call.duration)}
                                </span>
                                {call.internalPart && isValidContact(call.number) && (
                                  <>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                      <Tag size={10} />
                                      {call.internalPart}
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {/* Inline Audio Player */}
                              {call.hasRecording && call.recordingId && (
                                <div className="mt-2">
                                  <div className={`flex items-center gap-2 p-2 rounded-xl ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayRecording(call);
                                      }}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${theme === 'dark' ? 'bg-purple-500/20 hover:bg-purple-500/30' : 'bg-purple-100 hover:bg-purple-200'}`}
                                    >
                                      {playingId === call.recordingId && isPlaying ? (
                                        <Pause size={16} className="text-purple-400" />
                                      ) : (
                                        <Play size={16} className="text-purple-400 ml-0.5" fill="currentColor" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-xs font-medium ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Call Recording</div>
                                      {playingId === call.recordingId ? (
                                        <div
                                          className={`mt-1 h-1 rounded-full cursor-pointer ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-200'}`}
                                          onClick={(event) => {
                                            const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                                            const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
                                            void handleSeek(ratio);
                                          }}
                                        >
                                          <div
                                            className="h-1 rounded-full bg-purple-500"
                                            style={{
                                              width:
                                                playbackDurationMs > 0
                                                  ? `${Math.min(100, (playbackPositionMs / playbackDurationMs) * 100)}%`
                                                  : '0%',
                                            }}
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                    {playingId === call.recordingId && (
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <div className="w-0.5 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                        <div className="w-0.5 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-0.5 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Actions Panel - shows below call when selected */}
                        {selectedCall?.id === call.id && (
                          <div className="px-4 pb-4 animate-slide-down relative z-50">
                            <div className="backdrop-blur-xl rounded-2xl p-4 ">
                              {/* Label Section - only show for valid contacts */}
                              {editingId === call.id && isValidContact(call.number) ? (
                                <div className="mb-3 pb-3 border-b border-gray-800/50 relative z-50">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <select
                                      value={selectedPart}
                                      onChange={(e) => setSelectedPart(e.target.value)}
                                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white [&>option]:bg-gray-800 [&>option]:text-white' : 'bg-gray-100 border-gray-300 text-gray-900 [&>option]:bg-gray-100 [&>option]:text-gray-900'} border rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer [&>option]:py-2 min-w-0 relative z-50`}
                                      style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                                    >
                                      <option value="" className={theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}>No label</option>
                                      {internalParts.map((part) => (
                                        <option key={part} value={part} className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}>
                                          {part}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingId(null);
                                          setSelectedPart('');
                                        }}
                                        className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-gray-700/50 hover:bg-gray-700 rounded-xl text-white text-sm transition-all"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSavePart(call.id)}
                                        className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-sm transition-all"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Action Buttons */}
                              <div className="flex gap-3">
                                {/* Call Button */}
                                <button
                                  onClick={() => {
                                    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
                                      globalThis.localStorage.setItem('prefilledNumber', call.number);
                                    }
                                    router.push('/');
                                  }}
                                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-800/50 active:bg-gray-700/50 transition-all group"
                                >
                                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                                    <Phone size={22} className="text-green-400" />
                                  </div>
                                  <span className="text-xs font-medium text-white">Call</span>
                                </button>

                                {/* Label Button - only show for valid contacts */}
                                {isValidContact(call.number) ? (
                                  <button
                                    onClick={() => {
                                      if (editingId === call.id) {
                                        setEditingId(null);
                                      } else {
                                        setEditingId(call.id);
                                        setSelectedPart(call.internalPart || '');
                                      }
                                    }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-800/50 active:bg-gray-700/50 transition-all group"
                                  >
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                                      <Tag size={22} className="text-blue-400" />
                                    </div>
                                    <span className="text-xs font-medium text-white">Label</span>
                                  </button>
                                ) : (
                                  <div></div>
                                )}

                                <button
                                  onClick={() => handleDelete(call.id)}
                                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-800/50 active:bg-gray-700/50 transition-all group"
                                >
                                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-all">
                                    <Trash2 size={22} className="text-red-400" />
                                  </div>
                                  <span className="text-xs font-medium text-white">Delete</span>
                                </button>
                              </div>

                              {/* Audio Player - show if call has recording */}
                              {call.hasRecording && call.recordingId && (
                                <div className="mt-4 pt-4 border-t border-gray-800/50">
                                  <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                                    <button
                                      onClick={() => handlePlayRecording(call)}
                                      className="w-10 h-10 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all"
                                    >
                                      {playingId === call.recordingId && isPlaying ? (
                                        <Pause size={18} className="text-purple-400" />
                                      ) : (
                                        <Play size={18} className="text-purple-400" />
                                      )}
                                    </button>
                                    <div className="flex-1">
                                      <div className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Call Recording</div>
                                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Duration: {formatDuration(call.duration)}
                                      </div>
                                      {playingId === call.recordingId ? (
                                        <div
                                          className="mt-2 h-1 rounded-full bg-purple-500/20 cursor-pointer"
                                          onClick={(event) => {
                                            const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                                            const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
                                            void handleSeek(ratio);
                                          }}
                                        >
                                          <div
                                            className="h-1 rounded-full bg-purple-500"
                                            style={{
                                              width:
                                                playbackDurationMs > 0
                                                  ? `${Math.min(100, (playbackPositionMs / playbackDurationMs) * 100)}%`
                                                  : '0%',
                                            }}
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                    {playingId === call.recordingId && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                                        <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className={`${theme === 'dark' ? 'bg-gray-900/95 border-gray-800/50' : 'bg-white border-gray-200'} backdrop-blur-xl rounded-3xl border max-w-sm w-full shadow-2xl animate-slide-up`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-200'} border-b`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Delete Call</h2>
              </div>
              <button
                onClick={cancelDelete}
                className="w-8 h-8 rounded-full bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center transition-all"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-300 text-base">
                Are you sure you want to delete this call?
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={cancelDelete}
                className={`flex-1 px-6 py-3 ${theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-700/50 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} rounded-xl font-medium transition-all`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className={`${theme === 'dark' ? 'bg-gray-900/95 border-gray-800/50' : 'bg-white border-gray-200'} backdrop-blur-xl rounded-3xl border max-w-sm w-full shadow-2xl animate-slide-up`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-200'} border-b`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Clear All Calls</h2>
              </div>
              <button
                onClick={cancelClearAll}
                className={`w-8 h-8 rounded-full ${theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-100 hover:bg-gray-200'} flex items-center justify-center transition-all`}
              >
                <X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className={`text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Are you sure you want to delete all {calls.length} call{calls.length !== 1 ? 's' : ''}?
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                This will permanently delete all call history and recordings. This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={cancelClearAll}
                className={`flex-1 px-6 py-3 ${theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-700/50 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} rounded-xl font-medium transition-all`}
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAll}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium transition-all"
              >
                Delete All
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  clearButtonText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  menuButtonDisabled: {
    opacity: 0.4,
  },
  clearText: {
    color: '#f87171',
    fontSize: 12,
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
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9ca3af',
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
  },
  actionPanel: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  playbackMeter: {
    marginBottom: 12,
  },
  playbackBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  playbackProgress: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  playbackTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  playbackText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  cardLabel: {
    color: '#3b82f6',
    fontSize: 12,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
  },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  popupCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
  },
  popupTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  popupMessage: {
    color: '#e5e7eb',
    marginTop: 10,
    fontSize: 14,
  },
  popupSub: {
    color: '#9ca3af',
    marginTop: 6,
    fontSize: 12,
  },
  popupActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  popupButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  popupSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  popupDanger: {
    backgroundColor: '#ef4444',
  },
  popupButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
