/**
 * cast-icons.tsx — one pictogram per cast type, adapted from castroom's
 * src/components/CastIcons.tsx.
 *
 * Each icon starts from a limb silhouette (drawn faint, at low opacity) and
 * lays a thicker sleeve over the segment that cast type covers — a plain
 * capsule with no limb underneath reads as a thermometer, not a cast.
 */

import type { ReactNode } from "react";

const LIMB_W = 4.2;
const LIMB_OPACITY = 0.3;
const CAST_W = 7.5;

function Ghost({ children }: { children: ReactNode }) {
  return <g opacity={LIMB_OPACITY}>{children}</g>;
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width="28" height="32" viewBox="0 0 34 38" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function Cast({ d, w = CAST_W }: { d: string; w?: number }) {
  return <path d={d} stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

/** Hip, knee, shin, ankle, foot. `straight` holds the leg in full extension, as a knee slab does. */
function LegGhost({ straight = false }: { straight?: boolean }) {
  return (
    <Ghost>
      <path
        d={straight ? "M15 4 L15 30.5 L23.5 32.5" : "M15 4 L15 19 L13 30.5 L22.5 32.5"}
        stroke="currentColor"
        strokeWidth={LIMB_W}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Ghost>
  );
}

/** Shoulder, elbow, forearm, hand. */
function ArmGhost() {
  return (
    <Ghost>
      <path d="M11 4 L10 22 L25 28" stroke="currentColor" strokeWidth={LIMB_W} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="27.6" cy="29" r="3.5" fill="currentColor" />
    </Ghost>
  );
}

/** Wrist, palm, four fingers, thumb out to the left. */
function HandGhost() {
  return (
    <Ghost>
      <path d="M17 4 L17 13" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="9" y="11" width="16" height="13" rx="5.5" fill="currentColor" />
      <path d="M9.6 16.4 L5.4 21.4" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path
        d="M11.5 22 L11.5 31.5 M15.5 22 L15.5 33 M19.5 22 L19.5 32 M23.5 22 L23.5 29.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </Ghost>
  );
}

const ICONS: Record<string, () => ReactNode> = {
  longLeg: () => (
    <Svg>
      <LegGhost />
      <Cast d="M15 6.5 L15 19 L13 30.5 L20.5 32.1" />
    </Svg>
  ),
  shortLeg: () => (
    <Svg>
      <LegGhost />
      <Cast d="M14.5 22 L13 30.5 L20.5 32.1" />
    </Svg>
  ),
  kneeSlab: () => (
    <Svg>
      <LegGhost straight />
      <Cast d="M15 15.5 L15 22.5" w={8} />
    </Svg>
  ),
  longArm: () => (
    <Svg>
      <ArmGhost />
      <Cast d="M10.8 7 L10 22 L24 27.6" />
    </Svg>
  ),
  shortArm: () => (
    <Svg>
      <ArmGhost />
      <Cast d="M16 24.4 L24 27.6" />
    </Svg>
  ),
  uSlab: () => (
    <Svg>
      <ArmGhost />
      <Cast d="M11 5.5 L10 22 L12.8 23.1" />
    </Svg>
  ),
  thumbSpica: () => (
    <Svg>
      <HandGhost />
      <Cast d="M6 20.6 L10 16 L15.5 12.5 L17 5.5" w={6.5} />
    </Svg>
  ),
  ulnaGutter: () => (
    <Svg>
      <HandGhost />
      <Cast d="M21.5 29 L21.5 22 L18.5 14 L17 5.5" w={7} />
    </Svg>
  ),
  buddy: () => (
    <Svg>
      <HandGhost />
      <Cast d="M14.5 26 L20.5 26" w={4.2} />
      <Cast d="M14.5 31 L20.5 31" w={4.2} />
    </Svg>
  ),
  fingerSplint: () => (
    <Svg>
      <HandGhost />
      <Cast d="M15.5 21 L15.5 31" w={5.5} />
    </Svg>
  ),
};

export function CastIcon({ id }: { id: string }) {
  const Icon = ICONS[id];
  return Icon ? <Icon /> : null;
}
