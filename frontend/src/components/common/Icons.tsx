import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

/** 2D Minimalist Brand Logo Mark */
export const Logo2D: React.FC<IconProps> = ({ size = 28, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="26" height="26" rx="6" stroke={color} strokeWidth={strokeWidth} />
    <path d="M9 11L16 7L23 11L16 15L9 11Z" />
    <path d="M9 16.5L16 20.5L23 16.5" />
    <path d="M9 22L16 26L23 22" />
  </svg>
);

/** 2D Box / Asset / Inventory Icon */
export const IconBox: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

/** 2D Laptop / Hardware Icon */
export const IconLaptop: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="12" x="3" y="4" rx="2" />
    <line x1="2" x2="22" y1="20" y2="20" />
  </svg>
);

/** 2D Monitor Icon */
export const IconMonitor: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

/** 2D User / Employee Icon */
export const IconUser: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/** 2D Users Group Icon */
export const IconUsers: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/** 2D Wrench / Maintenance Icon */
export const IconWrench: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

/** 2D Download / Export Icon */
export const IconDownload: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

/** 2D Search Icon */
export const IconSearch: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
  </svg>
);

/** 2D Plus Icon */
export const IconPlus: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
);

/** 2D Sparkles / Request Icon */
export const IconSparkles: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

/** 2D Ticket / Support Icon */
export const IconTicket: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);

/** 2D Checkmark Icon */
export const IconCheck: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** 2D CheckCircle Icon */
export const IconCheckCircle: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="16 10 11 15 8 12" />
  </svg>
);

/** 2D Alert / Warning Icon */
export const IconAlert: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" x2="12" y1="9" y2="13" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
  </svg>
);

/** 2D Info Icon */
export const IconInfo: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="16" y2="12" />
    <line x1="12" x2="12.01" y1="8" y2="8" />
  </svg>
);

/** 2D Folder / Registry Icon */
export const IconFolder: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

/** 2D Sun Icon (Light Mode) */
export const IconSun: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

/** 2D Moon Icon (Dark Mode) */
export const IconMoon: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

/** 2D Globe / Network Icon */
export const IconGlobe: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

/** 2D Key / Access Icon */
export const IconKey: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21 2-2 2m-1.5 1.5L14 9a5 5 0 1 0 3 3l3.5-3.5" />
    <path d="m15.5 7.5 3 3" />
  </svg>
);

/** 2D Gear / System / Other Icon */
export const IconGear: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** 2D BarChart / Stats Icon */
export const IconBarChart: React.FC<IconProps> = ({ size = 18, className = '', color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </svg>
);

/** 2D ArrowRight Icon */
export const IconArrowRight: React.FC<IconProps> = ({ size = 16, className = '', color = 'currentColor', strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" x2="19" y1="12" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
