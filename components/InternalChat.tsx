import { ChatMessage, getAllChatMessages, saveChatMessage } from '@/utils/storage';
import { MessageSquare, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

export default function InternalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    const allMessages = await getAllChatMessages();
    setMessages(allMessages);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      timestamp: Date.now(),
      isSelf: true,
    };

    await saveChatMessage(userMessage);
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setWaitingForResponse(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Status Bar Area */}
      <div className="h-12"></div>

      {/* Top Bar */}
      <div className="px-4 py-3 border-b border-gray-800/50">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-white text-center">Internal Chat</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* Header Info */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-gray-500 text-sm text-center">Have a conversation with yourself</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-900/50 flex items-center justify-center">
                <MessageSquare size={32} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-base">No messages yet</p>
              <p className="text-gray-600 text-sm mt-1">
                Start a conversation with yourself...
              </p>
              <p className="text-gray-700 text-xs mt-2 px-8">
                When you send a message, you'll be prompted to respond from another part of yourself
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-3xl px-4 py-2.5 ${
                    message.isSelf
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-gray-800/60 text-white rounded-bl-sm'
                  }`}
                  style={{
                    background: message.isSelf
                      ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                      : 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: message.isSelf ? 'none' : 'blur(20px)',
                  }}
                >
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {message.text}
                  </p>
                  <p
                    className={`text-xs mt-1.5 ${
                      message.isSelf ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-6 pt-2 border-t border-gray-800/50">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={waitingForResponse ? "Waiting for your inner response..." : "Message..."}
                disabled={waitingForResponse}
                className="w-full bg-gray-900/60 border border-gray-800/50 rounded-3xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[3rem] max-h-32 disabled:opacity-50 text-[15px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                }}
                rows={1}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || waitingForResponse}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center active:scale-95"
              style={{
                boxShadow: inputText.trim() && !waitingForResponse ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none',
              }}
            >
              <Send size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
