import * as THREE from "three";
import type { BodyData } from "../data/bodies";
import { bodyPosition, sampleOrbit } from "./OrbitMath";
import { scalePosition, scaleRadius, type ScaleConfig } from "./Scaling";
import { BODY_TEXTURE, RING_TEXTURE, loadTexture } from "./Textures";

export class Body {
  data: BodyData;
  group: THREE.Group; // root for this body's mesh + children
  mesh: THREE.Mesh;
  rings?: THREE.Mesh;
  orbitLine?: THREE.Line;
  trail?: THREE.Line;
  parentBody: Body | null = null;
  children: Body[] = [];

  posKm: THREE.Vector3 = new THREE.Vector3(); // parent-relative (km)
  worldPosKm: THREE.Vector3 = new THREE.Vector3(); // heliocentric (km)
  prevWorldPosKm: THREE.Vector3 = new THREE.Vector3();

  trailPoints: THREE.Vector3[] = [];
  private trailMax = 200;

  constructor(data: BodyData) {
    this.data = data;
    this.group = new THREE.Group();
    this.group.name = data.id;

    const geom = new THREE.SphereGeometry(1, 64, 48);
    const texturePath = BODY_TEXTURE[data.id];
    const tex = texturePath ? loadTexture(texturePath) : null;

    let mat: THREE.Material;
    if (data.kind === "star") {
      mat = new THREE.MeshBasicMaterial({
        color: tex ? 0xffffff : data.color,
        map: tex ?? null,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: tex ? 0xffffff : data.color,
        map: tex ?? null,
        roughness: 0.92,
        metalness: 0.0,
      });
    }
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.userData = { bodyId: data.id, isBody: true };
    this.group.add(this.mesh);

    if (data.kind === "star") {
      const glowMat = new THREE.MeshBasicMaterial({
        color: data.emissive ?? data.color,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 48, 32), glowMat);
      this.group.add(glow);
      // Sun light
      const light = new THREE.PointLight(0xfff0c4, 2.5, 0, 0);
      this.group.add(light);
    }

    if (data.hasRings) {
      const ringInner = 1.4;
      const ringOuter = 2.3;
      const ringGeom = new THREE.RingGeometry(ringInner, ringOuter, 128);
      // Remap UVs so the ring texture wraps radially (u = 0..1 across ring width).
      const pos = ringGeom.attributes.position;
      const uv = ringGeom.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const r = Math.sqrt(x * x + y * y);
        uv.setXY(i, (r - ringInner) / (ringOuter - ringInner), 0.5);
      }
      const ringTexPath = RING_TEXTURE[data.id];
      const ringTex = ringTexPath ? loadTexture(ringTexPath) : null;
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringTex ? 0xffffff : 0xc9b48a,
        map: ringTex ?? null,
        alphaMap: ringTex ?? null,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: ringTex ? 1 : 0.55,
        depthWrite: false,
      });
      this.rings = new THREE.Mesh(ringGeom, ringMat);
      this.rings.rotation.x = Math.PI / 2;
      this.rings.rotation.z = (data.axialTilt * Math.PI) / 180;
      this.group.add(this.rings);
    }

    // Axial tilt for planets
    if (data.kind !== "star") {
      this.mesh.rotation.z = (data.axialTilt * Math.PI) / 180;
    }
  }

  applyScale(cfg: ScaleConfig) {
    const r = scaleRadius(this.data, cfg);
    this.mesh.scale.setScalar(r);
    if (this.rings) this.rings.scale.setScalar(r);
  }

  buildOrbitLine(cfg: ScaleConfig, parent: Body | null) {
    if (!this.data.parent) return;
    const samples = sampleOrbit(this.data, this.data.kind === "moon" ? 96 : 256);
    if (!samples.length) return;
    const scaled: THREE.Vector3[] = samples.map((p) => {
      const out = { x: 0, y: 0, z: 0 };
      scalePosition(parent ? parent.data : null, p, cfg, out);
      return new THREE.Vector3(out.x, out.y, out.z);
    });
    const geom = new THREE.BufferGeometry().setFromPoints(scaled);
    const mat = new THREE.LineBasicMaterial({
      color: this.data.kind === "moon" ? 0x3a8a87 : 0x2f6e6a,
      transparent: true,
      opacity: this.data.kind === "moon" ? 0.45 : 0.55,
    });
    this.orbitLine = new THREE.Line(geom, mat);
    this.orbitLine.renderOrder = -1;
  }

  rebuildOrbitLine(cfg: ScaleConfig, parent: Body | null) {
    if (this.orbitLine) {
      const parentObj = this.orbitLine.parent;
      this.orbitLine.geometry.dispose();
      (this.orbitLine.material as THREE.Material).dispose();
      parentObj?.remove(this.orbitLine);
      this.orbitLine = undefined;
    }
    this.buildOrbitLine(cfg, parent);
  }

  /** Update parent-relative position (km) from sim time. */
  updatePositionKm(simEpochMs: number) {
    bodyPosition(this.data, simEpochMs, this.posKm);
  }

  /** Update group's scene position from posKm and parent worldPosKm. */
  applyPosition(cfg: ScaleConfig, parent: Body | null) {
    const tmp = { x: 0, y: 0, z: 0 };
    scalePosition(parent ? parent.data : null, this.posKm, cfg, tmp);
    if (parent) {
      this.group.position.set(
        parent.group.position.x + tmp.x,
        parent.group.position.y + tmp.y,
        parent.group.position.z + tmp.z,
      );
      this.worldPosKm.copy(parent.worldPosKm).add(this.posKm);
    } else {
      this.group.position.set(0, 0, 0);
      this.worldPosKm.set(0, 0, 0);
    }
  }

  rotateForFrame(dtSec: number, simSpeed: number) {
    if (this.data.kind === "star") {
      this.mesh.rotation.y += 0.0002 * (dtSec * 60);
      return;
    }
    if (this.data.rotationPeriodHours === 0) return;
    const periodSec = this.data.rotationPeriodHours * 3600;
    const rot = ((dtSec * simSpeed) / periodSec) * Math.PI * 2;
    this.mesh.rotation.y += rot;
  }

  pushTrailPoint() {
    this.trailPoints.push(this.group.position.clone());
    if (this.trailPoints.length > this.trailMax) this.trailPoints.shift();
  }
}
