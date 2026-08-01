import type { SVGProps } from 'react';

export type AppIconName =
  | 'home' | 'location' | 'transfer' | 'emergency' | 'ai'
  | 'notification' | 'profile' | 'building' | 'shield';

type Props = SVGProps<SVGSVGElement> & { name: AppIconName; size?: number };

const paths: Record<AppIconName, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></>,
  location: <><path d="M20 10c0 5.5-8 10-8 10S4 15.5 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  transfer: <><path d="M5 7h12"/><path d="m14 4 3 3-3 3"/><path d="M19 17H7"/><path d="m10 14-3 3 3 3"/></>,
  emergency: <><path d="M12 3 3.5 20h17L12 3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
  ai: <><rect x="5" y="6" width="14" height="12" rx="3"/><path d="M9 10h.01M15 10h.01"/><path d="M9 14c1.8 1.2 4.2 1.2 6 0"/><path d="M12 3v3M3 12h2M19 12h2"/></>,
  notification: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 19h4"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  building: <><path d="M4 21V5h10v16"/><path d="M14 9h6v12"/><path d="M8 9h2M8 13h2M8 17h2M17 13h1M17 17h1"/></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 2.7 7.8 7 10 4.3-2.2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
};

export default function AppIcon({ name, size = 24, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
