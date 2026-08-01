import type { SVGProps } from 'react';

export type AppIconName =
  | 'home' | 'location' | 'transfer' | 'emergency' | 'ai'
  | 'notification' | 'profile' | 'building' | 'shield'
  | 'employees' | 'reports' | 'settings' | 'search' | 'menu'
  | 'activity' | 'check' | 'clock' | 'logout' | 'chevron';

type Props = SVGProps<SVGSVGElement> & { name: AppIconName; size?: number };

const paths: Record<AppIconName, React.ReactNode> = {
  home: <><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></>,
  location: <><path d="M20 10c0 5.5-8 10-8 10S4 15.5 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  transfer: <><circle cx="6" cy="7" r="2"/><circle cx="18" cy="17" r="2"/><path d="M8 7h5a3 3 0 0 1 3 3v1"/><path d="m13 9 3 2 3-2"/><path d="M16 17h-5a3 3 0 0 1-3-3v-1"/></>,
  emergency: <><path d="M12 3 3.5 20h17L12 3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
  ai: <><rect x="5" y="5" width="14" height="14" rx="2.5"/><path d="M9 9h6v6H9z"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></>,
  notification: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 19h4"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  building: <><path d="M4 21V5h10v16"/><path d="M14 9h6v12"/><path d="M8 9h2M8 13h2M8 17h2M17 13h1M17 17h1"/></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 2.7 7.8 7 10 4.3-2.2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  employees: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3"/></>,
  reports: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 17v-4M12 17v-7M16 17v-2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  activity: <><path d="M3 12h4l2-6 4 12 2-6h6"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  logout: <><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4M18 12H9"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
};

export default function AppIcon({ name, size = 24, ...props }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {paths[name]}
    </svg>
  );
}
