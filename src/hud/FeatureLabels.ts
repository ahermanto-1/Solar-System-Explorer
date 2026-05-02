import * as THREE from "three";
import type { SolarSystem } from "../scene/SolarSystem";
import type { CameraRig } from "../scene/CameraRig";
import type { SimState } from "../state/SimState";
import { FEATURES } from "../data/features";
import { surfacePointFromLatLon } from "../scene/SurfaceCoordinates";

export class FeatureLabels {
  private root: HTMLElement;
  private markers = new Map<string, HTMLElement>();
  private state: SimState;
  private system: SolarSystem;
  private rig: CameraRig;
  private tmpVec = new THREE.Vector3();
  private tmpProj = new THREE.Vector3();
  private tmpNorm = new THREE.Vector3();
  private tmpDir = new THREE.Vector3();

  constructor(parent: HTMLElement, system: SolarSystem, rig: CameraRig, state: SimState) {
    this.system = system;
    this.rig = rig;
    this.state = state;

    this.root = document.createElement("div");
    this.root.className = "feature-labels-layer";
    parent.appendChild(this.root);

    for (const f of FEATURES) {
      const el = document.createElement("button");
      el.className = `feature-marker feature-marker--${f.type.replace(/\s+/g, "-")}`;
      el.setAttribute("aria-label", f.name);
      el.dataset.feature = f.name;

      const dot = document.createElement("span");
      dot.className = "fm-dot";
      const lbl = document.createElement("span");
      lbl.className = "fm-label";
      lbl.textContent = f.name;
      el.append(dot, lbl);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.state.setActiveFeature(f.name);
      });

      this.root.appendChild(el);
      this.markers.set(f.name, el);
    }

    state.subscribe(() => this.applyVisibility());
    this.applyVisibility();
  }

  private applyVisibility() {
    this.root.style.display = this.state.mission.activeId || !this.state.toggles.showLabels ? "none" : "block";
  }

  tick(canvasW: number, canvasH: number) {
    if (this.state.mission.activeId || !this.state.toggles.showLabels) return;

    const cam = this.rig.camera;
    const halfW = canvasW / 2;
    const halfH = canvasH / 2;
    const focusedId = this.state.focusedId;
    const hasActive = !!this.state.activeFeatureId;

    this.root.classList.toggle("has-active", hasActive);

    for (const f of FEATURES) {
      const el = this.markers.get(f.name)!;

      if (f.bodyId !== focusedId) {
        el.style.display = "none";
        continue;
      }

      const body = this.system.bodyAt(f.bodyId);
      if (!body) {
        el.style.display = "none";
        continue;
      }

      surfacePointFromLatLon(f.lat, f.lon, this.tmpVec);

      // Force the world matrix up-to-date so localToWorld reflects this frame's rotation,
      // not the previous frame (matrixWorld is updated lazily by the renderer).
      body.mesh.updateWorldMatrix(true, false);
      body.mesh.localToWorld(this.tmpVec);

      // Visibility: dot-product of surface normal against camera direction from body center
      this.tmpNorm.subVectors(this.tmpVec, body.group.position).normalize();
      this.tmpDir.subVectors(cam.position, body.group.position).normalize();
      const facing = this.tmpNorm.dot(this.tmpDir);

      if (facing < 0.05) {
        el.style.display = "none";
        continue;
      }

      this.tmpProj.copy(this.tmpVec).project(cam);
      if (this.tmpProj.z > 1) {
        el.style.display = "none";
        continue;
      }

      const x = this.tmpProj.x * halfW + halfW;
      const y = -this.tmpProj.y * halfH + halfH;

      if (x < -40 || x > canvasW + 40 || y < -40 || y > canvasH + 40) {
        el.style.display = "none";
        continue;
      }

      const limb = Math.min(1, (facing - 0.05) / 0.25);
      el.style.display = "flex";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty("--limb", limb.toFixed(2));
      el.classList.toggle("active", this.state.activeFeatureId === f.name);
    }
  }
}
