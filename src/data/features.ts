export type SurfaceFeatureType =
  | "basin"
  | "canyon"
  | "crater"
  | "landing site"
  | "volcano"
  | "region"
  | "storm"
  | "ice"
  | "ocean";

export interface SurfaceFeature {
  bodyId: string;
  name: string;
  type: SurfaceFeatureType;
  lat: number; // deg, -90..90
  lon: number; // deg, -180..180
  radiusDeg: number; // angular radius for hit-testing
  description: string;
  diameterKm?: number;
  detail?: string;
  whyItMatters?: string;
}

export const FEATURES: SurfaceFeature[] = [
  // Earth
  {
    bodyId: "earth",
    name: "Mt. Everest",
    type: "region",
    lat: 27.99,
    lon: 86.92,
    radiusDeg: 6,
    description: "Earth's highest peak — 8,848 m above sea level. On the border of Nepal and Tibet.",
  },
  {
    bodyId: "earth",
    name: "Amazon Basin",
    type: "basin",
    lat: -3.5,
    lon: -62.0,
    radiusDeg: 14,
    description: "Largest tropical rainforest on Earth, drained by the Amazon River — about 7M km².",
  },
  {
    bodyId: "earth",
    name: "Sahara Desert",
    type: "region",
    lat: 23.0,
    lon: 13.0,
    radiusDeg: 16,
    description: "World's largest hot desert, covering most of North Africa — 9M km².",
  },
  {
    bodyId: "earth",
    name: "Pacific Ocean",
    type: "ocean",
    lat: 0,
    lon: -160,
    radiusDeg: 28,
    description: "Largest body of water on the planet. Contains over half of Earth's free water.",
  },
  // Mars
  {
    bodyId: "mars",
    name: "Olympus Mons",
    type: "volcano",
    lat: 18.65,
    lon: -133.8,
    radiusDeg: 10,
    description: "Largest volcano in the solar system. 22 km tall — nearly three times the height of Everest.",
  },
  {
    bodyId: "mars",
    name: "Valles Marineris",
    type: "canyon",
    lat: -14,
    lon: -59,
    radiusDeg: 14,
    description: "A canyon system 4,000 km long, up to 7 km deep — dwarfs the Grand Canyon.",
  },
  {
    bodyId: "mars",
    name: "North Polar Cap",
    type: "ice",
    lat: 85,
    lon: 0,
    radiusDeg: 12,
    description: "Permanent water-ice cap at the Martian north pole, layered with frozen CO₂ in winter.",
  },
  // Jupiter
  {
    bodyId: "jupiter",
    name: "Great Red Spot",
    type: "storm",
    lat: -22,
    lon: 0,
    radiusDeg: 12,
    description: "A giant anticyclonic storm raging for at least 350 years. Wider than Earth.",
  },
  {
    bodyId: "jupiter",
    name: "North Equatorial Belt",
    type: "storm",
    lat: 12,
    lon: 90,
    radiusDeg: 14,
    description: "A dark cloud band of descending air. The most active belt — frequent storms.",
  },
  // Saturn
  {
    bodyId: "saturn",
    name: "Hexagonal Polar Storm",
    type: "storm",
    lat: 78,
    lon: 0,
    radiusDeg: 14,
    description: "A persistent six-sided jet stream around Saturn's north pole. ~30,000 km across.",
  },
  // Moon
  {
    bodyId: "moon",
    name: "Mare Tranquillitatis",
    type: "basin",
    lat: 8.35,
    lon: 30.83,
    radiusDeg: 14,
    diameterKm: 876,
    description: "Sea of Tranquility, a broad basalt plain inside an ancient impact basin.",
    detail: "Its smooth mare lavas and equatorial position helped make the southwest part of this region suitable for the first crewed lunar landing.",
    whyItMatters: "Shows how early impacts opened basins that later filled with dark volcanic basalt.",
  },
  {
    bodyId: "moon",
    name: "Tranquility Base",
    type: "landing site",
    lat: 0.67416,
    lon: 23.47314,
    radiusDeg: 4,
    description: "Apollo 11 Lunar Module landing site in southwestern Mare Tranquillitatis.",
    detail: "Neil Armstrong and Buzz Aldrin landed Eagle here on July 20, 1969, then worked on the surface for about 21.5 hours.",
    whyItMatters: "First place humans landed and walked on another world.",
  },
  {
    bodyId: "moon",
    name: "Tycho Crater",
    type: "crater",
    lat: -43.3,
    lon: -11.22,
    radiusDeg: 6,
    diameterKm: 85,
    description: "Prominent young impact crater with a bright ray system visible from Earth.",
    detail: "Tycho's crisp rim, central peak, and rays stand out because the crater is geologically young by lunar standards.",
    whyItMatters: "A vivid example of how fresh impacts scatter bright ejecta across the Moon.",
  },
  {
    bodyId: "moon",
    name: "Copernicus Crater",
    type: "crater",
    lat: 9.62,
    lon: -20.08,
    radiusDeg: 6,
    diameterKm: 96,
    description: "Large young crater northwest of the Moon's near-side center.",
    detail: "Copernicus has terraced walls, central peaks, and a radial ray pattern that makes it one of the most recognizable near-side craters.",
    whyItMatters: "Classic textbook crater for reading impact structure and ejecta on an airless world.",
  },
  {
    bodyId: "moon",
    name: "Clavius Crater",
    type: "crater",
    lat: -58.62,
    lon: -14.73,
    radiusDeg: 9,
    diameterKm: 231,
    description: "Huge southern highland crater, among the largest visible from Earth.",
    detail: "NASA's SOFIA observatory detected water molecules in sunlit terrain at Clavius, showing lunar water is not limited to permanently shadowed regions.",
    whyItMatters: "Connects ancient impact terrain with modern lunar resource science.",
  },
  {
    bodyId: "moon",
    name: "Mare Imbrium",
    type: "basin",
    lat: 34.72,
    lon: -14.91,
    radiusDeg: 18,
    diameterKm: 1146,
    description: "Sea of Rains, a vast lava-filled impact basin on the near side.",
    detail: "Its circular outline and surrounding mountain arcs mark one of the Moon's great basin-forming impacts.",
    whyItMatters: "A major near-side basin that helps define the face of the Moon seen from Earth.",
  },
  {
    bodyId: "moon",
    name: "Orientale Basin",
    type: "basin",
    lat: -20,
    lon: -95,
    radiusDeg: 16,
    diameterKm: 950,
    description: "Young multi-ring impact basin near the Moon's western limb.",
    detail: "Orientale's concentric rings form a bullseye pattern, preserving the architecture of a tremendous basin-forming impact.",
    whyItMatters: "One of the best-preserved examples of a multi-ring basin in the solar system.",
  },
  {
    bodyId: "moon",
    name: "South Pole-Aitken Basin",
    type: "basin",
    lat: -53,
    lon: -169,
    radiusDeg: 26,
    diameterKm: 2500,
    description: "Immense far-side basin stretching from near the lunar south pole toward Aitken crater.",
    detail: "This ancient impact structure covers nearly a quarter of the Moon and is roughly 10 km deep on average.",
    whyItMatters: "The Moon's largest impact feature and a prime window into early solar system bombardment.",
  },
  {
    bodyId: "moon",
    name: "Vallis Schroteri",
    type: "canyon",
    lat: 26.16,
    lon: -51.58,
    radiusDeg: 5,
    diameterKm: 185,
    description: "Largest named sinuous valley on the Moon, carved into the Aristarchus Plateau region.",
    detail: "This winding channel is usually interpreted as a volcanic rille formed by flowing lava.",
    whyItMatters: "A clear surface trace of the Moon's volcanic plumbing.",
  },
  {
    bodyId: "moon",
    name: "Mons Rumker",
    type: "volcano",
    lat: 40.76,
    lon: -58.33,
    radiusDeg: 5,
    diameterKm: 73,
    description: "Low volcanic dome complex in Oceanus Procellarum.",
    detail: "Mons Rumker is a raised region built by late lunar volcanism, with overlapping shallow domes and subtle slopes.",
    whyItMatters: "A rare place where lunar volcanism is visible as a dome field rather than only broad dark plains.",
  },
  // Europa
  {
    bodyId: "europa",
    name: "Conamara Chaos",
    type: "region",
    lat: 9.5,
    lon: -86,
    radiusDeg: 8,
    description: "Region of jumbled ice blocks — evidence of a subsurface ocean breaking through the crust.",
  },
  // Io
  {
    bodyId: "io",
    name: "Loki Patera",
    type: "volcano",
    lat: 12.5,
    lon: -50,
    radiusDeg: 6,
    description: "The most powerful volcano in the solar system. Lava lake the size of Lake Ontario.",
  },
  // Titan
  {
    bodyId: "titan",
    name: "Kraken Mare",
    type: "ocean",
    lat: 68,
    lon: -50,
    radiusDeg: 14,
    description: "Largest known body of liquid methane on Titan — bigger than the Caspian Sea.",
  },
];

export function featuresFor(bodyId: string): SurfaceFeature[] {
  return FEATURES.filter((f) => f.bodyId === bodyId);
}

export function featureByName(name: string | null): SurfaceFeature | null {
  if (!name) return null;
  return FEATURES.find((f) => f.name === name) ?? null;
}

export function nearbyFeatures(feature: SurfaceFeature, count = 3): SurfaceFeature[] {
  return featuresFor(feature.bodyId)
    .filter((f) => f.name !== feature.name)
    .map((f) => ({ feature: f, distance: angularDistance(feature.lat, feature.lon, f.lat, f.lon) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((item) => item.feature);
}

export function angularDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a))) * (180 / Math.PI);
}
