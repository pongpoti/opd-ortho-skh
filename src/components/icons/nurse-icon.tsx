import type { SVGProps } from "react";

/**
 * NurseIcon — a nurse's cap pictogram, drawn to match lucide-react's own
 * 24x24/2px-stroke style since no such profession icon ships in that set.
 */
export function NurseIcon({ size = 24, strokeWidth = 2, ...props }: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 10C4 5.5 7.6 3 12 3c4.4 0 8 2.5 8 7v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4Z" />
      <path d="M12 10.5v5M9.5 13h5" />
    </svg>
  );
}
