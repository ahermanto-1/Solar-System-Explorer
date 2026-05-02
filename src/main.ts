import * as THREE from "three";
import "./styles/hud.css";
import { SolarSystem } from "./scene/SolarSystem";
import { CameraRig } from "./scene/CameraRig";
import { Picker } from "./scene/Picker";
import { SimState } from "./state/SimState";
import { HUD } from "./hud/HUD";
import { Labels } from "./hud/Labels";
import { FeatureLabels } from "./hud/FeatureLabels";
import { orbitalSpeed } from "./scene/OrbitMath";
import { getBody } from "./data/bodies";
import { featureByName } from "./data/features";
import { activeMissionStep, getMission } from "./data/missions";
import { MissionLayer } from "./scene/MissionLayer";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const hudRoot = document.getElementById("hud") as HTMLElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const state = new SimState();
const system = new SolarSystem();
const rig = new CameraRig(canvas, window.innerWidth / window.innerHeight);
const missionLayer = new MissionLayer(system);
system.scene.add(missionLayer.group);
const MISSION_CAMERA_TRANSITION_MS = 2200;

// Initial scale + orbit lines
system.applyScale(state.toggles);
system.rebuildOrbitLines(state.toggles);
system.updateAll(state.simEpochMs, state.toggles);

const sun = system.bodyAt("sun")!;
const earth = system.bodyAt("earth")!;
rig.focus(earth, true);
state.setFocus("earth");

const goOverview = () => {
  rig.overview(sun);
  state.setFocus("sun");
  state.setActiveFeature(null);
};

new Picker(canvas, system, rig, state, goOverview);
const hud = new HUD(hudRoot, state, system);
const labels = new Labels(document.body, system, rig, state);
const featureLabels = new FeatureLabels(document.body, system, rig, state);
(window as any).__rig = rig;
(window as any).__overview = goOverview;
(window as any).__takeMeToFeature = (id: string) => takeMeToFeature(id);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.activeFeatureId) {
      state.setActiveFeature(null);
    } else {
      goOverview();
    }
  }
});

// React to toggles & scale changes
let prevTrueScale = state.toggles.trueScale;
let prevShowOrbits = state.toggles.showOrbits;
let prevShowMoons = state.toggles.showMoons;
let prevShowAsteroids = state.toggles.showAsteroidBelt;
let prevShowTrails = state.toggles.showTrails;
let prevMissionActive = !!state.mission.activeId;
let prevMissionKey = "";
let prevActiveFeatureId = state.activeFeatureId;
let applyingMissionCamera = false;
const applyOrbitVisibility = () => {
  system.setOrbitsVisible(state.toggles.showOrbits && !state.mission.activeId);
};
state.subscribe(() => {
  if (state.mission.activeId && state.toggles.trueScale) {
    state.setToggle("trueScale", false);
    return;
  }

  if (state.toggles.trueScale !== prevTrueScale) {
    prevTrueScale = state.toggles.trueScale;
    system.applyScale(state.toggles);
    system.rebuildOrbitLines(state.toggles);
  }
  if (state.toggles.showOrbits !== prevShowOrbits) {
    prevShowOrbits = state.toggles.showOrbits;
    applyOrbitVisibility();
  }
  if (state.toggles.showMoons !== prevShowMoons) {
    prevShowMoons = state.toggles.showMoons;
    system.setMoonsVisible(state.toggles.showMoons);
  }
  if (state.toggles.showAsteroidBelt !== prevShowAsteroids) {
    prevShowAsteroids = state.toggles.showAsteroidBelt;
    system.asteroidBelt.setVisible(state.toggles.showAsteroidBelt);
  }
  if (state.toggles.showTrails !== prevShowTrails) {
    prevShowTrails = state.toggles.showTrails;
    system.trailsLayer.setVisible(state.toggles.showTrails);
    if (!state.toggles.showTrails) system.trailsLayer.reset();
  }

  const missionActive = !!state.mission.activeId;
  if (missionActive !== prevMissionActive) {
    prevMissionActive = missionActive;
    applyOrbitVisibility();
  }

  const missionKey = `${state.mission.activeId ?? "none"}:${state.mission.stepIndex}`;
  if (missionKey !== prevMissionKey) {
    prevMissionKey = missionKey;
    applyMissionCamera();
  }

  if (state.activeFeatureId !== prevActiveFeatureId) {
    prevActiveFeatureId = state.activeFeatureId;
    if (!state.mission.activeId && !applyingMissionCamera) applyFeatureCamera();
  }
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  rig.resize(window.innerWidth / window.innerHeight);
});

let lastT = performance.now();
function frame() {
  const now = performance.now();
  const dtSec = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;

  state.tickSim(dtSec);
  system.updateAll(state.simEpochMs, state.toggles);
  system.rotateAll(dtSec, state.playing ? state.speed : 0);
  missionLayer.update(state, rig.camera);
  if (state.mission.activeId && !rig.isFocusingObject(missionLayer.cameraTarget)) {
    rig.focusObject(missionLayer.cameraTarget, true, rig.distance);
  }
  rig.update(dtSec);

  // Telemetry: derive from focused body
  const focusBody = system.bodyAt(state.focusedId);
  if (focusBody) {
    state.distanceFromSunKm = focusBody.worldPosKm.length();
    if (focusBody.parentBody) {
      const dx = focusBody.posKm.length();
      state.distanceFromParentKm = dx;
      const parentMass = focusBody.parentBody.data.massKg;
      state.velocityKmS = orbitalSpeed(focusBody.data, state.simEpochMs, parentMass);
    } else {
      state.distanceFromParentKm = 0;
      state.velocityKmS = 0;
    }
  }

  system.trailsLayer.tick(now);
  hud.tick(dtSec);
  labels.tick(window.innerWidth, window.innerHeight);
  featureLabels.tick(window.innerWidth, window.innerHeight);
  renderer.render(system.scene, rig.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

void getBody;

function applyMissionCamera() {
  const step = activeMissionStep(state.mission.activeId, state.mission.stepIndex);
  if (!step) return;

  applyingMissionCamera = true;
  try {
    const mission = getMission(state.mission.activeId);
    const epochMs = new Date(step.timestampUtc).getTime();
    state.setPlaying(false);
    state.setSimClock(new Date(mission?.steps[0].timestampUtc ?? step.timestampUtc).getTime(), epochMs);
    system.updateAll(epochMs, state.toggles);
    missionLayer.update(state, rig.camera);

    const focus = system.bodyAt(step.focusId);
    const sun = system.bodyAt("sun");
    const earth = system.bodyAt("earth");
    const moon = system.bodyAt("moon");
    if (!focus || !sun || !earth || !moon) return;

    const earthMoonSpan = earth.group.position.distanceTo(moon.group.position);
    const focusSunSpan = focus.group.position.distanceTo(sun.group.position);
    let distance = focus.mesh.scale.x * 8;

    if (step.cameraMode === "earth") {
      distance = step.pathMode === "launch"
        ? Math.max(earth.mesh.scale.x * 3.8, 2.6)
        : Math.max(earth.mesh.scale.x * 5.8, 4.2);
    } else if (step.cameraMode === "transfer") {
      distance = Math.max(earthMoonSpan * 0.38, 11);
    } else if (step.cameraMode === "moon") {
      distance = Math.max(moon.mesh.scale.x * 12, 3.6);
    } else if (step.cameraMode === "surface") {
      distance = Math.max(moon.mesh.scale.x * 5.5, 1.4);
    } else if (step.cameraMode === "solar-transfer") {
      distance = Math.max(focusSunSpan * 0.34, 18);
    } else if (step.cameraMode === "planet") {
      distance = Math.max(focus.mesh.scale.x * 15, 7);
    } else if (step.cameraMode === "deep-space") {
      distance = Math.max(focusSunSpan * 0.3, 20);
    }
    if (isGrandTourPath(step.pathMode)) {
      const lookAheadDistance = missionLayer.markerTarget.position.distanceTo(missionLayer.cameraTarget.position);
      distance = Math.max(distance, lookAheadDistance + focus.mesh.scale.x * 14);
    }

    rig.focusObject(
      missionLayer.cameraTarget,
      false,
      distance,
      missionViewForStep(step.pathMode, earth.group.position, moon.group.position, focus.group.position, sun.group.position),
      MISSION_CAMERA_TRANSITION_MS,
    );
    state.setFocus(step.focusId);
    state.setActiveFeature(null);
  } finally {
    applyingMissionCamera = false;
  }
}

function missionViewForStep(
  pathMode: string,
  earthPos: THREE.Vector3,
  moonPos: THREE.Vector3,
  focusPos: THREE.Vector3,
  sunPos: THREE.Vector3,
) {
  const cameraTargetPos = missionLayer.cameraTarget.position;
  const markerPos = missionLayer.markerTarget.position;
  const earthToMoon = moonPos.clone().sub(earthPos).normalize();
  const side = new THREE.Vector3(-earthToMoon.z, 0, earthToMoon.x).normalize();
  let dir: THREE.Vector3;

  if (pathMode === "launch" || pathMode === "earth-orbit" || pathMode === "splashdown") {
    dir = markerPos.clone().sub(earthPos).normalize();
  } else if (pathMode === "outbound") {
    dir = side.multiplyScalar(0.9).add(new THREE.Vector3(0, 0.55, 0)).add(earthToMoon.multiplyScalar(0.2)).normalize();
  } else if (pathMode === "return") {
    dir = side.multiplyScalar(-0.9).add(new THREE.Vector3(0, 0.5, 0)).add(earthToMoon.multiplyScalar(-0.15)).normalize();
  } else if (pathMode === "grand-tour" || pathMode === "outer-flyby" || pathMode === "interstellar") {
    const ahead = cameraTargetPos.clone().sub(markerPos);
    const fallbackAhead = focusPos.clone().sub(markerPos);
    const forward = ahead.lengthSq() > 0.001 ? ahead.normalize() : fallbackAhead.normalize();
    const radial = markerPos.clone().sub(sunPos).normalize();
    const outerSide = new THREE.Vector3(-forward.z, 0.05, forward.x).normalize();
    dir = forward
      .multiplyScalar(-1)
      .addScaledVector(outerSide, 0.18)
      .addScaledVector(radial, 0.08)
      .add(new THREE.Vector3(0, 0.18, 0))
      .normalize();
  } else {
    dir = markerPos.clone().sub(moonPos).normalize().add(side.multiplyScalar(0.35)).add(new THREE.Vector3(0, 0.22, 0)).normalize();
  }

  return viewFromDirection(dir);
}

function isGrandTourPath(pathMode: string) {
  return pathMode === "grand-tour" || pathMode === "outer-flyby" || pathMode === "interstellar";
}

function viewFromDirection(dir: THREE.Vector3) {
  const d = dir.normalize();
  return {
    yaw: Math.atan2(d.x, d.z),
    pitch: Math.asin(THREE.MathUtils.clamp(d.y, -0.95, 0.95)),
  };
}

function applyFeatureCamera() {
  if (!state.activeFeatureId) {
    rig.clearSurfaceLock();
    const focus = system.bodyAt(state.focusedId);
    if (focus) rig.focus(focus);
    return;
  }
  takeMeToFeature(state.activeFeatureId);
}

function takeMeToFeature(id: string) {
  const feature = featureByName(id);
  if (!feature) return;
  const body = system.bodyAt(feature.bodyId);
  if (!body) return;
  state.setFocus(feature.bodyId, true);
  rig.focusFeature(body, feature.lat, feature.lon);
}
