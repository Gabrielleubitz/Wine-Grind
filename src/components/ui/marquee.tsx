import React from 'react';

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  speed?: 'slow' | 'normal' | 'fast';
}

const Marquee = ({
  children,
  className = '',
  reverse = false,
  pauseOnHover = false,
  direction = 'left',
  speed = 'normal',
}: MarqueeProps) => {
  // Set the duration based on speed
  const getDuration = () => {
    switch (speed) {
      case 'slow':
        return '40s';
      case 'fast':
        return '20s';
      case 'normal':
      default:
        return '30s';
    }
  };

  // Determine the actual direction considering the reverse prop
  const actualDirection = reverse ? (direction === 'left' ? 'right' : 'left') : direction;

  return (
    <div
      className={`relative flex overflow-hidden ${className}`}
      style={{ '--duration': getDuration() } as React.CSSProperties}
    >
      <div
        className={`flex min-w-full shrink-0 items-center justify-around gap-4 py-4 animate-marquee ${
          pauseOnHover ? 'hover:[animation-play-state:paused]' : ''
        } ${actualDirection === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {children}
      </div>
      <div
        className={`flex min-w-full shrink-0 items-center justify-around gap-4 py-4 animate-marquee ${
          pauseOnHover ? 'hover:[animation-play-state:paused]' : ''
        } ${actualDirection === 'right' ? 'flex-row-reverse' : ''}`}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
};

export default Marquee;