export type MissionCameraMode = "earth" | "transfer" | "moon" | "surface";
export type MissionPathMode =
  | "launch"
  | "earth-orbit"
  | "outbound"
  | "lunar-orbit"
  | "surface-descent"
  | "surface"
  | "surface-ascent"
  | "return"
  | "splashdown";

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
}

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  steps: MissionStep[];
}

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
      durationSec: 7,
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
      durationSec: 7,
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
      durationSec: 8,
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
      durationSec: 8,
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
      durationSec: 7,
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
      durationSec: 8,
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
      durationSec: 6,
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
      durationSec: 7,
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
      durationSec: 8,
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
      durationSec: 6,
      tag: "RECOVERY",
      detail: "The command module Columbia splashed down in the Pacific Ocean, completing the first crewed landing on another world.",
      keyFact: "Apollo 11 lasted 8 days, 3 hours, 18 minutes, and 35 seconds.",
    },
  ],
};

export const MISSIONS: Mission[] = [APOLLO_11_MISSION];

export function getMission(id: string | null): Mission | null {
  if (!id) return null;
  return MISSIONS.find((mission) => mission.id === id) ?? null;
}

export function activeMissionStep(id: string | null, index: number): MissionStep | null {
  const mission = getMission(id);
  if (!mission) return null;
  return mission.steps[Math.max(0, Math.min(index, mission.steps.length - 1))] ?? null;
}
