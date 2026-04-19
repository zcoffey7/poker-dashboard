// Real-chip photographs for the user's Monte Carlo Poker Club set. When a
// chip denomination matches one of these values the legend / editor renders
// the actual chip face instead of the stylized colored disk fallback.
//
// The basePath prefix is required so the URLs resolve correctly when the app
// is hosted on a project-style GitHub Pages site (see `next.config.ts`).

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const CHIP_IMAGE_BY_VALUE: Record<number, string> = {
  100: `${BASE_PATH}/chips/100.png`,
  500: `${BASE_PATH}/chips/500.png`,
  1000: `${BASE_PATH}/chips/1000.png`,
  5000: `${BASE_PATH}/chips/5000.png`,
  25000: `${BASE_PATH}/chips/25000.png`,
};

export function chipImageForValue(value: number): string | undefined {
  return CHIP_IMAGE_BY_VALUE[value];
}
