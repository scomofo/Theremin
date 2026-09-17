import type { SVGProps } from "react";

function WaveSvg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 28 16"
      fill="none"
      aria-hidden="true"
      className="h-3.5 w-6"
      {...props}
    />
  );
}

export function SineWaveIcon() {
  return (
    <WaveSvg>
      <path
        d="M1 8c2.2-7 4.4-7 6.6 0s4.4 7 6.6 0 4.4-7 6.6 0 4.4 7 6.2 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </WaveSvg>
  );
}

export function TriangleWaveIcon() {
  return (
    <WaveSvg>
      <path
        d="M1 8 7.5 2.5 14.5 13.5 21.5 2.5 27 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </WaveSvg>
  );
}

export function SquareWaveIcon() {
  return (
    <WaveSvg>
      <path
        d="M1 8V3.5h8.5V12.5h8.5V3.5H27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </WaveSvg>
  );
}

export function SawWaveIcon() {
  return (
    <WaveSvg>
      <path
        d="M1 13.5 10.5 2.5v11h9L27 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </WaveSvg>
  );
}
