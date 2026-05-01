import type { SimState } from "../state/SimState";
import type { SolarSystem } from "../scene/SolarSystem";
import { BODIES, getBody } from "../data/bodies";
import { FEATURES, nearbyFeatures } from "../data/features";
import { APOLLO_11_MISSION, activeMissionStep, getMission, type Mission } from "../data/missions";
import { fmtKm, fmtMass, fmtMet, fmtSpeed, fmtUtc, fmtVelocity } from "./format";
import { Sparkline } from "./Sparkline";

const SPEEDS: { label: string; value: number }[] = [
  { label: "1×", value: 1 },
  { label: "1k×", value: 1_000 },
  { label: "100k×", value: 100_000 },
  { label: "1M×", value: 1_000_000 },
  { label: "10M×", value: 10_000_000 },
];

type MobilePanel = "info" | "mission" | "bodies" | "controls";

export class HUD {
  private root: HTMLElement;
  private state: SimState;
  private system: SolarSystem;
  private activeMobilePanel: MobilePanel | null = null;
  private mobileButtons = new Map<MobilePanel, HTMLButtonElement>();
  private mobileViews = new Map<MobilePanel, HTMLElement>();
  private mobileMissionTextExpanded = false;

  // Cached refs we update each frame
  private el = {
    crumbTarget: null as HTMLElement | null,
    metTime: null as HTMLElement | null,
    metUtc: null as HTMLElement | null,
    distSun: null as HTMLElement | null,
    distParent: null as HTMLElement | null,
    distParentLabel: null as HTMLElement | null,
    phaseVal: null as HTMLElement | null,
    eventTitle: null as HTMLElement | null,
    eventBody: null as HTMLElement | null,
    eventTag: null as HTMLElement | null,
    velSpark: null as Sparkline | null,
    distSpark: null as Sparkline | null,
    parentSpark: null as Sparkline | null,
    velRow: null as HTMLElement | null,
    distRow: null as HTMLElement | null,
    parentRow: null as HTMLElement | null,
    miniCanvas: null as HTMLCanvasElement | null,
    bodyData: null as HTMLElement | null,
    bodyList: null as HTMLElement | null,
    pbVal: null as HTMLElement | null,
    pbPlay: null as HTMLButtonElement | null,
    pbSpeedBtns: [] as HTMLButtonElement[],
    pbTimeline: null as HTMLInputElement | null,
    pbTrueScale: null as HTMLInputElement | null,
    toggleInputs: [] as { key: keyof SimToggleKeys; input: HTMLInputElement }[],
    miniCanvases: [] as HTMLCanvasElement[],
    bodyLists: [] as HTMLElement[],
    mobileTarget: null as HTMLElement | null,
    mobileTime: null as HTMLElement | null,
    mobileDescription: null as HTMLElement | null,
    mobileSheet: null as HTMLElement | null,
    mobileScrim: null as HTMLElement | null,
    mobileSheetTitle: null as HTMLElement | null,
    mobileMetTime: null as HTMLElement | null,
    mobileMetUtc: null as HTMLElement | null,
    mobileDistSun: null as HTMLElement | null,
    mobileDistParent: null as HTMLElement | null,
    mobileDistParentLabel: null as HTMLElement | null,
    mobilePhaseVal: null as HTMLElement | null,
    mobileEventTitle: null as HTMLElement | null,
    mobileEventBody: null as HTMLElement | null,
    mobileEventTag: null as HTMLElement | null,
    mobileBodyData: null as HTMLElement | null,
    mobileBodyList: null as HTMLElement | null,
    mobilePbVal: null as HTMLElement | null,
    mobilePbPlay: null as HTMLButtonElement | null,
    mobileSpeedBtns: [] as HTMLButtonElement[],
    mobileTimeline: null as HTMLInputElement | null,
    mobileTrueScale: null as HTMLInputElement | null,
    featureCard: null as HTMLElement | null,
    missionTopButton: null as HTMLButtonElement | null,
    missionPanel: null as HTMLElement | null,
    mobileMissionPanel: null as HTMLElement | null,
    missionMiniCanvases: [] as HTMLCanvasElement[],
  };

  private sparkTickAccum = 0;
  private missionPanelOpen = false;
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !this.activeMobilePanel) return;
    this.setMobilePanel(null);
    e.stopImmediatePropagation();
  };

  constructor(root: HTMLElement, state: SimState, system: SolarSystem) {
    this.root = root;
    this.state = state;
    this.system = system;
    this.build();
    this.state.subscribe(() => this.syncReactive());
    window.addEventListener("keydown", this.onKeyDown);
    this.syncReactive();
  }

  private build() {
    this.root.innerHTML = "";
    this.root.appendChild(this.buildTopBar());
    this.root.appendChild(this.buildLeftRail());
    this.root.appendChild(this.buildRightRail());
    this.root.appendChild(this.buildPlayback());
    this.root.appendChild(this.buildMobileHUD());
  }

  private buildTopBar(): HTMLElement {
    const el = document.createElement("div");
    el.className = "topbar";
    const target = document.createElement("span");
    target.className = "target";
    this.el.crumbTarget = target;
    const crumbs = document.createElement("div");
    crumbs.className = "crumbs";
    crumbs.append(
      span("SOLAR SYSTEM"),
      sep(),
      span("EXPLORER"),
      sep(),
      target,
    );
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    right.style.alignItems = "center";

    const overview = document.createElement("button");
    overview.className = "source";
    overview.style.cursor = "pointer";
    overview.style.background = "transparent";
    overview.style.fontFamily = "var(--mono)";
    overview.textContent = "↩  OVERVIEW";
    overview.addEventListener("click", () => {
      (window as any).__overview?.();
    });

    const mission = document.createElement("button");
    mission.className = "source mission-top-button";
    mission.style.cursor = "pointer";
    mission.style.background = "transparent";
    mission.style.fontFamily = "var(--mono)";
    mission.textContent = "MISSIONS";
    mission.addEventListener("click", () => {
      this.missionPanelOpen = !this.missionPanelOpen;
      this.renderMissionPanels();
      this.syncMissionTopButton();
    });
    this.el.missionTopButton = mission;

    right.append(overview, mission);
    el.append(crumbs, right);
    return el;
  }

  private buildLeftRail(): HTMLElement {
    const rail = document.createElement("div");
    rail.className = "left-rail";

    // MET / time panel
    const met = panel("met");
    met.appendChild(label("SIM TIME"));
    const metTime = document.createElement("div");
    metTime.className = "met-time";
    met.appendChild(metTime);
    this.el.metTime = metTime;
    met.appendChild(label("UTC"));
    const utc = document.createElement("div");
    utc.className = "met-utc";
    met.appendChild(utc);
    this.el.metUtc = utc;

    const distSunRow = row("DIST · SUN", "—", "v");
    met.appendChild(distSunRow.row);
    this.el.distSun = distSunRow.val;

    const distParentRow = row("DIST · MOON", "—", "v amber");
    met.appendChild(distParentRow.row);
    this.el.distParent = distParentRow.val;
    this.el.distParentLabel = distParentRow.key;

    const phaseRow = row("KIND", "—", "v amber");
    met.appendChild(phaseRow.row);
    this.el.phaseVal = phaseRow.val;

    rail.appendChild(met);

    // Current focus card
    const ev = panel("event");
    const evHeader = document.createElement("div");
    evHeader.className = "panel-header";
    const evLeft = document.createElement("span");
    evLeft.textContent = "CURRENT FOCUS";
    const evRight = document.createElement("span");
    evRight.className = "right";
    evHeader.append(evLeft, evRight);
    ev.appendChild(evHeader);
    this.el.eventTag = evRight;

    const evTitle = document.createElement("div");
    evTitle.className = "event-title";
    ev.appendChild(evTitle);
    this.el.eventTitle = evTitle;

    const evBody = document.createElement("div");
    evBody.className = "event-body";
    ev.appendChild(evBody);
    this.el.eventBody = evBody;

    rail.appendChild(ev);

    // Telemetry sparklines
    const tel = panel("spark");
    tel.appendChild(panelHeader("TELEMETRY", "ROLLING 60s"));

    const velRow = row("VELOCITY", "—", "v");
    tel.appendChild(velRow.row);
    this.el.velRow = velRow.val;
    const velSpark = new Sparkline("#5EE7E0");
    tel.appendChild(velSpark.canvas);
    this.el.velSpark = velSpark;

    const distRow = row("SUN RANGE", "—", "v");
    tel.appendChild(distRow.row);
    this.el.distRow = distRow.val;
    const distSpark = new Sparkline("#5EE7E0");
    tel.appendChild(distSpark.canvas);
    this.el.distSpark = distSpark;

    const parentRow = row("PARENT RANGE", "—", "v amber");
    tel.appendChild(parentRow.row);
    this.el.parentRow = parentRow.val;
    const parentSpark = new Sparkline("#F5B942");
    tel.appendChild(parentSpark.canvas);
    this.el.parentSpark = parentSpark;

    rail.appendChild(tel);
    return rail;
  }

  private buildRightRail(): HTMLElement {
    const rail = document.createElement("div");
    rail.className = "right-rail";

    const mission = panel("mission-panel");
    this.el.missionPanel = mission;
    rail.appendChild(mission);

    // Minimap
    const mini = panel("minimap");
    mini.appendChild(panelHeader("SYSTEM OVERVIEW", "TOP-DOWN"));
    const c = document.createElement("canvas");
    c.width = 560;
    c.height = 260;
    mini.appendChild(c);
    this.el.miniCanvas = c;
    this.el.miniCanvases.push(c);
    rail.appendChild(mini);

    // Body data
    const data = panel("body-data-panel");
    data.appendChild(panelHeader("BODY DATA", "PHYSICAL"));
    const dataBody = document.createElement("div");
    data.appendChild(dataBody);
    this.el.bodyData = dataBody;
    rail.appendChild(data);

    // Body list
    const list = panel("bodies-panel");
    list.appendChild(panelHeader("BODIES", "CLICK TO FOCUS"));
    const ul = document.createElement("div");
    ul.className = "body-list";
    list.appendChild(ul);
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.flex = "0 0 auto";
    list.style.minHeight = "120px";
    list.style.overflow = "visible";
    this.el.bodyList = ul;
    this.populateBodyList(ul);
    rail.appendChild(list);

    return rail;
  }

  private buildPlayback(): HTMLElement {
    const el = document.createElement("div");
    el.className = "playback";
    this.populatePlayback(el, false);
    return el;
  }

  private populatePlayback(el: HTMLElement, mobile: boolean) {
    const top = document.createElement("div");
    top.className = "pb-top";

    const lab = document.createElement("div");
    lab.className = "pb-label";
    const lbl = document.createElement("span");
    lbl.className = "lab";
    lbl.textContent = "SIM PLAYBACK";
    const val = document.createElement("span");
    val.className = "val";
    lab.append(lbl, document.createElement("br"), val);
    if (mobile) this.el.mobilePbVal = val;
    else this.el.pbVal = val;
    top.appendChild(lab);

    const ctrls = document.createElement("div");
    ctrls.className = "pb-controls";

    const play = btn("Play");
    play.addEventListener("click", () => this.state.togglePlaying());
    if (mobile) this.el.mobilePbPlay = play;
    else this.el.pbPlay = play;
    const reset = btn("Reset");
    reset.addEventListener("click", () => this.state.reset());
    ctrls.append(play, reset);

    for (const s of SPEEDS) {
      const b = btn(s.label);
      b.dataset.speed = String(s.value);
      b.addEventListener("click", () => {
        this.state.setSpeed(s.value);
        if (!this.state.playing) this.state.setPlaying(true);
      });
      if (mobile) this.el.mobileSpeedBtns.push(b);
      else this.el.pbSpeedBtns.push(b);
      ctrls.append(b);
    }

    const ts = document.createElement("label");
    ts.className = "toggle";
    const tsInput = document.createElement("input");
    tsInput.type = "checkbox";
    tsInput.checked = this.state.toggles.trueScale;
    tsInput.addEventListener("change", () => this.state.setToggle("trueScale", tsInput.checked));
    if (mobile) this.el.mobileTrueScale = tsInput;
    else this.el.pbTrueScale = tsInput;
    this.el.toggleInputs.push({ key: "trueScale", input: tsInput });
    const tsLab = document.createElement("span");
    tsLab.textContent = "True scale";
    ts.append(tsInput, tsLab);
    ctrls.append(ts);

    top.appendChild(ctrls);
    el.appendChild(top);

    // Timeline
    const timeline = document.createElement("input");
    timeline.type = "range";
    timeline.min = "0";
    timeline.max = "1000";
    timeline.value = "0";
    timeline.className = "timeline";
    timeline.addEventListener("input", () => {
      this.state.setSimEpochFromFraction(Number(timeline.value) / 1000);
    });
    if (mobile) this.el.mobileTimeline = timeline;
    else this.el.pbTimeline = timeline;
    el.appendChild(timeline);

    // Toggles row
    const toggles = document.createElement("div");
    toggles.className = "toggles";
    const tdefs: { key: keyof SimToggleKeys; label: string }[] = [
      { key: "showOrbits", label: "Show orbits" },
      { key: "showLabels", label: "Show labels" },
      { key: "showTrails", label: "Show trails" },
      { key: "showMoons", label: "Show moons" },
      { key: "showAsteroidBelt", label: "Asteroid belt" },
    ];
    for (const t of tdefs) {
      const lab = document.createElement("label");
      lab.className = "toggle";
      const inp = document.createElement("input");
      inp.type = "checkbox";
      inp.checked = (this.state.toggles as any)[t.key];
      inp.addEventListener("change", () => this.state.setToggle(t.key as any, inp.checked));
      this.el.toggleInputs.push({ key: t.key, input: inp });
      const span = document.createElement("span");
      span.textContent = t.label;
      lab.append(inp, span);
      toggles.appendChild(lab);
    }
    el.appendChild(toggles);
  }

  private buildMobileHUD(): HTMLElement {
    const root = document.createElement("div");
    root.className = "mobile-hud";

    const scrim = document.createElement("button");
    scrim.className = "mobile-scrim";
    scrim.setAttribute("aria-label", "Close panel");
    scrim.addEventListener("click", () => this.setMobilePanel(null));
    this.el.mobileScrim = scrim;

    const status = document.createElement("button");
    status.className = "mobile-status";
    status.addEventListener("click", () => this.toggleMobilePanel("info"));
    const statusLabel = document.createElement("span");
    statusLabel.className = "mobile-status-label";
    statusLabel.textContent = "FOCUS";
    const statusTarget = document.createElement("span");
    statusTarget.className = "mobile-status-target";
    const statusTime = document.createElement("span");
    statusTime.className = "mobile-status-time";
    const statusDescription = document.createElement("span");
    statusDescription.className = "mobile-status-description";
    status.append(statusLabel, statusTarget, statusTime, statusDescription);
    this.el.mobileTarget = statusTarget;
    this.el.mobileTime = statusTime;
    this.el.mobileDescription = statusDescription;

    const sheet = document.createElement("div");
    sheet.className = "mobile-sheet";
    sheet.setAttribute("aria-hidden", "true");
    const sheetHead = document.createElement("div");
    sheetHead.className = "mobile-sheet-head";
    const sheetTitle = document.createElement("div");
    sheetTitle.className = "mobile-sheet-title";
    const close = btn("×");
    close.className = "mobile-sheet-close";
    close.setAttribute("aria-label", "Close panel");
    close.addEventListener("click", () => this.setMobilePanel(null));
    sheetHead.append(sheetTitle, close);
    this.el.mobileSheet = sheet;
    this.el.mobileSheetTitle = sheetTitle;

    const sheetBody = document.createElement("div");
    sheetBody.className = "mobile-sheet-body";
    sheet.append(sheetHead, sheetBody);

    const info = this.buildMobileInfoPanel();
    const mission = this.buildMobileMissionPanel();
    const bodies = this.buildMobileBodiesPanel();
    const controls = this.buildMobileControlsPanel();
    this.mobileViews.set("info", info);
    this.mobileViews.set("mission", mission);
    this.mobileViews.set("bodies", bodies);
    this.mobileViews.set("controls", controls);
    sheetBody.append(info, mission, bodies, controls);

    const dock = document.createElement("div");
    dock.className = "mobile-dock";
    const buttons: { panel: MobilePanel; label: string }[] = [
      { panel: "info", label: "Info" },
      { panel: "mission", label: "Mission" },
      { panel: "bodies", label: "Bodies" },
      { panel: "controls", label: "Controls" },
    ];
    for (const item of buttons) {
      const b = btn(item.label);
      b.className = "mobile-dock-btn";
      b.dataset.panel = item.panel;
      b.addEventListener("click", () => this.toggleMobilePanel(item.panel));
      this.mobileButtons.set(item.panel, b);
      dock.appendChild(b);
    }

    root.append(scrim, status, sheet, dock);
    return root;
  }

  private buildMobileInfoPanel(): HTMLElement {
    const view = document.createElement("div");
    view.className = "mobile-panel-view";
    view.dataset.panel = "info";

    const event = panel("event mobile-info-focus");
    const eventHeader = document.createElement("div");
    eventHeader.className = "panel-header";
    const eventLeft = document.createElement("span");
    eventLeft.textContent = "CURRENT FOCUS";
    const eventRight = document.createElement("span");
    eventRight.className = "right";
    eventHeader.append(eventLeft, eventRight);
    const title = document.createElement("div");
    title.className = "event-title";
    const body = document.createElement("div");
    body.className = "event-body";
    event.append(eventHeader, title, body);
    this.el.mobileEventTag = eventRight;
    this.el.mobileEventTitle = title;
    this.el.mobileEventBody = body;

    const met = panel("met mobile-met");
    met.appendChild(label("SIM TIME"));
    const metTime = document.createElement("div");
    metTime.className = "met-time";
    met.appendChild(metTime);
    this.el.mobileMetTime = metTime;
    met.appendChild(label("UTC"));
    const utc = document.createElement("div");
    utc.className = "met-utc";
    met.appendChild(utc);
    this.el.mobileMetUtc = utc;

    const distSunRow = row("DIST · SUN", "—", "v");
    met.appendChild(distSunRow.row);
    this.el.mobileDistSun = distSunRow.val;

    const distParentRow = row("DIST · MOON", "—", "v amber");
    met.appendChild(distParentRow.row);
    this.el.mobileDistParent = distParentRow.val;
    this.el.mobileDistParentLabel = distParentRow.key;

    const phaseRow = row("KIND", "—", "v amber");
    met.appendChild(phaseRow.row);
    this.el.mobilePhaseVal = phaseRow.val;

    const data = panel("mobile-body-data-card");
    data.appendChild(panelHeader("BODY DATA", "PHYSICAL"));
    const dataBody = document.createElement("div");
    data.appendChild(dataBody);
    this.el.mobileBodyData = dataBody;

    view.append(event, met, data);
    return view;
  }

  private buildMobileMissionPanel(): HTMLElement {
    const view = document.createElement("div");
    view.className = "mobile-panel-view";
    view.dataset.panel = "mission";
    const mission = panel("mission-panel mobile-mission-card");
    this.el.mobileMissionPanel = mission;
    view.appendChild(mission);
    return view;
  }

  private buildMobileBodiesPanel(): HTMLElement {
    const view = document.createElement("div");
    view.className = "mobile-panel-view";
    view.dataset.panel = "bodies";

    const mini = panel("minimap mobile-minimap");
    mini.appendChild(panelHeader("SYSTEM OVERVIEW", "TOP-DOWN"));
    const c = document.createElement("canvas");
    c.width = 560;
    c.height = 260;
    mini.appendChild(c);
    this.el.miniCanvases.push(c);

    const list = panel("mobile-bodies-card");
    list.appendChild(panelHeader("BODIES", "TAP TO FOCUS"));
    const search = document.createElement("input");
    search.className = "mobile-body-search";
    search.type = "search";
    search.placeholder = "Search bodies";
    const ul = document.createElement("div");
    ul.className = "body-list mobile-body-list";
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      for (const child of Array.from(ul.children)) {
        const item = child as HTMLElement;
        const text = item.dataset.search ?? "";
        item.hidden = q.length > 0 && !text.includes(q);
      }
    });
    list.append(search, ul);
    this.el.mobileBodyList = ul;
    this.populateBodyList(ul, true);

    view.append(mini, list);
    return view;
  }

  private buildMobileControlsPanel(): HTMLElement {
    const view = document.createElement("div");
    view.className = "mobile-panel-view";
    view.dataset.panel = "controls";
    const controls = document.createElement("div");
    controls.className = "mobile-playback";
    this.populatePlayback(controls, true);
    view.appendChild(controls);
    return view;
  }

  private populateBodyList(ul: HTMLElement, closeOnFocus = false) {
    this.el.bodyLists.push(ul);
    for (const b of BODIES) {
      const item = document.createElement("div");
      item.className = "item";
      item.dataset.id = b.id;
      item.dataset.search = `${b.name} ${b.kind} ${b.parent ?? ""}`.toLowerCase();
      const indent = b.parent && b.parent !== "sun" ? "  └ " : "";
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = `${indent}${b.name}`;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = b.kind === "moon" ? `MOON · ${getBody(b.parent!)?.name}` : b.kind.toUpperCase();
      item.append(name, meta);
      item.addEventListener("click", () => {
        if (b.id === "sun") {
          (window as any).__overview?.();
          if (closeOnFocus) this.setMobilePanel(null);
          return;
        }
        const body = this.system.bodyAt(b.id);
        if (body) {
          (window as any).__rig?.focus(body);
          this.state.setFocus(b.id);
          if (closeOnFocus) this.setMobilePanel(null);
        }
      });
      ul.appendChild(item);
    }
  }

  private toggleMobilePanel(panel: MobilePanel) {
    this.setMobilePanel(this.activeMobilePanel === panel ? null : panel);
  }

  private setMobilePanel(panel: MobilePanel | null) {
    this.activeMobilePanel = panel;
    const open = panel !== null;
    this.el.mobileSheet?.classList.toggle("open", open);
    this.el.mobileScrim?.classList.toggle("open", open);
    this.el.mobileSheet?.setAttribute("aria-hidden", String(!open));
    if (this.el.mobileSheet) {
      this.el.mobileSheet.dataset.panel = panel ?? "";
      this.el.mobileSheet.classList.toggle(
        "mission-text-expanded",
        panel === "mission" && this.mobileMissionTextExpanded,
      );
    }
    if (this.el.mobileSheetTitle) {
      this.el.mobileSheetTitle.textContent = panel ? panel.toUpperCase() : "";
    }
    for (const [key, button] of this.mobileButtons) {
      button.classList.toggle("active", key === panel);
      button.setAttribute("aria-expanded", String(key === panel));
    }
    for (const [key, view] of this.mobileViews) {
      view.classList.toggle("active", key === panel);
    }
  }

  /** Called from the render loop each frame. */
  tick(dtSec: number) {
    // MET / clocks
    if (this.el.metTime) this.el.metTime.textContent = fmtMet(this.state.simStartMs, this.state.simEpochMs);
    if (this.el.metUtc) this.el.metUtc.textContent = fmtUtc(this.state.simEpochMs);
    if (this.el.pbVal) this.el.pbVal.textContent = fmtMet(this.state.simStartMs, this.state.simEpochMs);
    if (this.el.mobileTime) this.el.mobileTime.textContent = fmtUtc(this.state.simEpochMs);
    if (this.el.mobileMetTime) this.el.mobileMetTime.textContent = fmtMet(this.state.simStartMs, this.state.simEpochMs);
    if (this.el.mobileMetUtc) this.el.mobileMetUtc.textContent = fmtUtc(this.state.simEpochMs);
    if (this.el.mobilePbVal) this.el.mobilePbVal.textContent = fmtMet(this.state.simStartMs, this.state.simEpochMs);

    if (this.state.mission.activeId && this.state.mission.playing) {
      const mission = getMission(this.state.mission.activeId);
      const step = mission?.steps[this.state.mission.stepIndex];
      if (step && this.state.tickMissionStep(dtSec, step.durationSec)) {
        this.advanceMission(1);
      }
    }
    this.updateMissionProgressBars();

    // Distances
    if (this.el.distSun) this.el.distSun.textContent = fmtKm(this.state.distanceFromSunKm);
    if (this.el.distParent) this.el.distParent.textContent = fmtKm(this.state.distanceFromParentKm);
    if (this.el.mobileDistSun) this.el.mobileDistSun.textContent = fmtKm(this.state.distanceFromSunKm);
    if (this.el.mobileDistParent) this.el.mobileDistParent.textContent = fmtKm(this.state.distanceFromParentKm);

    // Velocity & sparkline rows
    if (this.el.velRow) this.el.velRow.textContent = fmtVelocity(this.state.velocityKmS);
    if (this.el.distRow) this.el.distRow.textContent = fmtKm(this.state.distanceFromSunKm);
    if (this.el.parentRow) this.el.parentRow.textContent = fmtKm(this.state.distanceFromParentKm);

    // Sparkline tick @ ~5Hz
    this.sparkTickAccum += dtSec;
    if (this.sparkTickAccum >= 0.2) {
      this.sparkTickAccum = 0;
      this.el.velSpark?.push(this.state.velocityKmS);
      this.el.distSpark?.push(this.state.distanceFromSunKm);
      this.el.parentSpark?.push(this.state.distanceFromParentKm);
    }

    // Timeline scrubber position
    if (this.el.pbTimeline && document.activeElement !== this.el.pbTimeline) {
      const f = this.state.fractionOfWindow();
      this.el.pbTimeline.value = String(Math.round(f * 1000));
      this.el.pbTimeline.style.setProperty("--p", `${(f * 100).toFixed(1)}%`);
    }
    if (this.el.mobileTimeline && document.activeElement !== this.el.mobileTimeline) {
      const f = this.state.fractionOfWindow();
      this.el.mobileTimeline.value = String(Math.round(f * 1000));
      this.el.mobileTimeline.style.setProperty("--p", `${(f * 100).toFixed(1)}%`);
    }

    // Minimap
    this.drawMinimaps();
    this.drawMissionMinimaps();
  }

  /** Reactive update — runs on every state change. */
  private syncReactive() {
    this.root.classList.toggle("mission-active", !!this.state.mission.activeId);
    this.root.classList.toggle("feature-active", !!this.state.activeFeatureId && !this.state.mission.activeId);

    const focus = getBody(this.state.focusedId);
    if (!focus) return;

    if (this.el.crumbTarget) this.el.crumbTarget.textContent = focus.name.toUpperCase();
    if (this.el.mobileTarget) this.el.mobileTarget.textContent = focus.name.toUpperCase();
    if (this.el.mobileDescription) this.el.mobileDescription.textContent = focus.description;
    if (this.el.eventTitle) this.el.eventTitle.textContent = focus.name;
    if (this.el.eventBody) this.el.eventBody.textContent = focus.description;
    if (this.el.eventTag) this.el.eventTag.textContent = focus.kind.toUpperCase();
    if (this.el.mobileEventTitle) this.el.mobileEventTitle.textContent = focus.name;
    if (this.el.mobileEventBody) this.el.mobileEventBody.textContent = focus.description;
    if (this.el.mobileEventTag) this.el.mobileEventTag.textContent = focus.kind.toUpperCase();

    // Distance row label changes based on parent
    const parent = focus.parent ? getBody(focus.parent) : null;
    if (this.el.distParentLabel) {
      this.el.distParentLabel.textContent = parent ? `DIST · ${parent.name.toUpperCase()}` : "DIST · PARENT";
    }
    if (this.el.mobileDistParentLabel) {
      this.el.mobileDistParentLabel.textContent = parent ? `DIST · ${parent.name.toUpperCase()}` : "DIST · PARENT";
    }
    if (this.el.phaseVal) this.el.phaseVal.textContent = focus.kind.toUpperCase();
    if (this.el.mobilePhaseVal) this.el.mobilePhaseVal.textContent = focus.kind.toUpperCase();

    // Body data card
    if (this.el.bodyData) this.renderBodyData(this.el.bodyData, focus);
    if (this.el.mobileBodyData) this.renderBodyData(this.el.mobileBodyData, focus);

    // Body list highlight
    for (const list of this.el.bodyLists) {
      for (const child of Array.from(list.children)) {
        const e = child as HTMLElement;
        e.classList.toggle("active", e.dataset.id === this.state.focusedId);
      }
    }

    // Speed buttons highlight
    for (const b of this.el.pbSpeedBtns) {
      b.classList.toggle("active", Number(b.dataset.speed) === this.state.speed);
    }
    for (const b of this.el.mobileSpeedBtns) {
      b.classList.toggle("active", Number(b.dataset.speed) === this.state.speed);
    }

    // Play button label
    if (this.el.pbPlay) this.el.pbPlay.textContent = this.state.playing ? "Pause" : "Play";
    if (this.el.mobilePbPlay) this.el.mobilePbPlay.textContent = this.state.playing ? "Pause" : "Play";

    // Toggle checkboxes
    if (this.el.pbTrueScale) this.el.pbTrueScale.checked = this.state.toggles.trueScale;
    if (this.el.mobileTrueScale) this.el.mobileTrueScale.checked = this.state.toggles.trueScale;
    for (const item of this.el.toggleInputs) {
      item.input.checked = this.state.toggles[item.key];
    }

    // Feature card
    this.renderFeatureCard();

    // Mission mode
    this.renderMissionPanels();
    this.syncMissionTopButton();
  }

  private renderBodyData(target: HTMLElement, focus: ReturnType<typeof getBody>) {
    if (!focus) return;
    target.innerHTML = "";
    const rows: [string, string][] = [
      ["Radius", `${focus.radiusKm.toLocaleString()} km`],
      ["Mass", fmtMass(focus.massKg)],
      ["Gravity", `${focus.gravity} m/s²`],
      ["Day", `${Math.abs(focus.rotationPeriodHours).toFixed(2)} h${focus.rotationPeriodHours < 0 ? " (retro)" : ""}`],
      ["Year", focus.parent && focus.kind !== "moon"
        ? `${(focus.periodDays / 365.25).toFixed(2)} yr`
        : focus.kind === "moon" ? `${focus.periodDays.toFixed(2)} d` : "—"],
      ["Mean temp", `${focus.meanTempC} °C`],
    ];
    for (const [k, v] of rows) {
      const r = row(k.toUpperCase(), v, "v white");
      target.appendChild(r.row);
    }
  }

  private renderFeatureCard() {
    if (this.el.featureCard) {
      this.el.featureCard.remove();
      this.el.featureCard = null;
    }
    if (this.state.mission.activeId) return;
    if (!this.state.activeFeatureId) return;
    const f = FEATURES.find((x) => x.name === this.state.activeFeatureId);
    if (!f) return;
    const rich = f.bodyId === "moon";
    const typeClass = f.type.replace(/\s+/g, "-");

    const card = document.createElement("div");
    card.className = `feature-card feature-card--${typeClass}`;

    // Mobile: start peeked (shows only fc-top); tap handle to expand
    const isMobile = window.innerWidth <= 820;
    if (isMobile) card.classList.add("fc-peek");

    const handle = document.createElement("button");
    handle.className = "fc-handle";
    handle.setAttribute("aria-label", "Expand feature details");
    handle.addEventListener("click", (e) => {
      e.stopPropagation();
      const nowPeek = card.classList.toggle("fc-peek");
      handle.setAttribute("aria-label", nowPeek ? "Expand feature details" : "Collapse feature details");
    });

    const close = document.createElement("button");
    close.className = "fc-close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.addEventListener("click", () => this.state.setActiveFeature(null));

    const top = document.createElement("div");
    top.className = "fc-top";
    const thumb = document.createElement("div");
    thumb.className = `fc-thumb fc-thumb--${typeClass}`;
    thumb.setAttribute("aria-hidden", "true");
    const head = document.createElement("div");
    const tag = document.createElement("div");
    tag.className = "fc-tag";
    tag.textContent = rich ? f.type.toUpperCase() : "SURFACE FEATURE";
    const name = document.createElement("div");
    name.className = "fc-name";
    name.textContent = f.name;
    head.append(tag, name);
    top.append(thumb, head);

    const desc = document.createElement("div");
    desc.className = "fc-desc";
    desc.textContent = f.description;

    const meta = document.createElement("div");
    meta.className = "fc-meta";
    meta.append(
      featurePill("TYPE", f.type),
      featurePill("COORD", formatCoords(f.lat, f.lon)),
    );
    if (f.diameterKm) meta.append(featurePill("SPAN", `${Math.round(f.diameterKm).toLocaleString()} km`));

    card.append(handle, close, top, meta, desc);

    if (f.detail || f.whyItMatters) {
      const expanded = document.createElement("div");
      expanded.className = "fc-expanded";
      if (f.detail) expanded.appendChild(featureNote("DETAIL", f.detail));
      if (f.whyItMatters) expanded.appendChild(featureNote("WHY IT MATTERS", f.whyItMatters));
      card.appendChild(expanded);
    }

    if (rich) {
      const nearby = nearbyFeatures(f, 3);
      if (nearby.length) {
        const wrap = document.createElement("div");
        wrap.className = "fc-nearby";
        const nearbyTitle = document.createElement("div");
        nearbyTitle.className = "fc-section-title";
        nearbyTitle.textContent = "NEARBY FEATURES";
        const list = document.createElement("div");
        list.className = "fc-nearby-list";
        for (const item of nearby) {
          const option = btn(item.name);
          option.className = `fc-nearby-item fc-nearby-item--${item.type.replace(/\s+/g, "-")}`;
          option.title = `${item.type} · ${formatCoords(item.lat, item.lon)}`;
          option.addEventListener("click", () => this.state.setActiveFeature(item.name));
          list.appendChild(option);
        }
        wrap.append(nearbyTitle, list);
        card.appendChild(wrap);
      }
    }

    this.root.appendChild(card);
    this.el.featureCard = card;
  }

  private drawMinimaps() {
    for (const c of this.el.miniCanvases) this.drawMinimap(c);
  }

  private renderMissionPanels() {
    if (this.el.missionPanel) this.renderMissionPanel(this.el.missionPanel);
    if (this.el.mobileMissionPanel) this.renderMissionPanel(this.el.mobileMissionPanel);
  }

  private renderMissionPanel(target: HTMLElement) {
    target.innerHTML = "";
    const mission = getMission(this.state.mission.activeId);
    target.classList.toggle("collapsed", target === this.el.missionPanel && !mission && !this.missionPanelOpen);
    const isMobileMissionPanel = target === this.el.mobileMissionPanel;
    target.classList.toggle("expanded", isMobileMissionPanel && this.mobileMissionTextExpanded);
    if (isMobileMissionPanel) {
      this.el.mobileSheet?.classList.toggle("mission-text-expanded", this.mobileMissionTextExpanded);
    }
    const header = panelHeader("MISSION MODE", mission ? "CINEMATIC" : "READY");
    target.appendChild(header);

    if (!mission) {
      const title = document.createElement("div");
      title.className = "mission-title";
      title.textContent = APOLLO_11_MISSION.title;
      const subtitle = document.createElement("div");
      subtitle.className = "mission-subtitle";
      subtitle.textContent = APOLLO_11_MISSION.summary;
      const start = btn("Begin Mission");
      start.className = "mission-primary";
      start.addEventListener("click", () => {
        this.missionPanelOpen = true;
        this.mobileMissionTextExpanded = false;
        this.state.startMission(APOLLO_11_MISSION.id);
      });
      target.append(title, subtitle, start);
      return;
    }

    const stepIndex = Math.max(0, Math.min(this.state.mission.stepIndex, mission.steps.length - 1));
    const step = mission.steps[stepIndex];

    const top = document.createElement("div");
    top.className = "mission-card-head";
    const titleWrap = document.createElement("div");
    const title = document.createElement("div");
    title.className = "mission-title";
    title.textContent = mission.title;
    const subtitle = document.createElement("div");
    subtitle.className = "mission-subtitle";
    subtitle.textContent = `${stepIndex + 1} / ${mission.steps.length} · ${step.tag}`;
    titleWrap.append(title, subtitle);
    const exit = btn("Exit");
    exit.addEventListener("click", () => {
      this.state.exitMission();
      this.missionPanelOpen = false;
      this.mobileMissionTextExpanded = false;
    });
    top.append(titleWrap, exit);

    const canvas = document.createElement("canvas");
    canvas.className = "mission-map";
    canvas.width = 560;
    canvas.height = 170;
    this.el.missionMiniCanvases.push(canvas);

    const stepTitle = document.createElement("div");
    stepTitle.className = "mission-step-title";
    stepTitle.textContent = step.title;
    const time = document.createElement("div");
    time.className = "mission-time";
    time.textContent = fmtUtc(new Date(step.timestampUtc).getTime());
    const detail = document.createElement("div");
    detail.className = "mission-detail";
    detail.textContent = step.detail;
    const fact = document.createElement("div");
    fact.className = "mission-fact";
    fact.textContent = step.keyFact;

    const showMore = btn(this.mobileMissionTextExpanded ? "Show less" : "Show more");
    showMore.className = "mission-show-more";
    showMore.setAttribute("aria-expanded", String(this.mobileMissionTextExpanded));
    showMore.addEventListener("click", () => {
      this.mobileMissionTextExpanded = !this.mobileMissionTextExpanded;
      this.renderMissionPanels();
    });

    const controls = document.createElement("div");
    controls.className = "mission-controls";
    const prev = btn("Prev");
    prev.disabled = stepIndex === 0;
    prev.addEventListener("click", () => {
      this.mobileMissionTextExpanded = false;
      this.advanceMission(-1);
    });
    const play = btn(this.state.mission.playing ? "Pause Tour" : "Play Tour");
    play.addEventListener("click", () => this.state.setMissionPlaying(!this.state.mission.playing));
    const next = btn(stepIndex === mission.steps.length - 1 ? "Done" : "Next");
    next.addEventListener("click", () => {
      if (stepIndex === mission.steps.length - 1) this.state.setMissionPlaying(false);
      else {
        this.mobileMissionTextExpanded = false;
        this.advanceMission(1);
      }
    });
    controls.append(prev, play, next);

    const progress = document.createElement("div");
    progress.className = "mission-progress";
    progress.style.setProperty("--p", `${this.missionProgressPercent(mission)}%`);

    const chapters = document.createElement("div");
    chapters.className = "mission-chapters";
    for (let i = 0; i < mission.steps.length; i++) {
      const chapter = document.createElement("button");
      chapter.textContent = mission.steps[i].title;
      chapter.dataset.step = String(i + 1);
      chapter.setAttribute("aria-label", mission.steps[i].title);
      chapter.className = i === stepIndex ? "active" : "";
      chapter.addEventListener("click", () => {
        this.mobileMissionTextExpanded = false;
        this.state.setMissionPlaying(false);
        this.state.setMissionStep(i);
      });
      chapters.appendChild(chapter);
    }

    target.append(top, canvas, stepTitle, time, detail);
    if (isMobileMissionPanel) target.append(showMore, fact);
    else target.appendChild(fact);
    target.append(controls, progress, chapters);
  }

  private advanceMission(delta: number) {
    const mission = getMission(this.state.mission.activeId);
    if (!mission) return;
    const next = Math.max(0, Math.min(mission.steps.length - 1, this.state.mission.stepIndex + delta));
    if (next === this.state.mission.stepIndex && delta > 0) {
      this.state.setMissionPlaying(false);
      return;
    }
    if (next !== this.state.mission.stepIndex) this.mobileMissionTextExpanded = false;
    this.state.setMissionStep(next);
    if (next === mission.steps.length - 1) this.state.setMissionPlaying(false);
  }

  private syncMissionTopButton() {
    if (!this.el.missionTopButton) return;
    this.el.missionTopButton.textContent = this.state.mission.activeId ? "MISSION ACTIVE" : "MISSIONS";
    this.el.missionTopButton.classList.toggle("active", !!this.state.mission.activeId || this.missionPanelOpen);
  }

  private updateMissionProgressBars() {
    const mission = getMission(this.state.mission.activeId);
    const percent = mission ? this.missionProgressPercent(mission) : 0;
    for (const bar of this.root.querySelectorAll<HTMLElement>(".mission-progress")) {
      bar.style.setProperty("--p", `${percent}%`);
    }
  }

  private missionProgressPercent(mission: Mission): number {
    const denom = Math.max(1, mission.steps.length - 1);
    return Math.max(0, Math.min(100, ((this.state.mission.stepIndex + this.state.mission.stepProgress) / denom) * 100));
  }

  private drawMissionMinimaps() {
    const canvases = this.el.missionMiniCanvases.filter((c) => c.isConnected);
    this.el.missionMiniCanvases = canvases;
    const mission = getMission(this.state.mission.activeId);
    const step = activeMissionStep(this.state.mission.activeId, this.state.mission.stepIndex);
    for (const c of canvases) this.drawMissionMinimap(c, mission, step);
  }

  private drawMissionMinimap(c: HTMLCanvasElement, mission: Mission | null, step: ReturnType<typeof activeMissionStep>) {
    const ctx = c.getContext("2d")!;
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(0, 0, w, h);

    const earth = { x: 76, y: h * 0.58 };
    const moon = { x: w - 72, y: h * 0.42 };
    const t = step ? lerp(step.markerStartT, step.markerT, this.state.mission.stepProgress) : 0;
    const returnMode = step?.pathMode === "return";
    const curveLift = returnMode ? 38 : -38;
    const marker = pointOnMiniCurve(earth, moon, t, curveLift);

    ctx.strokeStyle = "rgba(94, 231, 224, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(earth.x, earth.y, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = returnMode ? "rgba(94, 231, 224, 0.75)" : "rgba(245, 185, 66, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(earth.x, earth.y);
    ctx.quadraticCurveTo(w / 2, h / 2 + curveLift, moon.x, moon.y);
    ctx.stroke();

    ctx.fillStyle = "#4a90d9";
    ctx.beginPath();
    ctx.arc(earth.x, earth.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b8b6b0";
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d8e3ec";
    ctx.font = "20px JetBrains Mono, monospace";
    ctx.fillText("Earth", earth.x - 28, earth.y + 34);
    ctx.fillText("Moon", moon.x - 24, moon.y + 30);

    if (mission && step) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f5b942";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawMinimap(c: HTMLCanvasElement) {
    const ctx = c.getContext("2d")!;
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    // Find bounds: max heliocentric distance among visible planets
    const cx = w / 2, cy = h / 2;
    let maxR = 0;
    for (const b of this.system.bodyOrder) {
      if (b.parentBody?.data.kind !== "star") continue;
      const dx = b.group.position.x;
      const dz = b.group.position.z;
      const r = Math.hypot(dx, dz);
      if (r > maxR) maxR = r;
    }
    if (maxR === 0) maxR = 1;
    const scale = (Math.min(w, h) * 0.42) / maxR;

    // grid rings
    ctx.strokeStyle = "rgba(94, 231, 224, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (Math.min(w, h) * 0.42) * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Sun
    ctx.fillStyle = "#ffd27a";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Planets
    for (const b of this.system.bodyOrder) {
      if (b.parentBody?.data.kind !== "star") continue;
      const x = cx + b.group.position.x * scale;
      const y = cy + b.group.position.z * scale;
      const isFocus = b.data.id === this.state.focusedId;
      ctx.fillStyle = isFocus ? "#5EE7E0" : "#7c8fa3";
      ctx.beginPath();
      ctx.arc(x, y, isFocus ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();
      if (isFocus) {
        ctx.strokeStyle = "#5EE7E0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

type SimToggleKeys = {
  showOrbits: boolean;
  showLabels: boolean;
  showTrails: boolean;
  showMoons: boolean;
  showAsteroidBelt: boolean;
  trueScale: boolean;
};

// ---------- DOM helpers ----------
function span(text: string): HTMLElement {
  const s = document.createElement("span");
  s.textContent = text;
  return s;
}
function sep(): HTMLElement {
  const s = document.createElement("span");
  s.className = "sep";
  s.textContent = "/";
  return s;
}
function panel(extraClass: string): HTMLElement {
  const p = document.createElement("div");
  p.className = "panel " + extraClass;
  return p;
}
function panelHeader(left: string, right: string): HTMLElement {
  const h = document.createElement("div");
  h.className = "panel-header";
  const l = document.createElement("span");
  l.textContent = left;
  const r = document.createElement("span");
  r.className = "right";
  r.textContent = right;
  h.append(l, r);
  return h;
}
function label(text: string): HTMLElement {
  const l = document.createElement("div");
  l.className = "met-label";
  l.textContent = text;
  return l;
}
function row(k: string, v: string, vClass = "v"): { row: HTMLElement; key: HTMLElement; val: HTMLElement } {
  const r = document.createElement("div");
  r.className = "row";
  const ke = document.createElement("span");
  ke.className = "k";
  ke.textContent = k;
  const ve = document.createElement("span");
  ve.className = vClass;
  ve.textContent = v;
  r.append(ke, ve);
  return { row: r, key: ke, val: ve };
}
function btn(text: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = text;
  return b;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function featurePill(k: string, v: string): HTMLElement {
  const item = document.createElement("div");
  item.className = "fc-pill";
  const key = document.createElement("span");
  key.textContent = k;
  const val = document.createElement("strong");
  val.textContent = v;
  item.append(key, val);
  return item;
}

function featureNote(k: string, v: string): HTMLElement {
  const item = document.createElement("div");
  item.className = "fc-note";
  const key = document.createElement("div");
  key.className = "fc-section-title";
  key.textContent = k;
  const val = document.createElement("div");
  val.textContent = v;
  item.append(key, val);
  return item;
}

function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

function pointOnMiniCurve(
  start: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
  lift: number,
) {
  const control = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 + lift };
  const a = {
    x: start.x + (control.x - start.x) * t,
    y: start.y + (control.y - start.y) * t,
  };
  const b = {
    x: control.x + (end.x - control.x) * t,
    y: control.y + (end.y - control.y) * t,
  };
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
