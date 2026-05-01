import * as THREE from "three";

/** Path under /public/textures/ for each body that has a texture. */
export const BODY_TEXTURE: Record<string, string> = {
  sun: "/textures/2k_sun.jpg",
  mercury: "/textures/2k_mercury.jpg",
  venus: "/textures/2k_venus_atmosphere.jpg",
  earth: "/textures/2k_earth_daymap.jpg",
  moon: "/textures/2k_moon.jpg",
  mars: "/textures/2k_mars.jpg",
  phobos: "/textures/2k_phobos.jpg",
  jupiter: "/textures/2k_jupiter.jpg",
  io: "/textures/2k_io.jpg",
  europa: "/textures/2k_europa.jpg",
  ganymede: "/textures/2k_ganymede.jpg",
  callisto: "/textures/2k_callisto.jpg",
  saturn: "/textures/2k_saturn.jpg",
  titan: "/textures/2k_titan.jpg",
  enceladus: "/textures/2k_enceladus.jpg",
  uranus: "/textures/2k_uranus.jpg",
  neptune: "/textures/2k_neptune.jpg",
  pluto: "/textures/2k_pluto.jpg",
};

export const RING_TEXTURE: Record<string, string> = {
  saturn: "/textures/2k_saturn_ring_alpha.png",
};

export const STARFIELD_TEXTURE = "/textures/2k_stars_milky_way.jpg";

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

export function loadTexture(path: string): THREE.Texture {
  const cached = cache.get(path);
  if (cached) return cached;
  const tex = loader.load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(path, tex);
  return tex;
}
