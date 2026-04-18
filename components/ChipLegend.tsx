"use client";

import { useMemo } from "react";
import { useTournament } from "@/lib/store";
import type { ChipColor, ChipDenom } from "@/lib/types";

type ChipPalette = {
  face: string;
  stripe: string;
  inner: string;
  text: string;
  ring: string;
};

export const CHIP_COLOR_MAP: Record<ChipColor, ChipPalette> = {
  white: {
    face: "#f4f4f0",
    stripe: "#1f2330",
    inner: "#e5e5df",
    text: "#0f1117",
    ring: "rgba(15, 17, 23, 0.25)",
  },
  red: {
    face: "#c8303a",
    stripe: "#f4f4f0",
    inner: "#a92a33",
    text: "#ffffff",
    ring: "rgba(0, 0, 0, 0.35)",
  },
  green: {
    face: "#1f8a4c",
    stripe: "#f4f4f0",
    inner: "#18703d",
    text: "#ffffff",
    ring: "rgba(0, 0, 0, 0.35)",
  },
  black: {
    face: "#1a1c22",
    stripe: "#f4f4f0",
    inner: "#0f1117",
    text: "#ffffff",
    ring: "rgba(255, 255, 255, 0.18)",
  },
  blue: {
    face: "#1f4bd8",
    stripe: "#f4f4f0",
    inner: "#183bb0",
    text: "#ffffff",
    ring: "rgba(0, 0, 0, 0.35)",
  },
  purple: {
    face: "#6a2aa3",
    stripe: "#f4f4f0",
    inner: "#561f86",
    text: "#ffffff",
    ring: "rgba(0, 0, 0, 0.35)",
  },
  yellow: {
    face: "#f4c542",
    stripe: "#1f2330",
    inner: "#e1b22e",
    text: "#0f1117",
    ring: "rgba(0, 0, 0, 0.3)",
  },
  orange: {
    face: "#e8731b",
    stripe: "#f4f4f0",
    inner: "#c85f11",
    text: "#ffffff",
    ring: "rgba(0, 0, 0, 0.35)",
  },
  pink: {
    face: "#e05a9c",
    stripe: "#f4f4f0",
    inner: "#c64886",
    text: "#ffffff",
    ring: "rgba(0, 0, 0, 0.35)",
  },
  gray: {
    face: "#8a8f9e",
    stripe: "#f4f4f0",
    inner: "#72778a",
    text: "#0f1117",
    ring: "rgba(0, 0, 0, 0.35)",
  },
};

export const CHIP_COLOR_OPTIONS: { value: ChipColor; label: string }[] = [
  { value: "white", label: "White" },
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
  { value: "black", label: "Black" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "yellow", label: "Yellow" },
  { value: "orange", label: "Orange" },
  { value: "pink", label: "Pink" },
  { value: "gray", label: "Gray" },
];

type ChipDiskProps = Readonly<{
  color: ChipColor;
  size?: number;
  stripes?: number;
}>;

export function ChipDisk({ color, size = 56, stripes = 6 }: ChipDiskProps) {
  const palette = CHIP_COLOR_MAP[color];
  const stripeEls = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let i = 0; i < stripes; i++) {
      const rotation = (360 / stripes) * i;
      out.push(
        <span
          key={i}
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 rounded-sm"
          style={{
            width: `${size * 0.18}px`,
            height: `${size * 0.22}px`,
            background: palette.stripe,
            transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(-${size * 0.39}px)`,
          }}
        />,
      );
    }
    return out;
  }, [palette.stripe, size, stripes]);

  return (
    <div
      className="relative rounded-full shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: palette.face,
        boxShadow: `0 0 0 1px ${palette.ring}, 0 2px 6px rgba(0, 0, 0, 0.35)`,
      }}
      aria-hidden="true"
    >
      {stripeEls}
      <div
        className="absolute rounded-full"
        style={{
          inset: `${size * 0.18}px`,
          background: palette.inner,
          boxShadow: `inset 0 0 0 1px ${palette.ring}`,
        }}
      />
    </div>
  );
}

function sortedByValue(denoms: ChipDenom[]) {
  return denoms.slice().sort((a, b) => a.value - b.value);
}

export default function ChipLegend() {
  const chipDenoms = useTournament((s) => s.chipDenoms);
  const sorted = useMemo(() => sortedByValue(chipDenoms), [chipDenoms]);

  if (sorted.length === 0) return null;

  return (
    <div className="card p-4 flex flex-col gap-4 h-full min-h-0 overflow-hidden">
      <div className="label shrink-0">Chip values</div>
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
        {sorted.map((d) => {
          const palette = CHIP_COLOR_MAP[d.color];
          return (
            <div
              key={d.id}
              className="flex items-center gap-4"
              title={`${d.value.toLocaleString()} chip (${d.color})`}
            >
              <div className="relative shrink-0">
                <ChipDisk color={d.color} size={88} />
                <div
                  className="absolute inset-0 flex items-center justify-center font-mono tabular-nums font-bold text-sm sm:text-base leading-none"
                  style={{ color: palette.text }}
                >
                  {formatChipFace(d.value)}
                </div>
              </div>
              <div className="font-mono tabular-nums text-2xl md:text-3xl font-bold">
                {d.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatChipFace(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    const rounded = Number.isInteger(k) ? k.toString() : k.toFixed(1);
    return `${rounded}K`;
  }
  return value.toString();
}
