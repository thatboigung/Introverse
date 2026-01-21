import { useTheme } from '@/contexts/ThemeContext';
import { clearAllData, getInternalParts, saveInternalParts } from '@/utils/storage';
import { Moon, Plus, Settings as SettingsIcon, Sun, Trash2, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [internalParts, setInternalParts] = useState<string[]>(getInternalParts());
  const [newPart, setNewPart] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleAddPart = () => {
    if (newPart.trim() && !internalParts.includes(newPart.trim())) {
      const updated = [...internalParts, newPart.trim()];
      setInternalParts(updated);
      saveInternalParts(updated);
      setNewPart('');
    }
  };

  const handleRemovePart = (part: string) => {
    const updated = internalParts.filter((p) => p !== part);
    setInternalParts(updated);
    saveInternalParts(updated);
  };

  const handleClearAll = async () => {
    if (showConfirm) {
      await clearAllData();
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      alert('All data has been cleared.');
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Status Bar Area */}
      <div className="h-12"></div>

      {/* Top Bar */}
      <div className={`px-4 py-2 h-14 flex items-center fixed top-12 left-0 right-0 ${theme === 'dark' ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl z-50`}>
        <div className="max-w-2xl mx-auto w-full">
          <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
        </div>
      </div>

      {/* Spacer for fixed top bar */}
      <div className="h-14"></div>

      <div className="flex-1 px-4 pt-6 pb-32 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-sm mb-8 text-center">Manage your app preferences</p>

          {/* Theme Toggle Section */}
          <div
            className={`${theme === 'dark' ? 'bg-gray-900/40 border-gray-800/50' : 'bg-gray-50 border-gray-200'} backdrop-blur-xl border rounded-3xl p-6 mb-6`}
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(249, 250, 251, 1)',
              backdropFilter: 'blur(20px)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(229, 231, 235)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'} flex items-center justify-center`}>
                  {theme === 'dark' ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-yellow-500" />}
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Theme</h2>
                  <p className="text-gray-500 text-sm">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-16 h-8 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}`}
                  style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
                />
              </button>
            </div>
          </div>

          {/* Internal Parts Section */}
          <div
            className={`${theme === 'dark' ? 'bg-gray-900/40 border-gray-800/50' : 'bg-gray-50 border-gray-200'} backdrop-blur-xl border rounded-3xl p-6 mb-6`}
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(249, 250, 251, 1)',
              backdropFilter: 'blur(20px)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(229, 231, 235)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <SettingsIcon size={20} className="text-purple-400" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Internal Parts</h2>
                <p className="text-gray-500 text-sm">Label your calls with different parts of yourself</p>
              </div>
            </div>

            {/* Existing Parts */}
            <div className="flex flex-wrap gap-2 mb-6">
              {internalParts.map((part) => (
                <div
                  key={part}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 ${theme === 'dark' ? 'bg-gray-800/60 text-white border border-gray-700/50' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(243, 244, 246, 1)',
                  }}
                >
                  <span className="text-sm font-medium">{part}</span>
                  <button
                    onClick={() => handleRemovePart(part)}
                    className={`transition-colors p-0.5 rounded-full ${theme === 'dark' ? 'hover:text-red-400 hover:bg-red-500/20' : 'hover:text-red-600 hover:bg-red-100'}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Part */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPart}
                onChange={(e) => setNewPart(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddPart();
                  }
                }}
                placeholder="Add new part (e.g., 'Wise Self')"
                className={`flex-1 rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm ${theme === 'dark' ? 'bg-gray-800/60 border border-gray-700/50 text-white' : 'bg-gray-100 border border-gray-200 text-gray-900'}`}
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(243, 244, 246, 1)',
                }}
              />
              <button
                onClick={handleAddPart}
                className="w-12 h-12 bg-purple-600 hover:bg-purple-500 rounded-xl text-white transition-all flex items-center justify-center active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Clear All Data Section */}
          <div
            className={`${theme === 'dark' ? 'bg-gray-900/40 border-gray-800/50' : 'bg-gray-50 border-gray-200'} backdrop-blur-xl border rounded-3xl p-6`}
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(249, 250, 251, 1)',
              backdropFilter: 'blur(20px)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(229, 231, 235)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Privacy</h2>
                <p className="text-gray-500 text-sm">Clear all your data. This cannot be undone.</p>
              </div>
            </div>

            {showConfirm ? (
              <div className="space-y-3">
                <p className={`text-sm font-medium px-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  Are you sure? This will permanently delete all your recordings, chats, and settings.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearAll}
                    className={`flex-1 py-3.5 rounded-xl transition-all font-medium active:scale-95 ${theme === 'dark' ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                  >
                    Yes, Clear Everything
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className={`flex-1 py-3.5 rounded-xl transition-all font-medium active:scale-95 ${theme === 'dark' ? 'bg-gray-800/60 hover:bg-gray-700/60 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                    style={{
                      background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(229, 231, 235, 1)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleClearAll}
                className={`w-full py-3.5 rounded-xl transition-all font-medium active:scale-95 ${theme === 'dark' ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400' : 'bg-red-50 hover:bg-red-100 border border-red-300 text-red-700'}`}
              >
                Clear All Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
