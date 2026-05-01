import * as THREE from "three";
import type { SimState } from "../state/SimState";
import { activeMissionStep } from "../data/missions";
import { featureByName } from "../data/features";
import type { SolarSystem } from "./SolarSystem";
import { surfacePointFromLatLon } from "./SurfaceCoordinates";

const transferPoints = 80;
const orbitPoints = 96;
const EARTH_INSERTION_ANGLE = -Math.PI * 0.62;
const EARTH_TLI_ANGLE = EARTH_INSERTION_ANGLE + Math.PI * 1.72;
const MOON_LOI_ANGLE = Math.PI * 0.2;
const MOON_DESCENT_ANGLE = MOON_LOI_ANGLE + Math.PI * 1.25;
const MOON_ASCENT_ANGLE = MOON_DESCENT_ANGLE + Math.PI * 0.52;

export class MissionLayer {
  group = new THREE.Group();

  private system: SolarSystem;
  private outbound: THREE.Line;
  private returnPath: THREE.Line;
  private earthOrbit: THREE.Line;
  private lunarOrbit: THREE.Line;
  private launchPath: THREE.Line;
  private descentPath: THREE.Line;
  private ascentPath: THREE.Line;
  private splashdownPath: THREE.Line;
  private marker: THREE.Group;
  private markerCore: THREE.Mesh;
  private markerHalo: THREE.Mesh;
  private scratchEarth = new THREE.Vector3();
  private scratchMoon = new THREE.Vector3();

  constructor(system: SolarSystem) {
    this.system = system;
    this.group.name = "mission-layer";
    this.group.visible = false;

    this.outbound = makeLine(0xf5b942, 0.76);
    this.returnPath = makeLine(0x5ee7e0, 0.62);
    this.earthOrbit = makeLine(0xf5b942, 0.48);
    this.lunarOrbit = makeLine(0x5ee7e0, 0.5);
    this.launchPath = makeLine(0xf5b942, 0.62);
    this.descentPath = makeLine(0xf5b942, 0.68);
    this.ascentPath = makeLine(0x5ee7e0, 0.58);
    this.splashdownPath = makeLine(0x5ee7e0, 0.62);
    this.marker = new THREE.Group();
    this.marker.name = "apollo-marker";

    this.markerCore = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    this.markerHalo = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.MeshBasicMaterial({
        color: 0xf5b942,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    this.marker.add(this.markerHalo, this.markerCore);

    this.group.add(
      this.launchPath,
      this.outbound,
      this.returnPath,
      this.earthOrbit,
      this.lunarOrbit,
      this.descentPath,
      this.ascentPath,
      this.splashdownPath,
      this.marker,
    );
  }

  get cameraTarget(): THREE.Object3D {
    return this.marker;
  }

  update(state: SimState, camera: THREE.Camera) {
    const step = activeMissionStep(state.mission.activeId, state.mission.stepIndex);
    this.group.visible = !!step;
    if (!step) return;

    const earth = this.system.bodyAt("earth");
    const moon = this.system.bodyAt("moon");
    if (!earth || !moon) return;

    this.scratchEarth.copy(earth.group.position);
    this.scratchMoon.copy(moon.group.position);

    const earthR = Math.max(earth.mesh.scale.x, 0.6);
    const moonR = Math.max(moon.mesh.scale.x, 0.28);
    const earthOrbitR = earthR * 5.4;
    const lunarOrbitR = moonR * 8.2;
    const markerT = THREE.MathUtils.lerp(step.markerStartT, step.markerT, state.mission.stepProgress);

    const landingPoint = this.surfacePoint("Mare Tranquillitatis", lunarOrbitR);

    setLinePoints(this.launchPath, samplePath((t) => this.launchPoint(t, earthR, earthOrbitR)));
    setLinePoints(this.outbound, samplePath((t) => this.outboundPoint(t, earthOrbitR, lunarOrbitR)));
    setLinePoints(this.returnPath, samplePath((t) => this.returnPoint(t, earthR, lunarOrbitR)));
    setLinePoints(this.earthOrbit, orbitCircle(this.scratchEarth, earthOrbitR));
    setLinePoints(this.lunarOrbit, orbitCircle(this.scratchMoon, lunarOrbitR));
    setLinePoints(this.descentPath, samplePath((t) => this.surfaceDescentPoint(t, lunarOrbitR, landingPoint)));
    setLinePoints(this.ascentPath, samplePath((t) => this.surfaceAscentPoint(t, lunarOrbitR, landingPoint)));
    setLinePoints(this.splashdownPath, samplePath((t) => this.splashdownPoint(t, earthR, lunarOrbitR)));

    this.launchPath.visible = step.pathMode === "launch" || step.pathMode === "earth-orbit";
    this.outbound.visible = step.pathMode === "outbound" || step.pathMode === "lunar-orbit";
    this.returnPath.visible = step.pathMode === "return";
    this.earthOrbit.visible = step.pathMode === "launch" || step.pathMode === "earth-orbit" || step.pathMode === "outbound";
    this.lunarOrbit.visible = step.pathMode === "lunar-orbit" ||
      step.pathMode === "surface-descent" ||
      step.pathMode === "surface-ascent" ||
      step.pathMode === "return";
    this.descentPath.visible = step.pathMode === "surface-descent" || step.pathMode === "surface";
    this.ascentPath.visible = step.pathMode === "surface-ascent" || step.pathMode === "return";
    this.splashdownPath.visible = step.pathMode === "splashdown";

    const markerPos = this.markerPosition(step.pathMode, markerT, earthR, earthOrbitR, lunarOrbitR, landingPoint);
    this.marker.position.copy(markerPos);

    const cameraDistance = camera.position.distanceTo(markerPos);
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.08;
    const coreScale = THREE.MathUtils.clamp(cameraDistance * 0.006, 0.055, 0.24);
    this.markerCore.scale.setScalar(coreScale);
    this.markerHalo.scale.setScalar(coreScale * 2.1 * pulse);
  }

  private markerPosition(
    pathMode: string,
    t: number,
    earthR: number,
    earthOrbitR: number,
    lunarOrbitR: number,
    landingPoint: THREE.Vector3,
  ) {
    if (pathMode === "launch") {
      return this.launchPoint(t, earthR, earthOrbitR);
    }
    if (pathMode === "earth-orbit") {
      return this.earthOrbitPoint(t, earthOrbitR);
    }
    if (pathMode === "lunar-orbit") {
      return this.lunarOrbitPoint(t, lunarOrbitR);
    }
    if (pathMode === "return") {
      return this.returnPoint(t, earthR, lunarOrbitR);
    }
    if (pathMode === "outbound") {
      return this.outboundPoint(t, earthOrbitR, lunarOrbitR);
    }
    if (pathMode === "surface-descent") {
      return this.surfaceDescentPoint(t, lunarOrbitR, landingPoint);
    }
    if (pathMode === "surface") {
      return landingPoint.clone();
    }
    if (pathMode === "surface-ascent") {
      return this.surfaceAscentPoint(t, lunarOrbitR, landingPoint);
    }
    if (pathMode === "splashdown") {
      return this.splashdownPoint(t, earthR, lunarOrbitR);
    }
    const dir = this.scratchMoon.clone().sub(this.scratchEarth).normalize();
    return this.scratchEarth.clone().addScaledVector(dir, earthOrbitR * 0.9);
  }

  private launchPoint(t: number, earthR: number, earthOrbitR: number) {
    const angle = EARTH_INSERTION_ANGLE - 0.52 + t * 0.52;
    const radius = THREE.MathUtils.lerp(earthR * 1.08, earthOrbitR, easeOutCubic(t));
    const climb = orbitPoint(this.scratchEarth, radius, angle);
    climb.y += Math.sin(t * Math.PI) * earthR * 1.7;
    return climb;
  }

  private earthOrbitPoint(t: number, earthOrbitR: number) {
    return orbitPoint(this.scratchEarth, earthOrbitR, THREE.MathUtils.lerp(EARTH_INSERTION_ANGLE, EARTH_TLI_ANGLE, t));
  }

  private lunarOrbitPoint(t: number, lunarOrbitR: number) {
    return orbitPoint(this.scratchMoon, lunarOrbitR, THREE.MathUtils.lerp(MOON_LOI_ANGLE, MOON_DESCENT_ANGLE, t));
  }

  private outboundPoint(t: number, earthOrbitR: number, lunarOrbitR: number) {
    const start = this.earthOrbitPoint(1, earthOrbitR);
    const end = this.lunarOrbitPoint(0, lunarOrbitR);
    const earthTangent = tangentPoint(this.scratchEarth, earthOrbitR, EARTH_TLI_ANGLE, 8.5);
    const moonApproach = tangentPoint(this.scratchMoon, lunarOrbitR, MOON_LOI_ANGLE - Math.PI * 0.35, 7);
    return cubicBezier(start, earthTangent, moonApproach, end, easeInOutCubic(t));
  }

  private returnPoint(t: number, earthR: number, lunarOrbitR: number) {
    const start = orbitPoint(this.scratchMoon, lunarOrbitR, MOON_ASCENT_ANGLE);
    const end = this.earthReentryPoint(0, earthR);
    const moonTangent = tangentPoint(this.scratchMoon, lunarOrbitR, MOON_ASCENT_ANGLE + Math.PI * 0.35, 8);
    const earthApproach = tangentPoint(this.scratchEarth, earthR * 5.7, EARTH_INSERTION_ANGLE + Math.PI * 0.45, -6);
    return cubicBezier(start, moonTangent, earthApproach, end, easeInOutCubic(t));
  }

  private surfaceDescentPoint(t: number, lunarOrbitR: number, landingPoint: THREE.Vector3) {
    const start = this.lunarOrbitPoint(1, lunarOrbitR);
    const arc = cubicBezier(
      start,
      tangentPoint(this.scratchMoon, lunarOrbitR, MOON_DESCENT_ANGLE + Math.PI * 0.16, 1.4),
      landingPoint.clone().lerp(this.scratchMoon, -1.8),
      landingPoint,
      easeInOutCubic(t),
    );
    return arc;
  }

  private surfaceAscentPoint(t: number, lunarOrbitR: number, landingPoint: THREE.Vector3) {
    const end = orbitPoint(this.scratchMoon, lunarOrbitR, MOON_ASCENT_ANGLE);
    return cubicBezier(
      landingPoint,
      landingPoint.clone().lerp(this.scratchMoon, -1.6),
      tangentPoint(this.scratchMoon, lunarOrbitR, MOON_ASCENT_ANGLE - Math.PI * 0.18, -1.2),
      end,
      easeInOutCubic(t),
    );
  }

  private splashdownPoint(t: number, earthR: number, lunarOrbitR: number) {
    const start = this.earthReentryPoint(0, earthR);
    const end = this.earthReentryPoint(1, earthR);
    const control1 = start.clone().lerp(this.scratchEarth, -0.5);
    const control2 = end.clone().lerp(this.scratchEarth, -0.2);
    return cubicBezier(start, control1, control2, end, easeInCubic(t));
  }

  private earthReentryPoint(t: number, earthR: number) {
    const angle = EARTH_INSERTION_ANGLE + Math.PI * 0.56 + t * 0.22;
    return orbitPoint(this.scratchEarth, THREE.MathUtils.lerp(earthR * 5.2, earthR * 1.1, t), angle);
  }

  private surfacePoint(featureId: string, fallbackR: number) {
    const feature = featureByName(featureId);
    const moon = this.system.bodyAt("moon");
    if (!feature || !moon) {
      return orbitPoint(this.scratchMoon, fallbackR * 0.16, MOON_DESCENT_ANGLE);
    }
    const local = surfacePointFromLatLon(feature.lat, feature.lon);
    return moon.mesh.localToWorld(local.multiplyScalar(1.28));
  }
}

function makeLine(color: number, opacity: number): THREE.Line {
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.Line(new THREE.BufferGeometry(), mat);
  line.renderOrder = 4;
  return line;
}

function setLinePoints(line: THREE.Line, points: THREE.Vector3[]) {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points);
}

function samplePath(pointAt: (t: number) => THREE.Vector3, samples = transferPoints) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    points.push(pointAt(i / samples));
  }
  return points;
}

function orbitCircle(center: THREE.Vector3, radius: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= orbitPoints; i++) {
    points.push(orbitPoint(center, radius, (i / orbitPoints) * Math.PI * 2));
  }
  return points;
}

function tangentPoint(center: THREE.Vector3, radius: number, angle: number, gain: number) {
  const radial = new THREE.Vector3(Math.cos(angle), 0.18 * Math.sin(angle), Math.sin(angle)).normalize();
  const tangent = new THREE.Vector3(-Math.sin(angle), 0.08, Math.cos(angle)).normalize();
  return center.clone()
    .addScaledVector(radial, radius)
    .addScaledVector(tangent, radius * gain);
}

function cubicBezier(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, t: number) {
  const ab = a.clone().lerp(b, t);
  const bc = b.clone().lerp(c, t);
  const cd = c.clone().lerp(d, t);
  return ab.lerp(bc, t).lerp(bc.lerp(cd, t), t);
}

function easeInCubic(t: number) {
  return t * t * t;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function orbitPoint(center: THREE.Vector3, radius: number, angle: number) {
  return new THREE.Vector3(
    center.x + Math.cos(angle) * radius,
    center.y + Math.sin(angle) * radius * 0.18,
    center.z + Math.sin(angle) * radius,
  );
}
