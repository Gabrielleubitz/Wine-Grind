import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { Message } from './ChatWidget';
import TypewriterText from './TypewriterText';
import logoSvg from '../../assets/W&G Logo.svg';

interface FluidConversationProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

const FluidConversation: React.FC<FluidConversationProps> = ({ 
  messages, 
  isLoading, 
  onSendMessage, 
  onClose 
}) => {
  const [inputText, setInputText] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [typewriterKey, setTypewriterKey] = useState(0);
  const [showInput, setShowInput] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 1 && !messages[0].isUser) {
      setCurrentMessage(messages[0].text);
      setTypewriterKey(prev => prev + 1);
    }
  }, []);

  // Handle new assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.isUser && lastMessage.text !== currentMessage) {
      setCurrentMessage(lastMessage.text);
      setTypewriterKey(prev => prev + 1);
      setShowInput(true);
    }
  }, [messages]);

  // Auto-focus input after typewriter completes
  const handleTypewriterComplete = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading && !isTransitioning) {
      const userMessage = inputText.trim();
      
      // Hide input and start transition
      setShowInput(false);
      setIsTransitioning(true);
      
      // Clear input
      setInputText('');
      
      // Fade out current message
      setTimeout(() => {
        setCurrentMessage('');
        onSendMessage(userMessage);
        setIsTransitioning(false);
      }, 400);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full h-full bg-white relative overflow-hidden">
      {/* Wine & Grind Logo - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <img 
          src={logoSvg}
          alt="Wine & Grind Logo" 
          className="h-8 w-auto opacity-60 hover:opacity-100 transition-opacity duration-200"
        />
      </div>

      {/* Close button - minimal and elegant */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-10 text-gray-400 hover:text-gray-600 transition-colors duration-200"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main content area - centered like Formless */}
      <div className="flex flex-col items-center justify-center min-h-full px-8 py-16">
        <div className="w-full max-w-3xl">
          
          {/* Message display area */}
          <div className="mb-16">
            {isLoading ? (
              // Loading state with blinking cursor
              <div className="text-gray-900 text-2xl md:text-3xl leading-relaxed font-light tracking-wide">
                <span className="animate-pulse text-red-500 font-mono">|</span>
              </div>
            ) : currentMessage ? (
              // Current message with typewriter effect
              <div className={`transition-all duration-400 ${
                isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
              }`}>
                <TypewriterText
                  key={typewriterKey}
                  text={currentMessage}
                  speed={35}
                  onComplete={handleTypewriterComplete}
                  className="text-gray-900 text-2xl md:text-3xl leading-relaxed font-light tracking-wide"
                />
              </div>
            ) : (
              // Empty state
              <div className="text-gray-900 text-2xl md:text-3xl leading-relaxed font-light tracking-wide">
                <span className="animate-pulse text-red-500 font-mono">|</span>
              </div>
            )}
          </div>

          {/* Input area - only show when ready */}
          {showInput && !isLoading && (
            <div className={`transition-all duration-300 ${
              isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
            }`}>
              <form onSubmit={handleSubmit} className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your response..."
                  className="w-full text-xl md:text-2xl font-light bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 py-4 pr-16"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isTransitioning}
                  style={{ 
                    fontFamily: 'inherit',
                    lineHeight: '1.5'
                  }}
                />
                
                {/* Subtle underline */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>
                
                {/* Send button - minimal */}
                <button 
                  type="submit"
                  disabled={!inputText.trim() || isTransitioning}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 disabled:text-gray-300 transition-colors duration-200"
                >
                  <Send className="h-6 w-6" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FluidConversation;