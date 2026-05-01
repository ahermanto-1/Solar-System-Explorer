import * as THREE from "three";
import type { SolarSystem } from "./SolarSystem";

const POINTS_PER_BODY = 240;

interface Trail {
  bodyId: string;
  parentId: string | null;
  line: THREE.Line;
  positions: Float32Array;
  colors: Float32Array;
  count: number; // points written so far
  head: number; // next write index
  baseColor: THREE.Color;
}

/**
 * Per-body fading trail lines. Each body keeps a ring buffer of recent
 * world positions. Older points fade toward transparent black via vertex
 * colors (using an additive-friendly LineBasicMaterial with vertexColors).
 *
 * Moon trails live in the parent's group so they translate with the planet.
 * Planet trails live in the scene root.
 */
export class Trails {
  group: THREE.Group;
  private trails: Trail[] = [];
  private system: SolarSystem;
  private lastSampleAt = 0;
  private sampleIntervalMs = 80; // ~12 Hz

  constructor(system: SolarSystem) {
    this.system = system;
    this.group = new THREE.Group();
    this.group.visible = false;

    for (const b of system.bodyOrder) {
      if (b.data.kind === "star") continue;

      const positions = new Float32Array(POINTS_PER_BODY * 3);
      const colors = new Float32Array(POINTS_PER_BODY * 3);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geom.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, mat);
      line.frustumCulled = false;

      // Moon trails track parent (which moves through the system).
      if (b.parentBody && b.parentBody.data.kind !== "star") {
        b.parentBody.group.add(line);
      } else {
        this.group.add(line);
      }

      this.trails.push({
        bodyId: b.data.id,
        parentId: b.data.parent,
        line,
        positions,
        colors,
        count: 0,
        head: 0,
        baseColor: new THREE.Color(b.data.color),
      });
    }
  }

  setVisible(v: boolean) {
    this.group.visible = v;
    for (const t of this.trails) t.line.visible = v;
  }

  reset() {
    for (const t of this.trails) {
      t.count = 0;
      t.head = 0;
      t.line.geometry.setDrawRange(0, 0);
    }
  }

  tick(realNowMs: number) {
    if (!this.group.visible) return;
    if (realNowMs - this.lastSampleAt < this.sampleIntervalMs) {
      this.refreshColors();
      return;
    }
    this.lastSampleAt = realNowMs;

    for (const t of this.trails) {
      const body = this.system.bodyAt(t.bodyId);
      if (!body) continue;

      // Trail point: world position for planets, parent-relative for moons
      let px: number, py: number, pz: number;
      if (t.parentId && t.parentId !== "sun") {
        const p = body.group.position;
        const pp = body.parentBody!.group.position;
        px = p.x - pp.x;
        py = p.y - pp.y;
        pz = p.z - pp.z;
      } else {
        px = body.group.position.x;
        py = body.group.position.y;
        pz = body.group.position.z;
      }

      const idx = t.head * 3;
      t.positions[idx] = px;
      t.positions[idx + 1] = py;
      t.positions[idx + 2] = pz;
      t.head = (t.head + 1) % POINTS_PER_BODY;
      if (t.count < POINTS_PER_BODY) t.count++;
    }

    this.refreshColors();
  }

  /** Rebuild geometry as a head-ordered linear strip with colour fade. */
  private refreshColors() {
    if (!this.group.visible) return;
    for (const t of this.trails) {
      if (t.count < 2) {
        t.line.geometry.setDrawRange(0, 0);
        continue;
      }
      const geom = t.line.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const colAttr = geom.attributes.color as THREE.BufferAttribute;

      // Re-order from oldest → newest into a contiguous strip.
      // Easier: just write a parallel ordered buffer and overwrite.
      const start = (t.head - t.count + POINTS_PER_BODY) % POINTS_PER_BODY;
      const orderedPos = new Float32Array(t.count * 3);
      const orderedCol = new Float32Array(t.count * 3);
      for (let i = 0; i < t.count; i++) {
        const src = ((start + i) % POINTS_PER_BODY) * 3;
        orderedPos[i * 3] = t.positions[src];
        orderedPos[i * 3 + 1] = t.positions[src + 1];
        orderedPos[i * 3 + 2] = t.positions[src + 2];

        const f = i / Math.max(1, t.count - 1); // 0 oldest → 1 newest
        // Fade colour from black → baseColor
        orderedCol[i * 3] = t.baseColor.r * f;
        orderedCol[i * 3 + 1] = t.baseColor.g * f;
        orderedCol[i * 3 + 2] = t.baseColor.b * f;
      }
      // Write ordered into the geometry's underlying arrays.
      // Reuse the existing arrays to avoid GC churn — copy in place.
      (posAttr.array as Float32Array).set(orderedPos);
      (colAttr.array as Float32Array).set(orderedCol);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      geom.setDrawRange(0, t.count);
    }
  }
}
