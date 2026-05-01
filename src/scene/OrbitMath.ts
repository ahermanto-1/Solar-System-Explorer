import * as THREE from "three";
import type { BodyData } from "../data/bodies";

const DEG = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export function meanAnomaly(body: BodyData, simEpochMs: number): number {
  if (body.periodDays <= 0) return 0;
  const daysSinceEpoch = (simEpochMs - J2000_MS) / 86_400_000;
  const n = 360 / body.periodDays; // deg per day
  const M = (body.M0 + n * daysSinceEpoch) % 360;
  return M < 0 ? M + 360 : M;
}

export function solveKepler(M_deg: number, e: number): number {
  // Returns eccentric anomaly E in radians.
  const M = M_deg * DEG;
  let E = M;
  for (let i = 0; i < 8; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

export function trueAnomaly(E: number, e: number): number {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

/** Position in the parent's reference frame, in km. */
export function bodyPosition(body: BodyData, simEpochMs: number, out = new THREE.Vector3()): THREE.Vector3 {
  if (!body.parent) {
    out.set(0, 0, 0);
    return out;
  }
  const M = meanAnomaly(body, simEpochMs);
  const E = solveKepler(M, body.e);
  const v = trueAnomaly(E, body.e);
  const r = body.a * (1 - body.e * Math.cos(E));

  // Position in orbital plane
  const x = r * Math.cos(v);
  const y = r * Math.sin(v);

  const cosO = Math.cos(body.raan * DEG);
  const sinO = Math.sin(body.raan * DEG);
  const cosI = Math.cos(body.i * DEG);
  const sinI = Math.sin(body.i * DEG);
  const cosW = Math.cos(body.argp * DEG);
  const sinW = Math.sin(body.argp * DEG);

  // Standard rotation: orbital plane → ecliptic
  const X = (cosO * cosW - sinO * sinW * cosI) * x + (-cosO * sinW - sinO * cosW * cosI) * y;
  const Y = (sinO * cosW + cosO * sinW * cosI) * x + (-sinO * sinW + cosO * cosW * cosI) * y;
  const Z = (sinW * sinI) * x + (cosW * sinI) * y;

  // Three.js convention: ecliptic plane = XZ, Y up
  out.set(X, Z, -Y);
  return out;
}

/** Sample N points along the body's full orbit for drawing the orbit line. */
export function sampleOrbit(body: BodyData, segments = 256): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  if (!body.parent || body.periodDays <= 0) return points;
  const periodMs = body.periodDays * 86_400_000;
  for (let i = 0; i <= segments; i++) {
    const t = J2000_MS + (i / segments) * periodMs;
    points.push(bodyPosition(body, t).clone());
  }
  return points;
}

/** Approximate orbital speed in km/s using vis-viva. */
export function orbitalSpeed(body: BodyData, simEpochMs: number, parentMassKg: number): number {
  if (!body.parent || body.periodDays <= 0) return 0;
  const G = 6.674e-20; // km^3 kg^-1 s^-2
  const mu = G * parentMassKg;
  const M = meanAnomaly(body, simEpochMs);
  const E = solveKepler(M, body.e);
  const r = body.a * (1 - body.e * Math.cos(E));
  return Math.sqrt(mu * (2 / r - 1 / body.a));
}
