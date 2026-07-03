export const SAVE_DATA_VERSION = 1;
export const SAVE_STORAGE_KEY = "galaxy-exploration.save.v1";
export const RESOURCE_TYPES = Object.freeze(["oil", "iron", "copper", "ice", "water"]);

export const STARTER_PART_IDS = Object.freeze([
  "cmd-pioneer",
  "air-maker-basic",
  "water-tank-s",
  "tank-kerolox-s",
  "engine-swift-1",
  "legs-light-quad",
  "avionics-basic",
  "tank-kerolox-m",
  "tank-orbital-xl",
  "engine-vector-2",
  "engine-hawk-vac",
  "legs-heavy-triad",
  "heatshield-ablative",
  "reaction-wheel-r2",
  "science-bay-light",
  "radar-planetary",
]);
export const STARTER_SHIP_GRID = Object.freeze({
  columns: 12,
  rows: 16,
});
export const STARTER_SHIP_LAYOUT = Object.freeze([
  { id: "layout-reaction-wheel", partId: "reaction-wheel-r2", x: 3, y: 0 },
  { id: "layout-command", partId: "cmd-pioneer", x: 5, y: 0 },
  { id: "layout-radar", partId: "radar-planetary", x: 8, y: 0 },
  { id: "layout-heatshield", partId: "heatshield-ablative", x: 4, y: 2 },
  { id: "layout-avionics", partId: "avionics-basic", x: 8, y: 2 },
  { id: "layout-air-maker", partId: "air-maker-basic", x: 2, y: 3 },
  { id: "layout-water", partId: "water-tank-s", x: 4, y: 3 },
  { id: "layout-science", partId: "science-bay-light", x: 6, y: 3 },
  { id: "layout-fuel", partId: "tank-kerolox-s", x: 3, y: 5 },
  { id: "layout-medium-fuel", partId: "tank-kerolox-m", x: 5, y: 5 },
  { id: "layout-vac-engine", partId: "engine-hawk-vac", x: 8, y: 5 },
  { id: "layout-orbital-tank", partId: "tank-orbital-xl", x: 4, y: 9 },
  { id: "layout-vector-engine", partId: "engine-vector-2", x: 8, y: 9 },
  { id: "layout-engine", partId: "engine-swift-1", x: 8, y: 11 },
  { id: "layout-heavy-landing", partId: "legs-heavy-triad", x: 3, y: 14 },
  { id: "layout-landing", partId: "legs-light-quad", x: 8, y: 14 },
]);

export const STARTER_PLANET_IDS = Object.freeze([
  "homeworld",
  "ember",
  "brine",
  "vesper",
  "sable",
  "glint",
  "kelp",
  "frost",
  "aurelia",
]);
export const STARTER_RESOURCES = Object.freeze({
  oil: 0,
  iron: 0,
  copper: 0,
  ice: 0,
  water: 25,
});

export function createDefaultSaveData() {
  return {
    version: SAVE_DATA_VERSION,
    money: 25000,
    resources: { ...STARTER_RESOURCES },
    unlockedParts: [...STARTER_PART_IDS],
    discoveredPlanets: [...STARTER_PLANET_IDS],
    builtShips: [
      {
        id: "ship-pioneer-test-vehicle",
        name: "Pioneer Test Vehicle",
        grid: { ...STARTER_SHIP_GRID },
        layout: cloneLayout(STARTER_SHIP_LAYOUT),
        partIds: STARTER_SHIP_LAYOUT.map((part) => part.partId),
        stats: {
          dryMass: 9000,
          fuelMass: 16000,
          thrust: 1100000,
          dragCoefficient: 0.42,
          referenceArea: 9.6,
        },
      },
    ],
    activeShipId: "ship-pioneer-test-vehicle",
    activeMissionPlanetId: "ember",
    lastSavePoint: {
      planetId: "homeworld",
      planetName: "Homeworld",
      savedAt: null,
    },
    missionHistory: [],
  };
}

export function normalizeSaveData(candidate) {
  const fallback = createDefaultSaveData();

  if (!candidate || typeof candidate !== "object") {
    return fallback;
  }

  const builtShips = normalizeBuiltShips(candidate.builtShips, fallback.builtShips);
  const activeShipId = builtShips.some((ship) => ship.id === candidate.activeShipId)
    ? candidate.activeShipId
    : builtShips[0]?.id;

  return {
    version: SAVE_DATA_VERSION,
    money: normalizeMoney(candidate.money, fallback.money),
    resources: normalizeResourceInventory(candidate.resources, fallback.resources),
    unlockedParts: normalizeStringList(candidate.unlockedParts, fallback.unlockedParts),
    discoveredPlanets: normalizeStringList(
      candidate.discoveredPlanets,
      fallback.discoveredPlanets,
    ),
    builtShips,
    activeShipId,
    activeMissionPlanetId: normalizeMissionPlanetId(
      candidate.activeMissionPlanetId,
      fallback.activeMissionPlanetId,
      candidate.discoveredPlanets,
    ),
    lastSavePoint: normalizeLastSavePoint(candidate.lastSavePoint, fallback.lastSavePoint),
    missionHistory: Array.isArray(candidate.missionHistory)
      ? candidate.missionHistory.filter((entry) => entry && typeof entry === "object")
      : fallback.missionHistory,
  };
}

export function loadSaveData(storage = globalThis.localStorage) {
  if (!storage) {
    return createDefaultSaveData();
  }

  try {
    return normalizeSaveData(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)));
  } catch {
    return createDefaultSaveData();
  }
}

export function saveGameData(saveData, storage = globalThis.localStorage) {
  const normalized = normalizeSaveData(saveData);

  try {
    storage?.setItem(SAVE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    return normalized;
  }

  return normalized;
}

function normalizeMoney(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function normalizeStringList(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const uniqueValues = new Set(
    [...fallback, ...value].filter((item) => typeof item === "string" && item.length > 0),
  );

  return uniqueValues.size > 0 ? [...uniqueValues] : [...fallback];
}

function normalizeResourceInventory(value, fallback) {
  return RESOURCE_TYPES.reduce((resources, resourceType) => {
    const amount = value?.[resourceType];
    const fallbackAmount = fallback[resourceType] ?? 0;
    resources[resourceType] =
      Number.isFinite(amount) && amount >= 0 ? Math.floor(amount) : fallbackAmount;
    return resources;
  }, {});
}

function normalizeMissionPlanetId(value, fallback, discoveredPlanets) {
  const knownPlanets = normalizeStringList(discoveredPlanets, STARTER_PLANET_IDS);
  const fallbackPlanet = knownPlanets.find((planetId) => planetId !== "homeworld") ?? fallback;

  return typeof value === "string" && knownPlanets.includes(value) && value !== "homeworld"
    ? value
    : fallbackPlanet;
}

function normalizeLastSavePoint(value, fallback) {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }

  return {
    planetId:
      typeof value.planetId === "string" && value.planetId.length > 0
        ? value.planetId
        : fallback.planetId,
    planetName:
      typeof value.planetName === "string" && value.planetName.length > 0
        ? value.planetName
        : fallback.planetName,
    savedAt:
      typeof value.savedAt === "string" || value.savedAt === null
        ? value.savedAt
        : fallback.savedAt,
  };
}

function normalizeBuiltShips(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback.map((ship) => cloneShip(ship));
  }

  const ships = value
    .filter((ship) => ship && typeof ship === "object")
    .map((ship, index) => ({
      id:
        typeof ship.id === "string" && ship.id.length > 0
          ? ship.id
          : `generated-ship-${index + 1}`,
      name: typeof ship.name === "string" && ship.name.length > 0 ? ship.name : "Unnamed Ship",
      grid: normalizeShipGrid(ship.grid, fallback[index]?.grid ?? STARTER_SHIP_GRID),
      layout: normalizeShipLayout(ship.layout, fallback[index]?.layout ?? STARTER_SHIP_LAYOUT),
      partIds: normalizeStringList(
        ship.partIds,
        (fallback[index]?.layout ?? STARTER_SHIP_LAYOUT).map((part) => part.partId),
      ),
      stats: {
        dryMass: normalizePositiveNumber(ship.stats?.dryMass, 1),
        fuelMass: normalizePositiveNumber(ship.stats?.fuelMass, 0),
        thrust: normalizePositiveNumber(ship.stats?.thrust, 0),
        dragCoefficient: normalizePositiveNumber(ship.stats?.dragCoefficient, 0.3),
        referenceArea: normalizePositiveNumber(ship.stats?.referenceArea, 1),
      },
    }));

  return ships.length > 0 ? ships : fallback.map((ship) => cloneShip(ship));
}

function normalizePositiveNumber(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function cloneShip(ship) {
  return {
    ...ship,
    grid: { ...ship.grid },
    layout: cloneLayout(ship.layout),
    partIds: [...ship.partIds],
    stats: { ...ship.stats },
  };
}

function normalizeShipGrid(value, fallback) {
  const columns = Number.isFinite(value?.columns) ? Math.floor(value.columns) : fallback.columns;
  const rows = Number.isFinite(value?.rows) ? Math.floor(value.rows) : fallback.rows;

  return {
    columns: Math.max(6, columns),
    rows: Math.max(8, rows),
  };
}

function normalizeShipLayout(value, fallback) {
  if (!Array.isArray(value) || value.length === 0) {
    return cloneLayout(fallback);
  }

  const normalizedLayout = value
    .filter((part) => part && typeof part === "object" && typeof part.partId === "string")
    .map((part, index) => ({
      id:
        typeof part.id === "string" && part.id.length > 0
          ? part.id
          : `layout-part-${index + 1}`,
      partId: part.partId,
      x: normalizeGridPosition(part.x),
      y: normalizeGridPosition(part.y),
    }));

  return normalizedLayout.length > 0 ? normalizedLayout : cloneLayout(fallback);
}

function normalizeGridPosition(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function cloneLayout(layout) {
  return layout.map((part) => ({ ...part }));
}
