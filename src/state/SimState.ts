type Listener = () => void;

export interface SimToggles {
  showOrbits: boolean;
  showLabels: boolean;
  showTrails: boolean;
  showMoons: boolean;
  showAsteroidBelt: boolean;
  trueScale: boolean;
}

export interface MissionState {
  activeId: string | null;
  stepIndex: number;
  stepProgress: number;
  playing: boolean;
}

export class SimState {
  // Time
  simStartMs: number; // wall epoch when sim started
  simEpochMs: number; // sim's "now" in ms since unix epoch
  speed: number; // sim seconds per real second
  playing: boolean;

  // Focus
  focusedId: string;
  hoveredId: string | null;

  // Display toggles
  toggles: SimToggles;

  // Telemetry
  velocityKmS: number;
  distanceFromSunKm: number;
  distanceFromParentKm: number;

  // Triggered events (for FeatureCard etc.)
  activeFeatureId: string | null;

  // Guided mission mode
  mission: MissionState;

  private listeners: Set<Listener> = new Set();
  private missionClockRestore: { simStartMs: number; simEpochMs: number; playing: boolean } | null = null;

  constructor() {
    const now = Date.now();
    this.simStartMs = now;
    this.simEpochMs = now;
    this.speed = 1_000;
    this.playing = true;
    this.focusedId = "earth";
    this.hoveredId = null;
    this.toggles = {
      showOrbits: true,
      showLabels: true,
      showTrails: false,
      showMoons: true,
      showAsteroidBelt: true,
      trueScale: false,
    };
    this.velocityKmS = 0;
    this.distanceFromSunKm = 0;
    this.distanceFromParentKm = 0;
    this.activeFeatureId = null;
    this.mission = {
      activeId: null,
      stepIndex: 0,
      stepProgress: 0,
      playing: false,
    };
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const l of this.listeners) l();
  }

  setSpeed(s: number) {
    this.speed = s;
    this.emit();
  }

  togglePlaying() {
    this.playing = !this.playing;
    this.emit();
  }

  setPlaying(p: boolean) {
    this.playing = p;
    this.emit();
  }

  reset() {
    this.simEpochMs = this.simStartMs;
    this.emit();
  }

  setSimEpochMs(epochMs: number) {
    this.simEpochMs = epochMs;
    this.emit();
  }

  setSimClock(simStartMs: number, simEpochMs: number) {
    this.simStartMs = simStartMs;
    this.simEpochMs = simEpochMs;
    this.emit();
  }

  setFocus(id: string, preserveFeature = false) {
    if (id === this.focusedId) return;
    this.focusedId = id;
    if (!preserveFeature) this.activeFeatureId = null;
    this.emit();
  }

  setHover(id: string | null) {
    if (id === this.hoveredId) return;
    this.hoveredId = id;
    this.emit();
  }

  setToggle<K extends keyof SimToggles>(key: K, v: SimToggles[K]) {
    this.toggles[key] = v;
    this.emit();
  }

  setActiveFeature(id: string | null) {
    this.activeFeatureId = id;
    this.emit();
  }

  startMission(id: string) {
    if (!this.mission.activeId) {
      this.missionClockRestore = {
        simStartMs: this.simStartMs,
        simEpochMs: this.simEpochMs,
        playing: this.playing,
      };
    }
    this.mission = {
      activeId: id,
      stepIndex: 0,
      stepProgress: 0,
      playing: false,
    };
    this.activeFeatureId = null;
    this.emit();
  }

  exitMission() {
    if (!this.mission.activeId) return;
    this.mission = {
      activeId: null,
      stepIndex: 0,
      stepProgress: 0,
      playing: false,
    };
    if (this.missionClockRestore) {
      this.simStartMs = this.missionClockRestore.simStartMs;
      this.simEpochMs = this.missionClockRestore.simEpochMs;
      this.playing = this.missionClockRestore.playing;
      this.missionClockRestore = null;
    }
    this.activeFeatureId = null;
    this.emit();
  }

  setMissionStep(index: number) {
    if (!this.mission.activeId) return;
    this.mission.stepIndex = Math.max(0, index);
    this.mission.stepProgress = 0;
    this.activeFeatureId = null;
    this.emit();
  }

  setMissionPlaying(playing: boolean) {
    if (!this.mission.activeId) return;
    this.mission.playing = playing;
    this.emit();
  }

  tickMissionStep(dtSec: number, durationSec: number): boolean {
    if (!this.mission.activeId || !this.mission.playing) return false;
    const duration = Math.max(0.1, durationSec);
    this.mission.stepProgress = Math.min(1, this.mission.stepProgress + dtSec / duration);
    return this.mission.stepProgress >= 1;
  }

  setSimEpochFromFraction(frac: number) {
    // map 0..1 to a 5-year window starting at simStartMs
    const span = 5 * 365.25 * 24 * 3600 * 1000;
    this.simEpochMs = this.simStartMs + frac * span;
    this.emit();
  }

  fractionOfWindow(): number {
    const span = 5 * 365.25 * 24 * 3600 * 1000;
    return Math.max(0, Math.min(1, (this.simEpochMs - this.simStartMs) / span));
  }

  // Called every frame from the render loop (does NOT emit; HUD polls on RAF)
  tickSim(dtSec: number) {
    if (!this.playing) return;
    this.simEpochMs += dtSec * this.speed * 1000;
  }
}
