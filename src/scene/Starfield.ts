import * as THREE from "three";

export function makeStarfield(count = 4500): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Random point on a large sphere
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const x = r * Math.cos(t);
    const y = r * Math.sin(t);
    const z = u;
    const dist = 8000 + Math.random() * 2000;
    positions[i * 3] = x * dist;
    positions[i * 3 + 1] = y * dist;
    positions[i * 3 + 2] = z * dist;

    const brightness = 0.4 + Math.random() * 0.6;
    const tint = Math.random();
    if (tint < 0.7) {
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    } else if (tint < 0.85) {
      colors[i * 3] = brightness * 0.7;
      colors[i * 3 + 1] = brightness * 0.85;
      colors[i * 3 + 2] = brightness;
    } else {
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.85;
      colors[i * 3 + 2] = brightness * 0.7;
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: false,
    depthWrite: false,
  });
  return new THREE.Points(geom, mat);
}

export function makeGridPlane(size = 4000, divisions = 40): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, 0x1a3e3c, 0x102826);
  const mat = grid.material as THREE.Material | THREE.Material[];
  if (Array.isArray(mat)) {
    mat.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.35;
      m.depthWrite = false;
    });
  } else {
    mat.transparent = true;
    mat.opacity = 0.35;
    mat.depthWrite = false;
  }
  return grid;
}
