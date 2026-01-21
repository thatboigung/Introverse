import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// @ts-ignore
import { Audio } from 'expo-av';

export interface RecordingResult {
  id: string;
  audioData: string; // base64 for web, file URI for native
  duration: number;
}

export function useCrossPlatformRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioData, setAudioData] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<any>(null);

  // Start recording
  const startRecording = async () => {
    setDuration(0);
    if (Platform.OS === 'web') {
      // Web: Use MediaRecorder (handled in your existing code)
      return;
    }
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e) {
      console.error('Failed to start recording', e);
    }
  };

  // Stop recording
  const stopRecording = async (): Promise<RecordingResult | null> => {
    if (Platform.OS === 'web') {
      // Web: Use MediaRecorder (handled in your existing code)
      return null;
    }
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      const recording = recordingRef.current;
      if (!recording) return null;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const id = Date.now().toString();
      setRecordingId(id);
      setAudioData(uri);
      return { id, audioData: uri, duration };
    } catch (e) {
      console.error('Failed to stop recording', e);
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    isRecording,
    duration,
    recordingId,
    audioData,
    startRecording,
    stopRecording,
  };
}
