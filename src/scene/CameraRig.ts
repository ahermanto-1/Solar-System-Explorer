import * as THREE from "three";
import type { Body } from "./Body";
import { surfacePointFromLatLon } from "./SurfaceCoordinates";

/**
 * A focus-and-orbit camera rig. The camera always orbits around `target.group.position`.
 * Mouse drag rotates the orbit. Wheel zooms in/out (clamped per body radius).
 * Switching focus tweens the orbit center smoothly.
 */
export class CameraRig {
  camera: THREE.PerspectiveCamera;
  target: Body | null = null;
  targetObject: THREE.Object3D | null = null;
  domElement: HTMLElement;

  // Orbit state (spherical around target)
  yaw = 0.6;
  pitch = 0.45;
  distance = 200;

  // Tween state
  private tweenStart = 0;
  private tweenDuration = 0;
  private tweenFromCenter = new THREE.Vector3();
  private tweenToBody: Body | null = null;
  private tweenToObject: THREE.Object3D | null = null;
  private tweenFromDistance = 0;
  private tweenToDistance = 0;
  private tweenView = false;
  private tweenFromYaw = 0;
  private tweenToYaw = 0;
  private tweenFromPitch = 0;
  private tweenToPitch = 0;
  private surfaceLock: { body: Body; lat: number; lon: number } | null = null;
  private scratchFeature = new THREE.Vector3();

  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.domElement.setPointerCapture(e.pointerId);
  };
  private onPointerUp = (e: PointerEvent) => {
    this.dragging = false;
    try { this.domElement.releasePointerCapture(e.pointerId); } catch {}
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.yaw -= dx * 0.005;
    this.pitch -= dy * 0.005;
    const eps = 0.05;
    this.pitch = Math.max(-Math.PI / 2 + eps, Math.min(Math.PI / 2 - eps, this.pitch));
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.001);
    this.distance *= factor;
    const min = this.minDistance();
    const max = 6000;
    this.distance = Math.max(min, Math.min(max, this.distance));
  };

  constructor(canvas: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.001, 50000);
    this.domElement = canvas;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  focus(body: Body, instant = false, overrideDistance?: number) {
    this.surfaceLock = null;
    this.targetObject = null;
    this.tweenToObject = null;
    this.tweenView = false;
    const targetDist = overrideDistance ?? this.idealDistance(body);
    if (instant || !this.target) {
      this.target = body;
      this.distance = targetDist;
      return;
    }
    if (this.target === body && this.tweenToBody === null) {
      // Already focused — just retarget the distance
      this.tweenFromCenter.copy(this.target.group.position);
      this.tweenFromDistance = this.distance;
      this.tweenToBody = body;
      this.tweenToDistance = targetDist;
      this.tweenStart = performance.now();
      this.tweenDuration = 800;
      return;
    }
    this.tweenFromCenter.copy(this.target.group.position);
    this.tweenFromDistance = this.distance;
    this.tweenToBody = body;
    this.tweenToDistance = targetDist;
    this.tweenStart = performance.now();
    this.tweenDuration = 1200;
  }

  focusObject(
    object: THREE.Object3D,
    instant = false,
    overrideDistance = 8,
    view?: { yaw: number; pitch: number },
    transitionDurationMs = 1200,
  ) {
    this.surfaceLock = null;
    const fromCenter = this.currentCenter();
    if (instant || (!this.target && !this.targetObject)) {
      this.target = null;
      this.targetObject = object;
      this.tweenToBody = null;
      this.tweenToObject = null;
      this.tweenStart = 0;
      this.distance = overrideDistance;
      if (view) {
        this.yaw = view.yaw;
        this.pitch = view.pitch;
      }
      this.tweenView = false;
      return;
    }
    this.tweenFromCenter.copy(fromCenter);
    this.tweenFromDistance = this.distance;
    this.tweenToBody = null;
    this.tweenToObject = object;
    this.tweenToDistance = overrideDistance;
    if (view) {
      this.tweenView = true;
      this.tweenFromYaw = this.yaw;
      this.tweenToYaw = closestAngle(this.yaw, view.yaw);
      this.tweenFromPitch = this.pitch;
      this.tweenToPitch = view.pitch;
    } else {
      this.tweenView = false;
    }
    this.tweenStart = performance.now();
    this.tweenDuration = transitionDurationMs;
  }

  isFocusingObject(object: THREE.Object3D): boolean {
    return this.targetObject === object || this.tweenToObject === object;
  }

  focusFeature(body: Body, lat: number, lon: number, instant = false) {
    const targetDist = Math.max(body.mesh.scale.x * 2.2, 0.9);
    const fromCenter = this.currentCenter();
    const normal = this.featureWorldPoint(body, lat, lon).sub(body.group.position).normalize();
    this.yaw = Math.atan2(normal.x, normal.z) + 0.22;
    this.pitch = THREE.MathUtils.clamp(Math.asin(normal.y) + 0.12, -Math.PI / 2 + 0.08, Math.PI / 2 - 0.08);
    this.surfaceLock = { body, lat, lon };
    this.tweenView = false;

    if (instant || !this.target) {
      this.target = body;
      this.targetObject = null;
      this.distance = targetDist;
      this.tweenToBody = null;
      this.tweenToObject = null;
      this.tweenStart = 0;
      return;
    }

    this.tweenFromCenter.copy(fromCenter);
    this.tweenFromDistance = this.distance;
    this.tweenToBody = body;
    this.tweenToDistance = targetDist;
    this.tweenStart = performance.now();
    this.tweenDuration = 900;
  }

  clearSurfaceLock() {
    this.surfaceLock = null;
  }

  private minDistance(): number {
    if (this.targetObject) return 0.35;
    if (!this.target) return 1;
    const r = this.target.mesh.scale.x;
    if (this.surfaceLock) return r * 0.65;
    return r * 1.4;
  }

  private idealDistance(body: Body): number {
    const r = body.mesh.scale.x;
    if (body.data.kind === "moon") return r * 6;
    return r * 6;
  }

  /** Frame the whole solar system from above-and-behind the Sun. */
  overview(sun: Body, instant = false) {
    this.yaw = 0.6;
    this.pitch = 0.45;
    this.focus(sun, instant, 700);
  }

  update(_dtSec: number) {
    if (!this.target && !this.targetObject) return;

    // Tween to new focus center
    let center: THREE.Vector3;
    if ((this.tweenToBody || this.tweenToObject) && this.tweenStart > 0) {
      const t = Math.min(1, (performance.now() - this.tweenStart) / this.tweenDuration);
      const e = easeInOutSmoothStep(t);
      const toPos = this.tweenToObject
        ? this.tweenToObject.position
        : this.surfaceLock && this.tweenToBody === this.surfaceLock.body
        ? this.featureWorldPoint(this.surfaceLock.body, this.surfaceLock.lat, this.surfaceLock.lon)
        : this.tweenToBody!.group.position;
      center = this.tweenFromCenter.clone().lerp(toPos, e);
      this.distance = this.tweenFromDistance + (this.tweenToDistance - this.tweenFromDistance) * e;
      if (this.tweenView) {
        this.yaw = this.tweenFromYaw + (this.tweenToYaw - this.tweenFromYaw) * e;
        this.pitch = this.tweenFromPitch + (this.tweenToPitch - this.tweenFromPitch) * e;
      }
      if (t >= 1) {
        this.target = this.tweenToBody;
        this.targetObject = this.tweenToObject;
        this.tweenToBody = null;
        this.tweenToObject = null;
        this.tweenStart = 0;
        if (this.tweenView) {
          this.yaw = this.tweenToYaw;
          this.pitch = this.tweenToPitch;
          this.tweenView = false;
        }
        center = this.currentCenter();
      }
    } else {
      center = this.currentCenter();
    }

    const cosP = Math.cos(this.pitch);
    const x = this.distance * cosP * Math.sin(this.yaw);
    const y = this.distance * Math.sin(this.pitch);
    const z = this.distance * cosP * Math.cos(this.yaw);
    this.camera.position.set(center.x + x, center.y + y, center.z + z);
    this.camera.lookAt(center);
  }

  private currentCenter(): THREE.Vector3 {
    if (this.surfaceLock) {
      return this.featureWorldPoint(this.surfaceLock.body, this.surfaceLock.lat, this.surfaceLock.lon).clone();
    }
    if (this.targetObject) return this.targetObject.position;
    return this.target ? this.target.group.position : new THREE.Vector3();
  }

  private featureWorldPoint(body: Body, lat: number, lon: number): THREE.Vector3 {
    surfacePointFromLatLon(lat, lon, this.scratchFeature);
    return body.mesh.localToWorld(this.scratchFeature.clone());
  }
}

function easeInOutSmoothStep(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function closestAngle(from: number, to: number) {
  let target = to;
  while (target - from > Math.PI) target -= Math.PI * 2;
  while (target - from < -Math.PI) target += Math.PI * 2;
  return target;
}
