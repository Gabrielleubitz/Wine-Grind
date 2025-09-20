import React, { useState, useEffect } from 'react';

interface WineGlassButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

const WineGlassButton: React.FC<WineGlassButtonProps> = ({ onClick, isOpen }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHopping, setIsHopping] = useState(false);

  // Auto-hop every 8 seconds to grab attention
  useEffect(() => {
    const hopInterval = setInterval(() => {
      if (!isHovered && !isOpen) {
        setIsHopping(true);
        setTimeout(() => setIsHopping(false), 1200); // Duration of hop animation
      }
    }, 8000);

    return () => clearInterval(hopInterval);
  }, [isHovered, isOpen]);

  // Trigger hop on hover for immediate feedback
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!isHopping) {
      setIsHopping(true);
      setTimeout(() => setIsHopping(false), 600);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="relative">
      {/* Chat Bubble - Fixed positioning to prevent cutoff */}
      <div className="absolute -top-16 right-0 transform translate-x-2 mb-2">
        <div className={`bg-gradient-to-r from-blue-500 to-red-500 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium whitespace-nowrap relative border border-white/20 min-w-max transition-all duration-300 ${
          isHopping ? 'animate-bounce' : ''
        }`}>
          💬 Chat with me!
          {/* Arrow pointing to wine glass - positioned on the right side */}
          <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-gradient-to-r from-blue-500 to-red-500 border-r border-b border-white/20"></div>
        </div>
      </div>

      {/* Wine Glass Button using your exact SVG */}
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative transition-all duration-300 group ${
          isHovered ? 'scale-110' : 'scale-100'
        } ${
          isHopping ? 'animate-hop' : ''
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {/* Your exact wine glass SVG */}
        <div className="w-16 h-16 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
            {/* Wine glass bowl */}
            <path 
              d="M25 20 L75 20 L72 45 C72 55 63 63 50 63 C37 63 28 55 28 45 L25 20 Z" 
              fill="#E0F7FF" 
              stroke="#2D1B20" 
              strokeWidth="3" 
              className={`transition-colors ${isHovered ? 'fill-blue-50' : ''}`}
            />
            
            {/* Red wine inside - with sloshing effect when hopping */}
            <path 
              d="M28 25 L72 25 L70 43 C70 51 61 57 50 57 C39 57 30 51 30 43 L28 25 Z" 
              fill="#DC2626" 
              className={`transition-all duration-300 ${
                isHovered ? 'fill-red-500' : ''
              } ${
                isHopping ? 'animate-wine-slosh' : ''
              }`}
            />
            
            {/* Glass stem */}
            <rect 
              x="47" 
              y="63" 
              width="6" 
              height="20" 
              fill="#E0F7FF" 
              stroke="#2D1B20" 
              strokeWidth="3"
            />
            
            {/* Glass base */}
            <ellipse 
              cx="50" 
              cy="83" 
              rx="15" 
              ry="4" 
              fill="#E0F7FF" 
              stroke="#2D1B20" 
              strokeWidth="3"
            />
            
            {/* Left eye - with excited blink during hop */}
            <circle cx="42" cy="38" r="4" fill="white" />
            <circle cx="42" cy="38" r="3" fill="#2D1B20" />
            <circle 
              cx="43" 
              cy="36.5" 
              r="1.2" 
              fill="white" 
              className={`${isHovered || isHopping ? 'animate-bounce' : ''}`}
            />
            
            {/* Right eye - with excited blink during hop */}
            <circle cx="58" cy="38" r="4" fill="white" />
            <circle cx="58" cy="38" r="3" fill="#2D1B20" />
            <circle 
              cx="59" 
              cy="36.5" 
              r="1.2" 
              fill="white" 
              className={`${isHovered || isHopping ? 'animate-bounce' : ''}`}
              style={{ animationDelay: '0.1s' }}
            />
            
            {/* Closed mouth (normal state) */}
            <path 
              d="M45 48 Q50 53 55 48" 
              stroke="#2D1B20" 
              strokeWidth="2.5" 
              fill="none" 
              strokeLinecap="round" 
              className={`transition-opacity duration-300 ${isHovered || isHopping ? 'opacity-0' : 'opacity-100'}`}
            />
            
            {/* Open mouth (hover/hop state) */}
            <ellipse 
              cx="50" 
              cy="50" 
              rx="4" 
              ry="6" 
              fill="#2D1B20" 
              className={`transition-opacity duration-300 ${isHovered || isHopping ? 'opacity-100' : 'opacity-0'}`}
            />
            
            {/* Blush cheeks - more prominent during hop */}
            <ellipse 
              cx="35" 
              cy="45" 
              rx="3" 
              ry="2" 
              fill="#FF69B4" 
              className={`transition-opacity duration-300 ${isHopping ? 'opacity-90' : 'opacity-70'}`}
            />
            <ellipse 
              cx="65" 
              cy="45" 
              rx="3" 
              ry="2" 
              fill="#FF69B4" 
              className={`transition-opacity duration-300 ${isHopping ? 'opacity-90' : 'opacity-70'}`}
            />
            
            {/* Glass shine effect */}
            <ellipse cx="38" cy="30" rx="4" ry="8" fill="white" opacity="0.3" />
          </svg>
        </div>
        
        {/* Enhanced sparkles around the glass when hovered or hopping */}
        {(isHovered || isHopping) && (
          <>
            <div className="absolute -top-2 -left-2 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute -top-1 -right-3 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute -bottom-2 -left-3 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
            <div className="absolute -bottom-1 -right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
            
            {/* Extra sparkles during hop */}
            {isHopping && (
              <>
                <div className="absolute top-0 left-1/2 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.1s' }}></div>
                <div className="absolute bottom-0 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute top-1/2 right-0 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </>
            )}
          </>
        )}
      </button>

      {/* Custom CSS for hop animation */}
      <style jsx>{`
        @keyframes hop {
          0%, 100% { 
            transform: translateY(0) scale(1); 
          }
          25% { 
            transform: translateY(-8px) scale(1.05); 
          }
          50% { 
            transform: translateY(-12px) scale(1.1); 
          }
          75% { 
            transform: translateY(-6px) scale(1.05); 
          }
        }
        
        @keyframes wine-slosh {
          0%, 100% { 
            transform: skewX(0deg); 
          }
          25% { 
            transform: skewX(-2deg); 
          }
          75% { 
            transform: skewX(2deg); 
          }
        }
        
        .animate-hop {
          animation: hop 0.6s ease-in-out;
        }
        
        .animate-wine-slosh {
          animation: wine-slosh 0.6s ease-in-out;
          transform-origin: center bottom;
        }
      `}</style>
    </div>
  );
};

export default WineGlassButton;