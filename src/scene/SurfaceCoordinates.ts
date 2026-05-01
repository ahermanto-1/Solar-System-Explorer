import * as THREE from "three";

export function surfacePointFromLatLon(lat: number, lon: number, target = new THREE.Vector3()): THREE.Vector3 {
  const latRad = THREE.MathUtils.degToRad(lat);
  const lonRad = THREE.MathUtils.degToRad(lon);
  const cosLat = Math.cos(latRad);
  return target.set(
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    -cosLat * Math.sin(lonRad),
  );
}

export function surfaceLatFromLocal(local: THREE.Vector3): number {
  return THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)));
}

export function surfaceLonFromLocal(local: THREE.Vector3): number {
  return normalizeLongitude(THREE.MathUtils.radToDeg(Math.atan2(-local.z, local.x)));
}

function normalizeLongitude(lon: number): number {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}
