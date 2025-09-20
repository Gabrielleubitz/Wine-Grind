import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  showCursor?: boolean;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  speed = 40, 
  onComplete,
  className = "",
  showCursor = true
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBlinkingCursor, setShowBlinkingCursor] = useState(true);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
    setShowBlinkingCursor(true);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const char = text[currentIndex];
      
      // Add natural pauses for punctuation
      let delay = speed;
      if (char === '.' || char === '!' || char === '?') {
        delay = speed * 8; // Longer pause for sentence endings
      } else if (char === ',' || char === ';') {
        delay = speed * 4; // Medium pause for commas
      } else if (char === '\n') {
        delay = speed * 6; // Pause for line breaks
      } else if (char === ' ') {
        delay = speed * 0.8; // Slightly faster for spaces
      }

      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + char);
        setCurrentIndex(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length) {
      // Hide cursor after completion
      setTimeout(() => {
        setShowBlinkingCursor(false);
        if (onComplete) {
          onComplete();
        }
      }, 500);
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <div className={className}>
      <span className="whitespace-pre-wrap">{displayedText}</span>
      {showCursor && showBlinkingCursor && (
        <span className="animate-pulse text-red-400 font-mono">|</span>
      )}
    </div>
  );
};

export default TypewriterText;