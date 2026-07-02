import { Application, Assets, Container, Graphics, Sprite, Text } from "pixi.js";
import "./styles.css";
import { RESOURCE_TYPES, loadSaveData, saveGameData } from "./data/saveData.js";
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
let draggedBuilderPartId = null;
let builderStatusText = "Ready";

const ROCKET_VISUAL_SCALE = 0.32;
const ROCKET_SURFACE_OFFSET = 26;
const HOMEWORLD_VIEW_SCALE = 0.0072;
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
    cost: 0,
    category: "Command",
  },
  {
    id: "tank-kerolox-s",
    name: "Kerolox Tank S",
    detail: "16,000 kg starter propellant",
    cost: 0,
    category: "Fuel",
  },
  {
    id: "engine-swift-1",
    name: "Swift-1 Engine",
    detail: "510 kN liftoff thrust",
    cost: 0,
    category: "Engine",
  },
  {
    id: "legs-light-quad",
    name: "Light Quad Legs",
    detail: "Starter landing stability",
    cost: 0,
    category: "Landing",
  },
  {
    id: "avionics-basic",
    name: "Basic Avionics",
    detail: "Throttle and attitude control",
    cost: 0,
    category: "Avionics",
  },
  {
    id: "tank-kerolox-m",
    name: "Kerolox Tank M",
    detail: "Adds more oil-fuel storage for longer launches.",
    cost: 4200,
    category: "Fuel",
  },
  {
    id: "tank-orbital-xl",
    name: "Orbital Tank XL",
    detail: "Heavy fuel tank for long trips between planets.",
    cost: 9800,
    category: "Fuel",
  },
  {
    id: "engine-vector-2",
    name: "Vector-2 Engine",
    detail: "Stronger sea-level thrust for high gravity liftoff.",
    cost: 7600,
    category: "Engine",
  },
  {
    id: "engine-hawk-vac",
    name: "Hawk Vacuum Engine",
    detail: "Efficient engine for steering and burns in space.",
    cost: 6400,
    category: "Engine",
  },
  {
    id: "legs-heavy-triad",
    name: "Heavy Triad Legs",
    detail: "Wider landing stance for rough planet surfaces.",
    cost: 3600,
    category: "Landing",
  },
  {
    id: "heatshield-ablative",
    name: "Ablative Heat Shield",
    detail: "Protects the ship in thicker atmospheres.",
    cost: 5200,
    category: "Thermal",
  },
  {
    id: "reaction-wheel-r2",
    name: "R2 Reaction Wheel",
    detail: "Faster turning control without wasting fuel.",
    cost: 4800,
    category: "Control",
  },
  {
    id: "science-bay-light",
    name: "Light Science Bay",
    detail: "Stores samples from planets and asteroid fields.",
    cost: 5800,
    category: "Science",
  },
  {
    id: "radar-planetary",
    name: "Planetary Radar",
    detail: "Improves planet scanning and landing approach data.",
    cost: 6900,
    category: "Avionics",
  },
];
const partLabels = Object.fromEntries(PART_CATALOG.map((part) => [part.id, part]));
const BUILDER_SLOTS = [
  {
    id: "command",
    label: "Command Nose",
    category: "Command",
    x: 50,
    y: 12,
  },
  {
    id: "fuel",
    label: "Fuel Core",
    category: "Fuel",
    x: 50,
    y: 34,
  },
  {
    id: "engine",
    label: "Main Engine",
    category: "Engine",
    x: 50,
    y: 72,
  },
  {
    id: "landing",
    label: "Landing Gear",
    category: "Landing",
    x: 50,
    y: 91,
  },
  {
    id: "avionics",
    label: "Avionics Bay",
    category: "Avionics",
    x: 24,
    y: 30,
  },
  {
    id: "control",
    label: "Control Ring",
    category: "Control",
    x: 76,
    y: 30,
  },
  {
    id: "thermal",
    label: "Heat Shield",
    category: "Thermal",
    x: 24,
    y: 70,
  },
  {
    id: "science",
    label: "Science Mount",
    category: "Science",
    x: 76,
    y: 70,
  },
];

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
rocket.addChild(plume, createRocketBody());
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

function reset() {
  state = createLaunchState();
  launchRequested = false;
  steering.clear();
  hud.throttle.value = "72";
  resultUi.panel.hidden = true;
  landingNotification.panel.hidden = true;
}

hud.launchButton.addEventListener("click", () => {
  launchRequested = true;
  resultUi.panel.hidden = true;
  landingNotification.panel.hidden = true;
});

hud.resetButton.addEventListener("click", reset);
hud.saveButton.addEventListener("click", saveAtHomeworld);
resultUi.retryButton.addEventListener("click", reset);
bindSteerButton(hud.steerLeft, "ArrowLeft");
bindSteerButton(hud.steerRight, "ArrowRight");

const blockedThrottleKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

window.addEventListener("keydown", (event) => {
  if (blockedThrottleKeys.has(event.key) && activeScreen === "launch") {
    event.preventDefault();
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    steering.add(event.key);
  }

  if (event.code === "Space") {
    launchRequested = true;
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

  return {
    launch: launchRequested,
    throttle: Number(hud.throttle.value) / 100,
    turnRate: left + right,
  };
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
    renderPlaceholderScreens(saveData);
    return;
  }

  saveData.money -= part.cost;
  saveData.unlockedParts.push(partId);
  Object.assign(saveData, saveGameData(saveData));
  renderPlaceholderScreens(saveData);
}

function switchScreen(screenId) {
  activeScreen = screenId;
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

  screenUi.shopMoney.textContent = `${data.money.toLocaleString()} credits`;
  screenUi.builderShipName.textContent = activeShip?.name ?? "No Ship";
  screenUi.travelPlanetCount.textContent = `${data.discoveredPlanets.length} world${
    data.discoveredPlanets.length === 1 ? "" : "s"
  }`;

  replaceList(
    screenUi.shopParts,
    PART_CATALOG.map((part) => {
      const isOwned = data.unlockedParts.includes(part.id);
      const canShop = isAtHomeworldSavePoint();
      const canAfford = data.money >= part.cost;
      const price = part.cost > 0 ? `${part.cost.toLocaleString()} credits` : "Starter part";

      return {
        partId: part.id,
        label: isOwned ? "Owned" : part.category,
        name: part.name,
        detail: `${part.detail} ${price}.`,
        buttonLabel: isOwned ? "Owned" : "Buy",
        buttonDisabled: isOwned || !canShop || !canAfford,
        buttonTitle: shopButtonTitle(isOwned, canShop, canAfford),
        onAction: () => buyPart(part.id),
      };
    }),
  );

  renderBuilder(data, activeShip);

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

function renderBuilder(data, activeShip) {
  const canBuild = isAtHomeworldSavePoint();
  const ownedParts = data.unlockedParts
    .map((partId) => partLabels[partId])
    .filter(Boolean);

  screenUi.builderStatus.textContent = canBuild ? builderStatusText : "Return to Homeworld";
  screenUi.builderShipParts.replaceChildren(
    ...ownedParts.map((part) => createBuilderPartItem(part, canBuild)),
  );
  screenUi.builderGraph.replaceChildren(createBuilderLinks(), createShipCore());

  for (const slot of BUILDER_SLOTS) {
    screenUi.builderGraph.append(createBuilderSlot(slot, activeShip));
  }
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
  category.textContent = part.category;
  name.textContent = part.name;
  detail.textContent = part.detail;
  item.append(category, name, detail);

  if (selectedBuilderPartId === part.id) {
    item.classList.add("is-selected");
  }

  item.addEventListener("click", () => {
    selectedBuilderPartId = part.id;
    builderStatusText = part.name;
    renderPlaceholderScreens(saveData);
  });
  item.addEventListener("dragstart", (event) => {
    draggedBuilderPartId = part.id;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", part.id);
  });
  item.addEventListener("dragend", () => {
    draggedBuilderPartId = null;
  });

  return item;
}

function createBuilderLinks() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.classList.add("builder-links");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");

  for (const slot of BUILDER_SLOTS) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "50");
    line.setAttribute("y1", "50");
    line.setAttribute("x2", String(slot.x));
    line.setAttribute("y2", String(slot.y));
    svg.append(line);
  }

  return svg;
}

function createShipCore() {
  const core = document.createElement("div");
  const nose = document.createElement("span");
  const body = document.createElement("span");
  const engine = document.createElement("span");

  core.className = "builder-ship-core";
  nose.className = "builder-ship-nose";
  body.className = "builder-ship-body";
  engine.className = "builder-ship-engine";
  core.append(nose, body, engine);

  return core;
}

function createBuilderSlot(slot, activeShip) {
  const equippedPart = equippedPartForSlot(activeShip, slot);
  const node = document.createElement("button");
  const label = document.createElement("span");
  const name = document.createElement("strong");
  const detail = document.createElement("small");

  node.className = "builder-slot";
  node.type = "button";
  node.dataset.builderSlot = slot.id;
  node.dataset.category = slot.category;
  node.style.setProperty("--x", `${slot.x}%`);
  node.style.setProperty("--y", `${slot.y}%`);
  node.setAttribute("aria-label", `${slot.label}, ${slot.category}`);
  label.textContent = slot.label;
  name.textContent = equippedPart?.name ?? "Empty";
  detail.textContent = equippedPart?.detail ?? slot.category;
  node.append(label, name, detail);

  if (!equippedPart) {
    node.classList.add("is-empty");
  }

  node.addEventListener("click", () => {
    if (selectedBuilderPartId) {
      equipPartToSlot(selectedBuilderPartId, slot.id);
    }
  });
  node.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    node.classList.add("is-drop-target");
  });
  node.addEventListener("dragleave", () => {
    node.classList.remove("is-drop-target");
  });
  node.addEventListener("drop", (event) => {
    event.preventDefault();
    node.classList.remove("is-drop-target");
    equipPartToSlot(event.dataTransfer.getData("text/plain") || draggedBuilderPartId, slot.id);
  });

  return node;
}

function activeShipFor(data = saveData) {
  return data.builtShips.find((ship) => ship.id === data.activeShipId) ?? data.builtShips[0];
}

function equippedPartForSlot(activeShip, slot) {
  const partIds = [...(activeShip?.partIds ?? [])].reverse();
  const partId = partIds.find((id) => partLabels[id]?.category === slot.category);

  return partLabels[partId];
}

function equipPartToSlot(partId, slotId) {
  const part = partLabels[partId];
  const slot = BUILDER_SLOTS.find((candidate) => candidate.id === slotId);
  const activeShip = activeShipFor();

  if (!part || !slot || !activeShip) {
    return;
  }

  if (!isAtHomeworldSavePoint()) {
    builderStatusText = "Return to Homeworld";
    renderPlaceholderScreens(saveData);
    return;
  }

  if (!saveData.unlockedParts.includes(part.id)) {
    builderStatusText = "Part locked";
    renderPlaceholderScreens(saveData);
    return;
  }

  if (part.category !== slot.category) {
    builderStatusText = `${part.name} does not fit ${slot.label}`;
    renderPlaceholderScreens(saveData);
    return;
  }

  activeShip.partIds = [
    ...activeShip.partIds.filter((id) => partLabels[id]?.category !== slot.category),
    part.id,
  ];
  selectedBuilderPartId = part.id;
  Object.assign(saveData, saveGameData(saveData));
  builderStatusText = `Equipped ${part.name}`;
  renderPlaceholderScreens(saveData);
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

function shopButtonTitle(isOwned, canShop, canAfford) {
  if (isOwned) {
    return "Already unlocked";
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
  drawPlume(
    Number(hud.throttle.value) / 100,
    state.launched && state.fuelMass > 0 && !TERMINAL_OUTCOMES.has(state.outcome),
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
  const statuses = {
    Preflight: `Target: ${missionPlanet.name}, ${distance} away`,
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

function drawPlume(throttle, isActive) {
  plume.clear();

  if (!isActive || throttle <= 0) {
    return;
  }

  const length = 44 + throttle * 82;
  plume
    .moveTo(-10, 54)
    .lineTo(0, 54 + length)
    .lineTo(10, 54)
    .closePath()
    .fill({ color: 0xffc857, alpha: 0.72 })
    .moveTo(-5, 52)
    .lineTo(0, 52 + length * 0.68)
    .lineTo(5, 52)
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

function createRocketBody() {
  const body = new Graphics();

  body
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

  return body;
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
