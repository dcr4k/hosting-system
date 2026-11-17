import React from 'react';

interface BrandLogo47Props {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

/**
 * Custom geometric monogram uniting the numbers "4" and "7" in color
 * while keeping the platform typography and surrounding system in neutral slate tones.
 */
export const BrandLogo47: React.FC<BrandLogo47Props> = ({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
}) => {
  const iconDimensions =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg'
      : size === 'lg'
      ? 'w-11 h-11 rounded-xl'
      : 'w-9 h-9 rounded-lg';

  const textSize =
    size === 'sm'
      ? 'text-base'
      : size === 'lg'
      ? 'text-xl sm:text-2xl'
      : 'text-base sm:text-lg';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Interlocked "4" + "7" Color Monogram Badge */}
      <div
        className={`${iconDimensions} bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-xs relative overflow-hidden`}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
          aria-hidden="true"
        >
          <defs>
            {/* Gradient for the "4" (Cyan/Sky to Royal Blue) */}
            <linearGradient
              id="grad47_four"
              x1="10"
              y1="12"
              x2="38"
              y2="52"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            {/* Gradient for the "7" united with "4" (Emerald/Amber warm accent) */}
            <linearGradient
              id="grad47_seven"
              x1="26"
              y1="12"
              x2="54"
              y2="52"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="55%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Subtle hospitality roof arc above the 47 */}
          <path
            d="M14 14L32 6L50 14"
            stroke="#475569"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />

          {/* Number "4" — Left diagonal, horizontal crossbar uniting into the 7, and vertical stem */}
          <path
            d="M27 16L12 37H35"
            stroke="url(#grad47_four)"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M27 16V50"
            stroke="url(#grad47_four)"
            strokeWidth="6.5"
            strokeLinecap="round"
          />

          {/* Number "7" — Interlocking top bar starting from the "4" stem and sweeping down */}
          <path
            d="M27 16H51L36 50"
            stroke="url(#grad47_seven)"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Union node highlight where 4 and 7 meet */}
          <circle cx="27" cy="16" r="3.2" fill="#F8FAFC" />
        </svg>
      </div>

      {showText && (
        <div className="min-w-0 flex flex-col justify-center">
          <div
            className={`${textSize} font-bold tracking-tight text-slate-900 leading-none truncate flex items-baseline`}
          >
            <span className="font-extrabold text-slate-900">47</span>
            <span className="font-semibold text-slate-700">hospedagens</span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-mono uppercase text-slate-400 truncate mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
