
import React, { useEffect, useRef } from 'react';
import { MessageCircle, X, Loader2, Send } from 'lucide-react';
import { ChatMessage } from '../types';

interface ZotBotChatProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  history: ChatMessage[];
  input: string;
  setInput: (input: string) => void;
  onSend: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const ZotBotChat: React.FC<ZotBotChatProps> = ({
  isOpen,
  setIsOpen,
  history,
  input,
  setInput,
  onSend,
  isLoading
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen]);

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all hover:scale-110 animate-bounce-subtle ring-4 ring-green-100 dark:ring-green-900/30"
        title="Open Chatbot"
        aria-label="Open ZOT Assistant Chat"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <MessageCircle className="w-8 h-8" />
      </button>

      {/* Chat Overlay Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
        >
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[85vh] border border-gray-200 dark:border-gray-700">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-green-600 border-b border-green-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 id="chat-title" className="text-lg font-bold text-white">ZOTBOT</h3>
                  <p className="text-xs text-green-100">AI Support Chat</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-3">
              {history.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6">
                  <MessageCircle className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-700" />
                  <p className="text-sm italic">
                    Hello! I'm ZOTBOT. Ask me anything about the app features or the ECZ syllabus.
                  </p>
                </div>
              )}
              {history.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-green-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-green-600 dark:text-green-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Typing...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <form onSubmit={onSend} className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
                  disabled={isLoading}
                  autoFocus
                  aria-label="Type your question for the assistant"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ZotBotChat;
