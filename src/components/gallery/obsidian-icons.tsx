'use client';

import type { SVGProps } from 'react';

function Ic({
  children,
  size = 16,
  sw = 1.6,
  className,
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number; sw?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconAperture({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      aria-hidden
      {...rest}
    >
      <circle cx="14" cy="14" r="11" />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const x1 = 14 + Math.cos(r) * 11;
        const y1 = 14 + Math.sin(r) * 11;
        const x2 = 14 + Math.cos(r + 1.2) * 4;
        const y2 = 14 + Math.sin(r + 1.2) * 4;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <circle cx="14" cy="14" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMasonry(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="12" width="7" height="9" />
    </Ic>
  );
}

export function IconBento(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="8" />
      <rect x="3" y="13" width="8" height="8" />
      <rect x="13" y="13" width="8" height="8" />
    </Ic>
  );
}

export function IconHoneycomb(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
    </Ic>
  );
}

export function IconWave(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <path d="M3 8 Q 8 4, 13 8 T 21 8" />
      <path d="M3 14 Q 8 10, 13 14 T 21 14" />
      <path d="M3 20 Q 8 16, 13 20 T 21 20" />
    </Ic>
  );
}

export function IconEmpire(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <path d="M12 3 l2 5 h5 l-4 3 1.5 5 -4.5 -3 -4.5 3 1.5 -5 -4 -3 h5 z" />
    </Ic>
  );
}

export function IconMinimal(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <line x1="4" y1="12" x2="20" y2="12" />
    </Ic>
  );
}

export function IconAlbum(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </Ic>
  );
}

export function IconLogin(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={18} {...props}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M19 4h-6a2 2 0 0 0-2 2v2" />
    </Ic>
  );
}

export function IconSort(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <path d="M7 4v16" />
      <path d="M4 7l3-3 3 3" />
      <path d="M17 20V4" />
      <path d="M14 17l3 3 3-3" />
    </Ic>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Ic>
  );
}

export function IconRefresh(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </Ic>
  );
}

export function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </Ic>
  );
}

export function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={16} {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Ic>
  );
}

export function IconMenu(props: SVGProps<SVGSVGElement>) {
  return (
    <Ic size={18} sw={2} {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </Ic>
  );
}
