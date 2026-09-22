/**
 * Cast-type pictograms: a readable limb outline with a filled cast wrap over
 * the segment that type covers, so each tile reads as a real slab/splint.
 */

import type { ReactNode } from "react";

function Svg({ children, size }: { children: ReactNode; size: number }) {
  const height = Math.round(size * 1.15);
  return (
    <svg width={size} height={height} viewBox="0 0 80 92" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function Limb({ d, w = 7 }: { d: string; w?: number }) {
  return (
    <path
      d={d}
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={0.28}
    />
  );
}

function CastWrap({ d, w = 14 }: { d: string; w?: number }) {
  return (
    <path
      d={d}
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={0.92}
    />
  );
}

function CastBand({ x, y, w, h, r = 5 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill="currentColor" opacity={0.88} />;
}

function Foot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      d={`M${cx} ${cy} L${cx + 14} ${cy + 3} L${cx + 16} ${cy + 8} L${cx - 2} ${cy + 6} Z`}
      fill="currentColor"
      opacity={0.28}
    />
  );
}

function HandPalm({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <rect x={cx - 11} y={cy} width={22} height={16} rx={7} fill="currentColor" opacity={0.28} />
      {/* fingers */}
      <path
        d={`M${cx - 8} ${cy + 14} V${cy + 28} M${cx - 2.5} ${cy + 14} V${cy + 30} M${cx + 3} ${cy + 14} V${cy + 29} M${cx + 8.5} ${cy + 14} V${cy + 26}`}
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        opacity={0.28}
      />
      {/* thumb */}
      <path
        d={`M${cx - 10} ${cy + 6} L${cx - 18} ${cy + 14}`}
        stroke="currentColor"
        strokeWidth={3.6}
        strokeLinecap="round"
        opacity={0.28}
      />
    </>
  );
}

const ICONS: Record<string, (size: number) => ReactNode> = {
  /** Below-knee slab: shin + ankle + foot wrapped */
  shortLeg: (size) => (
    <Svg size={size}>
      <Limb d="M36 8 V42 L32 70" w={8} />
      <Foot cx={32} cy={70} />
      <CastWrap d="M34 44 L32 68 L42 71" w={16} />
      <CastBand x={24} y={48} w={20} h={8} />
      <CastBand x={23} y={60} w={22} h={8} />
    </Svg>
  ),

  /** Above-knee slab: thigh through foot */
  longLeg: (size) => (
    <Svg size={size}>
      <Limb d="M36 6 V40 L32 70" w={8} />
      <Foot cx={32} cy={70} />
      <CastWrap d="M36 12 V40 L32 68 L42 71" w={16} />
      <CastBand x={26} y={18} w={20} h={8} />
      <CastBand x={25} y={36} w={20} h={8} />
      <CastBand x={23} y={56} w={22} h={8} />
    </Svg>
  ),

  /** Knee slab: wrap centered on the knee */
  kneeSlab: (size) => (
    <Svg size={size}>
      <Limb d="M40 6 V78" w={8} />
      <Foot cx={40} cy={78} />
      <CastBand x={26} y={34} w={28} h={22} r={8} />
      <path
        d="M30 45 H50"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.35}
        strokeDasharray="3 3"
      />
    </Svg>
  ),

  /** Short arm: forearm + wrist */
  shortArm: (size) => (
    <Svg size={size}>
      <Limb d="M24 10 L22 42 L52 58" w={7} />
      <circle cx={58} cy={61} r={7} fill="currentColor" opacity={0.28} />
      <CastWrap d="M34 48 L52 58" w={15} />
      <CastBand x={36} y={48} w={18} h={10} r={4} />
    </Svg>
  ),

  /** Long arm: upper arm through wrist */
  longArm: (size) => (
    <Svg size={size}>
      <Limb d="M24 8 L22 42 L52 58" w={7} />
      <circle cx={58} cy={61} r={7} fill="currentColor" opacity={0.28} />
      <CastWrap d="M24 14 L22 42 L50 56" w={15} />
      <CastBand x={14} y={18} w={20} h={9} r={4} />
      <CastBand x={14} y={34} w={20} h={9} r={4} />
      <CastBand x={34} y={48} w={18} h={9} r={4} />
    </Svg>
  ),

  /** U slab: hangs from shoulder down upper arm (U-shaped wrap) */
  uSlab: (size) => (
    <Svg size={size}>
      <Limb d="M28 10 L26 46 L54 60" w={7} />
      <circle cx={60} cy={63} r={7} fill="currentColor" opacity={0.28} />
      <CastWrap d="M34 8 L26 12 L24 40" w={14} />
      <path
        d="M22 10 C18 18 18 28 22 36"
        stroke="currentColor"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
        opacity={0.88}
      />
      <CastBand x={16} y={14} w={18} h={8} r={4} />
    </Svg>
  ),

  /** Thumb spica: wrap from forearm onto thumb */
  thumbSpica: (size) => (
    <Svg size={size}>
      <Limb d="M40 6 V22" w={9} />
      <HandPalm cx={40} cy={22} />
      <CastWrap d="M40 10 V24 L28 34 L22 42" w={11} />
      <CastBand x={31} y={10} w={18} h={10} r={4} />
      <path
        d="M28 30 L20 42"
        stroke="currentColor"
        strokeWidth={10}
        strokeLinecap="round"
        opacity={0.88}
      />
    </Svg>
  ),

  /** Ulna gutter: ulnar side of hand + 4th/5th fingers */
  ulnaGutter: (size) => (
    <Svg size={size}>
      <Limb d="M40 6 V22" w={9} />
      <HandPalm cx={40} cy={22} />
      <CastWrap d="M40 10 V24 L48 36 L50 52" w={12} />
      <CastBand x={31} y={10} w={18} h={10} r={4} />
      <path
        d="M46 34 V54"
        stroke="currentColor"
        strokeWidth={11}
        strokeLinecap="round"
        opacity={0.88}
      />
    </Svg>
  ),

  /** Buddy: two fingers taped together */
  buddy: (size) => (
    <Svg size={size}>
      <Limb d="M40 6 V22" w={9} />
      <HandPalm cx={40} cy={22} />
      <CastBand x={30} y={42} w={18} h={6} r={3} />
      <CastBand x={30} y={52} w={18} h={6} r={3} />
      <path
        d="M34 40 V58 M42 40 V58"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
        opacity={0.45}
      />
    </Svg>
  ),

  /** Finger splint: single finger stiffened */
  fingerSplint: (size) => (
    <Svg size={size}>
      <Limb d="M40 6 V22" w={9} />
      <HandPalm cx={40} cy={22} />
      <path
        d="M37.5 34 V60"
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
        opacity={0.88}
      />
      <CastBand x={32} y={38} w={11} h={5} r={2} />
      <CastBand x={32} y={48} w={11} h={5} r={2} />
    </Svg>
  ),
};

export function CastIcon({ id, size = 64 }: { id: string; size?: number }) {
  const render = ICONS[id];
  return render ? <>{render(size)}</> : null;
}
