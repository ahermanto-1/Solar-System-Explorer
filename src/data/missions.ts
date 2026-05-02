export type MissionCameraMode = "earth" | "transfer" | "moon" | "surface" | "solar-transfer" | "planet" | "deep-space";
export type MissionPathMode =
  | "launch"
  | "earth-orbit"
  | "outbound"
  | "lunar-orbit"
  | "surface-descent"
  | "surface"
  | "surface-ascent"
  | "return"
  | "splashdown"
  | "grand-tour"
  | "outer-flyby"
  | "interstellar";

export interface MissionStep {
  id: string;
  title: string;
  timestampUtc: string;
  focusId: string;
  cameraMode: MissionCameraMode;
  pathMode: MissionPathMode;
  markerStartT: number;
  markerT: number;
  durationSec: number;
  tag: string;
  detail: string;
  keyFact: string;
  featureId?: string;
  routeBodyIds?: string[];
}

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  steps: MissionStep[];
}

const MISSION_LEG_DURATION_SEC = 15;

export const APOLLO_11_MISSION: Mission = {
  id: "apollo-11",
  title: "Apollo 11",
  subtitle: "Earth to Moon",
  summary: "Follow the first crewed lunar landing through launch, translunar coast, lunar orbit, Tranquility Base, and the return home.",
  steps: [
    {
      id: "launch",
      title: "Launch",
      timestampUtc: "1969-07-16T13:32:00Z",
      focusId: "earth",
      cameraMode: "earth",
      pathMode: "launch",
      markerStartT: 0,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "SATURN V",
      detail: "Apollo 11 lifted off from Kennedy Space Center with Neil Armstrong, Buzz Aldrin, and Michael Collins aboard.",
      keyFact: "The Saturn V cleared the tower about 12 seconds after liftoff.",
    },
    {
      id: "parking-orbit",
      title: "Earth Parking Orbit",
      timestampUtc: "1969-07-16T13:44:00Z",
      focusId: "earth",
      cameraMode: "earth",
      pathMode: "earth-orbit",
      markerStartT: 0,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "CHECKOUT",
      detail: "The spacecraft first entered a low Earth parking orbit so the crew and ground teams could verify systems before committing to the Moon.",
      keyFact: "Apollo 11 spent about two and a half hours in Earth orbit.",
    },
    {
      id: "tli",
      title: "Translunar Injection",
      timestampUtc: "1969-07-16T16:22:13Z",
      focusId: "earth",
      cameraMode: "transfer",
      pathMode: "outbound",
      markerStartT: 0,
      markerT: 0.24,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "BURN",
      detail: "The S-IVB third stage fired again, increasing Apollo's speed enough to leave Earth orbit and start the coast toward the Moon.",
      keyFact: "The burn had to aim for where the Moon would be three days later.",
    },
    {
      id: "coast",
      title: "Coast to the Moon",
      timestampUtc: "1969-07-18T18:00:00Z",
      focusId: "earth",
      cameraMode: "transfer",
      pathMode: "outbound",
      markerStartT: 0.24,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "NAVIGATION",
      detail: "For most of the trip, Apollo 11 coasted through cislunar space while the crew made navigation checks and prepared the lunar module.",
      keyFact: "Even at lunar distance, radio delay was only about 1.3 seconds one way.",
    },
    {
      id: "loi",
      title: "Lunar Orbit Insertion",
      timestampUtc: "1969-07-19T17:21:50Z",
      focusId: "moon",
      cameraMode: "moon",
      pathMode: "lunar-orbit",
      markerStartT: 0,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "CAPTURE",
      detail: "Apollo 11 fired its service propulsion engine behind the Moon, slowing down so lunar gravity could capture it into orbit.",
      keyFact: "The burn happened during a communications blackout on the far side.",
    },
    {
      id: "landing",
      title: "Descent to Tranquility Base",
      timestampUtc: "1969-07-20T20:17:40Z",
      focusId: "moon",
      cameraMode: "surface",
      pathMode: "surface-descent",
      markerStartT: 0,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "EAGLE",
      detail: "The Eagle lunar module descended toward Mare Tranquillitatis, with Armstrong taking manual control near the end to avoid rough terrain.",
      keyFact: "Touchdown came with roughly half a minute of landing fuel remaining.",
      featureId: "Mare Tranquillitatis",
    },
    {
      id: "moonwalk",
      title: "Moonwalk",
      timestampUtc: "1969-07-21T02:56:15Z",
      focusId: "moon",
      cameraMode: "surface",
      pathMode: "surface",
      markerStartT: 1,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "EVA",
      detail: "Armstrong and Aldrin explored the surface, photographed the site, deployed experiments, and collected lunar samples.",
      keyFact: "The first EVA lasted about two and a half hours.",
      featureId: "Mare Tranquillitatis",
    },
    {
      id: "ascent",
      title: "Ascent and Rendezvous",
      timestampUtc: "1969-07-21T17:54:00Z",
      focusId: "moon",
      cameraMode: "moon",
      pathMode: "surface-ascent",
      markerStartT: 0,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "RENDEZVOUS",
      detail: "Eagle's ascent stage lifted off from the Moon and rejoined Columbia in lunar orbit before the crew prepared for the trip home.",
      keyFact: "Only the ascent stage left the surface; the descent stage stayed on the Moon.",
    },
    {
      id: "return",
      title: "Trans-Earth Injection",
      timestampUtc: "1969-07-22T04:55:00Z",
      focusId: "earth",
      cameraMode: "transfer",
      pathMode: "return",
      markerStartT: 0,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "HOMEBOUND",
      detail: "The service module engine fired again, sending Apollo 11 out of lunar orbit and onto a return path to Earth.",
      keyFact: "The return corridor had to be precise enough for safe atmospheric reentry.",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      timestampUtc: "1969-07-24T16:50:35Z",
      focusId: "earth",
      cameraMode: "earth",
      pathMode: "splashdown",
      markerStartT: 0,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "RECOVERY",
      detail: "The command module Columbia splashed down in the Pacific Ocean, completing the first crewed landing on another world.",
      keyFact: "Apollo 11 lasted 8 days, 3 hours, 18 minutes, and 35 seconds.",
    },
  ],
};

const VOYAGER_2_ROUTE = ["earth", "jupiter", "saturn", "uranus", "neptune"];

export const VOYAGER_2_MISSION: Mission = {
  id: "voyager-2",
  title: "Voyager 2",
  subtitle: "Grand Tour",
  summary: "Trace Voyager 2 from its 1977 launch through the only spacecraft flybys of Jupiter, Saturn, Uranus, and Neptune.",
  steps: [
    {
      id: "launch",
      title: "Launch from Earth",
      timestampUtc: "1977-08-20T14:29:00Z",
      focusId: "earth",
      cameraMode: "earth",
      pathMode: "launch",
      markerStartT: 0,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "TITAN-CENTAUR",
      detail: "Voyager 2 lifted off before Voyager 1, taking a slower trajectory that preserved the rare alignment needed for the Grand Tour.",
      keyFact: "Its launch window used gravity assists that repeat only about every 176 years.",
      routeBodyIds: VOYAGER_2_ROUTE,
    },
    {
      id: "jupiter",
      title: "Jupiter Gravity Assist",
      timestampUtc: "1979-07-09T22:29:00Z",
      focusId: "jupiter",
      cameraMode: "planet",
      pathMode: "grand-tour",
      markerStartT: 0,
      markerT: 0.26,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "GAS GIANT",
      detail: "Jupiter bent Voyager 2's path outward and accelerated it toward Saturn while the spacecraft studied the planet, rings, and large moons.",
      keyFact: "Voyager 2 confirmed active volcanism on Io after Voyager 1's discovery earlier that year.",
      routeBodyIds: VOYAGER_2_ROUTE,
    },
    {
      id: "saturn",
      title: "Saturn Encounter",
      timestampUtc: "1981-08-26T03:24:00Z",
      focusId: "saturn",
      cameraMode: "planet",
      pathMode: "grand-tour",
      markerStartT: 0.26,
      markerT: 0.49,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "RINGS",
      detail: "Voyager 2 flew through the Saturn system, refining measurements of the rings and inspecting moons such as Titan, Enceladus, and Iapetus.",
      keyFact: "The Saturn flyby redirected Voyager 2 toward Uranus, extending the mission far beyond its original planetary targets.",
      routeBodyIds: VOYAGER_2_ROUTE,
    },
    {
      id: "uranus",
      title: "Uranus Flyby",
      timestampUtc: "1986-01-24T17:59:00Z",
      focusId: "uranus",
      cameraMode: "planet",
      pathMode: "grand-tour",
      markerStartT: 0.49,
      markerT: 0.72,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "ICE GIANT",
      detail: "Voyager 2 made humanity's first close visit to Uranus, revealing a tilted magnetic field, dark rings, and new moons.",
      keyFact: "Voyager 2 remains the only spacecraft to have visited Uranus up close.",
      routeBodyIds: VOYAGER_2_ROUTE,
    },
    {
      id: "neptune",
      title: "Neptune and Triton",
      timestampUtc: "1989-08-25T03:56:00Z",
      focusId: "neptune",
      cameraMode: "planet",
      pathMode: "grand-tour",
      markerStartT: 0.72,
      markerT: 0.9,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "LAST PLANET",
      detail: "Voyager 2 skimmed past Neptune and then flew by Triton, finding the Great Dark Spot, supersonic winds, and nitrogen geysers.",
      keyFact: "Its Neptune flyby sent the spacecraft onto a path out of the planetary plane.",
      routeBodyIds: VOYAGER_2_ROUTE,
    },
    {
      id: "interstellar-space",
      title: "Into Interstellar Space",
      timestampUtc: "2018-11-05T00:00:00Z",
      focusId: "neptune",
      cameraMode: "deep-space",
      pathMode: "interstellar",
      markerStartT: 0.9,
      markerT: 1,
      durationSec: MISSION_LEG_DURATION_SEC,
      tag: "HELIOPAUSE",
      detail: "After decades in the outer heliosphere, Voyager 2 crossed the heliopause and began sampling interstellar plasma directly.",
      keyFact: "Voyager 2 is the only spacecraft to visit both Uranus and Neptune.",
      routeBodyIds: VOYAGER_2_ROUTE,
    },
  ],
};

export const MISSIONS: Mission[] = [APOLLO_11_MISSION, VOYAGER_2_MISSION];

export function getMission(id: string | null): Mission | null {
  if (!id) return null;
  return MISSIONS.find((mission) => mission.id === id) ?? null;
}

export function activeMissionStep(id: string | null, index: number): MissionStep | null {
  const mission = getMission(id);
  if (!mission) return null;
  return mission.steps[Math.max(0, Math.min(index, mission.steps.length - 1))] ?? null;
}
