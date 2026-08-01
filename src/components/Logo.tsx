import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'horizontal' | 'symbol' | 'white' | 'teal' | 'favicon' | 'mobile';
}

export default function Logo({ className = "h-8", variant = "horizontal" }: LogoProps) {
  // Brand color constants
  const ink = '#073F3B';
  const turquoise = '#0AA99D';
  const gold = '#E5A823';

  // Render the symbol C graphic and its three internal pillars
  const renderSymbol = (colorInk: string, colorTurquoise: string) => (
    <g id="logo-symbol">
      {/* Open C shape representing inclusion */}
      <path
        d="M 68,22 A 32,32 0 1,0 68,68"
        stroke={colorInk}
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Pillar 1 (Left, short) */}
      <path d="M 33,48 L 33,62" stroke={colorTurquoise} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="33" cy="40" r="3.5" fill={colorTurquoise} />
      {/* Pillar 2 (Middle, tall) */}
      <path d="M 45,36 L 45,62" stroke={colorTurquoise} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="45" cy="28" r="3.5" fill={colorTurquoise} />
      {/* Pillar 3 (Right, medium) */}
      <path d="M 57,42 L 57,62" stroke={colorTurquoise} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="57" cy="34" r="3.5" fill={colorTurquoise} />
    </g>
  );

  // Render the continuous baseline connecting underline path
  const renderBaseline = (colorInk: string) => (
    <path
      d="M 68,68 L 122,68 Q 129,68 129,75 L 129,83 Q 129,90 136,90 L 178,90 Q 185,90 185,83 L 185,56"
      stroke={colorInk}
      strokeWidth="6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );

  if (variant === 'symbol' || variant === 'favicon') {
    return (
      <svg
        viewBox="0 0 90 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <g transform="translate(2, 2)">
          {renderSymbol(ink, turquoise)}
        </g>
      </svg>
    );
  }

  if (variant === 'white') {
    return (
      <svg
        viewBox="0 0 240 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {renderSymbol('#FFFFFF', '#EDF6F3')}
        {renderBaseline('#FFFFFF')}
        
        {/* Golden Dot above the i stem */}
        <circle cx="185" cy="45" r="4.5" fill={gold} />
        
        {/* Typography */}
        <text x="76" y="58" fill="#FFFFFF" fontFamily="Manrope, system-ui, sans-serif" fontSize="30" fontWeight="800" letterSpacing="-0.02em">ount</text>
        <text x="136" y="82" fill="#EDF6F3" fontFamily="Manrope, system-ui, sans-serif" fontSize="28" fontWeight="800" letterSpacing="-0.02em">us</text>
        <text x="194" y="82" fill="#FFFFFF" fontFamily="Manrope, system-ui, sans-serif" fontSize="28" fontWeight="800" letterSpacing="-0.02em">n</text>
        
        {/* Subtitle */}
        <text x="120" y="110" textAnchor="middle" fill="#FFFFFF" fontFamily="Manrope, system-ui, sans-serif" fontSize="9" fontWeight="800" letterSpacing="0.4em">
          BUDGET <tspan fill={gold}>•</tspan> SHARE <tspan fill={gold}>•</tspan> GROW
        </text>
      </svg>
    );
  }

  if (variant === 'teal') {
    return (
      <svg
        viewBox="0 0 240 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {renderSymbol(ink, ink)}
        {renderBaseline(ink)}
        <circle cx="185" cy="45" r="4.5" fill={ink} />
        
        <text x="76" y="58" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="30" fontWeight="800" letterSpacing="-0.02em">ount</text>
        <text x="136" y="82" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="28" fontWeight="800" letterSpacing="-0.02em">us</text>
        <text x="194" y="82" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="28" fontWeight="800" letterSpacing="-0.02em">n</text>
        
        <text x="120" y="110" textAnchor="middle" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="9" fontWeight="800" letterSpacing="0.4em">
          BUDGET • SHARE • GROW
        </text>
      </svg>
    );
  }

  if (variant === 'mobile') {
    return (
      <svg
        viewBox="0 0 240 98"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {renderSymbol(ink, turquoise)}
        {renderBaseline(ink)}
        
        <circle cx="185" cy="45" r="4.5" fill={gold} />
        
        <text x="76" y="58" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="30" fontWeight="800" letterSpacing="-0.02em">ount</text>
        <text x="136" y="82" fill={turquoise} fontFamily="Manrope, system-ui, sans-serif" fontSize="28" fontWeight="800" letterSpacing="-0.02em">us</text>
        <text x="194" y="82" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="28" fontWeight="800" letterSpacing="-0.02em">n</text>
      </svg>
    );
  }

  // Default: horizontal variant
  return (
    <svg
      viewBox="0 0 240 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {renderSymbol(ink, turquoise)}
      {renderBaseline(ink)}
      
      {/* Golden Dot above the i stem */}
      <circle cx="185" cy="45" r="4.5" fill={gold} />
      
      {/* Typography */}
      <text x="76" y="58" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="30" fontWeight="800" letterSpacing="-0.02em">ount</text>
      <text x="136" y="82" fill={turquoise} fontFamily="Manrope, system-ui, sans-serif" fontSize="28" fontWeight="800" letterSpacing="-0.02em">us</text>
      <text x="194" y="82" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="28" fontWeight="800" letterSpacing="-0.02em">n</text>
      
      {/* Subtitle */}
      <text x="120" y="110" textAnchor="middle" fill={ink} fontFamily="Manrope, system-ui, sans-serif" fontSize="9" fontWeight="800" letterSpacing="0.4em">
        BUDGET <tspan fill={gold}>•</tspan> SHARE <tspan fill={gold}>•</tspan> GROW
      </text>
    </svg>
  );
}
