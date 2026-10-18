import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  isDark?: boolean;
  showWordmark?: boolean;
}

/**
 * Original MADHAVAN AI Brand Identity:
 * Minimalist geometric M-shaped neural bridge with an electric blue (#2563EB) apex node,
 * paired with deep charcoal (#171717) wordmark in white mode.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  isDark = false,
  showWordmark = true,
}) => {
  const iconDimensions =
    size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <div className="inline-flex items-center gap-2.5 select-none shrink-0">
      <div
        className={`${iconDimensions} rounded-lg flex items-center justify-center border ${
          isDark
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-[#E5E7EB] shadow-2xs'
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
        >
          {/* Minimalist M architectural strokes */}
          <path
            d="M6.5 23.5V9.5L16 18.5L25.5 9.5V23.5"
            stroke={isDark ? '#F8FAFC' : '#171717'}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Electric Blue AI apex accent */}
          <circle cx="16" cy="9.5" r="2.6" fill="#2563EB" />
          <path
            d="M16 12.1V18.5"
            stroke="#2563EB"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <span
          className={`${textSize} font-bold tracking-tight whitespace-nowrap ${
            isDark ? 'text-white' : 'text-[#171717]'
          }`}
        >
          MADHAVAN <span className="text-[#2563EB]">AI</span>
        </span>
      )}
    </div>
  );
};
