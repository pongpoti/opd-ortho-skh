/**
 * cast-types.ts — the fixed list of slab/splint types the cast room applies.
 *
 * Duplicated from the castroom app's src/lib/casts.ts, which this module's
 * form is itself a port of.
 */
export interface CastType {
  id: string;
  label: string;
}

export const CAST_TYPES: CastType[] = [
  { id: "shortLeg", label: "Short Leg Slab" },
  { id: "longLeg", label: "Long Leg Slab" },
  { id: "shortArm", label: "Short Arm Slab" },
  { id: "longArm", label: "Long Arm Slab" },
  { id: "buddy", label: "Buddy Splint" },
  { id: "fingerSplint", label: "Finger Splint" },
  { id: "thumbSpica", label: "Thumb Spica Slab" },
  { id: "ulnaGutter", label: "Ulna Gutter Slab" },
  { id: "uSlab", label: "U Slab" },
  { id: "kneeSlab", label: "Knee Slab" },
];

const BY_ID: Record<string, CastType> = Object.fromEntries(CAST_TYPES.map((c) => [c.id, c]));

export function castLabel(id: string): string {
  return BY_ID[id]?.label ?? id;
}
