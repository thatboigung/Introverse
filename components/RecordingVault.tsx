import { deleteRecording, getAllRecordings, getInternalParts, Recording, updateRecordingInternalPart } from '@/utils/storage';
import { Calendar, Clock, Pause, Play, Tag, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';

export default function RecordingVault() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [nativeSound, setNativeSound] = useState<Audio.Sound | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<string>('');
  const internalParts = getInternalParts();

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    const allRecordings = await getAllRecordings();
    setRecordings(allRecordings.sort((a, b) => b.timestamp - a.timestamp));
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = (recording: Recording) => {
    if (Platform.OS !== 'web') {
      const playNative = async () => {
        if (nativeSound) {
          await nativeSound.unloadAsync();
          setNativeSound(null);
        }

        if (playingId === recording.id) {
          setPlayingId(null);
          return;
        }

        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: recording.audioData },
            { shouldPlay: true }
          );
          setNativeSound(sound);
          setPlayingId(recording.id);
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('didJustFinish' in status && status.didJustFinish) {
              setPlayingId(null);
              sound.unloadAsync();
              setNativeSound(null);
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
      audioElement.pause();
      audioElement.src = '';
    }

    if (playingId === recording.id) {
      setPlayingId(null);
      setAudioElement(null);
      return;
    }

    const audio = new Audio(recording.audioData);
    audio.play();
    setAudioElement(audio);
    setPlayingId(recording.id);

    audio.onended = () => {
      setPlayingId(null);
      setAudioElement(null);
    };
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS !== 'web') {
      Alert.alert('Delete recording?', 'This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecording(id);
            loadRecordings();
          },
        },
      ]);
      return;
    }
    if (confirm('Delete this recording?')) {
      await deleteRecording(id);
      if (audioElement && playingId === id) {
        audioElement.pause();
        setAudioElement(null);
        setPlayingId(null);
      }
      loadRecordings();
    }
  };

  const handleSavePart = async (id: string) => {
    if (selectedPart) {
      await updateRecordingInternalPart(id, selectedPart);
      setEditingId(null);
      setSelectedPart('');
      loadRecordings();
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Recordings</Text>
        <Text style={styles.subtitle}>Your self-reflection calls</Text>
        <ScrollView contentContainerStyle={styles.list}>
          {recordings.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={28} color="#6b7280" />
              <Text style={styles.emptyText}>No recordings yet</Text>
            </View>
          ) : (
            recordings.map((recording) => (
              <View key={recording.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{recording.internalPart || 'Self Reflection'}</Text>
                  <Pressable onPress={() => handleDelete(recording.id)}>
                    <Feather name="trash-2" size={16} color="#f87171" />
                  </Pressable>
                </View>
                <Text style={styles.cardMeta}>
                  {formatDate(recording.timestamp)} • {formatTime(recording.timestamp)} • {formatDuration(recording.duration)}
                </Text>
                <Pressable style={styles.playButton} onPress={() => handlePlay(recording)}>
                  <Feather name="play" size={16} color="#fff" />
                  <Text style={styles.playText}>Play (web only)</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Status Bar Area */}
      <div className="h-12"></div>

      {/* Top Bar */}
      <div className="px-4 py-3 border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-white text-center">Recordings</h1>
        </div>
      </div>

      <div className="flex-1 px-4 pt-6 pb-32 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-sm mb-6 px-2">Your self-reflection calls</p>

          {recordings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-900/50 flex items-center justify-center">
                <Calendar size={32} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-base">No recordings yet</p>
              <p className="text-gray-600 text-sm mt-1">Start a call to create your first recording</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-4 hover:bg-gray-900/60 transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Play Button */}
                    <button
                      onClick={() => handlePlay(recording)}
                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                        playingId === recording.id
                          ? 'bg-green-500 hover:bg-green-400'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {playingId === recording.id ? (
                        <Pause size={20} className="text-white" fill="white" />
                      ) : (
                        <Play size={20} className="text-white ml-0.5" fill="white" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <div className="text-white font-medium text-base mb-0.5">
                            {recording.internalPart || 'Self Reflection'}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(recording.timestamp)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatTime(recording.timestamp)}
                            </span>
                            <span>•</span>
                            <span>{formatDuration(recording.duration)}</span>
                          </div>
                        </div>
                      </div>

                      {editingId === recording.id && (
                        <div className="mt-3 pt-3 border-t border-gray-800/50">
                          <div className="flex gap-2">
                            <select
                              value={selectedPart}
                              onChange={(e) => setSelectedPart(e.target.value)}
                              className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="">No label</option>
                              {internalParts.map((part) => (
                                <option key={part} value={part}>
                                  {part}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleSavePart(recording.id)}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-sm transition-all"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          if (editingId === recording.id) {
                            setEditingId(null);
                          } else {
                            setEditingId(recording.id);
                            setSelectedPart(recording.internalPart || '');
                          }
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                      >
                        <Tag size={18} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(recording.id)}
                        className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-all"
                      >
                        <Trash2 size={18} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  list: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cardMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 6,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  playText: {
    color: '#fff',
    fontSize: 12,
  },
});
