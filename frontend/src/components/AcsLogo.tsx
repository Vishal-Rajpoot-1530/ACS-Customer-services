import React from 'react';

interface AcsLogoProps {
  className?: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  showText?: boolean;
}

export const AcsLogo: React.FC<AcsLogoProps> = ({ 
  className = '', 
  size = 'xl',
}) => {
  const hasExplicitDimensionClass = className.includes('w-') || className.includes('h-');

  let defaultPresetClasses = '';
  if (!hasExplicitDimensionClass && typeof size !== 'number') {
    switch (size) {
      case 'sm': defaultPresetClasses = 'w-10 h-10 sm:w-12 sm:h-12'; break;
      case 'md': defaultPresetClasses = 'w-12 h-12 sm:w-16 sm:h-16'; break;
      case 'lg': defaultPresetClasses = 'w-16 h-16 sm:w-20 sm:h-20'; break;
      case 'xl': defaultPresetClasses = 'w-12 h-12 xs:w-14 xs:h-14 sm:w-18 sm:h-18 md:w-22 md:h-22'; break;
      case '2xl': defaultPresetClasses = 'w-24 h-24 sm:w-32 sm:h-32'; break;
      case 'hero': defaultPresetClasses = 'w-28 h-28 xs:w-32 xs:h-32 sm:w-40 sm:h-40 md:w-44 md:h-44'; break;
      default: defaultPresetClasses = 'w-14 h-14 sm:w-20 sm:h-20';
    }
  }

  const inlineStyle = (typeof size === 'number') 
    ? { width: size, height: size } 
    : undefined;

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none shrink-0 bg-transparent ${defaultPresetClasses} ${className}`}
      style={inlineStyle}
      aria-label="ACS Customer Service Center Logo"
    >
      <svg
        viewBox="0 0 500 500"
        width="100%"
        height="100%"
        className="w-full h-full drop-shadow-xl transition-transform duration-300 filter"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Deep Navy Disc Radial Gradient */}
          <radialGradient id="discNavyGrad" cx="50%" cy="40%" r="58%">
            <stop offset="0%" stopColor="#0d326f" />
            <stop offset="45%" stopColor="#07204c" />
            <stop offset="85%" stopColor="#03112c" />
            <stop offset="100%" stopColor="#010818" />
          </radialGradient>

          {/* Dual Split Ring - Electric Blue Left */}
          <linearGradient id="ringBlueGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0055ff" />
            <stop offset="50%" stopColor="#0099ff" />
            <stop offset="100%" stopColor="#00d4ff" />
          </linearGradient>

          {/* Dual Split Ring - Radiant Orange Right */}
          <linearGradient id="ringOrangeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff9900" />
            <stop offset="50%" stopColor="#ff5500" />
            <stop offset="100%" stopColor="#d93800" />
          </linearGradient>

          {/* Top Arches Gradients */}
          <linearGradient id="topBlueArch" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0052cc" />
            <stop offset="50%" stopColor="#0094ff" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>

          <linearGradient id="topOrangeArch" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ff3700" />
            <stop offset="60%" stopColor="#ff7700" />
            <stop offset="100%" stopColor="#ffb700" />
          </linearGradient>

          {/* Letter 'A' Royal / Cyan 3D Gradient */}
          <linearGradient id="letterAGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0099ff" />
            <stop offset="40%" stopColor="#0052cc" />
            <stop offset="80%" stopColor="#002d80" />
            <stop offset="100%" stopColor="#001a4d" />
          </linearGradient>

          <linearGradient id="letterASwoosh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#66d9ff" />
            <stop offset="100%" stopColor="#0088ff" />
          </linearGradient>

          {/* Letter 'C' Sky Cyan 3D Gradient */}
          <linearGradient id="letterCGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4de1ff" />
            <stop offset="35%" stopColor="#00aaff" />
            <stop offset="70%" stopColor="#0066e6" />
            <stop offset="100%" stopColor="#003d99" />
          </linearGradient>

          {/* Letter 'S' Radiant Fiery Orange/Amber 3D Gradient */}
          <linearGradient id="letterSGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd200" />
            <stop offset="35%" stopColor="#ff7a00" />
            <stop offset="70%" stopColor="#ff3a00" />
            <stop offset="100%" stopColor="#c41a00" />
          </linearGradient>

          {/* Beacon Red Button */}
          <radialGradient id="redBeaconGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="40%" stopColor="#ee1d24" />
            <stop offset="85%" stopColor="#990008" />
            <stop offset="100%" stopColor="#550005" />
          </radialGradient>

          {/* Drop Shadows */}
          <filter id="logoDeepShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.65" />
          </filter>

          <filter id="letterShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.75" />
          </filter>
        </defs>

        {/* 1. Main Background Navy Disc */}
        <circle cx="250" cy="250" r="236" fill="url(#discNavyGrad)" />

        {/* 2. Outer Dual-Colored Split Rings */}
        {/* Left Semi-Circle (Blue Ring) */}
        <path
          d="M 250 18 A 232 232 0 0 0 250 482"
          stroke="url(#ringBlueGrad)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />

        {/* Right Semi-Circle (Orange Ring) */}
        <path
          d="M 250 18 A 232 232 0 0 1 250 482"
          stroke="url(#ringOrangeGrad)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />

        {/* Inner Silver Rim */}
        <circle cx="250" cy="250" r="222" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.45" fill="none" />
        <circle cx="250" cy="250" r="218" stroke="#04122d" strokeWidth="3.5" fill="none" />

        {/* 3. Top Red Jewel / Beacon */}
        <g id="top-beacon">
          <circle cx="250" cy="26" r="20" fill="#04122d" stroke="#ffffff" strokeWidth="3" />
          <circle cx="250" cy="26" r="15" fill="url(#redBeaconGrad)" />
          <ellipse cx="245" cy="21" rx="4.5" ry="2.5" fill="#ffffff" fillOpacity="0.85" transform="rotate(-30 245 21)" />
        </g>

        {/* 4. Dynamic Top Arches / Swooshes */}
        <g id="top-arches" filter="url(#letterShadow)">
          {/* Blue Top Arch */}
          <path
            d="M 54 285 C 50 135 155 70 404 114 C 275 92 110 128 92 270 Z"
            fill="url(#topBlueArch)"
          />
          {/* Orange Lower Arch */}
          <path
            d="M 125 240 C 135 125 230 84 445 130 C 315 106 178 135 142 235 Z"
            fill="url(#topOrangeArch)"
          />
        </g>

        {/* 5. Central 3D ACS Typography */}
        <g id="acs-letters" filter="url(#letterShadow)">
          
          {/* --- Letter 'A' with Integrated Forward Swoosh --- */}
          <g id="letter-A">
            {/* 3D Depth Shadow/Extrusion */}
            <path
              d="M 160 300 L 98 300 L 152 152 L 188 152 L 242 300 L 180 300 L 170 262 L 134 262 Z"
              fill="#001844"
            />
            {/* Main 'A' Body */}
            <path
              d="M 152 292 L 105 292 L 156 150 L 186 150 L 235 292 L 188 292 L 177 254 L 129 254 Z M 142 216 L 168 216 L 155 174 Z"
              fill="url(#letterAGrad)"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Left Dynamic Wing/Swoosh on 'A' */}
            <path
              d="M 36 318 C 65 295 100 240 165 210 C 235 178 300 205 348 208 C 285 208 205 214 135 250 C 78 280 48 310 36 318 Z"
              fill="url(#topBlueArch)"
              stroke="#ffffff"
              strokeWidth="2.5"
            />

            {/* Sharp Cyan/White Cross Swoosh cutting across 'A' into 'C' */}
            <path
              d="M 40 310 C 95 270 175 205 300 208 C 240 216 160 252 82 304 Z"
              fill="url(#letterASwoosh)"
            />
          </g>

          {/* --- Letter 'C' Sky Cyan 3D --- */}
          <g id="letter-C">
            {/* 3D Depth Shadow */}
            <path
              d="M 334 175 C 314 140 274 134 235 146 C 188 160 165 210 174 255 C 184 300 228 326 276 320 C 315 315 342 292 352 265 L 305 250 C 298 266 280 276 258 276 C 230 276 210 255 210 230 C 210 205 230 184 258 184 C 280 184 298 194 305 210 Z"
              fill="#002459"
            />
            {/* Main 'C' Body */}
            <path
              d="M 344 168 C 322 136 280 134 242 144 C 196 156 172 205 180 250 C 188 295 230 322 278 316 C 320 310 348 285 358 258 L 308 244 C 300 262 284 272 262 272 C 232 272 214 252 214 228 C 214 204 232 184 262 184 C 284 184 300 194 308 212 Z"
              fill="url(#letterCGrad)"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>

          {/* --- Letter 'S' Radiant Fiery Orange/Amber 3D --- */}
          <g id="letter-S">
            {/* 3D Depth Shadow */}
            <path
              d="M 458 165 C 445 142 418 136 388 136 C 348 136 325 156 325 188 C 325 240 435 220 435 264 C 435 285 412 296 382 296 C 348 296 324 282 312 260 L 278 284 C 298 312 338 326 382 326 C 442 326 478 298 478 258 C 478 206 368 226 368 188 C 368 172 382 164 402 164 C 424 164 442 172 452 188 Z"
              fill="#5c1000"
            />
            {/* Main 'S' Body */}
            <path
              d="M 454 158 C 440 138 414 132 384 132 C 344 132 320 152 320 184 C 320 236 430 216 430 260 C 430 282 408 292 378 292 C 344 292 320 278 308 256 L 274 278 C 294 308 334 322 378 322 C 438 322 472 294 472 254 C 472 202 362 222 362 184 C 362 168 376 160 398 160 C 420 160 438 168 448 184 Z"
              fill="url(#letterSGrad)"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* 6. Center Horizontal Badge: CUSTOMER SERVICE CENTER */}
        <g id="center-badge" transform="translate(0, 312)" filter="url(#letterShadow)">
          {/* Outer Orange Pill Border & Fill */}
          <rect
            x="32"
            y="0"
            width="436"
            height="56"
            rx="28"
            fill="#051a3d"
            stroke="#ff6600"
            strokeWidth="4"
          />
          {/* Inner Decorative Orange Inset Border */}
          <rect
            x="36"
            y="4"
            width="428"
            height="48"
            rx="24"
            fill="none"
            stroke="#ff9900"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />

          {/* Left Orange Triple Bar (≡) */}
          <g fill="#ff5500">
            <rect x="48" y="19" width="28" height="4" rx="2" />
            <rect x="48" y="26" width="28" height="4" rx="2" />
            <rect x="48" y="33" width="28" height="4" rx="2" />
          </g>

          {/* Center Text: CUSTOMER SERVICE CENTER */}
          <text
            x="250"
            y="36"
            textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', -apple-system, sans-serif"
            fontWeight="900"
            fontSize="26"
            letterSpacing="2.2"
            fill="#ffffff"
          >
            CUSTOMER SERVICE CENTER
          </text>

          {/* Right Orange Triple Bar (≡) */}
          <g fill="#ff5500">
            <rect x="424" y="19" width="28" height="4" rx="2" />
            <rect x="424" y="26" width="28" height="4" rx="2" />
            <rect x="424" y="33" width="28" height="4" rx="2" />
          </g>
        </g>

        {/* 7. Bottom Dual Symmetrical Needle / Arrow Divider */}
        <g id="bottom-arrows" transform="translate(0, 390)">
          {/* Left Cyan/Blue Arrow Line */}
          <path
            d="M 90 2 L 230 2 L 244 14 L 230 26 L 90 26 L 100 14 Z"
            fill="none"
            stroke="url(#topBlueArch)"
            strokeWidth="3.5"
          />
          <polygon points="228,0 248,14 228,28" fill="#00d4ff" />

          {/* Right Orange Arrow Line */}
          <path
            d="M 410 2 L 270 2 L 256 14 L 270 26 L 410 26 L 400 14 Z"
            fill="none"
            stroke="url(#topOrangeArch)"
            strokeWidth="3.5"
          />
          <polygon points="272,0 252,14 272,28" fill="#ff7700" />

          {/* Center Connecting Pin */}
          <circle cx="250" cy="14" r="3.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};
