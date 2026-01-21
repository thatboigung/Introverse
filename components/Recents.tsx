import { useTheme } from '@/contexts/ThemeContext';
import { Call, deleteCall, deleteRecording, getAllCalls, getAllRecordings, getInternalParts, getUserProfile, Recording, updateCallInternalPart } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { AlertTriangle, Clock, Pause, Phone, PhoneIncoming, PhoneOutgoing, Play, Search, Tag, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export default function Recents() {
  const { theme } = useTheme();
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<string>('');  
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [userPhone, setUserPhone] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [callToDelete, setCallToDelete] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const internalParts = getInternalParts();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCalls();
    loadRecordings();
    loadUserPhone();
  }, []);

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

  const handlePlayRecording = (call: Call) => {
    if (!call.hasRecording || !call.recordingId) return;

    const recording = recordings.find(r => r.id === call.recordingId);
    if (!recording) return;

    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }

    if (playingId === call.recordingId) {
      setPlayingId(null);
      setAudioElement(null);
      return;
    }

    const audio = new Audio(recording.audioData);
    audio.play();
    setAudioElement(audio);
    setPlayingId(call.recordingId);

    audio.onended = () => {
      setPlayingId(null);
      setAudioElement(null);
    };
  };

  const handleDelete = (id: string) => {
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
    setCallToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCallToDelete(null);
  };

  const handleClearAll = () => {
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
                                      {playingId === call.recordingId ? (
                                        <Pause size={16} className="text-purple-400" />
                                      ) : (
                                        <Play size={16} className="text-purple-400 ml-0.5" fill="currentColor" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-xs font-medium ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Call Recording</div>
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
                                    localStorage.setItem('prefilledNumber', call.number);
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
                                      {playingId === call.recordingId ? (
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
