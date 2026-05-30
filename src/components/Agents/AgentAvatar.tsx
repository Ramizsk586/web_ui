import React from 'react';

interface AgentAvatarProps {
  emoji: string;
  className?: string;
}

export function AgentAvatar({ emoji, className = "w-full h-full text-white" }: AgentAvatarProps) {
  // Map emoji to highly professional minimalist vector SVG designs
  switch (emoji) {
    case '🤖': // Bot
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 2v2M5 10a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-7z"/>
          <circle cx="9" cy="11" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="11" r="1.5" fill="currentColor"/>
          <path d="M9 16h6" strokeLinecap="round"/>
          <path d="M2 13h3M19 13h3"/>
        </svg>
      );
    case '🧠': // Brain
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 2.46-4.06z"/>
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0-2.46-4.06z"/>
          <path d="M12 4.5c0 1-1 2-2 2M12 11.5c-1 0-2-1-2-2M12 15.5c-1.5 0-2.5-1-2.5-2"/>
          <path d="M12 4.5c0 1 1 2 2 2M12 11.5c1 0 2-1 2-2M12 15.5c1.5 0 2.5-1 2.5-2"/>
        </svg>
      );
    case '🎯': // Target
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        </svg>
      );
    case '🚀': // Rocket
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4.5 16.5c-1.5 1.5-2.5 3.5-2.5 5.5C4 22 6 21 7.5 19.5M12 12l9-9-3 12-6 3-3-3-3-3z"/>
          <path d="M14 6.5L17.5 10M9 15l-3 3M15 15l-3 3"/>
        </svg>
      );
    case '💡': // Bulb
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .5 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
          <path d="M9 18h6M10 22h4"/>
        </svg>
      );
    case '🎨': // Art
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.32624 19.4792 5.37521 20.2199 4.96587 20.75C4.4695 21.3928 3.51381 21.4111 2.99124 20.7853C1.6508 19.18 1 17.0706 1 14.7562C1 8.81604 5.81604 4 11.7562 4C17.6963 4 22.5123 8.81604 22.5123 14.7562C22.5123 16.5413 22.0792 18.2255 21.3117 19.7118C20.9169 20.4764 19.9822 20.7303 19.2635 20.2085C18.2575 19.478 17.5 19 16.5 19C15.5 19 14 20 13 21C12.5513 21.4487 12 22 12 22Z" fill="none" />
          <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/>
          <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"/>
          <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"/>
        </svg>
      );
    case '📊': // Chart
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      );
    case '🔬': // Science
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(30 12 12)"/>
          <ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(150 12 12)"/>
        </svg>
      );
    case '🏗️': // Build
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
        </svg>
      );
    case '🌿': // Leaf
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 1.2 5-3.8 11.2A7 7 0 0 1 11 20z"/>
          <path d="M19 2c-2.26 4.33-5.27 7.14-8 10"/>
        </svg>
      );
    case '⚡': // Power
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/>
        </svg>
      );
    case '🎓': // Grad
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
        </svg>
      );
    case '🧑‍💻': // Coder (or use keyboard/screen)
    case '👩‍💻': // Proposal / Coder
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
          <line x1="14" y1="4" x2="10" y2="20"/>
        </svg>
      );
    case '🧘': // Zen
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
          <path d="M12 7v10"/>
          <path d="M8 12h8"/>
          <path d="M9.5 9.5l5 5"/>
          <path d="M14.5 9.5l-5 5"/>
        </svg>
      );
    case '📸': // Camera
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      );
    case '🐾': // Paw/Animal
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="14" r="4" fill="currentColor"/>
          <circle cx="6" cy="9" r="2" fill="currentColor"/>
          <circle cx="10" cy="6" r="2" fill="currentColor"/>
          <circle cx="14" cy="6" r="2" fill="currentColor"/>
          <circle cx="18" cy="9" r="2" fill="currentColor"/>
        </svg>
      );
    default:
      // Fallback: A nice generic robot vector SVG avatar
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 2v2M5 10a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-7z"/>
          <circle cx="9" cy="11" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="11" r="1.5" fill="currentColor"/>
          <path d="M9 16h6"/>
        </svg>
      );
  }
}
