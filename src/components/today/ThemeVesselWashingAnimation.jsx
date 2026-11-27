import React, { useEffect, useState, useId } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Theme-Adaptive Vessel Washing Animation
 *
 * Displays an animated cookware vessel being washed with water ripples,
 * ascending soap bubbles, wiping scrub motion, and sparkling clean glints.
 *
 * Features:
 * - Adapts automatically to Day (Warm Orange/Amber/Coral) vs. Night (Cool Blue/Indigo/Cyan) brand theme.
 * - Optimized for both Light & Dark surface contrast (WCAG accessible).
 * - Respects 'prefers-reduced-motion: reduce' with a clean, static, polished vessel fallback.
 * - Lightweight, non-intrusive SVG with CSS keyframe acceleration and unique instance gradient IDs.
 */
export function ThemeVesselWashingAnimation({
  size = 'md', // 'sm' | 'md' | 'lg' | 'badge'
  className = '',
  showBadge = false,
  badgeText = 'Washing Duty Active',
  mode, // optional override: 'day' | 'night'
}) {
  const { isDaytime, isDark, timeTheme } = useTheme();
  const uid = useId().replace(/:/g, ''); // unique prefix for SVG defs

  // Listen for user OS reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setPrefersReducedMotion(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } else if (mq.addListener) {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  const isDay = mode ? mode === 'day' : (isDaytime || timeTheme === 'day');

  // Dimension presets
  const dimensions = {
    badge: { width: 44, height: 34, svgClass: 'w-[44px] h-[34px]' },
    sm: { width: 54, height: 42, svgClass: 'w-[54px] h-[42px]' },
    md: { width: 72, height: 56, svgClass: 'w-[72px] h-[56px]' },
    lg: { width: 96, height: 74, svgClass: 'w-[96px] h-[74px]' },
  }[size] || { width: 54, height: 42, svgClass: 'w-[54px] h-[42px]' };

  // Refined Subtle Monochrome Palette
  const themeColors = {
    waterGradStart: isDark ? '#64748B' : '#94A3B8',
    waterGradEnd: isDark ? '#334155' : '#64748B',
    waterWave: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.2)',
    bubbleStroke: isDark ? '#E2E8F0' : '#475569',
    bubbleFill: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.75)',
    spongeTop: isDark ? '#94A3B8' : '#64748B',
    spongeBase: isDark ? '#475569' : '#334155',
    spongeStroke: isDark ? '#64748B' : '#1E293B',
    sparkleFill: isDark ? '#FFFFFF' : '#111214',
    sparkleGlow: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.3)',
    potGlow: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    rimStroke: isDark ? '#94A3B8' : '#475569',
    badgeBg: isDark ? 'bg-white/10 text-[#F5F5F7] border-white/15' : 'bg-black/5 text-[#111214] border-black/10',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 select-none relative ${className}`}
      role="img"
      aria-label="Vessel washing animation for active duty washer"
    >
      <style>{`
        @keyframes vesselScrubWobble {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(2deg) translateY(-0.8px); }
          50% { transform: rotate(-1.8deg) translateY(0.4px); }
          75% { transform: rotate(1.2deg) translateY(-0.4px); }
        }
        @keyframes vesselWaterRipple {
          0%, 100% { transform: scaleX(0.96) translateX(0); opacity: 0.75; }
          50% { transform: scaleX(1.04) translateX(1px); opacity: 0.95; }
        }
        @keyframes vesselBubbleRise1 {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          25% { opacity: 0.9; }
          75% { opacity: 0.75; }
          100% { transform: translate(-3px, -18px) scale(1.15); opacity: 0; }
        }
        @keyframes vesselBubbleRise2 {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
          30% { opacity: 0.95; }
          80% { opacity: 0.7; }
          100% { transform: translate(4px, -22px) scale(1.25); opacity: 0; }
        }
        @keyframes vesselBubbleRise3 {
          0% { transform: translate(0, 0) scale(0.55); opacity: 0; }
          35% { opacity: 0.85; }
          85% { opacity: 0.65; }
          100% { transform: translate(1px, -15px) scale(1.1); opacity: 0; }
        }
        @keyframes vesselSpongeScrub {
          0%, 100% { transform: translate(0, 0) rotate(-4deg); }
          25% { transform: translate(7px, -2px) rotate(6deg); }
          50% { transform: translate(12px, 1px) rotate(-3deg); }
          75% { transform: translate(4px, 2px) rotate(4deg); }
        }
        @keyframes vesselSparkleTwinkle1 {
          0%, 100% { transform: scale(0.3) rotate(0deg); opacity: 0.15; }
          50% { transform: scale(1.1) rotate(45deg); opacity: 1; }
        }
        @keyframes vesselSparkleTwinkle2 {
          0%, 100% { transform: scale(0.3) rotate(0deg); opacity: 0.2; }
          50% { transform: scale(1.2) rotate(-45deg); opacity: 0.95; }
        }
        @keyframes vesselAuraPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.98); }
          50% { opacity: 0.75; transform: scale(1.03); }
        }

        /* Reduced motion: smoothly lock all animations to a static clean display */
        @media (prefers-reduced-motion: reduce) {
          .vessel-anim-rock,
          .vessel-anim-water,
          .vessel-anim-bubble-1,
          .vessel-anim-bubble-2,
          .vessel-anim-bubble-3,
          .vessel-anim-sponge,
          .vessel-anim-sparkle-1,
          .vessel-anim-sparkle-2,
          .vessel-anim-aura {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* SVG Animation Container */}
      <div className={`relative flex items-center justify-center shrink-0 ${dimensions.svgClass}`}>
        {/* Soft Ambient Glow Halo Behind Pot */}
        <div
          className="absolute inset-0 rounded-full blur-md pointer-events-none transition-all duration-300"
          style={{
            background: `radial-gradient(circle, ${themeColors.potGlow} 0%, transparent 70%)`,
            animation: prefersReducedMotion ? 'none' : 'vesselAuraPulse 3s ease-in-out infinite',
          }}
        />

        <svg
          viewBox="0 0 100 80"
          className="w-full h-full overflow-visible relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Vessel Metallic Shading */}
            <linearGradient id={`${uid}-pot`} x1="15" y1="26" x2="85" y2="72" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isDark ? '#334155' : '#64748B'} />
              <stop offset="35%" stopColor={isDark ? '#64748B' : '#CBD5E1'} />
              <stop offset="70%" stopColor={isDark ? '#475569' : '#94A3B8'} />
              <stop offset="100%" stopColor={isDark ? '#1E293B' : '#475569'} />
            </linearGradient>

            {/* Vessel Metallic Rim */}
            <linearGradient id={`${uid}-rim`} x1="12" y1="22" x2="88" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isDark ? '#475569' : '#94A3B8'} />
              <stop offset="50%" stopColor={isDark ? '#E2E8F0' : '#FFFFFF'} />
              <stop offset="100%" stopColor={isDark ? '#334155' : '#64748B'} />
            </linearGradient>

            {/* Theme Water Gradient */}
            <linearGradient id={`${uid}-water`} x1="18" y1="28" x2="82" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={themeColors.waterGradStart} />
              <stop offset="100%" stopColor={themeColors.waterGradEnd} />
            </linearGradient>

            {/* Soap Bubble Shimmer */}
            <linearGradient id={`${uid}-bubble`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="60%" stopColor={themeColors.bubbleFill} />
              <stop offset="100%" stopColor={themeColors.waterGradStart} stopOpacity="0.3" />
            </linearGradient>

            {/* Sponge Texture Gradient */}
            <linearGradient id={`${uid}-sponge`} x1="0" y1="0" x2="16" y2="10" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={themeColors.spongeTop} />
              <stop offset="100%" stopColor={themeColors.spongeBase} />
            </linearGradient>
          </defs>

          {/* 1. Base Countertop Shadow */}
          <ellipse cx="50" cy="72" rx="34" ry="4.5" fill="#000000" fillOpacity={isDark ? '0.35' : '0.15'} />

          {/* 2. Vessel Pot Group (Gently rocks during wash) */}
          <g
            style={{
              animation: prefersReducedMotion ? 'none' : 'vesselScrubWobble 2s ease-in-out infinite',
              transformOrigin: '50px 50px',
            }}
          >
            {/* Left Handle */}
            <path
              d="M15 36 C 8 36, 8 46, 17 46"
              stroke={isDark ? '#94A3B8' : '#64748B'}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Right Handle */}
            <path
              d="M85 36 C 92 36, 92 46, 83 46"
              stroke={isDark ? '#94A3B8' : '#64748B'}
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Vessel Body (Deep Curved Kadai/Pot) */}
            <path
              d="M18 28 L 24 62 C 26 67, 32 70, 40 70 L 60 70 C 68 70, 74 67, 76 62 L 82 28 Z"
              fill={`url(#${uid}-pot)`}
              stroke={isDark ? '#1E293B' : '#475569'}
              strokeWidth="1.2"
            />

            {/* Specular Curved Sheen on Left Side */}
            <path
              d="M29 32 L 34 64 C 35 66, 38 67, 41 67 L 45 67 C 42 67, 39 65, 38 62 L 33 32 Z"
              fill="#FFFFFF"
              fillOpacity={isDark ? '0.22' : '0.4'}
            />

            {/* Pot Interior Rim Depth */}
            <ellipse cx="50" cy="28" rx="33" ry="7.5" fill={isDark ? '#0F172A' : '#1E293B'} fillOpacity="0.55" />

            {/* Water Wave Surface Inside Rim */}
            <ellipse
              cx="50"
              cy="28.5"
              rx="30"
              ry="6"
              fill={`url(#${uid}-water)`}
              fillOpacity="0.65"
              style={{
                animation: prefersReducedMotion ? 'none' : 'vesselWaterRipple 1.8s ease-in-out infinite',
                transformOrigin: '50px 28.5px',
              }}
            />

            {/* Rim Ring */}
            <ellipse
              cx="50"
              cy="28"
              rx="33"
              ry="7"
              fill="none"
              stroke={`url(#${uid}-rim)`}
              strokeWidth="1.5"
            />
          </g>

          {/* 3. Ascending Soap Suds & Bubbles */}
          <g>
            {/* Bubble 1 (Left-Center) */}
            <g
              style={{
                animation: prefersReducedMotion ? 'none' : 'vesselBubbleRise1 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                transformOrigin: '36px 26px',
              }}
            >
              <circle
                cx="36"
                cy="26"
                r="3.5"
                fill={`url(#${uid}-bubble)`}
                stroke={themeColors.bubbleStroke}
                strokeWidth="0.75"
              />
              <circle cx="34.8" cy="24.8" r="0.8" fill="#FFFFFF" opacity="0.9" />
            </g>

            {/* Bubble 2 (Right-Center, Higher Delay) */}
            <g
              style={{
                animation: prefersReducedMotion ? 'none' : 'vesselBubbleRise2 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.7s',
                transformOrigin: '64px 24px',
              }}
            >
              <circle
                cx="64"
                cy="24"
                r="4.2"
                fill={`url(#${uid}-bubble)`}
                stroke={themeColors.bubbleStroke}
                strokeWidth="0.8"
              />
              <circle cx="62.5" cy="22.5" r="1.1" fill="#FFFFFF" opacity="0.95" />
            </g>

            {/* Bubble 3 (Center Small) */}
            <g
              style={{
                animation: prefersReducedMotion ? 'none' : 'vesselBubbleRise3 1.9s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.3s',
                transformOrigin: '48px 23px',
              }}
            >
              <circle
                cx="48"
                cy="23"
                r="2.8"
                fill={`url(#${uid}-bubble)`}
                stroke={themeColors.bubbleStroke}
                strokeWidth="0.65"
              />
              <circle cx="47.2" cy="22.2" r="0.7" fill="#FFFFFF" opacity="0.85" />
            </g>

            {/* Bubble 4 (Far Left Micro) */}
            <g
              style={{
                animation: prefersReducedMotion ? 'none' : 'vesselBubbleRise1 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.4s',
                transformOrigin: '27px 27px',
              }}
            >
              <circle
                cx="27"
                cy="27"
                r="2.2"
                fill={`url(#${uid}-bubble)`}
                stroke={themeColors.bubbleStroke}
                strokeWidth="0.6"
              />
            </g>
          </g>

          {/* 4. Scrub Sponge & Foam Suds (Circular arc scrub) */}
          <g
            style={{
              animation: prefersReducedMotion ? 'none' : 'vesselSpongeScrub 1.6s ease-in-out infinite',
              transformOrigin: '50px 24px',
            }}
          >
            {/* Sponge Pad Body */}
            <rect
              x="44"
              y="18"
              width="18"
              height="10"
              rx="3"
              fill={`url(#${uid}-sponge)`}
              stroke={themeColors.spongeStroke}
              strokeWidth="0.8"
            />
            {/* Sponge Bottom Scrub Layer */}
            <rect
              x="44"
              y="25"
              width="18"
              height="3"
              rx="1.2"
              fill={themeColors.spongeBase}
            />
            {/* Suds Froth Around Sponge */}
            <circle cx="43" cy="26" r="2.2" fill="#FFFFFF" fillOpacity="0.95" />
            <circle cx="49" cy="28.5" r="2.6" fill="#FFFFFF" fillOpacity="0.9" />
            <circle cx="57" cy="28" r="2.4" fill="#FFFFFF" fillOpacity="0.9" />
            <circle cx="63" cy="26" r="2" fill="#FFFFFF" fillOpacity="0.9" />
          </g>

          {/* 5. Sparkling Clean Twinkle Glints */}
          {/* Sparkle 1 (Upper Right Rim) */}
          <g
            style={{
              animation: prefersReducedMotion ? 'none' : 'vesselSparkleTwinkle1 1.9s ease-in-out infinite 0.2s',
              transformOrigin: '76px 20px',
            }}
          >
            <path
              d="M76 14 L 77.5 18.5 L 82 20 L 77.5 21.5 L 76 26 L 74.5 21.5 L 70 20 L 74.5 18.5 Z"
              fill={themeColors.sparkleFill}
            />
            <circle cx="76" cy="20" r="1" fill="#FFFFFF" />
          </g>

          {/* Sparkle 2 (Lower Left Belly) */}
          <g
            style={{
              animation: prefersReducedMotion ? 'none' : 'vesselSparkleTwinkle2 2.3s ease-in-out infinite 1.1s',
              transformOrigin: '30px 48px',
            }}
          >
            <path
              d="M30 43 L 31.2 46.8 L 35 48 L 31.2 49.2 L 30 53 L 28.8 49.2 L 25 48 L 28.8 46.8 Z"
              fill={themeColors.sparkleGlow}
            />
            <circle cx="30" cy="48" r="0.8" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Optional Badge Label */}
      {showBadge && (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs uppercase tracking-wider shrink-0 ${themeColors.badgeBg}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>{badgeText}</span>
        </span>
      )}
    </div>
  );
}
