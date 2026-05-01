import * as THREE from "three";
import { scalePosition, type ScaleConfig } from "./Scaling";

const AU_KM = 149_597_870.7;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

interface Asteroid {
  aKm: number; // semi-major axis in km
  phase0: number; // initial mean anomaly (rad)
  inclination: number; // rad
  raan: number; // longitude of ascending node (rad)
  scale: number; // scene-unit radius
  rotAxis: THREE.Vector3;
  rotSpeed: number; // rad / sim-second
  periodSec: number; // orbital period in *sim* seconds
}

interface DustParticle {
  aKm: number;
  phase0: number;
  inclination: number;
  raan: number;
  periodSec: number;
}

export class AsteroidBelt {
  mesh: THREE.Group;
  private rocks: THREE.InstancedMesh;
  private dust: THREE.Points;
  private asteroids: Asteroid[] = [];
  private dustParticles: DustParticle[] = [];
  private dustPositions: Float32Array;
  private dummy = new THREE.Object3D();
  private tmpVec = { x: 0, y: 0, z: 0 };
  // Scratch quaternion/euler for instance rotation
  private quatScratch = new THREE.Quaternion();

  constructor(count = 3600, dustCount = 9000) {
    this.mesh = new THREE.Group();
    this.mesh.name = "Asteroid belt";

    const geom = new THREE.IcosahedronGeometry(1, 0);
    // Jitter geometry verts a bit so each asteroid isn't a smooth icosahedron
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const j = 0.18 * (Math.random() - 0.5);
      pos.setX(i, pos.getX(i) * (1 + j));
      pos.setY(i, pos.getY(i) * (1 + j));
      pos.setZ(i, pos.getZ(i) * (1 + j));
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x8a7c6a,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true,
    });
    this.rocks = new THREE.InstancedMesh(geom, mat, count);
    this.rocks.frustumCulled = false;
    this.rocks.name = "Asteroid rocks";
    // Subtle per-instance color tint
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const aAu = randomBeltAu();
      const aKm = aAu * AU_KM;
      const periodYears = Math.pow(aAu, 1.5);
      const periodSec = periodYears * 365.25 * 86400;

      // Distribute across the belt — most concentrated, a few stragglers
      const rotAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();

      this.asteroids.push({
        aKm,
        phase0: Math.random() * Math.PI * 2,
        inclination: randomInclination(0.28),
        raan: Math.random() * Math.PI * 2,
        scale: 0.065 + Math.pow(Math.random(), 3) * 0.25, // mostly small, a few bigger
        rotAxis,
        rotSpeed: (Math.random() - 0.5) * 0.4,
        periodSec,
      });

      // Subtle color variation: warm gray to cool gray
      const t = Math.random();
      colors[i * 3] = 0.58 + t * 0.14;
      colors[i * 3 + 1] = 0.52 + t * 0.13;
      colors[i * 3 + 2] = 0.43 + t * 0.11;
    }
    this.rocks.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    this.mesh.add(this.rocks);

    this.dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const aAu = randomBeltAu(0.22);
      const periodYears = Math.pow(aAu, 1.5);
      this.dustParticles.push({
        aKm: aAu * AU_KM,
        phase0: Math.random() * Math.PI * 2,
        inclination: randomInclination(0.42),
        raan: Math.random() * Math.PI * 2,
        periodSec: periodYears * 365.25 * 86400,
      });

      const t = Math.random();
      dustColors[i * 3] = 0.70 + t * 0.18;
      dustColors[i * 3 + 1] = 0.61 + t * 0.16;
      dustColors[i * 3 + 2] = 0.48 + t * 0.12;
    }

    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute("position", new THREE.BufferAttribute(this.dustPositions, 3));
    dustGeom.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.34,
      transparent: true,
      opacity: 0.42,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.dust = new THREE.Points(dustGeom, dustMat);
    this.dust.frustumCulled = false;
    this.dust.name = "Asteroid dust cloud";
    this.mesh.add(this.dust);
  }

  /** Recompute every instance matrix for the current sim time + scale config. */
  update(simEpochMs: number, simSpeedSec: number, cfg: ScaleConfig) {
    const tSec = (simEpochMs - J2000_MS) / 1000;
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      this.setScaledOrbitPosition(a, tSec, cfg, this.tmpVec);

      this.dummy.position.set(this.tmpVec.x, this.tmpVec.y, this.tmpVec.z);

      // Spin
      this.quatScratch.setFromAxisAngle(a.rotAxis, tSec * a.rotSpeed);
      this.dummy.quaternion.copy(this.quatScratch);

      this.dummy.scale.setScalar(a.scale);
      this.dummy.updateMatrix();
      this.rocks.setMatrixAt(i, this.dummy.matrix);
    }
    this.rocks.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.dustParticles.length; i++) {
      this.setScaledOrbitPosition(this.dustParticles[i], tSec, cfg, this.tmpVec);
      const j = i * 3;
      this.dustPositions[j] = this.tmpVec.x;
      this.dustPositions[j + 1] = this.tmpVec.y;
      this.dustPositions[j + 2] = this.tmpVec.z;
    }
    const dustPosition = this.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
    dustPosition.needsUpdate = true;
    void simSpeedSec;
  }

  setVisible(v: boolean) {
    this.mesh.visible = v;
  }

  private setScaledOrbitPosition(
    particle: Pick<Asteroid, "aKm" | "phase0" | "periodSec" | "inclination" | "raan">,
    tSec: number,
    cfg: ScaleConfig,
    out: { x: number; y: number; z: number },
  ) {
    const theta = particle.phase0 + (tSec / particle.periodSec) * Math.PI * 2;
    const x0 = particle.aKm * Math.cos(theta);
    const y0 = particle.aKm * Math.sin(theta);

    const cI = Math.cos(particle.inclination);
    const sI = Math.sin(particle.inclination);
    const cO = Math.cos(particle.raan);
    const sO = Math.sin(particle.raan);
    const X = cO * x0 - sO * y0 * cI;
    const Y = sO * x0 + cO * y0 * cI;
    const Z = y0 * sI;

    scalePosition({ kind: "star" } as any, { x: X, y: Z, z: -Y }, cfg, out);
  }
}

function randomBeltAu(extraSpread = 0): number {
  const center = 2.74;
  const concentrated = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
  const straggler = (Math.random() - 0.5) * (Math.random() < 0.12 ? 1.45 : 1.0);
  const offset = Math.random() < 0.75 ? concentrated * 1.15 : straggler * 1.1;
  return THREE.MathUtils.clamp(center + offset + (Math.random() - 0.5) * extraSpread, 2.08, 3.48);
}

function randomInclination(maxInclination: number): number {
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * Math.pow(Math.random(), 2.4) * maxInclination;
}
