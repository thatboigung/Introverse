import InCall from '@/components/InCall';
import Keypad from '@/components/Keypad';
import { Call, ChatMessage, getAllCalls, getInternalParts, getRecordingById, getUserProfile, saveCall, saveChatMessage, updateCallInternalPart } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { Tag, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function HomeScreen() {
  const { theme } = useTheme();
  const [isInCall, setIsInCall] = useState(false);
  const [callNumber, setCallNumber] = useState('');
  const [callContactName, setCallContactName] = useState<string | undefined>(undefined);
  const [prefilledNumber, setPrefilledNumber] = useState<string | undefined>(undefined);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingCall, setPendingCall] = useState<Call | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      // Check for direct call initiation from Contacts
      if (typeof window !== 'undefined') {
        const shouldInitiateCall = localStorage.getItem('initiateCall');
        if (shouldInitiateCall === 'true') {
          const contactName = localStorage.getItem('callContactName');
          const contactNumber = localStorage.getItem('callContactNumber');
          if (contactNumber) {
            setCallNumber(contactNumber);
            setCallContactName(contactName || undefined);
            setIsInCall(true);
          }
          localStorage.removeItem('initiateCall');
          localStorage.removeItem('callContactName');
          localStorage.removeItem('callContactNumber');
          return;
        }

        // Check for prefilled number from Contacts
        const stored = localStorage.getItem('prefilledNumber');
        if (stored) {
          setPrefilledNumber(stored);
          localStorage.removeItem('prefilledNumber');
        } else {
          // Check if we should load the last called number
          const shouldLoadLast = localStorage.getItem('loadLastNumber');
          if (shouldLoadLast === 'true') {
            loadLastCalledNumber();
            localStorage.removeItem('loadLastNumber');
          }
        }
      }
    }, [])
  );

  const loadLastCalledNumber = async () => {
    const calls = await getAllCalls();
    if (calls.length > 0) {
      // Sort by timestamp and get the most recent call
      const sortedCalls = calls.sort((a, b) => b.timestamp - a.timestamp);
      const lastCall = sortedCalls[0];
      setPrefilledNumber(lastCall.number);
    } else {
      // Show message if no calls exist
      alert('No recent calls. Please enter a number to call.');
    }
  };

  const handleCall = async (number: string) => {
    setCallNumber(number);
    setIsInCall(true);
    setPrefilledNumber(undefined);
  };

  const handleEndCall = async (duration: number, hasRecording: boolean, recordingId?: string) => {
    // Create call object
    const call: Call = {
      id: Date.now().toString(),
      number: callNumber,
      timestamp: Date.now(),
      duration: duration,
      type: 'outgoing',
      hasRecording: hasRecording,
      recordingId: recordingId,
    };
    
    // Check if number matches user's contact
    const profile = await getUserProfile();
    const normalizePhone = (phone: string) => phone.replace(/[\s\-()]/g, '');
    const normalizedInput = normalizePhone(callNumber);
    const normalizedUser = profile ? normalizePhone(profile.phoneNumber) : '';
    const isValidContact = normalizedInput === normalizedUser;
    
    setIsInCall(false);
    
    // If calling own number, save as chat message (both with and without recording)
    if (isValidContact) {
      if (hasRecording && recordingId) {
        console.log('Saving recording as chat message...', { recordingId, callNumber });
        const recording = await getRecordingById(recordingId);
        if (recording) {
          console.log('Recording found, creating chat message...', recording);
          const timestamp = Date.now();
          
          // Create voice message in the "you" conversation (Gavena - receiving from subconscious)
          const chatMessage1: ChatMessage = {
            id: `${timestamp}-you`,
            conversationId: 'you',
            text: 'Voice message',
            timestamp: timestamp,
            isSelf: false, // Received from You 🖤
            audioData: recording.audioData,
            isAudio: true,
          };
          await saveChatMessage(chatMessage1);
          
          // Also save to "you2" (You 🖤) conversation (sending to conscious)
          const chatMessage2: ChatMessage = {
            id: `${timestamp}-you2`,
            conversationId: 'you2',
            text: 'Voice message',
            timestamp: timestamp,
            isSelf: true, // Sent from You 🖤
            audioData: recording.audioData,
            isAudio: true,
          };
          await saveChatMessage(chatMessage2);
          console.log('Chat message saved to both conversations successfully!');
        } else {
          console.log('Recording not found for ID:', recordingId);
        }
      } else {
        // Save call without recording as a text message in both conversations
        const timestamp = Date.now();
        const messageText = `Call ended - Duration: ${duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : 'No answer'}`;
        
        const chatMessage1: ChatMessage = {
          id: `${timestamp}-you`,
          conversationId: 'you',
          text: messageText,
          timestamp: timestamp,
          isSelf: false, // Received in Gavena inbox
          isAudio: false,
        };
        await saveChatMessage(chatMessage1);
        
        const chatMessage2: ChatMessage = {
          id: `${timestamp}-you2`,
          conversationId: 'you2',
          text: messageText,
          timestamp: timestamp,
          isSelf: true, // Sent from You 🖤 inbox
          isAudio: false,
        };
        await saveChatMessage(chatMessage2);
        console.log('Call saved as text message in both You chats');
      }
    }
    
    // Only show label modal if number matches user's contact
    if (isValidContact) {
      setPendingCall(call);
      setShowLabelModal(true);
    } else {
      // Save call without label option
      await saveCall(call);
      setCallNumber('');
    }
  };

  const handleSaveLabel = async () => {
    if (pendingCall) {
      // Save call first
      await saveCall(pendingCall);
      
      // If label selected, update the call
      if (selectedLabel) {
        await updateCallInternalPart(pendingCall.id, selectedLabel);
      }
    }
    
    // Reset states
    setShowLabelModal(false);
    setPendingCall(null);
    setSelectedLabel('');
    setCallNumber('');
  };

  const handleSkipLabel = async () => {
    if (pendingCall) {
      // Just save call without label
      await saveCall(pendingCall);
    }
    
    // Reset states
    setShowLabelModal(false);
    setPendingCall(null);
    setSelectedLabel('');
    setCallNumber('');
  };

  const internalParts = getInternalParts();

  if (isInCall) {
    return <InCall onEndCall={handleEndCall} number={callNumber} contactName={callContactName} />;
  }

  return (
    <>
      <Keypad onCall={handleCall} prefilledNumber={prefilledNumber} />
      
      {/* Label Modal */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'} backdrop-blur-xl rounded-3xl border max-w-md w-full shadow-2xl animate-slide-up`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Tag size={20} className="text-purple-400" />
                </div>
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Label Call</h2>
              </div>
              <button
                onClick={handleSkipLabel}
                className={`w-8 h-8 rounded-full ${theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-100 hover:bg-gray-200'} flex items-center justify-center transition-all`}>
                <X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Add a label to categorize this call
              </p>
              
              <select
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
                className={`w-full ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white [&>option]:bg-gray-800 [&>option]:text-white' : 'bg-gray-50 border-gray-200 text-gray-900 [&>option]:bg-gray-50 [&>option]:text-gray-900'} border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer [&>option]:py-2`}
                style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
              >
                <option value="" className={theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}>No label</option>
                {internalParts.map((part) => (
                  <option key={part} value={part} className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}>
                    {part}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleSkipLabel}
                className={`flex-1 px-6 py-3 ${theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-700/50 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} rounded-xl font-medium transition-all`}>
                Skip
              </button>
              <button
                onClick={handleSaveLabel}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-medium transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
