import React from 'react';

interface InstaCleanerLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<InstaCleanerLogoProps['size']>, string> = {
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const InstaCleanerLogo: React.FC<InstaCleanerLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${SIZE_CLASSES[size]} ${className}`}
    >
      {/* Subtle Ambient Glow */}
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-[#F59E0B] via-[#EC4899] to-[#8B5CF6] opacity-55 blur-xs pointer-events-none" />

      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-full h-full drop-shadow-md"
        aria-label="Insta Cleaner App Icon"
      >
        <defs>
          <linearGradient
            id={`bg_${uniqueId}`}
            x1="10"
            y1="118"
            x2="118"
            y2="10"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="28%" stopColor="#F43F5E" />
            <stop offset="62%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          <linearGradient
            id={`sheen_${uniqueId}`}
            x1="14"
            y1="10"
            x2="86"
            y2="92"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id={`badge_${uniqueId}`}
            x1="74"
            y1="74"
            x2="116"
            y2="116"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>

        {/* Squircle Base */}
        <rect
          x="6"
          y="6"
          width="116"
          height="116"
          rx="32"
          fill={`url(#bg_${uniqueId})`}
        />
        <rect
          x="7.5"
          y="7.5"
          width="113"
          height="113"
          rx="30.5"
          stroke={`url(#sheen_${uniqueId})`}
          strokeWidth="3"
        />

        {/* Camera Body */}
        <rect
          x="27"
          y="27"
          width="74"
          height="74"
          rx="21"
          fill="#0B1020"
          fillOpacity="0.18"
          stroke="#FFFFFF"
          strokeWidth="6.5"
        />

        {/* Center Camera Lens */}
        <circle
          cx="64"
          cy="64"
          r="18"
          stroke="#FFFFFF"
          strokeWidth="6.5"
          fill="none"
        />

        {/* Top-Right Clean Sparkle Star (Flash) */}
        <path
          d="M84.5 36.5L86.4 41.6L91.5 43.5L86.4 45.4L84.5 50.5L82.6 45.4L77.5 43.5L82.6 41.6L84.5 36.5Z"
          fill="#FFFFFF"
        />

        {/* Bottom-Right Verified Unfollow / Cleaner Badge */}
        <circle cx="95" cy="95" r="22" fill="#0B1020" />
        <circle cx="95" cy="95" r="18.5" fill={`url(#badge_${uniqueId})`} />
        <path
          d="M87.5 95.2L92.5 100.2L103 89.7"
          stroke="#FFFFFF"
          strokeWidth="5.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
