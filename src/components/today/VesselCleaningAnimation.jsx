import React from 'react';

/**
 * Animated SVG component depicting a person/hand actively scrubbing and cleaning a vessel
 * with soap foam, floating bubbles, and gleaming sparkles.
 */
export function VesselCleaningAnimation({
  isCleaned = false, // When marked Present, shows shining sparkling vessel
  isAbsent = false,
  className = '',
}) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <style>{`
        @keyframes scrubMotion {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(6px, -2px) rotate(8deg); }
          50% { transform: translate(-4px, 3px) rotate(-6deg); }
          75% { transform: translate(5px, 2px) rotate(4deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes bubbleRise1 {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          40% { opacity: 0.9; }
          80% { transform: translateY(-24px) scale(1.1); opacity: 0.7; }
          100% { transform: translateY(-36px) scale(1.3); opacity: 0; }
        }
        @keyframes bubbleRise2 {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          50% { opacity: 0.8; }
          85% { transform: translateY(-20px) scale(1); opacity: 0.6; }
          100% { transform: translateY(-32px) scale(1.2); opacity: 0; }
        }
        @keyframes sparkleTwinkle {
          0%, 100% { transform: scale(0.4) rotate(0deg); opacity: 0.2; }
          50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
        }
        @keyframes waterRipples {
          0% { transform: scaleX(0.95); opacity: 0.5; }
          50% { transform: scaleX(1.05); opacity: 0.8; }
          100% { transform: scaleX(0.95); opacity: 0.5; }
        }
        .scrubbing-sponge {
          animation: scrubMotion 1.4s ease-in-out infinite;
          transform-origin: 50% 50%;
        }
        .bubble-1 {
          animation: bubbleRise1 2.2s ease-in infinite;
        }
        .bubble-2 {
          animation: bubbleRise2 1.8s ease-in infinite 0.7s;
        }
        .bubble-3 {
          animation: bubbleRise1 2.5s ease-in infinite 1.2s;
        }
        .sparkle-star {
          animation: sparkleTwinkle 1.8s ease-in-out infinite;
          transform-origin: center;
        }
        .water-wave {
          animation: waterRipples 2s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      <svg
        viewBox="0 0 160 120"
        className="w-full h-full max-h-28 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Pot Gradients */}
          <linearGradient id="potGrad" x1="20" y1="40" x2="140" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="35%" stopColor="#94A3B8" />
            <stop offset="70%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="potRimGrad" x1="15" y1="35" x2="145" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="spongeGrad" x1="0" y1="0" x2="28" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>
          <linearGradient id="foamGrad" x1="0" y1="0" x2="0" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#BAE6FD" />
          </linearGradient>
        </defs>

        {/* 1. Counter / Sink Surface Shadow */}
        <ellipse cx="80" cy="106" rx="55" ry="7" fill="#000000" fillOpacity="0.25" />

        {/* 2. Vessel / Pot Body */}
        <g>
          {/* Pot Handles */}
          <path
            d="M22 55 C 10 55, 10 70, 24 70"
            stroke="#64748B"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M138 55 C 150 55, 150 70, 136 70"
            stroke="#64748B"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* Pot Body */}
          <path
            d="M26 44 L 34 92 C 36 99, 44 104, 55 104 L 105 104 C 116 104, 124 99, 126 92 L 134 44 Z"
            fill="url(#potGrad)"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Pot Highlight Sheen */}
          <path
            d="M48 48 L 54 98 C 55 101, 58 102, 62 102 L 68 102 C 64 102, 60 100, 58 96 L 52 48 Z"
            fill="#FFFFFF"
            fillOpacity="0.28"
          />

          {/* Pot Rim */}
          <ellipse
            cx="80"
            cy="44"
            rx="54"
            ry="11"
            fill="url(#potRimGrad)"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Pot Interior Depth */}
          <ellipse
            cx="80"
            cy="44"
            rx="48"
            ry="8.5"
            fill="#1E293B"
            fillOpacity="0.4"
          />

          {/* Water / Soap Suds Inside */}
          <ellipse
            cx="80"
            cy="45"
            rx="44"
            ry="7"
            fill="#38BDF8"
            fillOpacity="0.45"
            className="water-wave"
          />
        </g>

        {/* 3. Scrubbing Animation Elements */}
        {!isCleaned ? (
          <g>
            {/* White Suds on Rim */}
            <path
              d="M42 43 Q 48 37 56 42 Q 64 36 72 41 Q 80 35 90 42 Q 100 37 108 43 Q 116 38 122 44"
              stroke="#FFFFFF"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />

            {/* Floating Soap Bubbles */}
            <circle cx="58" cy="40" r="4" fill="url(#foamGrad)" stroke="#38BDF8" strokeWidth="0.8" className="bubble-1" />
            <circle cx="95" cy="38" r="5.5" fill="url(#foamGrad)" stroke="#38BDF8" strokeWidth="0.8" className="bubble-2" />
            <circle cx="76" cy="36" r="3.5" fill="url(#foamGrad)" stroke="#38BDF8" strokeWidth="0.8" className="bubble-3" />
            <circle cx="112" cy="42" r="4.5" fill="url(#foamGrad)" stroke="#38BDF8" strokeWidth="0.8" className="bubble-2" />

            {/* Person's Hand & Scrub Sponge doing circular motion */}
            <g className="scrubbing-sponge">
              {/* Hand / Arm */}
              <path
                d="M112 18 C 104 22, 94 30, 88 36 L 98 42 C 102 36, 112 28, 122 22 Z"
                fill="#FDBA74"
                stroke="#EA580C"
                strokeWidth="1"
              />
              
              {/* Green/Yellow Scrub Sponge */}
              <rect
                x="76"
                y="32"
                width="24"
                height="13"
                rx="4"
                fill="url(#spongeGrad)"
                stroke="#854D0E"
                strokeWidth="1.2"
              />
              <rect
                x="76"
                y="41"
                width="24"
                height="4"
                rx="1.5"
                fill="#15803D"
              />

              {/* Suds / Foam under sponge */}
              <circle cx="77" cy="44" r="3" fill="#FFFFFF" opacity="0.9" />
              <circle cx="85" cy="46" r="4" fill="#FFFFFF" opacity="0.9" />
              <circle cx="96" cy="44" r="3.5" fill="#FFFFFF" opacity="0.9" />
            </g>
          </g>
        ) : (
          /* When Cleaned (Present): Gleaming Sparkles Burst */
          <g>
            {/* Sparkle Star 1 */}
            <g className="sparkle-star" style={{ transformOrigin: '48px 46px' }}>
              <path
                d="M48 38 L 50 44 L 56 46 L 50 48 L 48 54 L 46 48 L 40 46 L 46 44 Z"
                fill="#FACC15"
              />
              <circle cx="48" cy="46" r="1.5" fill="#FFFFFF" />
            </g>

            {/* Sparkle Star 2 */}
            <g className="sparkle-star" style={{ transformOrigin: '114px 48px', animationDelay: '0.6s' }}>
              <path
                d="M114 40 L 116 46 L 122 48 L 116 50 L 114 56 L 112 50 L 106 48 L 112 46 Z"
                fill="#38BDF8"
              />
              <circle cx="114" cy="48" r="1.5" fill="#FFFFFF" />
            </g>

            {/* Sparkle Star 3 */}
            <g className="sparkle-star" style={{ transformOrigin: '82px 76px', animationDelay: '1.1s' }}>
              <path
                d="M82 68 L 84 74 L 90 76 L 84 78 L 82 84 L 80 78 L 74 76 L 80 74 Z"
                fill="#4ADE80"
              />
              <circle cx="82" cy="76" r="1.5" fill="#FFFFFF" />
            </g>

            {/* Gleam Line */}
            <path
              d="M38 52 C 55 46, 85 46, 120 54"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
