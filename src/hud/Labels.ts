import * as THREE from "three";
import type { SolarSystem } from "../scene/SolarSystem";
import type { CameraRig } from "../scene/CameraRig";
import type { SimState } from "../state/SimState";

/**
 * DOM-based labels overlaid on the 3D scene. Each body gets a small div that
 * tracks its on-screen position. Hidden when off-screen, behind the camera,
 * or for bodies that occupy fewer than `MIN_PIXEL_SIZE` pixels of the viewport.
 */
export class Labels {
  private root: HTMLElement;
  private items = new Map<string, HTMLElement>();
  private tmpVec = new THREE.Vector3();
  private state: SimState;
  private system: SolarSystem;
  private rig: CameraRig;

  constructor(parent: HTMLElement, system: SolarSystem, rig: CameraRig, state: SimState) {
    this.system = system;
    this.rig = rig;
    this.state = state;

    this.root = document.createElement("div");
    this.root.className = "labels-layer";
    parent.appendChild(this.root);

    for (const b of system.bodyOrder) {
      const el = document.createElement("div");
      el.className = "label";
      el.dataset.id = b.data.id;
      el.dataset.kind = b.data.kind;
      const dot = document.createElement("span");
      dot.className = "label-dot";
      const txt = document.createElement("span");
      txt.className = "label-text";
      txt.textContent = b.data.name;
      el.append(dot, txt);
      el.addEventListener("click", () => {
        if (b.data.id === "sun") {
          (window as any).__overview?.();
        } else {
          this.rig.focus(b);
          this.state.setFocus(b.data.id);
        }
      });
      this.root.appendChild(el);
      this.items.set(b.data.id, el);
    }

    state.subscribe(() => this.applyVisibility());
    this.applyVisibility();
  }

  private applyVisibility() {
    this.root.style.display = this.state.toggles.showLabels ? "block" : "none";
  }

  tick(canvasW: number, canvasH: number) {
    if (!this.state.toggles.showLabels) return;
    const cam = this.rig.camera;
    const camPos = cam.position;
    const halfW = canvasW / 2;
    const halfH = canvasH / 2;

    for (const b of this.system.bodyOrder) {
      const el = this.items.get(b.data.id)!;
      // Hide moons when their parent isn't focused (cuts clutter)
      if (b.data.kind === "moon" && this.state.focusedId !== b.data.parent && this.state.focusedId !== b.data.id) {
        el.style.display = "none";
        continue;
      }
      // Hide hidden moons (showMoons toggle)
      if (b.data.kind === "moon" && !this.state.toggles.showMoons) {
        el.style.display = "none";
        continue;
      }

      this.tmpVec.copy(b.group.position).project(cam);
      // .z > 1 means behind the camera (Three.js NDC depth)
      if (this.tmpVec.z > 1 || this.tmpVec.z < -1) {
        el.style.display = "none";
        continue;
      }
      const x = this.tmpVec.x * halfW + halfW;
      const y = -this.tmpVec.y * halfH + halfH;
      if (x < -50 || x > canvasW + 50 || y < -50 || y > canvasH + 50) {
        el.style.display = "none";
        continue;
      }

      // Distance-based fade: hide when body subtends < 3 px on screen, unless focused
      const r = b.mesh.scale.x;
      const dist = camPos.distanceTo(b.group.position);
      const fov = (cam.fov * Math.PI) / 180;
      const pxRadius = (r / dist) * (canvasH / (2 * Math.tan(fov / 2)));
      const isFocus = this.state.focusedId === b.data.id;
      if (!isFocus && pxRadius < 1.5) {
        el.style.display = "none";
        continue;
      }

      el.style.display = "flex";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.classList.toggle("focus", isFocus);
    }
  }
}
