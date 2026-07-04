import { Application, Assets, Container, Graphics, Sprite, Text } from "pixi.js";
import "./styles.css";
import {
  RESOURCE_TYPES,
  STARTER_SHIP_GRID,
  createDefaultSaveData,
  loadSaveData,
  saveGameData,
} from "./data/saveData.js";
import {
  HOMEWORLD,
  STARTER_SHIP,
  TERMINAL_OUTCOMES,
  createLaunchState,
  orbitalSpeedAtAltitude,
  stepLaunch,
} from "./simulation/launchPhysics.js";

const canvasHost = document.querySelector("#game-canvas");
const saveData = saveGameData(loadSaveData());
const screenUi = {
  container: document.querySelector("#screen-panel"),
  tabs: [...document.querySelectorAll("[data-screen-target]")],
  cards: [...document.querySelectorAll("[data-screen-panel]")],
  shopMoney: document.querySelector("#shop-money"),
  shopParts: document.querySelector("#shop-parts"),
  builderShipName: document.querySelector("#builder-ship-name"),
  builderStatus: document.querySelector("#builder-status"),
  builderShipParts: document.querySelector("#builder-ship-parts"),
  builderGraph: document.querySelector("#builder-ship-graph"),
  travelPlanetCount: document.querySelector("#travel-planet-count"),
  travelPlanets: document.querySelector("#travel-planets"),
};
const hud = {
  root: document.querySelector("#hud"),
  missionTitle: document.querySelector("#mission-title"),
  missionStatus: document.querySelector("#mission-status"),
  missionTarget: document.querySelector("#mission-target"),
  savePoint: document.querySelector("#save-point"),
  saveButton: document.querySelector("#save-button"),
  saveResources: document.querySelector("#save-resources"),
  saveStatus: document.querySelector("#save-status"),
  altitude: document.querySelector("#altitude"),
  speed: document.querySelector("#speed"),
  fuel: document.querySelector("#fuel"),
  verticalSpeed: document.querySelector("#vertical-speed"),
  throttle: document.querySelector("#throttle"),
  steerLeft: document.querySelector("#steer-left"),
  steerRight: document.querySelector("#steer-right"),
  launchButton: document.querySelector("#launch-button"),
  resetButton: document.querySelector("#reset-button"),
  outcome: document.querySelector("#outcome"),
};
const resultUi = {
  panel: document.querySelector("#result-panel"),
  title: document.querySelector("#result-title"),
  summary: document.querySelector("#result-summary"),
  retryButton: document.querySelector("#retry-button"),
};
const landingNotification = {
  panel: document.querySelector("#landing-notification"),
  detail: document.querySelector("#landing-notification-detail"),
};

let state = createLaunchState();
let launchRequested = false;
let activeScreen = "launch";
const steering = new Set();
const fixedStep = 1 / 60;
let accumulator = 0;
let savePointStatus = "Ready";
let selectedBuilderPartId = null;
let selectedPlacedPartId = null;
let draggedBuilderPartId = null;
let draggedPlacedPartId = null;
let paintBrushSize = 0.16;
let activePaintStroke = null;
let builderStatusText = "Ready";
let lifeSupportStatusText = "Install an Air Maker";
let lifeSupportWaterCharged = false;
let unplacePartArmed = false;

const ROCKET_VISUAL_SCALE = 0.32;
const ROCKET_SURFACE_OFFSET = 26;
const HOMEWORLD_VIEW_SCALE = 0.0072;
const SHIP_CONTACT_RADIUS = ROCKET_SURFACE_OFFSET / HOMEWORLD_VIEW_SCALE;
const SHIP_DRAW_MAX_WIDTH = 96;
const SHIP_DRAW_MAX_HEIGHT = 136;
const SHIP_DRAW_MAX_CELL = 18;
const SHIP_DRAW_MIN_CELL = 6;
const MINIMAP_MARGIN = 16;
const HOMEWORLD_RETURN_TARGET_ALTITUDE = 500;

const SPACE_PLANET_SPECS = [
  {
    id: "ember",
    name: "Ember",
    detail: "Small red world",
    resources: ["iron", "copper"],
    worldX: 14000,
    worldY: 26000,
    physicalRadius: 4200,
    surfaceGravity: 3.8,
    atmosphereDensity: 0.08,
    atmosphereScaleHeight: 3600,
    atmosphereHeight: 14000,
    radius: 32,
    color: 0x9d5542,
    highlight: 0xd18861,
  },
  {
    id: "brine",
    name: "Brine",
    detail: "Blue-green atmosphere",
    resources: ["water", "copper"],
    worldX: -28000,
    worldY: 23000,
    physicalRadius: 5200,
    surfaceGravity: 5.4,
    atmosphereDensity: 0.9,
    atmosphereScaleHeight: 4200,
    atmosphereHeight: 18000,
    radius: 38,
    color: 0x4d8fa8,
    highlight: 0xb9e5e7,
  },
  {
    id: "vesper",
    name: "Vesper",
    detail: "Dim ringed planet",
    resources: ["ice", "iron"],
    worldX: -46000,
    worldY: 4000,
    physicalRadius: 5000,
    surfaceGravity: 2.7,
    radius: 46,
    color: 0x756d92,
    highlight: 0xc4bde0,
    ring: true,
  },
  {
    id: "sable",
    name: "Sable",
    detail: "Dark volcanic planet",
    resources: ["oil", "iron"],
    worldX: -32000,
    worldY: -21000,
    physicalRadius: 3600,
    surfaceGravity: 4.6,
    atmosphereDensity: 0.03,
    atmosphereScaleHeight: 3000,
    atmosphereHeight: 9000,
    radius: 30,
    color: 0x3d3941,
    highlight: 0x8e7c73,
  },
  {
    id: "glint",
    name: "Glint",
    detail: "Bright ice world",
    resources: ["ice", "copper"],
    worldX: 11000,
    worldY: -33000,
    physicalRadius: 2900,
    surfaceGravity: 1.6,
    radius: 24,
    color: 0xb8d6df,
    highlight: 0xf5fbff,
  },
  {
    id: "kelp",
    name: "Kelp",
    detail: "Green ocean world",
    resources: ["water", "oil"],
    worldX: 41000,
    worldY: -28000,
    physicalRadius: 4800,
    surfaceGravity: 4.9,
    atmosphereDensity: 0.7,
    atmosphereScaleHeight: 3900,
    atmosphereHeight: 16000,
    radius: 34,
    color: 0x397c65,
    highlight: 0x9bd6a8,
  },
  {
    id: "frost",
    name: "Frost",
    detail: "Small frozen moon",
    resources: ["ice", "water"],
    worldX: 54000,
    worldY: -7000,
    physicalRadius: 2600,
    surfaceGravity: 1.3,
    radius: 27,
    color: 0x9fb8d7,
    highlight: 0xe2f1ff,
  },
  {
    id: "aurelia",
    name: "Aurelia",
    detail: "Golden storm planet",
    resources: ["oil", "copper"],
    worldX: 44000,
    worldY: 36000,
    physicalRadius: 6200,
    surfaceGravity: 7.1,
    atmosphereDensity: 1.8,
    atmosphereScaleHeight: 6500,
    atmosphereHeight: 26000,
    radius: 39,
    color: 0xa8873f,
    highlight: 0xf2d070,
    ring: true,
  },
];
const SPACE_PLANETS = SPACE_PLANET_SPECS;
const HOMEWORLD_TARGET = {
  id: "homeworld",
  name: HOMEWORLD.name,
  detail: "Compact training world",
  resources: ["water"],
  worldX: 0,
  worldY: -HOMEWORLD.radius,
  physicalRadius: HOMEWORLD.radius,
  surfaceGravity: HOMEWORLD.surfaceGravity,
  atmosphereDensity: HOMEWORLD.atmosphereDensity,
  atmosphereScaleHeight: HOMEWORLD.atmosphereScaleHeight,
  atmosphereHeight: HOMEWORLD.atmosphereHeight,
};
let activeMissionPlanetId = normalizeMissionPlanetId(saveData.activeMissionPlanetId);
let missionTargetOptionSignature = "";
const MINIMAP_WORLD_RADIUS =
  Math.max(...SPACE_PLANETS.map((planet) => Math.hypot(planet.worldX, planet.worldY))) *
  1.16;
const GRAVITY_BODIES = [
  {
    id: "homeworld",
    name: HOMEWORLD.name,
    radius: HOMEWORLD.radius,
    collisionRadius: HOMEWORLD.radius + SHIP_CONTACT_RADIUS,
    surfaceGravity: HOMEWORLD.surfaceGravity,
    atmosphereDensity: HOMEWORLD.atmosphereDensity,
    atmosphereScaleHeight: HOMEWORLD.atmosphereScaleHeight,
    atmosphereHeight: HOMEWORLD.atmosphereHeight,
    worldX: 0,
    worldY: -HOMEWORLD.radius,
  },
  ...SPACE_PLANETS.map((planet) => ({
    id: planet.id,
    name: planet.name,
    radius: planet.physicalRadius,
    collisionRadius: planet.physicalRadius + SHIP_CONTACT_RADIUS,
    surfaceGravity: planet.surfaceGravity,
    atmosphereDensity: planet.atmosphereDensity ?? 0,
    atmosphereScaleHeight: planet.atmosphereScaleHeight ?? 1,
    atmosphereHeight: planet.atmosphereHeight ?? 0,
    worldX: planet.worldX,
    worldY: planet.worldY,
  })),
];

const PART_CATALOG = [
  {
    id: "cmd-pioneer",
    name: "Pioneer Command",
    detail: "Crew control, telemetry, guidance",
    category: "Command",
    cost: 2500,
    width: 2,
    height: 2,
    color: "#dbe8f3",
  },
  {
    id: "air-maker-basic",
    name: "Air Maker",
    detail: "Life support that turns stored water into breathable air.",
    category: "Life Support",
    cost: 1800,
    width: 2,
    height: 2,
    color: "#89e8bd",
    required: true,
    waterUse: 1,
  },
  {
    id: "water-tank-s",
    name: "Water Tank S",
    detail: "Stores water for the Air Maker.",
    category: "Water",
    cost: 800,
    width: 2,
    height: 2,
    color: "#6ed7ff",
  },
  {
    id: "tank-kerolox-s",
    name: "Kerolox Tank S",
    detail: "16,000 kg starter propellant",
    category: "Fuel",
    cost: 3200,
    width: 2,
    height: 4,
    color: "#f2c76e",
  },
  {
    id: "engine-swift-1",
    name: "Swift-1 Engine",
    detail: "510 kN liftoff thrust",
    category: "Engine",
    cost: 5000,
    width: 2,
    height: 2,
    color: "#d18861",
  },
  {
    id: "legs-light-quad",
    name: "Light Quad Legs",
    detail: "Starter landing stability",
    category: "Landing",
    cost: 1200,
    width: 4,
    height: 1,
    color: "#aebbc6",
  },
  {
    id: "avionics-basic",
    name: "Basic Avionics",
    detail: "Throttle and attitude control",
    category: "Avionics",
    cost: 1600,
    width: 2,
    height: 1,
    color: "#b8d6df",
  },
  {
    id: "tank-kerolox-m",
    name: "Kerolox Tank M",
    detail: "Adds more oil-fuel storage for longer launches.",
    category: "Fuel",
    cost: 4200,
    width: 3,
    height: 4,
    color: "#e9b94f",
  },
  {
    id: "tank-orbital-xl",
    name: "Orbital Tank XL",
    detail: "Heavy fuel tank for long trips between planets.",
    category: "Fuel",
    cost: 9800,
    width: 4,
    height: 5,
    color: "#d49b3d",
  },
  {
    id: "engine-vector-2",
    name: "Vector-2 Engine",
    detail: "Stronger sea-level thrust for high gravity liftoff.",
    category: "Engine",
    cost: 7600,
    width: 3,
    height: 2,
    color: "#e57d5f",
  },
  {
    id: "engine-hawk-vac",
    name: "Hawk Vacuum Engine",
    detail: "Efficient engine for steering and burns in space.",
    category: "Engine",
    cost: 6400,
    width: 2,
    height: 3,
    color: "#c96d85",
  },
  {
    id: "legs-heavy-triad",
    name: "Heavy Triad Legs",
    detail: "Wider landing stance for rough planet surfaces.",
    category: "Landing",
    cost: 3600,
    width: 5,
    height: 1,
    color: "#8fa0b2",
  },
  {
    id: "heatshield-ablative",
    name: "Ablative Heat Shield",
    detail: "Protects the ship in thicker atmospheres.",
    category: "Thermal",
    cost: 5200,
    width: 4,
    height: 1,
    color: "#9d5542",
  },
  {
    id: "reaction-wheel-r2",
    name: "R2 Reaction Wheel",
    detail: "Faster turning control without wasting fuel.",
    category: "Control",
    cost: 4800,
    width: 2,
    height: 2,
    color: "#9fb8d7",
  },
  {
    id: "science-bay-light",
    name: "Light Science Bay",
    detail: "Stores samples from planets and asteroid fields.",
    category: "Science",
    cost: 5800,
    width: 3,
    height: 2,
    color: "#c4bde0",
  },
  {
    id: "radar-planetary",
    name: "Planetary Radar",
    detail: "Improves planet scanning and landing approach data.",
    category: "Avionics",
    cost: 6900,
    width: 2,
    height: 2,
    color: "#9bd6a8",
  },
];
const partLabels = Object.fromEntries(PART_CATALOG.map((part) => [part.id, part]));
const PAINT_CATALOG = [
  {
    id: "paint-white",
    name: "White Paint",
    shortName: "white",
    color: "#f7fbff",
    cost: 300,
  },
  {
    id: "paint-red",
    name: "Red Paint",
    shortName: "red",
    color: "#d95b4a",
    cost: 350,
  },
  {
    id: "paint-blue",
    name: "Blue Paint",
    shortName: "blue",
    color: "#4d8fa8",
    cost: 350,
  },
  {
    id: "paint-green",
    name: "Green Paint",
    shortName: "green",
    color: "#397c65",
    cost: 350,
  },
  {
    id: "paint-yellow",
    name: "Yellow Paint",
    shortName: "yellow",
    color: "#f2c76e",
    cost: 400,
  },
  {
    id: "paint-orange",
    name: "Orange Paint",
    shortName: "orange",
    color: "#e88945",
    cost: 400,
  },
  {
    id: "paint-brown",
    name: "Brown Paint",
    shortName: "brown",
    color: "#6b3f25",
    cost: 450,
  },
  {
    id: "paint-black",
    name: "Black Paint",
    shortName: "black",
    color: "#24262d",
    cost: 500,
  },
];
const paintLabels = Object.fromEntries(PAINT_CATALOG.map((paint) => [paint.id, paint]));
const MIXED_PAINT_RECIPES = [
  {
    id: "paint-peach",
    name: "Peach Paint",
    shortName: "peach",
    color: "#f5b98b",
    ingredients: ["paint-orange", "paint-white"],
  },
];
const BUILDER_GRID_COLUMNS = STARTER_SHIP_GRID.columns;
const BUILDER_GRID_ROWS = STARTER_SHIP_GRID.rows;
const REQUIRED_LIFE_SUPPORT_PART_ID = "air-maker-basic";
const METAL_OUTLINE_ID = "metal-outline";
const METAL_PACK_SIZE = 12;
const METAL_PACK_COST = 1200;
const METAL_PIECES_PER_CELL = 2;
const PAINT_BRUSH_MIN_SIZE = 0.08;
const PAINT_BRUSH_MAX_SIZE = 0.72;
const PAINT_BRUSH_DEFAULT_SIZE = 0.16;
const PAINT_STROKE_SPACING = 0.06;

const planetLabels = {
  homeworld: {
    name: "Homeworld",
    detail: "Blue ocean world, breathable atmosphere. Resources: water.",
  },
  ember: {
    name: "Ember",
    detail: "Small red world. Resources: iron, copper.",
  },
  brine: {
    name: "Brine",
    detail: "Blue-green atmosphere. Resources: water, copper.",
  },
  vesper: {
    name: "Vesper",
    detail: "Dim ringed planet. Resources: ice, iron.",
  },
  sable: {
    name: "Sable",
    detail: "Dark volcanic planet. Resources: oil, iron.",
  },
  glint: {
    name: "Glint",
    detail: "Bright ice world. Resources: ice, copper.",
  },
  kelp: {
    name: "Kelp",
    detail: "Green ocean world. Resources: water, oil.",
  },
  frost: {
    name: "Frost",
    detail: "Small frozen moon. Resources: ice, water.",
  },
  aurelia: {
    name: "Aurelia",
    detail: "Golden storm planet. Resources: oil, copper.",
  },
};

const app = new Application();
await app.init({
  resizeTo: window,
  backgroundAlpha: 0,
  antialias: true,
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
});

canvasHost.append(app.canvas);

const explosionTexture = await Assets.load(`${import.meta.env.BASE_URL}assets/explosion.png`);
const scene = new Container();
const backgroundLayer = new Container();
const worldLayer = new Container();
const vehicleLayer = new Container();
const overlayLayer = new Container();
scene.addChild(backgroundLayer, worldLayer, vehicleLayer, overlayLayer);
app.stage.addChild(scene);

const background = new Graphics();
const stars = new Graphics();
const distantWorlds = new Graphics();
const planet = new Graphics();
const spacePlanets = new Graphics();
const launchPad = new Graphics();
const rocket = new Container();
const plume = new Graphics();
const shipBody = new Graphics();
const explosion = new Sprite(explosionTexture);
const minimap = new Graphics();
const trajectoryText = new Text({
  text: "",
  style: {
    fill: "#b9dff7",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 14,
  },
});

backgroundLayer.addChild(background, stars, distantWorlds);
worldLayer.addChild(planet, spacePlanets, launchPad);
rocket.addChild(plume, shipBody);
explosion.anchor.set(0.5);
explosion.visible = false;
explosion.blendMode = "screen";
vehicleLayer.addChild(rocket, explosion);
overlayLayer.addChild(trajectoryText);

const planetDistanceLabels = SPACE_PLANETS.map((spacePlanet) =>
  createPlanetDistanceLabel(spacePlanet.name),
);
const minimapPlanetLabels = SPACE_PLANETS.map((spacePlanet) =>
  createMinimapLabel(spacePlanet.name.slice(0, 1)),
);
const minimapHomeLabel = createMinimapLabel("H");
overlayLayer.addChild(
  ...planetDistanceLabels,
  minimap,
  ...minimapPlanetLabels,
  minimapHomeLabel,
);

renderPlaceholderScreens(saveData);
setupMissionTargetPicker();
setupScreenNavigation();
switchScreen("launch");

function resetFlight() {
  state = createLaunchState();
  launchRequested = false;
  lifeSupportWaterCharged = false;
  lifeSupportStatusText = lifeSupportStatusFor(activeShipFor()).message;
  steering.clear();
  hud.throttle.value = "72";
  resultUi.panel.hidden = true;
  landingNotification.panel.hidden = true;
  renderPlaceholderScreens(saveData);
}

function resetProgress() {
  Object.assign(saveData, saveGameData(createDefaultSaveData()));
  activeMissionPlanetId = normalizeMissionPlanetId(saveData.activeMissionPlanetId);
  missionTargetOptionSignature = "";
  savePointStatus = "Progress reset";
  selectedBuilderPartId = null;
  selectedPlacedPartId = null;
  draggedBuilderPartId = null;
  draggedPlacedPartId = null;
  activePaintStroke = null;
  builderStatusText = "Ready";
  unplacePartArmed = false;
  resetFlight();
}

hud.launchButton.addEventListener("click", () => {
  requestLaunch();
});

hud.resetButton.addEventListener("click", resetProgress);
hud.saveButton.addEventListener("click", saveAtHomeworld);
resultUi.retryButton.addEventListener("click", resetFlight);
bindSteerButton(hud.steerLeft, "ArrowLeft");
bindSteerButton(hud.steerRight, "ArrowRight");

const blockedThrottleKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

window.addEventListener("keydown", (event) => {
  if (activeScreen === "builder" && event.key.toLowerCase() === "r") {
    event.preventDefault();
    rotateSelectedPlacedPart();
    return;
  }

  if (activeScreen === "builder" && event.key.toLowerCase() === "u") {
    event.preventDefault();
    armUnplacePart();
    return;
  }

  if (blockedThrottleKeys.has(event.key) && activeScreen === "launch") {
    event.preventDefault();
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    steering.add(event.key);
  }

  if (event.code === "Space") {
    requestLaunch();
  }
});

window.addEventListener("keyup", (event) => {
  steering.delete(event.key);
});

app.ticker.add((ticker) => {
  if (activeScreen === "launch") {
    accumulator += Math.min(ticker.deltaMS / 1000, 0.12);

    while (accumulator >= fixedStep) {
      state = stepLaunch(
        state,
        collectInput(),
        fixedStep,
        STARTER_SHIP,
        HOMEWORLD,
        GRAVITY_BODIES,
      );
      launchRequested = false;
      accumulator -= fixedStep;
    }
  } else {
    launchRequested = false;
    accumulator = 0;
  }

  render();
});

render();
document.documentElement.dataset.appReady = "true";

function collectInput() {
  const left = steering.has("ArrowLeft") ? -1 : 0;
  const right = steering.has("ArrowRight") ? 1 : 0;

  if (launchRequested && !state.launched) {
    launchRequested = chargeLifeSupportForLaunch();
  }

  return {
    launch: launchRequested,
    throttle: Number(hud.throttle.value) / 100,
    turnRate: left + right,
  };
}

function requestLaunch() {
  launchRequested = true;
  resultUi.panel.hidden = true;
  landingNotification.panel.hidden = true;
}

function bindSteerButton(button, key) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    steering.add(key);
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, () => {
      steering.delete(key);
    });
  }
}

function setupScreenNavigation() {
  for (const tab of screenUi.tabs) {
    tab.addEventListener("click", () => {
      switchScreen(tab.dataset.screenTarget);
    });
  }
}

function setupMissionTargetPicker() {
  refreshMissionTargetPicker();

  hud.missionTarget.addEventListener("change", () => {
    activeMissionPlanetId = normalizeMissionPlanetId(hud.missionTarget.value);
    hud.missionTarget.value = activeMissionPlanetId;
    saveSelectedMissionPlanet();
    updateHud();
  });
}

function refreshMissionTargetPicker() {
  const options = missionTargetOptions();
  const optionSignature = options.map((planet) => planet.id).join("|");
  const normalizedMissionPlanetId = normalizeMissionPlanetId(
    activeMissionPlanetId,
    options,
  );

  if (optionSignature !== missionTargetOptionSignature) {
    hud.missionTarget.replaceChildren(
      ...options.map((planet) => {
        const option = document.createElement("option");
        option.value = planet.id;
        option.textContent = planet.name;
        return option;
      }),
    );
    missionTargetOptionSignature = optionSignature;
  }

  if (activeMissionPlanetId !== normalizedMissionPlanetId) {
    activeMissionPlanetId = normalizedMissionPlanetId;
    saveSelectedMissionPlanet();
  }

  hud.missionTarget.value = activeMissionPlanetId;
}

function missionTargetOptions() {
  const discoveredPlanets = new Set(saveData.discoveredPlanets);
  const options = SPACE_PLANETS.filter((planet) => discoveredPlanets.has(planet.id));
  const canReturnToHomeworld =
    hasLeftHomeworld() && discoveredPlanets.has(HOMEWORLD_TARGET.id);

  if (canReturnToHomeworld) {
    return [HOMEWORLD_TARGET, ...options];
  }

  return options.length > 0 ? options : SPACE_PLANETS;
}

function hasLeftHomeworld() {
  const displayedAltitude = state.surfaceAltitude ?? state.altitude;

  return (
    state.launched &&
    (displayedAltitude > HOMEWORLD_RETURN_TARGET_ALTITUDE ||
      state.gravitySource !== HOMEWORLD.name)
  );
}

function normalizeMissionPlanetId(planetId, options = missionTargetOptions()) {
  const fallback = options[0] ?? SPACE_PLANETS[0];

  return options.some((planet) => planet.id === planetId) ? planetId : fallback.id;
}

function selectedMissionPlanet() {
  return (
    [HOMEWORLD_TARGET, ...SPACE_PLANETS].find(
      (planet) => planet.id === activeMissionPlanetId,
    ) ??
    missionTargetOptions()[0]
  );
}

function saveSelectedMissionPlanet() {
  saveData.activeMissionPlanetId = activeMissionPlanetId;
  Object.assign(saveData, saveGameData(saveData));
}

function saveAtHomeworld() {
  if (!isAtHomeworldSavePoint()) {
    savePointStatus = "Return to Homeworld";
    updateSavePoint();
    return;
  }

  saveData.activeMissionPlanetId = activeMissionPlanetId;
  saveData.lastSavePoint = {
    planetId: HOMEWORLD_TARGET.id,
    planetName: HOMEWORLD.name,
    savedAt: new Date().toISOString(),
  };
  Object.assign(saveData, saveGameData(saveData));
  savePointStatus = "Saved at Homeworld";
  renderPlaceholderScreens(saveData);
  updateSavePoint();
}

function buyPart(partId) {
  const part = partLabels[partId];

  if (!part || saveData.unlockedParts.includes(partId) || !isAtHomeworldSavePoint()) {
    renderPlaceholderScreens(saveData);
    return;
  }

  if (saveData.money < part.cost) {
    builderStatusText = "Not enough credits";
    renderPlaceholderScreens(saveData);
    return;
  }

  saveData.money -= part.cost;
  saveData.unlockedParts.push(partId);
  selectedBuilderPartId = partId;
  selectedPlacedPartId = null;
  builderStatusText = `Bought ${part.name}`;
  Object.assign(saveData, saveGameData(saveData));
  renderPlaceholderScreens(saveData);
}

function buyMetal() {
  if (!isAtHomeworldSavePoint()) {
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  if (saveData.money < METAL_PACK_COST) {
    builderStatusText = "Not enough credits";
    renderPlaceholderScreens(saveData);
    return;
  }

  saveData.money -= METAL_PACK_COST;
  saveData.resources.metal = (saveData.resources.metal ?? 0) + METAL_PACK_SIZE;
  selectedBuilderPartId = METAL_OUTLINE_ID;
  selectedPlacedPartId = null;
  builderStatusText = `Bought ${METAL_PACK_SIZE} metal`;
  Object.assign(saveData, saveGameData(saveData));
  renderPlaceholderScreens(saveData);
}

function buyPaint(paintId) {
  const paint = paintLabels[paintId];

  if (!paint || saveData.unlockedPaints.includes(paint.id) || !isAtHomeworldSavePoint()) {
    renderPlaceholderScreens(saveData);
    return;
  }

  if (saveData.money < paint.cost) {
    builderStatusText = "Not enough credits";
    renderPlaceholderScreens(saveData);
    return;
  }

  saveData.money -= paint.cost;
  saveData.unlockedPaints.push(paint.id);
  selectedBuilderPartId = paint.id;
  selectedPlacedPartId = null;
  builderStatusText = `Bought ${paint.name}`;
  Object.assign(saveData, saveGameData(saveData));
  renderPlaceholderScreens(saveData);
}

function switchScreen(screenId) {
  activeScreen = screenId;
  if (screenId !== "builder") {
    unplacePartArmed = false;
  }
  screenUi.container.dataset.activeScreen = screenId;
  hud.root.hidden = screenId !== "launch";
  screenUi.container.hidden = screenId === "launch";
  resultUi.panel.hidden = screenId !== "launch" || !shouldShowResultPanel();
  updateLandingNotification();

  for (const tab of screenUi.tabs) {
    tab.setAttribute("aria-pressed", String(tab.dataset.screenTarget === screenId));
  }

  for (const card of screenUi.cards) {
    card.hidden = card.dataset.screenPanel !== screenId;
  }

  renderPlaceholderScreens(saveData);
}

function renderPlaceholderScreens(data) {
  const activeShip = activeShipFor(data);
  lifeSupportStatusText = lifeSupportStatusFor(activeShip).message;
  const metalAmount = data.resources.metal ?? 0;
  const paintCount = data.unlockedPaints.length;

  screenUi.shopMoney.textContent = `${data.money.toLocaleString()} credits | Metal ${metalAmount} | Paints ${paintCount}`;
  screenUi.builderShipName.textContent = activeShip?.name ?? "No Ship";
  screenUi.travelPlanetCount.textContent = `${data.discoveredPlanets.length} world${
    data.discoveredPlanets.length === 1 ? "" : "s"
  }`;

  const canShop = isAtHomeworldSavePoint();
  replaceList(screenUi.shopParts, [
    {
      partId: METAL_OUTLINE_ID,
      label: "Ship Outline",
      name: "Metal Pack",
      detail: `${METAL_PACK_SIZE} metal lines | ${METAL_PACK_COST.toLocaleString()} credits. Place parts first, then seal their graph cells with metal lines.`,
      buttonLabel: "Buy",
      buttonDisabled: !canShop || data.money < METAL_PACK_COST,
      buttonTitle: partsBayButtonTitle(false, canShop, data.money >= METAL_PACK_COST),
      onAction: buyMetal,
    },
    ...PAINT_CATALOG.map((paint) => {
      const isOwned = data.unlockedPaints.includes(paint.id);
      const canAfford = data.money >= paint.cost;

      return {
        partId: paint.id,
        label: isOwned ? "Owned | Paint" : "Paint",
        name: paint.name,
        detail: `${paint.cost.toLocaleString()} credits. Paint placed ship parts ${paint.shortName}.`,
        buttonLabel: isOwned ? "Owned" : "Buy",
        buttonDisabled: isOwned || !canShop || !canAfford,
        buttonTitle: partsBayButtonTitle(isOwned, canShop, canAfford),
        onAction: () => buyPaint(paint.id),
      };
    }),
    ...PART_CATALOG.map((part) => {
      const isOwned = data.unlockedParts.includes(part.id);
      const canAfford = data.money >= part.cost;

      return {
        partId: part.id,
        label: isOwned ? `Owned | ${part.category}` : part.category,
        name: part.name,
        detail: `${formatPartFootprint(part)} | ${part.cost.toLocaleString()} credits. ${
          part.required ? `${part.detail} Required for launch.` : part.detail
        }`,
        buttonLabel: isOwned ? "Owned" : "Buy",
        buttonDisabled: isOwned || !canShop || !canAfford,
        buttonTitle: partsBayButtonTitle(isOwned, canShop, canAfford),
        onAction: () => buyPart(part.id),
      };
    }),
  ]);

  renderBuilder(activeShip);

  replaceList(
    screenUi.travelPlanets,
    data.discoveredPlanets.map((planetId) => {
      const knownWorld = planetLabels[planetId] ?? {
        name: planetId,
        detail: "Known world",
      };
      return {
        label: "Known World",
        name: knownWorld.name,
        detail: knownWorld.detail,
      };
    }),
  );
}

function renderBuilder(activeShip) {
  const canBuild = isAtHomeworldSavePoint();
  const availableParts = saveData.unlockedParts
    .map((partId) => partLabels[partId])
    .filter(Boolean);
  const availablePaints = paintOptionsForSave(saveData);
  const lifeSupport = lifeSupportStatusFor(activeShip);
  const metalAmount = saveData.resources.metal ?? 0;
  const metalLines = metalPiecesForShip(activeShip).total;
  const paintBrush = paintBrushForSelection();
  const statusText =
    builderStatusText === "Ready"
      ? `${lifeSupport.message} | Metal ${metalAmount} | Ship metal ${metalLines} lines | ${availablePaints.length} paints | ${availableParts.length} owned parts`
      : builderStatusText;

  screenUi.builderStatus.textContent = canBuild ? statusText : "Return to Homeworld";
  screenUi.builderShipParts.replaceChildren(
    createMetalOutlineItem(canBuild),
    ...(paintBrush ? [createBrushSizeControl(paintBrush, canBuild)] : []),
    ...availablePaints.map((paint) => createBuilderPaintItem(paint, canBuild)),
    ...availableParts.map((part) => createBuilderPartItem(part, canBuild)),
  );
  screenUi.builderGraph.replaceChildren(createShipGrid(activeShip, canBuild));
}

function createMetalOutlineItem(canBuild) {
  const item = document.createElement("button");
  const category = document.createElement("span");
  const name = document.createElement("strong");
  const detail = document.createElement("small");
  const metalAmount = saveData.resources.metal ?? 0;

  item.className = "builder-part builder-part-metal";
  item.type = "button";
  item.draggable = canBuild;
  item.dataset.builderPart = METAL_OUTLINE_ID;
  item.dataset.category = "Outline";
  item.setAttribute("aria-label", "Metal Line, one seal line");
  category.textContent = "Outline | 1 line";
  name.textContent = "Metal Line";
  detail.textContent = `${metalAmount} metal ready. Add 2 lines to seal one occupied block.`;
  item.append(category, name, detail);

  if (selectedBuilderPartId === METAL_OUTLINE_ID) {
    item.classList.add("is-selected");
  }

  item.addEventListener("click", () => {
    selectedBuilderPartId = METAL_OUTLINE_ID;
    selectedPlacedPartId = null;
    unplacePartArmed = false;
    builderStatusText = metalAmount > 0 ? "Metal Line selected" : "Buy metal in Parts Bay";
    renderPlaceholderScreens(saveData);
  });
  item.addEventListener("dragstart", (event) => {
    draggedBuilderPartId = METAL_OUTLINE_ID;
    draggedPlacedPartId = null;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", `part:${METAL_OUTLINE_ID}`);
  });
  item.addEventListener("dragend", () => {
    draggedBuilderPartId = null;
  });

  return item;
}

function createBuilderPaintItem(paint, canBuild) {
  const item = document.createElement("button");
  const category = document.createElement("span");
  const name = document.createElement("strong");
  const detail = document.createElement("small");
  const swatch = document.createElement("i");

  item.className = "builder-part builder-part-paint";
  item.type = "button";
  item.draggable = canBuild;
  item.dataset.builderPart = paint.id;
  item.dataset.paintId = paint.id;
  item.dataset.category = "Paint";
  item.setAttribute("aria-label", `${paint.name}, paint color`);
  item.style.setProperty("--paint-color", paint.color);
  category.textContent = paint.ingredients ? "Paint | mixed" : "Paint | color";
  swatch.className = "paint-swatch";
  swatch.setAttribute("aria-hidden", "true");
  name.textContent = paint.name;
  detail.textContent = paint.ingredients
    ? "Mixed from owned colors. Drag across placed blocks."
    : "Drag across placed blocks to paint.";
  name.prepend(swatch);
  item.append(category, name, detail);

  if (selectedBuilderPartId === paint.id) {
    item.classList.add("is-selected");
  }

  item.addEventListener("click", () => {
    selectedBuilderPartId = paint.id;
    selectedPlacedPartId = null;
    unplacePartArmed = false;
    builderStatusText = `${paint.name} selected`;
    renderPlaceholderScreens(saveData);
  });
  item.addEventListener("dragstart", (event) => {
    draggedBuilderPartId = paint.id;
    draggedPlacedPartId = null;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", `paint:${paint.id}`);
  });
  item.addEventListener("dragend", () => {
    draggedBuilderPartId = null;
  });

  return item;
}

function createBrushSizeControl(paint, canBuild) {
  const control = document.createElement("label");
  const header = document.createElement("span");
  const row = document.createElement("span");
  const name = document.createElement("strong");
  const value = document.createElement("small");
  const input = document.createElement("input");

  control.className = "builder-brush-control";
  control.style.setProperty("--paint-color", paint.color);
  header.textContent = "Paintbrush";
  row.className = "builder-brush-row";
  name.textContent = "Brush Size";
  value.textContent = paintBrushSizeLabel();
  input.type = "range";
  input.min = String(Math.round(PAINT_BRUSH_MIN_SIZE * 100));
  input.max = String(Math.round(PAINT_BRUSH_MAX_SIZE * 100));
  input.step = "1";
  input.value = String(Math.round(paintBrushSize * 100));
  input.disabled = !canBuild;
  input.setAttribute("aria-label", "Brush size");
  input.addEventListener("input", () => {
    paintBrushSize = normalizePaintBrushSize(Number(input.value) / 100);
    value.textContent = paintBrushSizeLabel();
    builderStatusText = `${paint.name} brush ${paintBrushSizeLabel()}`;
    screenUi.builderStatus.textContent = builderStatusText;
  });

  row.append(name, value);
  control.append(header, row, input);

  return control;
}

function createBuilderPartItem(part, canBuild) {
  const item = document.createElement("button");
  const category = document.createElement("span");
  const name = document.createElement("strong");
  const detail = document.createElement("small");

  item.className = "builder-part";
  item.type = "button";
  item.draggable = canBuild;
  item.dataset.builderPart = part.id;
  item.dataset.category = part.category;
  item.setAttribute("aria-label", `${part.name}, ${part.category}`);
  category.textContent = `${part.category} | ${formatPartFootprint(part)}`;
  name.textContent = part.name;
  detail.textContent = `${metalRequirementText(part)} ${part.required ? `${part.detail} Required.` : part.detail}`;
  item.append(category, name, detail);

  if (selectedBuilderPartId === part.id) {
    item.classList.add("is-selected");
  }

  item.addEventListener("click", () => {
    selectedBuilderPartId = part.id;
    selectedPlacedPartId = null;
    unplacePartArmed = false;
    builderStatusText = `${part.name}: ${metalRequirementText(part)}`;
    renderPlaceholderScreens(saveData);
  });
  item.addEventListener("dragstart", (event) => {
    draggedBuilderPartId = part.id;
    draggedPlacedPartId = null;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", `part:${part.id}`);
  });
  item.addEventListener("dragend", () => {
    draggedBuilderPartId = null;
  });

  return item;
}

function activeShipFor(data = saveData) {
  return data.builtShips.find((ship) => ship.id === data.activeShipId) ?? data.builtShips[0];
}

function createShipGrid(activeShip, canBuild) {
  const frame = document.createElement("div");
  const paper = document.createElement("div");
  const ship = document.createElement("div");
  const cells = document.createElement("div");
  const parts = document.createElement("div");
  const metal = document.createElement("div");
  const grid = gridForShip(activeShip);
  const layout = layoutForShip(activeShip);
  const metalPieces = metalPiecesForShip(activeShip);

  frame.className = "builder-grid-frame";
  frame.style.setProperty("--builder-cols", String(grid.columns));
  frame.style.setProperty("--builder-rows", String(grid.rows));
  paper.className = "builder-grid-paper";
  ship.className = "builder-ship-outline";
  cells.className = "builder-grid-cells";
  parts.className = "builder-grid-parts";
  metal.className = "builder-grid-metal";

  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < grid.columns; x += 1) {
      cells.append(createBuilderCell(x, y, canBuild, metalPieces.counts.get(`${x},${y}`) ?? 0));
    }
  }

  for (const placedPart of layout) {
    const part = partLabels[placedPart.partId];

    if (part) {
      parts.append(createPlacedGridPart(placedPart, part, canBuild));
    }
  }

  for (const [cellKey, pieceCount] of metalPieces.counts) {
    const [x, y] = cellKey.split(",").map((position) => Number(position));
    metal.append(createMetalGridLine(x, y, pieceCount));
  }

  frame.addEventListener("dragover", (event) => {
    event.preventDefault();
    frame.classList.add("is-drop-target");
  });
  frame.addEventListener("dragleave", (event) => {
    if (!frame.contains(event.relatedTarget)) {
      frame.classList.remove("is-drop-target");
    }
  });
  frame.addEventListener("drop", (event) => {
    event.preventDefault();
    frame.classList.remove("is-drop-target");
    const cell = cellFromPointer(event, frame, grid);
    placeDroppedBuilderItem(event.dataTransfer.getData("text/plain"), cell.x, cell.y);
  });
  frame.append(paper, ship, cells, parts, metal);

  return frame;
}

function createBuilderCell(x, y, canBuild, metalPieceCount) {
  const cell = document.createElement("button");

  cell.className = "builder-grid-cell";
  if (metalPieceCount > 0) {
    cell.classList.add("has-metal");
  }
  if (metalPieceCount > 0 && unplacePartArmed) {
    cell.classList.add("is-unplace-target");
  }
  cell.type = "button";
  cell.disabled = !canBuild;
  cell.dataset.builderCell = `${x},${y}`;
  cell.style.gridColumn = `${x + 1}`;
  cell.style.gridRow = `${y + 1}`;
  cell.setAttribute("aria-label", `Ship grid cell ${x + 1}, ${y + 1}`);
  cell.addEventListener("click", () => {
    placeBuilderSelectionAt(x, y);
  });

  return cell;
}

function createMetalGridLine(x, y, pieceCount) {
  const line = document.createElement("div");

  line.className = "builder-metal-line";
  line.classList.add(pieceCount >= METAL_PIECES_PER_CELL ? "is-sealed" : "is-half-sealed");
  line.style.setProperty("--metal-x", x);
  line.style.setProperty("--metal-y", y);
  line.setAttribute("aria-hidden", "true");

  return line;
}

function createPaintLayer(placedPart, part) {
  const layer = document.createElement("div");
  const size = rotatedPartSize(part, placedPart.rotation);

  layer.className = "builder-grid-part-paint-layer";
  layer.style.setProperty("--paint-cell-cols", size.width);
  layer.style.setProperty("--paint-cell-rows", size.height);
  layer.setAttribute("aria-hidden", "true");

  for (const [cellKey, paint] of Object.entries(paintCellsForPlacedPart(placedPart))) {
    const [x, y] = cellKey.split(",").map((position) => Number(position));

    if (x >= 0 && y >= 0 && x < size.width && y < size.height) {
      layer.append(createLegacyPaintCellNode(x, y, paint));
    }
  }

  for (const stroke of paintStrokesForPlacedPart(placedPart)) {
    if (stroke.x >= 0 && stroke.y >= 0 && stroke.x <= size.width && stroke.y <= size.height) {
      layer.append(createPaintStrokeNode(stroke));
    }
  }

  return layer;
}

function createLegacyPaintCellNode(x, y, paint) {
  const cell = document.createElement("div");

  cell.className = "builder-grid-part-paint-cell";
  cell.dataset.paintCell = `${x},${y}`;
  cell.style.gridColumn = `${x + 1}`;
  cell.style.gridRow = `${y + 1}`;
  cell.style.background = paint.color;

  return cell;
}

function createPaintStrokeNode(stroke) {
  const mark = document.createElement("i");

  mark.className = "builder-grid-part-paint-stroke";
  mark.style.setProperty("--stroke-x", stroke.x);
  mark.style.setProperty("--stroke-y", stroke.y);
  mark.style.setProperty("--stroke-size", stroke.size);
  mark.style.setProperty("--stroke-color", stroke.color);

  return mark;
}

function createPlacedGridPart(placedPart, part, canBuild) {
  const node = document.createElement("button");
  const category = document.createElement("span");
  const name = document.createElement("strong");
  const detail = document.createElement("small");
  const size = rotatedPartSize(part, placedPart.rotation);
  const paint = paintForPlacedPart(placedPart);
  const paintBrush = paintBrushForSelection();

  node.className = "builder-grid-part";
  node.type = "button";
  node.draggable = canBuild && !paintBrush;
  node.dataset.placedPart = placedPart.partId;
  node.dataset.placedId = placedPart.id;
  node.dataset.rotation = String(placedPart.rotation ?? 0);
  node.style.setProperty("--part-x", placedPart.x);
  node.style.setProperty("--part-y", placedPart.y);
  node.style.setProperty("--part-width", size.width);
  node.style.setProperty("--part-height", size.height);
  node.style.setProperty("--part-color", paint.color);
  node.setAttribute("aria-label", `${part.name}, placed on grid`);
  category.textContent = `${part.category} | ${formatPartFootprint(part, placedPart.rotation)}`;
  name.textContent = part.name;
  detail.textContent = `${placedPartSealText(placedPart, part)} | ${placedPartPaintSummary(placedPart, paint)}`;
  node.append(createPaintLayer(placedPart, part), category, name, detail);

  if (placedPart.id === selectedPlacedPartId) {
    node.classList.add("is-selected");
  }

  if (unplacePartArmed) {
    node.classList.add("is-unplace-target");
  }

  if (paintBrush) {
    node.classList.add("is-paint-target");
  }

  if (size.height <= 1 || size.width <= 2) {
    node.classList.add("is-compact");
  }

  node.addEventListener("click", (event) => {
    const pointedCell = cellFromPlacedPartPointer(event, placedPart, part);

    if (unplacePartArmed) {
      if (pointedCell && metalPieceCountForCell(activeShipFor(), pointedCell.x, pointedCell.y) > 0) {
        unplaceHullCell(pointedCell.x, pointedCell.y);
        return;
      }

      unplacePlacedPart(placedPart.id);
      return;
    }

    if (selectedBuilderPartId === METAL_OUTLINE_ID && pointedCell) {
      buildHullCell(pointedCell.x, pointedCell.y);
      return;
    }

    if (paintBrushForSelection()) {
      paintPlacedPartStrokeFromEvent(event, placedPart, part);
      return;
    }

    selectedBuilderPartId = part.id;
    selectedPlacedPartId = placedPart.id;
    builderStatusText = `${part.name} selected`;
    renderPlaceholderScreens(saveData);
  });
  node.addEventListener("dragstart", (event) => {
    selectedBuilderPartId = part.id;
    selectedPlacedPartId = placedPart.id;
    draggedBuilderPartId = null;
    draggedPlacedPartId = placedPart.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `placed:${placedPart.id}`);
  });
  node.addEventListener("dragend", () => {
    draggedPlacedPartId = null;
  });
  node.addEventListener("pointerdown", (event) => {
    if (!paintBrushForSelection()) {
      return;
    }

    event.preventDefault();
    try {
      node.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events in tests may not be captureable.
    }
    activePaintStroke = {
      placedPartId: placedPart.id,
      lastPoint: null,
    };
    paintPlacedPartStrokeFromEvent(event, placedPart, part, { render: false });
  });
  node.addEventListener("pointermove", (event) => {
    if (!paintBrushForSelection() || event.buttons !== 1) {
      return;
    }

    event.preventDefault();
    paintPlacedPartStrokeFromEvent(event, placedPart, part, { render: false });
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    node.addEventListener(eventName, () => {
      activePaintStroke = null;
      if (paintBrushForSelection()) {
        renderPlaceholderScreens(saveData);
      }
    });
  }

  return node;
}

function placeDroppedBuilderItem(dataTransferValue, x, y) {
  if (dataTransferValue?.startsWith("placed:")) {
    movePlacedPartToGrid(dataTransferValue.slice("placed:".length), x, y);
    return;
  }

  if (dataTransferValue?.startsWith("part:")) {
    const partId = dataTransferValue.slice("part:".length);

    if (partId === METAL_OUTLINE_ID) {
      buildHullCell(x, y);
      return;
    }

    placePartOnGrid(partId, x, y);
    return;
  }

  if (dataTransferValue?.startsWith("paint:")) {
    paintPlacedPartAtCell(dataTransferValue.slice("paint:".length), x, y);
    return;
  }

  if (draggedPlacedPartId) {
    movePlacedPartToGrid(draggedPlacedPartId, x, y);
    return;
  }

  if (draggedBuilderPartId) {
    if (draggedBuilderPartId === METAL_OUTLINE_ID) {
      buildHullCell(x, y);
      return;
    }

    if (paintOptionForId(draggedBuilderPartId)) {
      paintPlacedPartAtCell(draggedBuilderPartId, x, y);
      return;
    }

    placePartOnGrid(draggedBuilderPartId, x, y);
  }
}

function placeBuilderSelectionAt(x, y) {
  if (unplacePartArmed) {
    unplaceHullCell(x, y);
    return;
  }

  if (selectedPlacedPartId) {
    movePlacedPartToGrid(selectedPlacedPartId, x, y);
    return;
  }

  if (selectedBuilderPartId) {
    if (selectedBuilderPartId === METAL_OUTLINE_ID) {
      buildHullCell(x, y);
      return;
    }

    if (paintBrushForSelection()) {
      paintPlacedPartAtCell(selectedBuilderPartId, x, y);
      return;
    }

    placePartOnGrid(selectedBuilderPartId, x, y);
  }
}

function buildHullCell(x, y) {
  const activeShip = activeShipFor();

  if (!activeShip) {
    return;
  }

  if (!isAtHomeworldSavePoint()) {
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  const grid = gridForShip(activeShip);

  if (x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) {
    builderStatusText = "Metal does not fit there";
    renderPlaceholderScreens(saveData);
    return;
  }

  const cellKey = `${x},${y}`;
  activeShip.hullCells = Array.isArray(activeShip.hullCells) ? activeShip.hullCells : [];

  const placedPart = placedPartAtCell(activeShip, cellKey);

  if (!placedPart) {
    builderStatusText = "Place a part first";
    renderPlaceholderScreens(saveData);
    return;
  }

  const metalPieceCount = metalPieceCountForCell(activeShip, x, y);

  if (metalPieceCount >= METAL_PIECES_PER_CELL) {
    builderStatusText = "That block is already sealed";
    renderPlaceholderScreens(saveData);
    return;
  }

  if ((saveData.resources.metal ?? 0) <= 0) {
    builderStatusText = "Buy metal in Parts Bay";
    renderPlaceholderScreens(saveData);
    return;
  }

  saveData.resources.metal -= 1;
  activeShip.hullCells = [...activeShip.hullCells, metalPieceKeyForCell(activeShip, cellKey)];
  selectedBuilderPartId = METAL_OUTLINE_ID;
  selectedPlacedPartId = null;
  unplacePartArmed = false;
  Object.assign(saveData, saveGameData(saveData));
  builderStatusText = `Added metal line (${metalPieceCount + 1}/${METAL_PIECES_PER_CELL} on this block, ${saveData.resources.metal} left)`;
  renderPlaceholderScreens(saveData);
}

function armUnplacePart() {
  if (!isAtHomeworldSavePoint()) {
    unplacePartArmed = false;
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  unplacePartArmed = true;
  selectedBuilderPartId = null;
  selectedPlacedPartId = null;
  builderStatusText = "Unplace ready: click a part or metal cell";
  renderPlaceholderScreens(saveData);
}

function unplaceHullCell(x, y) {
  const activeShip = activeShipFor();

  if (!activeShip) {
    return;
  }

  if (!isAtHomeworldSavePoint()) {
    unplacePartArmed = false;
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  const cellKey = `${x},${y}`;
  activeShip.hullCells = Array.isArray(activeShip.hullCells) ? activeShip.hullCells : [];

  if (metalPieceCountForCell(activeShip, x, y) <= 0) {
    builderStatusText = "No metal there";
    renderPlaceholderScreens(saveData);
    return;
  }

  activeShip.hullCells = removeMetalPieceFromCell(activeShip.hullCells, cellKey);
  saveData.resources.metal = (saveData.resources.metal ?? 0) + 1;
  selectedBuilderPartId = METAL_OUTLINE_ID;
  selectedPlacedPartId = null;
  unplacePartArmed = false;
  Object.assign(saveData, saveGameData(saveData));
  builderStatusText = `Removed metal line (${saveData.resources.metal} metal ready)`;
  renderPlaceholderScreens(saveData);
}

function unplacePlacedPart(placedPartId) {
  const activeShip = activeShipFor();
  const placedPart = layoutForShip(activeShip).find((item) => item.id === placedPartId);
  const part = partLabels[placedPart?.partId];

  if (!activeShip || !placedPart || !part) {
    return;
  }

  if (!isAtHomeworldSavePoint()) {
    unplacePartArmed = false;
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  activeShip.layout = layoutForShip(activeShip).filter((item) => item.id !== placedPartId);
  activeShip.partIds = activeShip.layout.map((item) => item.partId);
  selectedBuilderPartId = part.id;
  selectedPlacedPartId = null;
  unplacePartArmed = false;
  Object.assign(saveData, saveGameData(saveData));
  builderStatusText = `Returned ${part.name} to templates`;
  renderPlaceholderScreens(saveData);
}

function paintPlacedPartAtCell(paintId, x, y) {
  const activeShip = activeShipFor();
  const placedPart = placedPartAtCell(activeShip, `${x},${y}`);
  const part = partLabels[placedPart?.partId];

  if (!placedPart || !part) {
    builderStatusText = "Click a placed part to paint it";
    renderPlaceholderScreens(saveData);
    return;
  }

  paintPlacedPartStroke(
    placedPart.id,
    [{ x: x - placedPart.x + 0.5, y: y - placedPart.y + 0.5 }],
    paintId,
  );
}

function paintPlacedPartStrokeFromEvent(
  event,
  placedPart,
  part,
  { render = true } = {},
) {
  const localPoint = localPaintPointFromPlacedPartPointer(event, placedPart, part);
  const previousPoint =
    activePaintStroke?.placedPartId === placedPart.id ? activePaintStroke.lastPoint : null;
  const points = paintStrokePointsBetween(previousPoint, localPoint, paintBrushSize);
  const strokes = paintPlacedPartStroke(placedPart.id, points, selectedBuilderPartId, {
    render,
  });

  if (activePaintStroke?.placedPartId === placedPart.id) {
    activePaintStroke.lastPoint = localPoint;
  }

  if (!render) {
    applyPaintStrokesToNode(event.currentTarget, strokes, part, placedPart);
  }
}

function paintPlacedPartStroke(placedPartId, points, paintId, { render = true } = {}) {
  const activeShip = activeShipFor();
  const paint = paintOptionForId(paintId);
  const placedPart = layoutForShip(activeShip).find((item) => item.id === placedPartId);
  const part = partLabels[placedPart?.partId];
  const size = part ? rotatedPartSize(part, placedPart.rotation) : { width: 0, height: 0 };

  if (!activeShip || !paint || !placedPart || !part) {
    return [];
  }

  if (!paintIsAvailable(paint.id)) {
    builderStatusText = "Buy that paint first";
    renderPlaceholderScreens(saveData);
    return [];
  }

  if (!isAtHomeworldSavePoint()) {
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return [];
  }

  const strokes = points
    .map((point) => ({
      x: clampPaintStrokePosition(point.x, size.width),
      y: clampPaintStrokePosition(point.y, size.height),
      size: paintBrushSize,
      paintId: paint.id,
      name: paint.name,
      color: paint.color,
    }))
    .filter((stroke) => stroke.x >= 0 && stroke.y >= 0);

  if (strokes.length === 0) {
    builderStatusText = "Paint goes on placed blocks";
    renderPlaceholderScreens(saveData);
    return [];
  }

  activeShip.layout = layoutForShip(activeShip).map((item) =>
    item.id === placedPartId
      ? {
          ...item,
          paintStrokes: [...(item.paintStrokes ?? []), ...strokes].slice(-600),
        }
      : item,
  );
  selectedBuilderPartId = paint.id;
  selectedPlacedPartId = placedPartId;
  unplacePartArmed = false;
  Object.assign(saveData, saveGameData(saveData));
  builderStatusText = `Painted ${part.name} ${paint.shortName} brush`;

  if (render) {
    renderPlaceholderScreens(saveData);
  }

  return strokes;
}

function placePartOnGrid(partId, x, y) {
  const part = partLabels[partId];
  const activeShip = activeShipFor();

  if (!part || !activeShip) {
    return;
  }

  if (!saveData.unlockedParts.includes(part.id)) {
    builderStatusText = "Buy that part first";
    renderPlaceholderScreens(saveData);
    return;
  }

  if (!isAtHomeworldSavePoint()) {
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  const grid = gridForShip(activeShip);
  const existingPlacement = layoutForShip(activeShip).find((item) => item.partId === part.id);
  const placement = existingPlacement
    ? { ...existingPlacement, x, y }
    : { id: `layout-${part.id}`, partId: part.id, x, y, rotation: 0 };
  const remainingLayout = layoutForShip(activeShip).filter((item) => item.id !== placement.id);
  const placementProblem = placementProblemFor(placement, part, remainingLayout, grid);

  if (placementProblem) {
    builderStatusText = placementProblem;
    renderPlaceholderScreens(saveData);
    return;
  }

  activeShip.layout = [...remainingLayout, placement];
  activeShip.partIds = activeShip.layout.map((item) => item.partId);
  selectedBuilderPartId = part.id;
  selectedPlacedPartId = placement.id;
  unplacePartArmed = false;
  Object.assign(saveData, saveGameData(saveData));
  builderStatusText = `Placed ${part.name}`;
  renderPlaceholderScreens(saveData);
}

function movePlacedPartToGrid(placedPartId, x, y) {
  const activeShip = activeShipFor();
  const placedPart = layoutForShip(activeShip).find((item) => item.id === placedPartId);
  const part = partLabels[placedPart?.partId];

  if (!activeShip || !placedPart || !part) {
    return;
  }

  if (!isAtHomeworldSavePoint()) {
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  const grid = gridForShip(activeShip);
  const movedPart = { ...placedPart, x, y };
  const remainingLayout = layoutForShip(activeShip).filter((item) => item.id !== placedPartId);
  const placementProblem = placementProblemFor(movedPart, part, remainingLayout, grid);

  if (placementProblem) {
    builderStatusText = placementProblem;
    renderPlaceholderScreens(saveData);
    return;
  }

  activeShip.layout = [...remainingLayout, movedPart];
  activeShip.partIds = activeShip.layout.map((item) => item.partId);
  selectedBuilderPartId = part.id;
  selectedPlacedPartId = placedPartId;
  unplacePartArmed = false;
  Object.assign(saveData, saveGameData(saveData));
  builderStatusText = `Moved ${part.name}`;
  renderPlaceholderScreens(saveData);
}

function rotateSelectedPlacedPart() {
  const activeShip = activeShipFor();
  const placedPart = layoutForShip(activeShip).find((item) => item.id === selectedPlacedPartId);
  const part = partLabels[placedPart?.partId];

  if (!activeShip || !placedPart || !part) {
    builderStatusText = "Select a placed part to rotate";
    renderPlaceholderScreens(saveData);
    return;
  }

  if (!isAtHomeworldSavePoint()) {
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  const grid = gridForShip(activeShip);
  const rotatedPart = {
    ...placedPart,
    rotation: nextRotation(placedPart.rotation),
  };
  const remainingLayout = layoutForShip(activeShip).filter((item) => {
    return item.id !== placedPart.id;
  });
  const placementProblem = placementProblemFor(rotatedPart, part, remainingLayout, grid);

  if (placementProblem) {
    builderStatusText = `Cannot rotate: ${placementProblem}`;
    renderPlaceholderScreens(saveData);
    return;
  }

  activeShip.layout = [...remainingLayout, rotatedPart];
  activeShip.partIds = activeShip.layout.map((item) => item.partId);
  selectedBuilderPartId = part.id;
  selectedPlacedPartId = placedPart.id;
  unplacePartArmed = false;
  Object.assign(saveData, saveGameData(saveData));
  builderStatusText = `Rotated ${part.name}`;
  renderPlaceholderScreens(saveData);
}

function placementProblemFor(placement, part, layout, grid) {
  const size = rotatedPartSize(part, placement.rotation);

  if (
    placement.x < 0 ||
    placement.y < 0 ||
    placement.x + size.width > grid.columns ||
    placement.y + size.height > grid.rows
  ) {
    return `${part.name} does not fit there`;
  }

  const proposedCells = occupiedCellsFor(placement, part);

  const hasOverlap = layout.some((placedPart) => {
    const placedPartTemplate = partLabels[placedPart.partId];

    return (
      placedPartTemplate &&
      occupiedCellsFor(placedPart, placedPartTemplate).some((cell) =>
        proposedCells.includes(cell),
      )
    );
  });

  return hasOverlap ? `${part.name} overlaps another part` : "";
}

function occupiedCellsFor(placedPart, part) {
  const cells = [];
  const size = rotatedPartSize(part, placedPart.rotation);

  for (let y = placedPart.y; y < placedPart.y + size.height; y += 1) {
    for (let x = placedPart.x; x < placedPart.x + size.width; x += 1) {
      cells.push(`${x},${y}`);
    }
  }

  return cells;
}

function rotatedPartSize(part, rotation = 0) {
  const normalizedRotation = normalizePartRotation(rotation);
  const isSideways = normalizedRotation === 90 || normalizedRotation === 270;

  return {
    width: isSideways ? part.height : part.width,
    height: isSideways ? part.width : part.height,
  };
}

function normalizePartRotation(rotation = 0) {
  const quarterTurns = Number.isFinite(rotation) ? Math.round(rotation / 90) : 0;

  return ((quarterTurns % 4) + 4) % 4 * 90;
}

function nextRotation(rotation = 0) {
  return (normalizePartRotation(rotation) + 90) % 360;
}

function cellFromPointer(event, frame, grid) {
  const rect = frame.getBoundingClientRect();
  const x = clampNumber(
    Math.floor(((event.clientX - rect.left) / rect.width) * grid.columns),
    0,
    grid.columns - 1,
  );
  const y = clampNumber(
    Math.floor(((event.clientY - rect.top) / rect.height) * grid.rows),
    0,
    grid.rows - 1,
  );

  return { x, y };
}

function cellFromPlacedPartPointer(event, placedPart, part) {
  const localCell = localCellFromPlacedPartPointer(event, placedPart, part);

  return {
    x: placedPart.x + localCell.x,
    y: placedPart.y + localCell.y,
  };
}

function localCellFromPlacedPartPointer(event, placedPart, part) {
  const rect = event.currentTarget.getBoundingClientRect();
  const size = rotatedPartSize(part, placedPart.rotation);
  const x = clampNumber(
    Math.floor(((event.clientX - rect.left) / rect.width) * size.width),
    0,
    size.width - 1,
  );
  const y = clampNumber(
    Math.floor(((event.clientY - rect.top) / rect.height) * size.height),
    0,
    size.height - 1,
  );

  return { x, y };
}

function localPaintPointFromPlacedPartPointer(event, placedPart, part) {
  const rect = event.currentTarget.getBoundingClientRect();
  const size = rotatedPartSize(part, placedPart.rotation);
  const x = clampNumber(((event.clientX - rect.left) / rect.width) * size.width, 0, size.width);
  const y = clampNumber(((event.clientY - rect.top) / rect.height) * size.height, 0, size.height);

  return {
    x: roundPaintValue(x),
    y: roundPaintValue(y),
  };
}

function paintStrokePointsBetween(startPoint, endPoint, brushSize) {
  if (!startPoint) {
    return [endPoint];
  }

  const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
  const step = Math.max(PAINT_STROKE_SPACING, brushSize * 0.45);
  const segments = Math.max(1, Math.ceil(distance / step));

  return Array.from({ length: segments }, (_, index) => {
    const ratio = (index + 1) / segments;

    return {
      x: roundPaintValue(startPoint.x + (endPoint.x - startPoint.x) * ratio),
      y: roundPaintValue(startPoint.y + (endPoint.y - startPoint.y) * ratio),
    };
  });
}

function gridForShip(activeShip) {
  return activeShip?.grid ?? { columns: BUILDER_GRID_COLUMNS, rows: BUILDER_GRID_ROWS };
}

function layoutForShip(activeShip) {
  return Array.isArray(activeShip?.layout) ? activeShip.layout : [];
}

function paintOptionsForSave(data = saveData) {
  const unlockedPaints = new Set(data.unlockedPaints ?? []);
  const ownedPaints = PAINT_CATALOG.filter((paint) => unlockedPaints.has(paint.id));
  const mixedPaints = MIXED_PAINT_RECIPES.filter((paint) => {
    return paint.ingredients.every((paintId) => unlockedPaints.has(paintId));
  });

  return [...ownedPaints, ...mixedPaints];
}

function paintOptionForId(paintId, data = saveData) {
  return paintOptionsForSave(data).find((paint) => paint.id === paintId) ?? null;
}

function paintIsAvailable(paintId) {
  return Boolean(paintOptionForId(paintId));
}

function paintBrushForSelection() {
  return paintOptionForId(selectedBuilderPartId);
}

function normalizePaintBrushSize(value) {
  return clampNumber(
    Number.isFinite(value) ? value : PAINT_BRUSH_DEFAULT_SIZE,
    PAINT_BRUSH_MIN_SIZE,
    PAINT_BRUSH_MAX_SIZE,
  );
}

function paintBrushSizeLabel() {
  return `${Math.round(paintBrushSize * 100)}% block`;
}

function paintForPlacedPart(placedPart, part = partLabels[placedPart?.partId]) {
  const paint = paintLabels[placedPart?.paintId];

  return {
    id: paint?.id ?? "factory",
    name: paint?.name ?? "Factory Color",
    shortName: paint?.shortName ?? "factory",
    color: paint?.color ?? part?.color ?? "#d8e4ed",
  };
}

function paintCellsForPlacedPart(placedPart) {
  if (!placedPart?.paintCells || typeof placedPart.paintCells !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(placedPart.paintCells).filter(([, paint]) => {
      return typeof paint?.color === "string" && /^#[0-9a-f]{6}$/i.test(paint.color);
    }),
  );
}

function paintCellForPlacedPart(placedPart, localX, localY) {
  return paintCellsForPlacedPart(placedPart)[`${localX},${localY}`] ?? null;
}

function paintStrokesForPlacedPart(placedPart) {
  if (!Array.isArray(placedPart?.paintStrokes)) {
    return [];
  }

  return placedPart.paintStrokes.filter((stroke) => {
    return (
      Number.isFinite(stroke?.x) &&
      Number.isFinite(stroke?.y) &&
      Number.isFinite(stroke?.size) &&
      typeof stroke?.color === "string" &&
      /^#[0-9a-f]{6}$/i.test(stroke.color)
    );
  });
}

function placedPartPaintSummary(placedPart, basePaint) {
  const paintedCells = Object.values(paintCellsForPlacedPart(placedPart));
  const paintStrokes = paintStrokesForPlacedPart(placedPart);

  if (paintedCells.length === 0 && paintStrokes.length === 0) {
    return basePaint.name;
  }

  const names = [
    ...new Set(
      [...paintedCells, ...paintStrokes].map((paint) => paint.name).filter(Boolean),
    ),
  ];

  return names.length === 1 ? names[0] : `${names.length} paints`;
}

function applyPaintStrokesToNode(node, strokes, part, placedPart) {
  const size = rotatedPartSize(part, placedPart.rotation);
  let layer = node.querySelector(".builder-grid-part-paint-layer");

  if (!layer) {
    layer = createPaintLayer(placedPart, part);
    node.prepend(layer);
  }

  layer.style.setProperty("--paint-cell-cols", size.width);
  layer.style.setProperty("--paint-cell-rows", size.height);

  layer.append(...strokes.map((stroke) => createPaintStrokeNode(stroke)));
}

function clampPaintStrokePosition(value, max) {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    return -1;
  }

  return roundPaintValue(value);
}

function roundPaintValue(value) {
  return Math.round(value * 1000) / 1000;
}

function metalPiecesForShip(activeShip) {
  const counts = new Map();
  let total = 0;

  for (const metalPiece of Array.isArray(activeShip?.hullCells) ? activeShip.hullCells : []) {
    const cellKey = metalCellKeyFromPiece(metalPiece);

    if (cellKey) {
      const value = metalPiece.includes(":") ? 1 : METAL_PIECES_PER_CELL;
      const nextValue = Math.min(
        METAL_PIECES_PER_CELL,
        (counts.get(cellKey) ?? 0) + value,
      );
      counts.set(cellKey, nextValue);
    }
  }

  for (const count of counts.values()) {
    total += count;
  }

  return { counts, total };
}

function metalCellKeyFromPiece(metalPiece) {
  if (typeof metalPiece !== "string") {
    return "";
  }

  const match = metalPiece.match(/^(\d+),(\d+)(?::[ab])?$/);

  return match ? `${match[1]},${match[2]}` : "";
}

function metalPieceCountForCell(activeShip, x, y) {
  return metalPiecesForShip(activeShip).counts.get(`${x},${y}`) ?? 0;
}

function metalPieceKeyForCell(activeShip, cellKey) {
  const existingPieces = new Set(Array.isArray(activeShip?.hullCells) ? activeShip.hullCells : []);

  return existingPieces.has(`${cellKey}:a`) ? `${cellKey}:b` : `${cellKey}:a`;
}

function removeMetalPieceFromCell(hullCells, cellKey) {
  if (hullCells.includes(`${cellKey}:b`)) {
    return hullCells.filter((hullCell) => hullCell !== `${cellKey}:b`);
  }

  if (hullCells.includes(`${cellKey}:a`)) {
    return hullCells.filter((hullCell) => hullCell !== `${cellKey}:a`);
  }

  if (hullCells.includes(cellKey)) {
    return hullCells.flatMap((hullCell) => (hullCell === cellKey ? [`${cellKey}:a`] : hullCell));
  }

  return hullCells;
}

function placedPartAtCell(activeShip, cellKey) {
  return layoutForShip(activeShip).find((placedPart) => {
    const part = partLabels[placedPart.partId];

    return part && occupiedCellsFor(placedPart, part).includes(cellKey);
  });
}

function lifeSupportStatusFor(activeShip) {
  const hasAirMaker = layoutForShip(activeShip).some((part) => {
    return part.partId === REQUIRED_LIFE_SUPPORT_PART_ID;
  });
  const water = saveData.resources.water ?? 0;

  if (!hasAirMaker) {
    return { ok: false, message: "Install an Air Maker" };
  }

  if (water <= 0) {
    return { ok: false, message: "Air Maker needs water" };
  }

  return { ok: true, message: `Air Maker ready | Water ${water}` };
}

function chargeLifeSupportForLaunch() {
  const activeShip = activeShipFor();
  const lifeSupport = lifeSupportStatusFor(activeShip);

  if (!lifeSupport.ok) {
    lifeSupportStatusText = lifeSupport.message;
    builderStatusText = lifeSupport.message;
    renderPlaceholderScreens(saveData);
    updateHud();
    return false;
  }

  if (!lifeSupportWaterCharged) {
    const airMaker = partLabels[REQUIRED_LIFE_SUPPORT_PART_ID];
    const waterUse = airMaker.waterUse ?? 1;
    saveData.resources.water = Math.max(0, (saveData.resources.water ?? 0) - waterUse);
    Object.assign(saveData, saveGameData(saveData));
    lifeSupportWaterCharged = true;
    lifeSupportStatusText = `Air Maker used ${waterUse} water`;
    builderStatusText = lifeSupportStatusText;
    renderPlaceholderScreens(saveData);
  }

  return true;
}

function replaceList(container, items) {
  container.replaceChildren(...items.map((item) => createScreenItem(item)));
}

function createScreenItem(item) {
  const element = document.createElement("section");
  const label = document.createElement("span");
  const name = document.createElement("strong");
  const detail = document.createElement("small");

  element.className = "screen-item";
  if (item.partId) {
    element.dataset.partId = item.partId;
  }
  label.textContent = item.label;
  name.textContent = item.name;
  detail.textContent = item.detail;
  element.append(label, name, detail);

  if (item.buttonLabel) {
    const action = document.createElement("button");
    action.className = "screen-item-action";
    action.type = "button";
    action.textContent = item.buttonLabel;
    action.disabled = item.buttonDisabled;
    action.title = item.buttonTitle ?? "";
    action.addEventListener("click", item.onAction);
    element.append(action);
  }

  return element;
}

function partsBayButtonTitle(isOwned, canShop, canAfford) {
  if (isOwned) {
    return "Already owned";
  }

  if (!canShop) {
    return "Return to Homeworld to buy parts";
  }

  if (!canAfford) {
    return "Not enough credits";
  }

  return "Buy this part";
}

function createPlanetDistanceLabel(name) {
  return new Text({
    text: name,
    style: {
      align: "center",
      fill: "#f7fbff",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 16,
      stroke: { color: "#07111d", width: 4 },
    },
  });
}

function createMinimapLabel(label) {
  return new Text({
    text: label,
    style: {
      align: "center",
      fill: "#f7fbff",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 9,
      fontWeight: "800",
      lineHeight: 10,
      stroke: { color: "#04101c", width: 3 },
    },
  });
}

function render() {
  const width = app.screen.width;
  const height = app.screen.height;
  const visualState = getVisualState(width, height);

  drawBackground(width, height, state.altitude);
  drawWorld(width, height, visualState);
  const shipVisualBounds = drawActiveShipBody(shipBody, activeShipFor());
  drawPlume(
    Number(hud.throttle.value) / 100,
    state.launched && state.fuelMass > 0 && !TERMINAL_OUTCOMES.has(state.outcome),
    shipVisualBounds,
  );
  drawExplosion(visualState);

  rocket.visible = state.outcome !== "Crash";
  rocket.position.set(visualState.cameraX, visualState.cameraY);
  rocket.rotation = state.angle;
  rocket.scale.set(ROCKET_VISUAL_SCALE);

  trajectoryText.text = telemetryLine();
  trajectoryText.position.set(18, 18);

  drawMinimap(width, height, visualState);
  updateHud();
}

function getVisualState(width, height) {
  const planetRadius = HOMEWORLD.radius * HOMEWORLD_VIEW_SCALE;
  const spaceScale = HOMEWORLD_VIEW_SCALE;
  const surfaceAngle = state.downrange / HOMEWORLD.radius;
  const outwardX = Math.sin(surfaceAngle);
  const outwardY = -Math.cos(surfaceAngle);
  const cameraX = width * 0.5;
  const cameraY = height * 0.5;
  const planetCenterX =
    cameraX - state.downrange * spaceScale - outwardX * ROCKET_SURFACE_OFFSET;
  const planetCenterY =
    cameraY + (HOMEWORLD.radius + state.altitude) * spaceScale -
    outwardY * ROCKET_SURFACE_OFFSET;

  return {
    cameraX,
    cameraY,
    spaceScale,
    planetCenterX,
    planetCenterY,
    planetRadius,
    surfaceAngle,
    surfaceX: planetCenterX + outwardX * planetRadius,
    surfaceY: planetCenterY + outwardY * planetRadius,
  };
}

function telemetryLine() {
  const homeAltitude = distanceToPlanetSurface(HOMEWORLD_TARGET);
  const gravitySource = state.gravitySource ?? HOMEWORLD.name;
  const missionPlanet = selectedMissionPlanet();
  const displayedAltitude = state.surfaceAltitude ?? state.altitude;
  const sourceBody =
    GRAVITY_BODIES.find((body) => body.name === gravitySource) ?? GRAVITY_BODIES[0];

  if (state.phase === "space") {
    return `${STARTER_SHIP.name} | Target: ${missionPlanet.name} ${formatDistance(
      distanceToPlanetSurface(missionPlanet),
    )} away | Home alt ${formatDistance(homeAltitude)} | Gravity: ${gravitySource}`;
  }

  return `${STARTER_SHIP.name} | Home alt ${formatDistance(
    homeAltitude,
  )} | Surface ${formatDistance(displayedAltitude)} over ${gravitySource} | Escape ${Math.round(
    orbitalSpeedAtAltitude(displayedAltitude, sourceBody) * Math.SQRT2,
  ).toLocaleString()} m/s`;
}

function updateHud() {
  const speed = Math.hypot(state.velocity.x, state.velocity.y);
  const fuelPercent = (state.fuelMass / STARTER_SHIP.fuelMass) * 100;
  const isTerminal = TERMINAL_OUTCOMES.has(state.outcome);
  const homeAltitude = distanceToPlanetSurface(HOMEWORLD_TARGET);

  refreshMissionTargetPicker();

  const missionPlanet = selectedMissionPlanet();

  hud.missionTitle.textContent = missionPlanet.name;
  hud.altitude.textContent = `${Math.round(homeAltitude).toLocaleString()} m`;
  hud.speed.textContent = `${Math.round(speed).toLocaleString()} m/s`;
  hud.fuel.textContent = `${Math.max(0, Math.round(fuelPercent))}%`;
  hud.verticalSpeed.textContent = `${Math.round(state.velocity.y).toLocaleString()} m/s`;
  hud.outcome.textContent = state.outcome;
  hud.missionStatus.textContent = missionStatusFor(state.outcome, missionPlanet);
  updateSavePoint();
  hud.launchButton.disabled = state.launched && !isTerminal;
  resultUi.panel.hidden = activeScreen !== "launch" || !shouldShowResultPanel();
  updateLandingNotification();

  if (shouldShowResultPanel()) {
    resultUi.title.textContent = resultTitleFor(state.outcome);
    resultUi.summary.textContent = resultSummaryFor(state.outcome, state);
  }
}

function missionStatusFor(outcome, missionPlanet) {
  const distance = formatDistance(distanceToPlanetSurface(missionPlanet));
  const lifeSupport = lifeSupportStatusFor(activeShipFor());
  const statuses = {
    Preflight: lifeSupport.ok
      ? `Target: ${missionPlanet.name}, ${distance} away | ${lifeSupportStatusText}`
      : `Target: ${missionPlanet.name}, ${distance} away | ${lifeSupport.message}`,
    Launch: `Manual launch toward ${missionPlanet.name}`,
    Flight: `${missionPlanet.name} is ${distance} away`,
    Crash: `Mission to ${missionPlanet.name} failed`,
    Landed: `Landing successful on ${state.landedBody ?? state.gravitySource}`,
    Orbit: `${missionPlanet.name} remains ${distance} away`,
    Space: `${missionPlanet.name} is ${distance} away`,
    Drift: `Out of fuel; ${missionPlanet.name} is ${distance} away`,
  };

  return statuses[outcome] ?? "Launch in progress";
}

function distanceToPlanetSurface(planet) {
  return Math.max(
    0,
    Math.hypot(planet.worldX - state.downrange, planet.worldY - state.altitude) -
      planet.physicalRadius,
  );
}

function resultTitleFor(outcome) {
  const titles = {
    Crash: "Crash",
    Landed: "Landing Successful",
    Orbit: "Orbit Achieved",
  };

  return titles[outcome] ?? outcome;
}

function resultSummaryFor(outcome, launchState) {
  const altitude = Math.max(0, Math.round(launchState.maxAltitude)).toLocaleString();
  const fuelPercent = Math.round(
    (launchState.crashFuelMass / STARTER_SHIP.fuelMass) * 100,
  );
  const landedBody = launchState.landedBody ?? launchState.gravitySource;
  const summaries = {
    Crash: `Vehicle lost after reaching ${altitude} m. Remaining fuel made a ${fuelPercent}% fuel explosion.`,
    Landed: `The Pioneer landed safely on ${landedBody}.`,
    Orbit: `The Pioneer is circling Homeworld at ${altitude} m.`,
  };

  return summaries[outcome] ?? "Mission complete.";
}

function shouldShowResultPanel() {
  return state.outcome === "Crash";
}

function updateLandingNotification() {
  const hasLanded = activeScreen === "launch" && state.outcome === "Landed";

  landingNotification.panel.hidden = !hasLanded;
  if (hasLanded) {
    landingNotification.detail.textContent = `Safe touchdown on ${
      state.landedBody ?? state.gravitySource
    }.`;
  }
}

function updateSavePoint() {
  const canSave = isAtHomeworldSavePoint();

  hud.savePoint.hidden = !canSave;
  if (!canSave) {
    return;
  }

  hud.saveResources.textContent = formatResourceInventory(saveData.resources);
  hud.saveStatus.textContent = savePointStatus;
  hud.saveButton.disabled = false;
}

function isAtHomeworldSavePoint() {
  const landedOnHomeworld =
    state.outcome === "Landed" && (state.landedBody ?? state.gravitySource) === HOMEWORLD.name;

  return !state.launched || landedOnHomeworld;
}

function drawBackground(width, height, altitude) {
  const spaceBlend = Math.min(1, altitude / HOMEWORLD.atmosphereHeight);
  const upper = mixColor(0x71b8ec, 0x02040a, spaceBlend);
  const lower = mixColor(0xd3ecff, 0x101926, spaceBlend);

  background.clear();
  const bands = 24;
  for (let index = 0; index < bands; index += 1) {
    const blend = index / Math.max(1, bands - 1);
    background
      .rect(0, (height / bands) * index, width, height / bands + 1)
      .fill(mixColor(upper, lower, blend));
  }

  stars.clear();
  const starAlpha = Math.max(0, (spaceBlend - 0.18) / 0.82);
  for (let index = 0; index < 130; index += 1) {
    const x = ((index * 97) % Math.max(1, width)) + ((index % 3) * 0.37);
    const y = ((index * 53) % Math.max(1, height * 0.74)) + ((index % 5) * 0.19);
    const radius = 0.7 + (index % 4) * 0.22;
    stars.circle(x, y, radius).fill({ color: 0xffffff, alpha: starAlpha });
  }

  drawDistantWorlds();
}

function drawDistantWorlds() {
  distantWorlds.clear();
}

function drawWorld(width, height, visualState) {
  const { planetCenterX, planetCenterY, planetRadius } = visualState;
  const atmosphereAlpha = Math.max(0.12, 0.52 - state.altitude / 18000);

  planet.clear();
  drawHomeworld(planet, planetCenterX, planetCenterY, planetRadius, atmosphereAlpha);

  drawSpacePlanets(visualState, width, height);
  drawLaunchPad(visualState);
}

function drawHomeworld(target, x, y, radius, atmosphereAlpha) {
  target
    .circle(x, y, radius + 30)
    .fill({ color: 0x8fcff5, alpha: atmosphereAlpha * 0.2 })
    .circle(x, y, radius + 15)
    .fill({ color: 0x8fcff5, alpha: atmosphereAlpha * 0.28 })
    .circle(x, y, radius)
    .fill(0x1b5f9f)
    .circle(x - radius * 0.28, y - radius * 0.32, radius * 0.5)
    .fill({ color: 0x2379bb, alpha: 0.38 });

  drawContinentPatch(target, x - radius * 0.3, y - radius * 0.2, radius * 0.36, 0x2f8b55, 0.86, 311);
  drawContinentPatch(target, x + radius * 0.24, y + radius * 0.06, radius * 0.32, 0x2f7f49, 0.82, 457);
  drawContinentPatch(target, x - radius * 0.1, y + radius * 0.3, radius * 0.22, 0x8c8b52, 0.58, 593);
  drawContinentPatch(target, x + radius * 0.04, y - radius * 0.42, radius * 0.2, 0xb6a263, 0.36, 739);

  target
    .ellipse(x, y - radius * 0.54, radius * 0.44, radius * 0.08)
    .fill({ color: 0xf1fbff, alpha: 0.78 })
    .ellipse(x - radius * 0.05, y + radius * 0.53, radius * 0.5, radius * 0.08)
    .fill({ color: 0xf1fbff, alpha: 0.66 });

  drawCloudBands(target, x, y, radius, atmosphereAlpha * 0.62, 887);

  target
    .circle(x + radius * 0.34, y + radius * 0.24, radius * 0.5)
    .fill({ color: 0x05121b, alpha: 0.26 })
    .circle(x - radius * 0.28, y - radius * 0.3, radius * 0.2)
    .fill({ color: 0xffffff, alpha: 0.22 });
}

function drawSpacePlanets(visualState, width, height) {
  const lowerInterfaceY = height - 190;

  spacePlanets.clear();

  SPACE_PLANETS.forEach((spacePlanet, index) => {
    const { screenX, screenY, radius, isInView } = planetViewState(
      spacePlanet,
      visualState,
      width,
      height,
    );
    const distance = distanceToPlanetSurface(spacePlanet);
    const label = planetDistanceLabels[index];
    const alpha = 0.92;

    if (!isInView) {
      label.alpha = 0;
      return;
    }

    if (spacePlanet.ring) {
      drawPlanetRing(spacePlanets, spacePlanet, screenX, screenY, radius, alpha);
    }

    drawDetailedPlanet(spacePlanets, spacePlanet, screenX, screenY, radius, alpha);

    label.text = `${spacePlanet.name}\n${formatDistance(distance)}\n${formatResources(
      spacePlanet.resources,
    )}`;
    label.alpha = state.launched && isInView ? 0.96 : 0;

    const labelBelowY = screenY + radius + 10;
    let labelX = screenX - label.width / 2;
    let labelY = labelBelowY;

    if (labelBelowY + label.height > lowerInterfaceY) {
      const side = screenX < visualState.cameraX ? -1 : 1;
      labelX = screenX + side * (radius + 12);
      labelY = screenY - label.height / 2;

      if (side < 0) {
        labelX -= label.width;
      }
    }

    labelX = clampNumber(labelX, 12, width - label.width - 12);
    labelY = clampNumber(labelY, 82, lowerInterfaceY - label.height - 8);
    label.position.set(labelX, labelY);
  });
}

function planetViewState(spacePlanet, visualState, width, height) {
  const screenX =
    visualState.cameraX + (spacePlanet.worldX - state.downrange) * visualState.spaceScale;
  const screenY =
    visualState.cameraY - (spacePlanet.worldY - state.altitude) * visualState.spaceScale;
  const radius = spacePlanet.physicalRadius * visualState.spaceScale;

  return {
    screenX,
    screenY,
    radius,
    isInView: isWorldObjectInView(screenX, screenY, radius, width, height),
  };
}

function isWorldObjectInView(x, y, radius, width, height) {
  const margin = Math.max(40, radius + 12);

  return (
    x >= -margin &&
    x <= width + margin &&
    y >= -margin &&
    y <= height + margin
  );
}

function drawDetailedPlanet(target, spacePlanet, x, y, radius, alpha) {
  const seed = hashString(spacePlanet.id);
  const terrainColor = terrainColorFor(spacePlanet);
  const cloudAlpha = spacePlanet.atmosphereDensity ? 0.34 : 0.16;

  target
    .circle(x, y, radius + 10)
    .fill({ color: atmosphereColorFor(spacePlanet), alpha: alpha * 0.16 })
    .circle(x, y, radius)
    .fill({ color: spacePlanet.color, alpha })
    .circle(x - radius * 0.24, y - radius * 0.24, radius * 0.52)
    .fill({ color: mixColor(spacePlanet.color, spacePlanet.highlight, 0.2), alpha: alpha * 0.3 });

  for (let index = 0; index < 6; index += 1) {
    const patchSeed = seed + index * 37;
    const patchX = x + (noiseUnit(patchSeed) * 2 - 1) * radius * 0.46;
    const patchY = y + (noiseUnit(patchSeed + 8) * 2 - 1) * radius * 0.44;
    const patchRadius = radius * (0.12 + noiseUnit(patchSeed + 16) * 0.18);
    const color = index % 2 === 0 ? terrainColor : mixColor(terrainColor, spacePlanet.highlight, 0.28);

    drawContinentPatch(target, patchX, patchY, patchRadius, color, alpha * 0.5, patchSeed);
  }

  drawResourceTerrain(target, spacePlanet, x, y, radius, alpha, seed);
  drawCloudBands(target, x, y, radius, alpha * cloudAlpha, seed + 211);

  target
    .circle(x + radius * 0.38, y + radius * 0.22, radius * 0.5)
    .fill({ color: 0x06101a, alpha: alpha * 0.25 })
    .circle(x - radius * 0.3, y - radius * 0.34, radius * 0.18)
    .fill({ color: 0xffffff, alpha: alpha * 0.22 });
}

function drawPlanetRing(target, spacePlanet, x, y, radius, alpha) {
  const seed = hashString(`${spacePlanet.id}-ring`);
  const ringWidth = radius * 1.82;
  const ringHeight = radius * 0.48;

  target
    .ellipse(x, y, ringWidth, ringHeight)
    .stroke({ color: mixColor(spacePlanet.highlight, 0xffffff, 0.15), width: 3, alpha: alpha * 0.5 })
    .ellipse(x, y, ringWidth * 0.86, ringHeight * 0.78)
    .stroke({ color: 0x665f7c, width: 2, alpha: alpha * 0.3 });

  for (let index = 0; index < 24; index += 1) {
    const rockSeed = seed + index * 29;
    const angle = Math.PI * 2 * noiseUnit(rockSeed);
    const rockX = x + Math.cos(angle) * ringWidth * (0.78 + noiseUnit(rockSeed + 4) * 0.2);
    const rockY = y + Math.sin(angle) * ringHeight * (0.78 + noiseUnit(rockSeed + 8) * 0.22);
    const rockRadius = Math.max(1.2, radius * (0.025 + noiseUnit(rockSeed + 12) * 0.018));

    target.circle(rockX, rockY, rockRadius).fill({
      color: mixColor(0x7c768c, spacePlanet.highlight, noiseUnit(rockSeed + 16) * 0.45),
      alpha: alpha * 0.58,
    });
  }
}

function drawResourceTerrain(target, spacePlanet, x, y, radius, alpha, seed) {
  const resourceColors = {
    water: 0x1a6f92,
    ice: 0xeaf8ff,
    oil: 0x07080a,
    iron: 0xb46343,
    copper: 0xc78148,
  };

  spacePlanet.resources.forEach((resource, index) => {
    const resourceSeed = seed + index * 53 + 401;
    const offsetX = (noiseUnit(resourceSeed) * 2 - 1) * radius * 0.42;
    const offsetY = (noiseUnit(resourceSeed + 12) * 2 - 1) * radius * 0.42;
    const patchRadius = radius * (0.14 + noiseUnit(resourceSeed + 24) * 0.14);

    drawContinentPatch(
      target,
      x + offsetX,
      y + offsetY,
      patchRadius,
      resourceColors[resource] ?? spacePlanet.highlight,
      alpha * (resource === "ice" ? 0.72 : 0.54),
      resourceSeed,
    );

    if (resource === "iron" || resource === "copper" || resource === "oil") {
      drawCrater(target, x + offsetX, y + offsetY, patchRadius * 0.45, alpha, resourceSeed);
    }
  });
}

function drawCloudBands(target, x, y, radius, alpha, seed) {
  for (let index = 0; index < 4; index += 1) {
    const bandSeed = seed + index * 31;
    const bandY = y + (noiseUnit(bandSeed) * 2 - 1) * radius * 0.46;
    const bandX = x + (noiseUnit(bandSeed + 9) * 2 - 1) * radius * 0.12;
    const width = radius * (0.8 + noiseUnit(bandSeed + 18) * 0.55);
    const height = radius * (0.045 + noiseUnit(bandSeed + 27) * 0.045);

    target
      .ellipse(bandX, bandY, width, height)
      .fill({ color: 0xf2fbff, alpha: alpha * (0.6 + noiseUnit(bandSeed + 36) * 0.4) })
      .ellipse(bandX + width * 0.18, bandY - height * 0.7, width * 0.55, height * 0.75)
      .fill({ color: 0xffffff, alpha: alpha * 0.42 });
  }
}

function drawContinentPatch(target, x, y, radius, color, alpha, seed) {
  drawSmoothBlob(
    target,
    x,
    y,
    radius * (1.05 + noiseUnit(seed + 5) * 0.34),
    radius * (0.54 + noiseUnit(seed + 10) * 0.28),
    12,
    color,
    alpha,
    seed,
    0.24,
  );

  drawSmoothBlob(
    target,
    x + radius * 0.1,
    y - radius * 0.07,
    radius * (0.46 + noiseUnit(seed + 19) * 0.2),
    radius * (0.2 + noiseUnit(seed + 23) * 0.18),
    9,
    mixColor(color, 0xffffff, 0.16),
    alpha * 0.18,
    seed + 101,
    0.16,
  );
}

function drawCrater(target, x, y, radius, alpha, seed) {
  target
    .circle(x, y, radius)
    .fill({ color: 0x07101a, alpha: alpha * 0.28 })
    .circle(x - radius * 0.2, y - radius * 0.24, radius * 0.38 + noiseUnit(seed) * radius * 0.08)
    .fill({ color: 0xffffff, alpha: alpha * 0.12 });
}

function drawSmoothBlob(
  target,
  x,
  y,
  radiusX,
  radiusY,
  points,
  color,
  alpha,
  seed,
  roughness,
) {
  const vertices = [];

  for (let point = 0; point < points; point += 1) {
    const angle = (Math.PI * 2 * point) / points;
    const wobble =
      1 +
      (noiseUnit(seed + point * 17) - 0.5) * roughness +
      Math.sin(angle * 3 + seed * 0.01) * roughness * 0.45;
    vertices.push({
      x: x + Math.cos(angle) * radiusX * wobble,
      y: y + Math.sin(angle) * radiusY * wobble,
    });
  }

  const first = midpoint(vertices[0], vertices[1]);
  target.moveTo(first.x, first.y);

  for (let point = 1; point <= vertices.length; point += 1) {
    const current = vertices[point % vertices.length];
    const next = vertices[(point + 1) % vertices.length];
    const mid = midpoint(current, next);
    target.quadraticCurveTo(current.x, current.y, mid.x, mid.y);
  }

  target.closePath().fill({ color, alpha });
}

function midpoint(first, second) {
  return {
    x: (first.x + second.x) * 0.5,
    y: (first.y + second.y) * 0.5,
  };
}

function atmosphereColorFor(spacePlanet) {
  if (spacePlanet.resources.includes("water")) {
    return 0x8cd7ff;
  }

  if (spacePlanet.resources.includes("ice")) {
    return 0xd9f3ff;
  }

  return spacePlanet.highlight;
}

function terrainColorFor(spacePlanet) {
  if (spacePlanet.resources.includes("water")) {
    return mixColor(spacePlanet.color, 0x1a6f92, 0.46);
  }

  if (spacePlanet.resources.includes("ice")) {
    return mixColor(spacePlanet.color, 0xf0fbff, 0.58);
  }

  if (spacePlanet.resources.includes("iron")) {
    return mixColor(spacePlanet.color, 0xb46343, 0.5);
  }

  if (spacePlanet.resources.includes("oil")) {
    return mixColor(spacePlanet.color, 0x07080a, 0.42);
  }

  return mixColor(spacePlanet.color, spacePlanet.highlight, 0.32);
}

function drawMinimap(width, height, visualState) {
  const isVisible = activeScreen === "launch";

  minimap.visible = isVisible;
  minimapHomeLabel.visible = isVisible;
  for (const label of minimapPlanetLabels) {
    label.visible = false;
  }

  minimap.clear();

  if (!isVisible) {
    return;
  }

  const mapWidth = clampNumber(width * 0.24, 190, 252);
  const mapHeight = clampNumber(mapWidth * 0.56, 106, 138);
  const navWidth = Math.min(520, width - 32);
  const navRight = width * 0.5 + navWidth * 0.5;
  const mapX = Math.max(MINIMAP_MARGIN, width - mapWidth - MINIMAP_MARGIN);
  const mapY = mapX < navRight + 12 ? 82 : MINIMAP_MARGIN;
  const centerX = mapX + mapWidth * 0.5;
  const centerY = mapY + mapHeight * 0.5;
  const ringRadius = Math.min(mapWidth, mapHeight) * 0.38;
  const mapScale = ringRadius / MINIMAP_WORLD_RADIUS;

  minimap
    .rect(mapX, mapY, mapWidth, mapHeight)
    .fill({ color: 0x04101c, alpha: 0.78 })
    .rect(mapX, mapY, mapWidth, mapHeight)
    .stroke({ color: 0xafd6ff, width: 1, alpha: 0.24 })
    .circle(centerX, centerY, ringRadius)
    .stroke({ color: 0xb9dff7, width: 1, alpha: 0.28 })
    .circle(centerX, centerY, ringRadius * 0.5)
    .stroke({ color: 0xb9dff7, width: 1, alpha: 0.16 })
    .circle(centerX, centerY, 5)
    .fill({ color: 0x1f5a50, alpha: 0.92 })
    .circle(centerX - 1.5, centerY - 1.7, 2.2)
    .fill({ color: 0x9fc8b2, alpha: 0.58 });

  positionMinimapLabel(minimapHomeLabel, centerX, centerY + 12);

  SPACE_PLANETS.forEach((spacePlanet, index) => {
    const viewState = planetViewState(spacePlanet, visualState, width, height);
    const label = minimapPlanetLabels[index];

    if (!viewState.isInView) {
      label.visible = false;
      return;
    }

    const planetX = centerX + spacePlanet.worldX * mapScale;
    const planetY = centerY - spacePlanet.worldY * mapScale;
    const markerRadius = spacePlanet.ring ? 4.4 : 3.8;
    label.visible = true;

    if (spacePlanet.ring) {
      minimap.ellipse(planetX, planetY, markerRadius * 2.8, markerRadius).stroke({
        color: spacePlanet.highlight,
        width: 1,
        alpha: 0.38,
      });
    }

    minimap
      .circle(planetX, planetY, markerRadius + 2)
      .fill({ color: spacePlanet.highlight, alpha: 0.18 })
      .circle(planetX, planetY, markerRadius)
      .fill({ color: spacePlanet.color, alpha: 0.96 })
      .circle(planetX - 1.2, planetY - 1.2, markerRadius * 0.45)
      .fill({ color: spacePlanet.highlight, alpha: 0.72 });

    positionMinimapLabel(label, planetX, planetY + markerRadius + 7);
  });

  const shipOffsetX = state.downrange * mapScale;
  const shipOffsetY = -state.altitude * mapScale;
  const shipDistance = Math.hypot(shipOffsetX, shipOffsetY);
  const maxShipDistance = ringRadius - 8;
  const shipScale =
    shipDistance > maxShipDistance && shipDistance > 0
      ? maxShipDistance / shipDistance
      : 1;
  const shipX = centerX + shipOffsetX * shipScale;
  const shipY = centerY + shipOffsetY * shipScale;

  minimap
    .circle(shipX, shipY, 5)
    .fill({ color: 0xf7fbff, alpha: 0.96 })
    .circle(shipX, shipY, 2.2)
    .fill({ color: 0x6ed7ff, alpha: 0.98 });
}

function positionMinimapLabel(label, x, y) {
  label.position.set(x - label.width * 0.5, y - label.height * 0.5);
}

function drawLaunchPad(visualState) {
  const padAlpha = Math.max(0, 1 - state.altitude / 850);
  launchPad.clear();

  if (padAlpha <= 0) {
    return;
  }

  launchPad.position.set(visualState.surfaceX, visualState.surfaceY);
  launchPad.rotation = visualState.surfaceAngle;
  launchPad
    .rect(-46, -5, 92, 9)
    .fill({ color: 0x52606c, alpha: padAlpha })
    .rect(-70, 4, 140, 7)
    .fill({ color: 0x2d3842, alpha: padAlpha })
    .rect(-18, -48, 5, 44)
    .fill({ color: 0x79848f, alpha: padAlpha })
    .rect(13, -48, 5, 44)
    .fill({ color: 0x79848f, alpha: padAlpha })
    .rect(50, -34, 20, 29)
    .fill({ color: 0x263e55, alpha: padAlpha })
    .rect(54, -29, 12, 15)
    .fill({ color: 0x6ed7ff, alpha: padAlpha * 0.5 })
    .circle(60, -43, 10)
    .fill({ color: 0x6ed7ff, alpha: padAlpha * 0.24 })
    .circle(60, -43, 4)
    .fill({ color: 0xeaf9ff, alpha: padAlpha * 0.9 });
}

function drawPlume(throttle, isActive, shipVisualBounds = defaultShipVisualBounds()) {
  plume.clear();

  if (!isActive || throttle <= 0) {
    return;
  }

  const shipWidth = shipVisualBounds.right - shipVisualBounds.left;
  const halfWidth = clampNumber(shipWidth * 0.14, 6, 14);
  const startY = shipVisualBounds.bottom - 3;
  const length = 44 + throttle * 82;
  plume
    .moveTo(-halfWidth, startY)
    .lineTo(0, startY + length)
    .lineTo(halfWidth, startY)
    .closePath()
    .fill({ color: 0xffc857, alpha: 0.72 })
    .moveTo(-halfWidth * 0.48, startY - 2)
    .lineTo(0, startY + length * 0.68)
    .lineTo(halfWidth * 0.48, startY - 2)
    .closePath()
    .fill({ color: 0xd9f7ff, alpha: 0.88 });
}

function drawExplosion(visualState) {
  if (state.outcome !== "Crash") {
    explosion.visible = false;
    return;
  }

  const fuelRatio = clampNumber(state.crashFuelMass / STARTER_SHIP.fuelMass, 0, 1);
  const { cameraX, cameraY } = visualState;
  const explosionDiameter = 170 + fuelRatio * 390;
  const textureWidth = explosion.texture.width || 1254;

  explosion.visible = true;
  explosion.position.set(cameraX, cameraY);
  explosion.scale.set(explosionDiameter / textureWidth);
  explosion.alpha = 0.76 + fuelRatio * 0.22;
}

function drawActiveShipBody(target, activeShip) {
  const layout = layoutForShip(activeShip).filter((placedPart) => partLabels[placedPart.partId]);

  target.clear();

  if (layout.length === 0) {
    drawDefaultRocketBody(target);
    return defaultShipVisualBounds();
  }

  const bounds = shipLayoutBounds(layout);
  const cellSize = clampNumber(
    Math.min(
      SHIP_DRAW_MAX_CELL,
      SHIP_DRAW_MAX_WIDTH / bounds.width,
      SHIP_DRAW_MAX_HEIGHT / bounds.height,
    ),
    SHIP_DRAW_MIN_CELL,
    SHIP_DRAW_MAX_CELL,
  );
  const shipWidth = bounds.width * cellSize;
  const shipHeight = bounds.height * cellSize;
  const left = -shipWidth * 0.5;
  const top = -shipHeight * 0.5;

  for (const placedPart of layout) {
    const part = partLabels[placedPart.partId];
    const paint = paintForPlacedPart(placedPart, part);
    const size = rotatedPartSize(part, placedPart.rotation);
    const x = left + (placedPart.x - bounds.minX) * cellSize;
    const y = top + (placedPart.y - bounds.minY) * cellSize;
    const width = size.width * cellSize;
    const height = size.height * cellSize;

    for (let cellY = 0; cellY < size.height; cellY += 1) {
      for (let cellX = 0; cellX < size.width; cellX += 1) {
        const cellPaint = paintCellForPlacedPart(placedPart, cellX, cellY);
        const color = cssHexToNumber(cellPaint?.color ?? paint.color);
        const highlight = mixColor(color, 0xffffff, 0.24);
        const shade = mixColor(color, 0x05070d, 0.32);
        const cellLeft = x + cellX * cellSize;
        const cellTop = y + cellY * cellSize;

        target
          .rect(cellLeft, cellTop, cellSize, cellSize)
          .fill(color)
          .rect(cellLeft, cellTop, cellSize, Math.max(1.4, cellSize * 0.16))
          .fill({ color: highlight, alpha: 0.32 })
          .rect(
            cellLeft,
            cellTop + cellSize - Math.max(1.4, cellSize * 0.13),
            cellSize,
            Math.max(1.4, cellSize * 0.13),
          )
          .fill({ color: shade, alpha: 0.2 });
      }
    }

    for (const stroke of paintStrokesForPlacedPart(placedPart)) {
      const color = cssHexToNumber(stroke.color);
      const radius = Math.max(1, stroke.size * cellSize * 0.5);
      const centerX = x + stroke.x * cellSize;
      const centerY = y + stroke.y * cellSize;

      target.circle(centerX, centerY, radius).fill({ color, alpha: 0.94 });
    }

    target.rect(x, y, width, height).stroke({ color: 0x07111d, alpha: 0.78, width: 1.5 });

    drawShipPartGridLines(target, x, y, size.width, size.height, cellSize);
  }

  return {
    left,
    right: left + shipWidth,
    top,
    bottom: top + shipHeight,
  };
}

function shipLayoutBounds(layout) {
  return layout.reduce(
    (bounds, placedPart) => {
      const part = partLabels[placedPart.partId];
      const size = rotatedPartSize(part, placedPart.rotation);
      const minX = Math.min(bounds.minX, placedPart.x);
      const minY = Math.min(bounds.minY, placedPart.y);
      const maxX = Math.max(bounds.maxX, placedPart.x + size.width);
      const maxY = Math.max(bounds.maxY, placedPart.y + size.height);

      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, width: 1, height: 1 },
  );
}

function drawShipPartGridLines(target, x, y, columns, rows, cellSize) {
  for (let column = 1; column < columns; column += 1) {
    const lineX = x + column * cellSize;
    target
      .moveTo(lineX, y)
      .lineTo(lineX, y + rows * cellSize)
      .stroke({ color: 0x07111d, alpha: 0.22, width: 1 });
  }

  for (let row = 1; row < rows; row += 1) {
    const lineY = y + row * cellSize;
    target
      .moveTo(x, lineY)
      .lineTo(x + columns * cellSize, lineY)
      .stroke({ color: 0x07111d, alpha: 0.22, width: 1 });
  }
}

function drawDefaultRocketBody(target) {
  target
    .moveTo(0, -76)
    .lineTo(22, -38)
    .lineTo(22, 46)
    .quadraticCurveTo(22, 56, 12, 58)
    .lineTo(-12, 58)
    .quadraticCurveTo(-22, 56, -22, 46)
    .lineTo(-22, -38)
    .closePath()
    .fill(0xd8e4ed)
    .moveTo(0, -76)
    .lineTo(22, -38)
    .lineTo(-22, -38)
    .closePath()
    .fill(0xaebbc6)
    .circle(0, -18, 8)
    .fill(0x1d3142)
    .rect(-15, 8, 30, 18)
    .fill(0xbccbd6)
    .moveTo(-22, 34)
    .lineTo(-40, 58)
    .lineTo(-22, 56)
    .closePath()
    .fill(0x8f9daa)
    .moveTo(22, 34)
    .lineTo(40, 58)
    .lineTo(22, 56)
    .closePath()
    .fill(0x8f9daa);
}

function defaultShipVisualBounds() {
  return {
    left: -40,
    right: 40,
    top: -76,
    bottom: 58,
  };
}

function cssHexToNumber(color) {
  if (typeof color !== "string") {
    return 0xd8e4ed;
  }

  const normalized = color.trim().replace(/^#/, "");
  const parsed = Number.parseInt(normalized, 16);

  return Number.isFinite(parsed) ? parsed : 0xd8e4ed;
}

function mixColor(from, to, amount) {
  const r1 = (from >> 16) & 255;
  const g1 = (from >> 8) & 255;
  const b1 = from & 255;
  const r2 = (to >> 16) & 255;
  const g2 = (to >> 8) & 255;
  const b2 = to & 255;
  const r = Math.round(r1 + (r2 - r1) * amount);
  const g = Math.round(g1 + (g2 - g1) * amount);
  const b = Math.round(b1 + (b2 - b1) * amount);

  return (r << 16) + (g << 8) + b;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value) {
  return [...value].reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) % 1000003;
  }, 17);
}

function noiseUnit(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distance)} m`;
}

function formatPartFootprint(part, rotation = 0) {
  const size = rotatedPartSize(part, rotation);

  return `${size.width}x${size.height}`;
}

function metalRequirementText(part, rotation = 0) {
  const size = rotatedPartSize(part, rotation);
  const cellCount = size.width * size.height;
  const metalLineCount = cellCount * METAL_PIECES_PER_CELL;

  return `Place first, then seal ${cellCount} blocks with ${metalLineCount} metal lines.`;
}

function placedPartSealText(placedPart, part) {
  const activeShip = activeShipFor();
  const metalPieces = metalPiecesForShip(activeShip);
  const occupiedCells = occupiedCellsFor(placedPart, part);
  const sealedLines = occupiedCells.reduce((total, cell) => {
    return total + (metalPieces.counts.get(cell) ?? 0);
  }, 0);
  const requiredLines = occupiedCells.length * METAL_PIECES_PER_CELL;

  return `${sealedLines}/${requiredLines} metal lines sealed`;
}

function formatResources(resources) {
  return resources.map((resource) => resource[0].toUpperCase() + resource.slice(1)).join(", ");
}

function formatResourceInventory(resources) {
  const stockedResources = RESOURCE_TYPES.filter((resourceType) => {
    return (resources[resourceType] ?? 0) > 0;
  });

  if (stockedResources.length === 0) {
    return "No resources";
  }

  return stockedResources.map((resourceType) => {
    return `${resourceLabel(resourceType)} ${resources[resourceType]}`;
  }).join(" | ");
}

function resourceLabel(resourceType) {
  return resourceType[0].toUpperCase() + resourceType.slice(1);
}
