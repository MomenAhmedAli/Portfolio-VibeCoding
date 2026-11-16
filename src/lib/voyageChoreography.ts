export interface VoyageFrameState {
  stageIndex: 1 | 2 | 3 | 4;
  stageLabel: string;
  /** Overall visibility of the single 3D Sphere [0..1] */
  circleAlpha: number;
  /** Overall radius multiplier [0..1] */
  circleScale: number;
  /** How fragmented [0..1] the single 3D sphere is (0 = unified sphere, 1 = split into 20 chunks) */
  splitAmount: number;
  /** Progress [0..1] of reassembling all chunks back together into the single sphere */
  reassembleSurge: number;
  /** Opacity [0..1] of centered Design / Teamwork / Brand Design focus typography */
  centerTextAlpha: number;
  /** Vertical gentle settle offset (px) for the centered copy */
  centerTextOffsetPx: number;
  /** Progress [0..1] of final dissolve before next section */
  vanishProgress: number;
  /** Cumulative scroll-coupled angular rotation in radians */
  rotationRad: number;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(edge1 - edge0, 1e-5), 0, 1);
  return t * t * (3 - 2 * t);
}

export function linearStep(edge0: number, edge1: number, x: number): number {
  return clamp((x - edge0) / Math.max(edge1 - edge0, 1e-5), 0, 1);
}

export function isCompassActiveInSection(
  rectTop: number,
  rectBottom: number,
  viewportHeight: number
): boolean {
  if (viewportHeight <= 0) return false;
  const visibleTop = Math.max(rectTop, 0);
  const visibleBottom = Math.min(rectBottom, viewportHeight);
  const visiblePx = Math.max(0, visibleBottom - visibleTop);
  return visiblePx >= viewportHeight * 0.55;
}

export function computeVoyageSectionProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number
): number {
  const travel = Math.max(rectHeight - viewportHeight, 1);
  return clamp(-rectTop / travel, 0, 1);
}

/**
 * Pure 4-stage Single-Sphere Fracturing & Reassembly Choreography:
 * 1. One unified 3D shader sphere enters and rotates smoothly (0.00 -> 0.28)
 * 2. The single sphere splits apart into 20 curved 3D pieces while spinning (0.28 -> 0.56)
 * 3. All pieces snap back together all at once into ONE sphere as centered Design / Teamwork / Brand copy reveals (0.56 -> 0.80)
 * 4. Vanishes cleanly before the final CTA section (0.80 -> 0.92)
 */
export function computeVoyageFrameState(rawProgress: number): VoyageFrameState {
  const p = clamp(rawProgress, 0, 1);

  const entryAlpha = linearStep(0.0, 0.1, p);
  const splitOut = smoothstep(0.24, 0.42, p);
  const splitBack = 1 - smoothstep(0.48, 0.56, p);
  const splitAmount = clamp(splitOut * splitBack, 0, 1);

  const reassembleSurge = smoothstep(0.48, 0.62, p) * (1 - smoothstep(0.76, 0.90, p));

  // Centered brand & teamwork copy appears cleanly once the sphere reassembles in center
  const textIn = smoothstep(0.58, 0.65, p);
  const textOut = 1 - smoothstep(0.76, 0.84, p);
  const centerTextAlpha = clamp(textIn * textOut, 0, 1);
  const centerTextOffsetPx = (1 - textIn) * 18 - (1 - textOut) * 12;

  const vanishProgress = smoothstep(0.78, 0.91, p);
  const circleAlpha = clamp(entryAlpha * (1 - vanishProgress), 0, 1);

  // Subtle scale breathing during entry, slight shrink as copy locks in, smooth vanish
  const entryScale = 0.72 + smoothstep(0.0, 0.20, p) * 0.28;
  const circleScale = entryScale * (1 - vanishProgress * 0.95);

  const rotationRad =
    p * Math.PI * 3.0 +
    splitOut * Math.PI * 1.4 +
    reassembleSurge * Math.PI * 2.2;

  let stageIndex: 1 | 2 | 3 | 4 = 1;
  let stageLabel = '01 // UNIFIED SPHERE';
  if (p >= 0.80) {
    stageIndex = 4;
    stageLabel = '04 // DISSOLVED';
  } else if (p >= 0.56) {
    stageIndex = 3;
    stageLabel = '03 // COLLECTIVE FORM';
  } else if (p >= 0.26) {
    stageIndex = 2;
    stageLabel = '02 // FRAGMENT & SPIN';
  }

  return {
    stageIndex,
    stageLabel,
    circleAlpha,
    circleScale,
    splitAmount,
    reassembleSurge,
    centerTextAlpha,
    centerTextOffsetPx,
    vanishProgress,
    rotationRad,
  };
}
