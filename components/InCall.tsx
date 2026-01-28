import { useTheme } from '@/contexts/ThemeContext';
import { useCrossPlatformRecorder } from '@/hooks/useCrossPlatformRecorder';
import { getUserProfile, Recording, saveRecording } from '@/utils/storage';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio as ExpoAudio } from 'expo-av';

interface InCallProps {
  onEndCall: (callDuration: number, hasRecording: boolean, recordingId?: string) => void;
  number: string;
  contactName?: string;
}

export default function InCall({ onEndCall, number, contactName: propContactName }: InCallProps) {
  const { theme } = useTheme();
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  // Web recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  // Native recording hook
  const nativeRecorder = useCrossPlatformRecorder();
  const [contactName, setContactName] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'failed'>('calling');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unavailableSoundRef = useRef<ExpoAudio.Sound | null>(null);
  const unavailableTone = useRef(require('../assets/sound/unavailable-phone-192489.mp3')).current;

  // Hide navbar during call
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const tabBar = document.querySelector('[role="tablist"]') as HTMLElement;
    if (tabBar) {
      tabBar.style.display = 'none';
    }

    return () => {
      // Show navbar when call ends
      if (tabBar) {
        tabBar.style.display = '';
      }
    };
  }, []);

  // Check if number matches a contact
  useEffect(() => {
    const checkContact = async () => {
      // If contact name is passed, use it and mark as connected
      if (propContactName) {
        setContactName(propContactName);
        setTimeout(() => {
          setCallStatus('connected');
        }, 500);
        return;
      }

      // Otherwise, check if number matches user profile
      const profile = await getUserProfile();
      if (profile) {
        const normalizePhone = (phone: string) => phone.replace(/[\s\-()]/g, '');
        const normalizedInput = normalizePhone(number);
        const normalizedUser = normalizePhone(profile.phoneNumber);
        
        if (normalizedInput === normalizedUser) {
          setContactName(profile.name);
          setTimeout(() => {
            setCallStatus('connected');
          }, 500);
        } else {
          // For any other number that doesn't match, mark as failed
          setTimeout(() => {
            setCallStatus('failed');
            setTimeout(() => {
              handleEndCall();
            }, 2000);
          }, 500);
        }
      }
    };
    checkContact();
  }, [number, propContactName]);

  useEffect(() => {
    // Only start timer if call is connected
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
      // Start recording for platform
      if (Platform.OS === 'web') {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            streamRef.current = stream;
            if (!isRecording) {
              handleStartRecording();
            }
          })
          .catch((err) => {
            console.error('Error accessing microphone:', err);
          });
      } else {
        nativeRecorder.startRecording();
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (Platform.OS === 'web' && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus]);

  useEffect(() => {
    const playUnavailableTone = async () => {
      try {
        if (unavailableSoundRef.current) {
          await unavailableSoundRef.current.unloadAsync();
        }
        const { sound } = await ExpoAudio.Sound.createAsync(unavailableTone, { shouldPlay: true });
        unavailableSoundRef.current = sound;
        await sound.playAsync();
      } catch (error) {
        console.error('Failed to play unavailable tone:', error);
      }
    };

    if (callStatus === 'failed') {
      playUnavailableTone();
    }

    return () => {
      if (unavailableSoundRef.current) {
        unavailableSoundRef.current.unloadAsync().catch(() => null);
        unavailableSoundRef.current = null;
      }
    };
  }, [callStatus, unavailableTone]);

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Web only
  const handleStartRecording = async () => {
    if (!streamRef.current) {
      alert('Microphone access is required for recording');
      return;
    }
    try {
      const recorder = new MediaRecorder(streamRef.current);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        const recId = Date.now().toString();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const recording: Recording = {
            id: recId,
            timestamp: Date.now(),
            audioData: base64Audio,
            duration: seconds,
            internalPart: undefined,
          };
          await saveRecording(recording);
          setRecordingId(recId);
        };
        reader.readAsDataURL(audioBlob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording');
    }
  };
  // Web only
  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleEndCall = async () => {
    let finalDuration = seconds;
    let finalRecordingId = null;
    let hasRecording = false;
    if (Platform.OS === 'web') {
      if (isRecording) handleStopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Wait for recording to be saved
      setTimeout(() => {
        onEndCall(finalDuration, !!recordingId, recordingId || undefined);
      }, 800);
    } else {
      // Native: stop and save
      const result = await nativeRecorder.stopRecording();
      if (result) {
        const { id, audioData, duration } = result;
        const recording: Recording = {
          id,
          timestamp: Date.now(),
          audioData, // file URI
          duration,
          internalPart: undefined,
        };
        await saveRecording(recording);
        finalRecordingId = id;
        hasRecording = true;
        finalDuration = duration;
      }
      onEndCall(finalDuration, hasRecording, finalRecordingId || undefined);
    }
  };

  // Get initials from contact name or number
  const getInitials = (nameOrNum: string) => {
    if (contactName) {
      return contactName.slice(0, 2).toUpperCase();
    }
    return nameOrNum.slice(0, 2).toUpperCase();
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(contactName || number)}</Text>
        </View>
        <Text style={styles.nameText}>{contactName || number}</Text>
        {contactName && number !== contactName ? <Text style={styles.subText}>{number}</Text> : null}

        <Text style={[styles.statusText, callStatus === 'failed' ? styles.statusFailed : null]}>
          {callStatus === 'calling' && 'Calling...'}
          {callStatus === 'connected' && 'Recording call...'}
          {callStatus === 'failed' && 'Call Failed'}
        </Text>
        {callStatus === 'connected' ? <Text style={styles.timerText}>{formatTime(seconds)}</Text> : null}

        <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={() => setIsMuted(!isMuted)}>
            {isMuted ? <Feather name="mic-off" size={22} color="#111827" /> : <Feather name="mic" size={22} color="#fff" />}
          </Pressable>
        </View>

        <Pressable style={styles.endButton} onPress={handleEndCall}>
          <Feather name="phone-off" size={28} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Status Bar Area */}
      <div className="h-12"></div>


      {/* Spacer for fixed top bar */}
      <div className="h-14"></div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-32">
        <div className="w-full max-w-sm text-center">
          {/* Contact Avatar */}
          <div className="mb-8">
            <div 
              className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-4xl font-light ${theme === 'dark' ? 'text-white' : 'text-white'} mb-4 shadow-2xl`}
              style={{
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.8), rgba(99, 102, 241, 0.8))',
                boxShadow: '0 20px 60px rgba(147, 51, 234, 0.4)',
              }}
            >
              {getInitials(contactName || number)}
            </div>
          </div>

          {/* Contact Name/Number */}
          <div className="mb-2">
            <div className={`text-3xl font-light ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
              {contactName || number}
            </div>
            {contactName && number !== contactName && (
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-light`}>{number}</div>
            )}
          </div>

          {/* Call Status */}
          <div className="mb-12">
            <div className={`text-base font-light mb-4 ${
              callStatus === 'failed' ? 'text-red-400 animate-pulse' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {callStatus === 'calling' && 'Calling...'}
              {callStatus === 'connected' && 'Recording call...'}
              {callStatus === 'failed' && 'Call Failed'}
            </div>
            {callStatus === 'connected' && (
              <div className={`text-2xl font-light ${theme === 'dark' ? 'text-white' : 'text-gray-900'} tracking-wider`}>{formatTime(seconds)}</div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center gap-8 mb-12">
            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl active:scale-95"
              style={{
                background: isMuted 
                  ? theme === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(243, 244, 246, 0.95)' 
                  : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)'}`,
                boxShadow: isMuted 
                  ? theme === 'dark' ? '0 8px 32px rgba(255, 255, 255, 0.2)' : '0 8px 32px rgba(0, 0, 0, 0.1)' 
                  : theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
            >
              {isMuted ? (
                <MicOff size={24} className={theme === 'dark' ? 'text-gray-900' : 'text-gray-600'} />
              ) : (
                <Mic size={24} className={theme === 'dark' ? 'text-white' : 'text-gray-900'} />
              )}
            </button>
          </div>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-20 h-20 mx-auto bg-red-500 hover:bg-red-400 active:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl active:scale-95"
            style={{
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
            }}
          >
            <PhoneOff size={32} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(147, 51, 234, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
  nameText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  subText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 20,
  },
  statusFailed: {
    color: '#f87171',
  },
  timerText: {
    color: '#fff',
    fontSize: 22,
    marginTop: 6,
  },
  controls: {
    marginTop: 30,
    marginBottom: 24,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
