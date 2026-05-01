import * as THREE from "three";
import type { SolarSystem } from "./SolarSystem";
import type { SimState } from "../state/SimState";
import { angularDistance, featuresFor } from "../data/features";
import type { CameraRig } from "./CameraRig";
import { surfaceLatFromLocal, surfaceLonFromLocal } from "./SurfaceCoordinates";

export class Picker {
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  private mouseDownPos: { x: number; y: number } | null = null;
  private onBackground: (() => void) | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private system: SolarSystem,
    private rig: CameraRig,
    private state: SimState,
    onBackground?: () => void,
  ) {
    this.onBackground = onBackground ?? null;
    canvas.addEventListener("pointerdown", (e) => {
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("pointerup", (e) => {
      if (!this.mouseDownPos) return;
      const dx = e.clientX - this.mouseDownPos.x;
      const dy = e.clientY - this.mouseDownPos.y;
      this.mouseDownPos = null;
      if (Math.hypot(dx, dy) > 4) return; // it was a drag, not a click
      this.handleClick(e);
    });
    canvas.addEventListener("pointermove", (e) => this.handleMove(e));
  }

  private setPointer(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleMove(e: PointerEvent) {
    this.setPointer(e);
    this.raycaster.setFromCamera(this.pointer, this.rig.camera);
    const hits = this.raycaster.intersectObjects(this.system.pickables(), false);
    if (hits.length === 0) {
      this.state.setHover(null);
      this.canvas.style.cursor = "default";
      return;
    }
    const id = hits[0].object.userData.bodyId as string | undefined;
    this.state.setHover(id ?? null);
    this.canvas.style.cursor = id ? "pointer" : "default";
  }

  private handleClick(e: PointerEvent) {
    this.setPointer(e);
    this.raycaster.setFromCamera(this.pointer, this.rig.camera);
    const hits = this.raycaster.intersectObjects(this.system.pickables(), false);
    if (hits.length === 0) {
      if (this.state.activeFeatureId) {
        this.state.setActiveFeature(null);
      } else {
        this.onBackground?.();
      }
      return;
    }

    const hit = hits[0];
    const id = hit.object.userData.bodyId as string;

    // If clicked on the currently focused body — try a feature pick
    if (!this.state.mission.activeId && id === this.state.focusedId) {
      const feature = this.featureAtHit(id, hit);
      if (feature) {
        this.state.setActiveFeature(feature.name);
        return;
      }
    }
    // Otherwise, change focus
    const body = this.system.bodyAt(id);
    if (body) {
      this.rig.focus(body);
      this.state.setFocus(id);
    }
  }

  private featureAtHit(bodyId: string, hit: THREE.Intersection): { name: string } | null {
    const features = featuresFor(bodyId);
    if (!features.length) return null;
    const body = this.system.bodyAt(bodyId);
    if (!body) return null;

    // Convert hit point to body-local coordinates, then to the same equirectangular
    // lat/lon convention used by the surface labels.
    const local = body.mesh.worldToLocal(hit.point.clone()).normalize();
    const lat = surfaceLatFromLocal(local);
    const lon = surfaceLonFromLocal(local);

    let best: typeof features[number] | null = null;
    let bestD = Infinity;
    for (const f of features) {
      const d = angularDistance(lat, lon, f.lat, f.lon);
      if (d < f.radiusDeg && d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best ? { name: best.name } : null;
  }
}
