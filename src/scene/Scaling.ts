// Scene units = millions of km (Mkm). Sun at origin.
// Two scale modes — cinematic (sqrt-compresses radii so the size *order* matches
// reality but small bodies stay visible) and trueScale (1 Mkm = 1 unit).

import type { BodyData } from "../data/bodies";

export interface ScaleConfig {
  trueScale: boolean;
}

// Cinematic radius targets at the calibration radii below:
//   Sun (695,700 km) → ~10 units
//   Jupiter (69,911 km) → ~2.1
//   Earth (6,371 km)   → ~0.64
//   Mercury (2,440 km) → ~0.40
//   Pluto (1,188 km)   → ~0.28
// Achieved with size = sqrt(radiusKm) * factor; star/planet/moon get separate
// factors so the Sun stays clearly larger than any planet without being absurd.
const STAR_FACTOR = 0.012;
const PLANET_FACTOR = 0.008;
const MOON_FACTOR = 0.005;
const MIN_VISIBLE_RADIUS = 0.05; // tiny moons stay clickable

const ORBIT_LOG_BASE = 8;
const ORBIT_LOG_GAIN = 80;
const MOON_DISTANCE_GAIN = 60;

export function scaleRadius(body: BodyData, cfg: ScaleConfig): number {
  const r = body.radiusKm;
  if (cfg.trueScale) return r / 1_000_000;
  const sqrtKm = Math.sqrt(r);
  let size: number;
  if (body.kind === "star") size = sqrtKm * STAR_FACTOR;
  else if (body.kind === "moon") size = sqrtKm * MOON_FACTOR;
  else size = sqrtKm * PLANET_FACTOR;
  return Math.max(MIN_VISIBLE_RADIUS, size);
}

/** Scale a position vector (km) into scene units (Mkm). */
export function scalePosition(
  parentBody: BodyData | null,
  posKm: { x: number; y: number; z: number },
  cfg: ScaleConfig,
  out: { x: number; y: number; z: number },
): void {
  const r = Math.sqrt(posKm.x ** 2 + posKm.y ** 2 + posKm.z ** 2);
  if (r === 0) {
    out.x = 0; out.y = 0; out.z = 0;
    return;
  }
  let rNew: number;
  if (cfg.trueScale) {
    rNew = r / 1_000_000;
  } else if (parentBody?.kind === "star") {
    const rMkm = r / 1_000_000;
    rNew = Math.log(1 + rMkm / ORBIT_LOG_BASE) * ORBIT_LOG_GAIN;
  } else {
    const rMkm = r / 1_000_000;
    rNew = rMkm * MOON_DISTANCE_GAIN;
  }
  const k = rNew / r;
  out.x = posKm.x * k;
  out.y = posKm.y * k;
  out.z = posKm.z * k;
}
