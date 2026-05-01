import * as THREE from "three";
import { BODIES, getBody, type BodyData } from "../data/bodies";
import { Body } from "./Body";
import { type ScaleConfig } from "./Scaling";
import { makeStarfield, makeGridPlane } from "./Starfield";
import { STARFIELD_TEXTURE, loadTexture } from "./Textures";
import { AsteroidBelt } from "./AsteroidBelt";
import { Trails } from "./Trails";

export class SolarSystem {
  scene: THREE.Scene;
  bodies = new Map<string, Body>();
  bodyOrder: Body[] = []; // parents before children
  orbitLines: THREE.Group;
  trails: THREE.Group;
  labels: THREE.Group;
  asteroidBelt: AsteroidBelt;
  trailsLayer!: Trails;

  constructor() {
    this.scene = new THREE.Scene();

    // Milky Way equirectangular as the scene background, dimmed via fog colour mix.
    const skyTex = loadTexture(STARFIELD_TEXTURE);
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = skyTex;
    this.scene.backgroundIntensity = 0.35;

    this.scene.add(new THREE.AmbientLight(0x223344, 0.35));
    this.scene.add(makeStarfield());
    const grid = makeGridPlane();
    this.scene.add(grid);

    this.orbitLines = new THREE.Group();
    this.trails = new THREE.Group();
    this.labels = new THREE.Group();
    this.scene.add(this.orbitLines);
    this.scene.add(this.trails);
    this.scene.add(this.labels);

    this.asteroidBelt = new AsteroidBelt();
    this.scene.add(this.asteroidBelt.mesh);

    this.trailsLayer = new Trails(this);
    this.scene.add(this.trailsLayer.group);

    // Build bodies in topological order (sun first, then planets, then moons)
    const ordered: BodyData[] = [];
    const seen = new Set<string>();
    const visit = (data: BodyData) => {
      if (seen.has(data.id)) return;
      if (data.parent) {
        const p = getBody(data.parent);
        if (p) visit(p);
      }
      ordered.push(data);
      seen.add(data.id);
    };
    BODIES.forEach(visit);

    for (const data of ordered) {
      const b = new Body(data);
      const parent = data.parent ? this.bodies.get(data.parent) ?? null : null;
      b.parentBody = parent;
      if (parent) parent.children.push(b);
      this.bodies.set(data.id, b);
      this.bodyOrder.push(b);
      this.scene.add(b.group);
    }
  }

  applyScale(cfg: ScaleConfig) {
    for (const b of this.bodyOrder) b.applyScale(cfg);
  }

  rebuildOrbitLines(cfg: ScaleConfig) {
    // remove all existing
    while (this.orbitLines.children.length) {
      const c = this.orbitLines.children.pop()!;
      if ((c as THREE.Line).geometry) (c as THREE.Line).geometry.dispose();
      const mat = (c as THREE.Line).material as THREE.Material;
      mat?.dispose?.();
    }
    for (const b of this.bodyOrder) {
      b.rebuildOrbitLine(cfg, b.parentBody);
      if (b.orbitLine) {
        // Heliocentric orbits live at the scene root; moon orbits live under their parent's group
        if (b.parentBody?.data.kind === "star") {
          this.orbitLines.add(b.orbitLine);
        } else if (b.parentBody) {
          // Position the orbit line at the parent each frame via a tiny group
          // Simpler: add to parent's group directly (parent's transform is what we want)
          b.parentBody.group.add(b.orbitLine);
        }
      }
    }
  }

  setOrbitsVisible(v: boolean) {
    this.orbitLines.visible = v;
    for (const b of this.bodyOrder) {
      if (b.orbitLine && b.parentBody && b.parentBody.data.kind !== "star") {
        b.orbitLine.visible = v;
      }
    }
  }

  setMoonsVisible(v: boolean) {
    for (const b of this.bodyOrder) {
      if (b.data.kind === "moon") {
        b.group.visible = v;
        if (b.orbitLine) b.orbitLine.visible = v && this.orbitLines.visible;
      }
    }
  }

  /** Update positions for all bodies given the current sim time. */
  updateAll(simEpochMs: number, cfg: ScaleConfig) {
    for (const b of this.bodyOrder) {
      b.updatePositionKm(simEpochMs);
      b.applyPosition(cfg, b.parentBody);
    }
    this.asteroidBelt.update(simEpochMs, 0, cfg);
  }

  rotateAll(dtSec: number, simSpeed: number) {
    for (const b of this.bodyOrder) b.rotateForFrame(dtSec, simSpeed);
  }

  /** Returns all meshes for raycasting. */
  pickables(): THREE.Object3D[] {
    return this.bodyOrder.map((b) => b.mesh);
  }

  bodyAt(id: string): Body | undefined {
    return this.bodies.get(id);
  }
}
