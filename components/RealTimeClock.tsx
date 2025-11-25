import React, { useState, useEffect, useRef } from 'react';

const RealTimeClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const requestRef = useRef<number>(0);

  const animate = () => {
    setTime(new Date());
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Time components for "Ticking" behavior (discrete seconds)
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  // Calculate angles
  // Seconds: discrete tick (6 degrees per second)
  const secondAngle = seconds * 6;
  
  // Minutes: smooth movement + fractional based on seconds for realism
  const minuteAngle = (minutes * 6) + (seconds * 0.1);
  
  // Hours: smooth movement + fractional based on minutes
  const hourAngle = ((hours % 12) * 30) + (minutes * 0.5);

  // Dynamic Color: Cycle through hues based on time for a "living" effect
  const hue = (Date.now() / 50) % 360; 
  const dynamicColor = `hsl(${hue}, 80%, 50%)`;
  
  // --- Digital Clock Formatting (Restoring previous style) ---
  const dateString = time.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeString = time.toLocaleTimeString('en-GB', { hour12: false });
  const msString = time.getMilliseconds().toString().padStart(3, '0');

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      
      {/* Digital Clock Section - Left */}
      <div className="flex flex-col items-end justify-center
                      bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm
                      px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
         <span className="text-[8px] sm:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap mb-0.5">
           {dateString}
         </span>
         <span className="text-sm sm:text-xl font-black font-mono tabular-nums leading-none text-gray-900 dark:text-white tracking-tight">
           {timeString}<span className="text-[10px] sm:text-xs text-gray-400 ml-0.5 font-medium">.{msString}</span>
         </span>
      </div>

      {/* Analog Clock Section - Right */}
      <div className="relative group w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center cursor-pointer" title="Analog Clock" role="img" aria-label="Dynamic Analog Clock">
        
        {/* Dynamic ambient glow behind the clock */}
        <div 
            className="absolute inset-0 rounded-full blur-lg transition-colors duration-100 opacity-30 group-hover:opacity-50"
            style={{ backgroundColor: dynamicColor }}
        ></div>

        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl z-10 transition-transform duration-300 group-hover:scale-110">
            <defs>
            {/* 3D Metallic Gradient for Bezel */}
            <linearGradient id="bezelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            
            {/* Soft Inner Face Gradient */}
            <radialGradient id="faceGradient" cx="50%" cy="50%" r="50%">
                <stop offset="80%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e2e8f0" />
            </radialGradient>

            {/* 3D Drop Shadow for Hands/Text */}
            <filter id="handShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.4"/>
                </feComponentTransfer>
                <feMerge>
                <feMergeNode in="offsetBlur" />
                <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            </defs>

            {/* Outer Bezel */}
            <circle cx="50" cy="50" r="48" fill="url(#bezelGradient)" stroke="#334155" strokeWidth="0.5" />
            
            {/* Inner Bezel Ring */}
            <circle cx="50" cy="50" r="45" fill="#1e293b" />

            {/* Clock Face */}
            <circle cx="50" cy="50" r="44" fill="url(#faceGradient)" />

            {/* Branding Text - ZOT (Top, Green, Dynamic Shadow) */}
            <text 
                x="50" y="35" 
                textAnchor="middle" 
                fontSize="18" 
                fontWeight="900" 
                fill="#16a34a" 
                filter="url(#handShadow)"
                style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.5px' }}
            >
                ZOT
            </text>
            
            {/* Branding Text - DMW (Bottom, Gold, Dynamic Shadow) */}
            <text 
                x="50" y="80" 
                textAnchor="middle" 
                fontSize="18" 
                fontWeight="900" 
                fill="#b45309" 
                filter="url(#handShadow)"
                style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.5px' }}
            >
                DMW
            </text>

            {/* Dynamic Color Ring inside face */}
            <circle cx="50" cy="50" r="42" fill="none" stroke={dynamicColor} strokeWidth="0.5" opacity="0.5" />

            {/* Minute Markers */}
            {[...Array(60)].map((_, i) => {
                const isHour = i % 5 === 0;
                const length = isHour ? 4 : 2;
                const width = isHour ? 2 : 0.5;
                const color = isHour ? "#1e293b" : "#94a3b8";
                return (
                <line
                    key={i}
                    x1="50" y1={10}
                    x2="50" y2={10 + length}
                    transform={`rotate(${i * 6} 50 50)`}
                    stroke={color}
                    strokeWidth={width}
                    strokeLinecap="round"
                />
                );
            })}

            {/* Hour Hand */}
            <g filter="url(#handShadow)" transform={`rotate(${hourAngle} 50 50)`}>
                <path d="M 50 50 L 50 25" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                <path d="M 50 25 L 48 28 L 52 28 Z" fill="#1e293b" />
            </g>

            {/* Minute Hand */}
            <g filter="url(#handShadow)" transform={`rotate(${minuteAngle} 50 50)`}>
                <path d="M 50 50 L 50 15" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
                <path d="M 50 15 L 49 18 L 51 18 Z" fill="#334155" />
            </g>

            {/* Second Hand (Dynamic) - Ticking */}
            <g filter="url(#handShadow)" transform={`rotate(${secondAngle} 50 50)`}>
                <line x1="50" y1="58" x2="50" y2="10" stroke={dynamicColor} strokeWidth="1" strokeLinecap="round" />
                <circle cx="50" cy="50" r="2" fill={dynamicColor} stroke="#fff" strokeWidth="0.5" />
                <circle cx="50" cy="10" r="1.5" fill={dynamicColor} />
            </g>

            {/* Glass Glint */}
            <path d="M 20 20 Q 50 5 80 20" fill="none" stroke="white" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
        </svg>
      </div>

    </div>
  );
};

export default RealTimeClock;