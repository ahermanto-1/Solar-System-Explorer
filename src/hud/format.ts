export function fmtKm(km: number): string {
  if (km < 1000) return `${km.toFixed(1)} km`;
  if (km < 1_000_000) return `${km.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} km`;
  if (km < 1_000_000_000) return `${(km / 1_000_000).toFixed(2)} Mkm`;
  return `${(km / 149_597_870.7).toFixed(3)} AU`;
}

export function fmtMet(simStartMs: number, simEpochMs: number): string {
  const seconds = Math.max(0, (simEpochMs - simStartMs) / 1000);
  const days = Math.floor(seconds / 86400);
  const rem = seconds - days * 86400;
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem - h * 3600) / 60);
  const s = Math.floor(rem - h * 3600 - m * 60);
  return `T+${days}/${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtUtc(simEpochMs: number): string {
  const d = new Date(simEpochMs);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

export function fmtSpeed(s: number): string {
  if (s < 1000) return `${s.toFixed(0)}×`;
  if (s < 1_000_000) return `${(s / 1000).toFixed(0)}k×`;
  return `${(s / 1_000_000).toFixed(0)}M×`;
}

export function fmtVelocity(kmS: number): string {
  if (kmS === 0) return "—";
  return `${kmS.toFixed(2)} km/s`;
}

export function fmtMass(kg: number): string {
  const exp = Math.floor(Math.log10(kg));
  const mantissa = kg / Math.pow(10, exp);
  return `${mantissa.toFixed(2)}e${exp} kg`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
