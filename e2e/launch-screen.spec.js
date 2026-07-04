import { expect, test } from "@playwright/test";

const SAVE_KEY = "galaxy-exploration.save.v2";
const ALL_PART_IDS = [
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
];

async function openReadyGame(page) {
  await page.goto("/");
  await expect(page.locator("html[data-app-ready='true']")).toBeAttached({
    timeout: 15000,
  });
}

async function reloadReadyGame(page) {
  await page.reload();
  await expect(page.locator("html[data-app-ready='true']")).toBeAttached({
    timeout: 15000,
  });
}

async function buyPartTemplate(page, partId) {
  await page.getByRole("button", { name: "Parts" }).click();
  await page
    .locator('[data-screen-panel="shop"]')
    .locator(`[data-part-id="${partId}"]`)
    .getByRole("button", { name: "Buy" })
    .click();
}

async function seedBuilderSave(page, { hullCells = [], resources = {}, unlockedParts = [] }) {
  await page.evaluate(
    ({ saveKey, hullCells: nextHullCells, resources: nextResources, unlockedParts: nextParts }) => {
      const saveData = JSON.parse(localStorage.getItem(saveKey));
      const activeShip =
        saveData.builtShips.find((ship) => ship.id === saveData.activeShipId) ??
        saveData.builtShips[0];

      saveData.unlockedParts = [...new Set([...saveData.unlockedParts, ...nextParts])];
      saveData.resources = { ...saveData.resources, ...nextResources };
      activeShip.hullCells = nextHullCells;
      activeShip.layout = [];
      activeShip.partIds = [];
      localStorage.setItem(saveKey, JSON.stringify(saveData));
    },
    {
      saveKey: SAVE_KEY,
      hullCells,
      resources,
      unlockedParts,
    },
  );
  await reloadReadyGame(page);
}

async function prepareAirMaker(page, waterAmount) {
  await buyPartTemplate(page, "air-maker-basic");
  await page.getByRole("button", { name: "Builder" }).click();
  await page.locator('[data-builder-part="air-maker-basic"]').dispatchEvent("click");
  await page.locator('[data-builder-cell="2,3"]').dispatchEvent("click");
  await expect(page.locator("#builder-status")).toContainText("Placed Air Maker");

  if (waterAmount !== undefined) {
    await page.evaluate(
      ({ saveKey, water }) => {
        const saveData = JSON.parse(localStorage.getItem(saveKey));
        saveData.resources.water = water;
        localStorage.setItem(saveKey, JSON.stringify(saveData));
      },
      { saveKey: SAVE_KEY, water: waterAmount },
    );
    await reloadReadyGame(page);
  } else {
    await page.locator('[data-screen-target="launch"]').click();
  }
}

test("renders the launch prototype shell", async ({ page }) => {
  await openReadyGame(page);

  await expect(page).toHaveTitle(/Galaxy Exploration/);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("hud")).toContainText("Home Alt");
  await expect(page.getByTestId("mission-panel")).toContainText("Ember");
  await expect(page.getByTestId("save-point")).toContainText("Homeworld Save Point");
  await expect(page.getByLabel("Mission target")).toHaveValue("ember");
  await expect(page.getByRole("button", { name: "Steer left" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Steer right" })).toBeVisible();
  await expect(
    page.getByTestId("hud").getByRole("button", { name: "Launch" }),
  ).toBeVisible();
});

test("saves game data and resources at the Homeworld save point", async ({ page }) => {
  await openReadyGame(page);

  await page.getByRole("button", { name: "Save Game" }).click();

  await expect(page.locator("#save-status")).toContainText("Saved at Homeworld");

  const savedData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v2"));
  });

  expect(savedData.resources.metal).toBe(0);
  expect(savedData.resources.water).toBeGreaterThan(0);
  expect(savedData.resources.oil).toBe(0);
  expect(savedData.lastSavePoint).toMatchObject({
    planetId: "homeworld",
    planetName: "Homeworld",
  });
});

test("buys costly part templates from the Parts Bay", async ({ page }) => {
  test.setTimeout(60000);
  await openReadyGame(page);

  await page.getByRole("button", { name: "Parts" }).click();
  const parts = page.locator('[data-screen-panel="shop"]');
  const metalPack = parts.locator('[data-part-id="metal-outline"]');
  const airMaker = parts.locator('[data-part-id="air-maker-basic"]');
  const tank = parts.locator('[data-part-id="tank-kerolox-m"]');

  await expect(parts).toContainText("Parts Bay");
  await expect(page.locator("#shop-money")).toContainText("25,000 credits | Metal 0");
  await expect(metalPack).toContainText("Metal Pack");
  await expect(metalPack).toContainText("1,200 credits");
  await expect(airMaker).toContainText("Air Maker");
  await expect(airMaker).toContainText("1,800 credits");
  await expect(airMaker).toContainText("Required for launch");
  await expect(tank).toContainText("Kerolox Tank M");
  await expect(tank).toContainText("4,200 credits");
  await metalPack.getByRole("button", { name: "Buy" }).click();
  await airMaker.getByRole("button", { name: "Buy" }).click();

  await expect(page.locator("#shop-money")).toContainText("22,000 credits | Metal 12");
  await expect(airMaker.getByRole("button", { name: "Owned" })).toBeVisible();

  const savedData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v2"));
  });

  expect(savedData.resources.metal).toBe(12);
  expect(savedData.unlockedParts).toContain("air-maker-basic");
  expect(savedData.money).toBe(22000);
});

test("places a part before sealing it with metal lines", async ({ page }) => {
  test.setTimeout(60000);
  await openReadyGame(page);
  await seedBuilderSave(page, {
    resources: { metal: 16 },
    unlockedParts: ["tank-kerolox-s"],
  });

  await page.getByRole("button", { name: "Builder" }).click();
  const builder = page.locator('[data-screen-panel="builder"]');

  await builder.locator('[data-builder-part="metal-outline"]').dispatchEvent("click");
  await builder.locator('[data-builder-cell="0,0"]').dispatchEvent("click");
  await expect(page.locator("#builder-status")).toContainText("Place a part first");
  await builder.locator('[data-builder-part="tank-kerolox-s"]').dispatchEvent("click");
  await expect(page.locator("#builder-status")).toContainText(
    "Kerolox Tank S: Place first, then seal 8 blocks with 16 metal lines.",
  );
  await builder.locator('[data-builder-cell="0,0"]').dispatchEvent("click");
  await expect(page.locator("#builder-status")).toContainText("Placed Kerolox Tank S");
  await expect(builder.locator('[data-placed-part="tank-kerolox-s"]')).toContainText(
    "0/16 metal lines sealed",
  );
  await builder.locator('[data-builder-part="metal-outline"]').dispatchEvent("click");
  await builder.locator('[data-builder-cell="0,0"]').dispatchEvent("click");
  await expect(page.locator("#builder-status")).toContainText(
    "Added metal line (1/2 on this block, 15 left)",
  );
  await builder.locator('[data-builder-cell="0,0"]').dispatchEvent("click");

  await expect(page.locator("#builder-status")).toContainText(
    "Added metal line (2/2 on this block, 14 left)",
  );
  await expect(builder.locator(".builder-metal-line.is-sealed")).toHaveCount(1);

  const sealedSaveData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v2"));
  });
  const sealedActiveShip = sealedSaveData.builtShips.find(
    (ship) => ship.id === sealedSaveData.activeShipId,
  );

  expect(sealedSaveData.resources.metal).toBe(14);
  expect(sealedActiveShip.hullCells).toEqual(
    expect.arrayContaining(["0,0:a", "0,0:b"]),
  );
});

test("places, moves, rotates, and unplaces part templates on the gridded ship graph", async ({
  page,
}) => {
  test.setTimeout(60000);
  await openReadyGame(page);
  await seedBuilderSave(page, {
    resources: { metal: 1 },
    unlockedParts: ["tank-kerolox-m"],
  });

  await page.getByRole("button", { name: "Builder" }).click();
  const builder = page.locator('[data-screen-panel="builder"]');
  const fuelPart = builder.locator('[data-builder-part="tank-kerolox-m"]');
  const openGridCell = builder.locator('[data-builder-cell="0,9"]');
  const movedGridCell = builder.locator('[data-builder-cell="0,12"]');

  await expect(builder.locator(".builder-graph")).toBeVisible();
  await expect(builder.locator(".builder-grid-frame")).toBeVisible();
  await expect(builder.locator("[data-placed-part]")).toHaveCount(0);
  await expect(fuelPart).toContainText("Kerolox Tank M");
  await fuelPart.dispatchEvent("click");
  await openGridCell.dispatchEvent("click");

  await expect(builder.locator('[data-placed-part="tank-kerolox-m"]')).toContainText(
    "Kerolox Tank M",
  );
  await expect(page.locator("#builder-status")).toContainText("Placed Kerolox Tank M");
  await expect(builder.locator("[data-placed-part]")).toHaveCount(1);

  await page.keyboard.press("R");
  await expect(page.locator("#builder-status")).toContainText("Rotated Kerolox Tank M");
  await movedGridCell.dispatchEvent("click");
  await expect(page.locator("#builder-status")).toContainText("Moved Kerolox Tank M");

  const movedSaveData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v2"));
  });
  const movedActiveShip = movedSaveData.builtShips.find(
    (ship) => ship.id === movedSaveData.activeShipId,
  );

  expect(movedActiveShip.hullCells).toHaveLength(0);
  expect(movedSaveData.resources.metal).toBe(1);
  expect(movedActiveShip.layout).toContainEqual(
    expect.objectContaining({
      partId: "tank-kerolox-m",
      rotation: 90,
      x: 0,
      y: 12,
    }),
  );

  await page.keyboard.press("U");
  await expect(page.locator("#builder-status")).toContainText("Unplace ready");
  await builder.locator('[data-placed-part="tank-kerolox-m"]').dispatchEvent("click");

  await expect(page.locator("#builder-status")).toContainText(
    "Returned Kerolox Tank M to templates",
  );
  await expect(builder.locator("[data-placed-part]")).toHaveCount(0);
  await expect(fuelPart).toContainText("Kerolox Tank M");

  const unplacedSaveData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v2"));
  });
  const unplacedActiveShip = unplacedSaveData.builtShips.find(
    (ship) => ship.id === unplacedSaveData.activeShipId,
  );

  expect(unplacedActiveShip.layout).not.toContainEqual(
    expect.objectContaining({
      partId: "tank-kerolox-m",
    }),
  );

  await fuelPart.dispatchEvent("click");
  await openGridCell.dispatchEvent("click");
  await expect(page.locator("#builder-status")).toContainText("Placed Kerolox Tank M");
  await builder.locator('[data-builder-part="metal-outline"]').dispatchEvent("click");
  await builder.locator('[data-builder-cell="0,9"]').dispatchEvent("click");
  await expect(page.locator("#builder-status")).toContainText(
    "Added metal line (1/2 on this block, 0 left)",
  );
  await page.keyboard.press("U");
  await expect(page.locator("#builder-status")).toContainText("Unplace ready");
  await builder.locator('[data-builder-cell="0,9"]').dispatchEvent("click");

  await expect(page.locator("#builder-status")).toContainText(
    "Removed metal line (1 metal ready)",
  );
  await expect(builder.locator(".builder-metal-line")).toHaveCount(0);

  const metalRemovedSaveData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v2"));
  });
  const metalRemovedActiveShip = metalRemovedSaveData.builtShips.find(
    (ship) => ship.id === metalRemovedSaveData.activeShipId,
  );

  expect(metalRemovedSaveData.resources.metal).toBe(1);
  expect(metalRemovedActiveShip.hullCells).not.toContain("0,9:a");
});

test("scrolls through all part templates in the builder", async ({ page }) => {
  test.setTimeout(60000);
  await openReadyGame(page);

  await page.evaluate(
    ({ saveKey, partIds }) => {
      const saveData = JSON.parse(localStorage.getItem(saveKey));
      saveData.unlockedParts = partIds;
      localStorage.setItem(saveKey, JSON.stringify(saveData));
    },
    { saveKey: SAVE_KEY, partIds: ALL_PART_IDS },
  );
  await reloadReadyGame(page);

  await page.getByRole("button", { name: "Builder" }).click();
  const partsList = page.locator("#builder-ship-parts");
  const beforeScroll = await partsList.evaluate((element) => {
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  });

  expect(beforeScroll.scrollHeight).toBeGreaterThan(beforeScroll.clientHeight);

  await partsList.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const afterScroll = await partsList.evaluate((element) => element.scrollTop);
  expect(afterScroll).toBeGreaterThan(beforeScroll.scrollTop);
  await expect(page.locator('[data-builder-part="radar-planetary"]')).toBeVisible();
});

test("updates the mission text when a new target is selected", async ({ page }) => {
  await openReadyGame(page);

  await page.getByLabel("Mission target").selectOption("frost");

  await expect(page.getByTestId("mission-panel")).toContainText("Frost");
  await expect(page.locator("#mission-status")).toContainText("Target: Frost");
});

test("shows a top notification instead of the result modal after landing", async ({
  page,
}) => {
  test.setTimeout(60000);
  await openReadyGame(page);
  await prepareAirMaker(page);

  await page.locator("#throttle").evaluate((input) => {
    input.value = "0";
  });
  await page.getByTestId("hud").getByRole("button", { name: "Launch" }).dispatchEvent("click");

  await expect(page.getByTestId("landing-notification")).toContainText(
    "Landing Successful",
    { timeout: 10000 },
  );
  await expect(page.locator("#result-panel")).toBeHidden();
  await expect(page.locator("#result-title")).not.toContainText("Touchdown Complete");
});

test("arrow steering keys do not change focused throttle", async ({ page }) => {
  await openReadyGame(page);

  const throttle = page.locator("#throttle");
  await throttle.evaluate((input) => {
    input.focus();
    input.value = "72";
  });

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");

  await expect(throttle).toHaveValue("72");
});

test("air maker consumes water and blocks launch when water is gone", async ({ page }) => {
  test.setTimeout(60000);
  await openReadyGame(page);
  await prepareAirMaker(page, 1);

  await expect(page.locator("#mission-status")).toContainText("Air Maker ready");
  await page.getByTestId("hud").getByRole("button", { name: "Launch" }).dispatchEvent("click");
  await page.waitForFunction(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v2")).resources.water === 0;
  });

  await page.getByRole("button", { name: "Reset" }).dispatchEvent("click");
  await page.getByTestId("hud").getByRole("button", { name: "Launch" }).dispatchEvent("click");

  await expect(page.locator("#mission-status")).toContainText("Air Maker needs water");
  await expect(page.locator("#outcome")).toContainText("Preflight");
});

test("adds Homeworld as a return target after leaving it", async ({ page }) => {
  test.setTimeout(60000);
  await openReadyGame(page);
  await prepareAirMaker(page);

  const targetOptions = page.locator("#mission-target option[value='homeworld']");
  await expect(targetOptions).toHaveCount(0);

  await page.locator("#throttle").evaluate((input) => {
    input.value = "100";
  });
  await page.getByTestId("hud").getByRole("button", { name: "Launch" }).dispatchEvent("click");

  await expect(targetOptions).toHaveCount(1, { timeout: 30000 });
  await page.getByLabel("Mission target").selectOption("homeworld");

  await expect(page.getByTestId("mission-panel")).toContainText("Homeworld");
  await expect(page.locator("#mission-status")).toContainText("Homeworld");
});

test("switches between foundation screens", async ({ page }) => {
  test.setTimeout(60000);
  await openReadyGame(page);

  await page.getByRole("button", { name: "Parts" }).click();
  const parts = page.locator('[data-screen-panel="shop"]');
  await expect(parts).toContainText("Parts Bay");
  await expect(parts).toContainText("Metal Pack");
  await expect(parts).toContainText("Pioneer Command");
  await expect(parts).toContainText("Air Maker");
  await expect(parts).toContainText("Kerolox Tank M");
  await expect(parts).toContainText("Vector-2 Engine");
  await expect(parts).toContainText("Planetary Radar");

  await page.getByRole("button", { name: "Builder" }).click();
  const builder = page.locator('[data-screen-panel="builder"]');
  await expect(builder.getByText("Active Ship")).toBeVisible();
  await expect(builder.getByText("Pioneer Test Vehicle")).toBeVisible();
  await expect(builder.locator(".builder-graph")).toBeVisible();
  await expect(builder.locator(".builder-grid-frame")).toBeVisible();
  await expect(builder.locator("[data-placed-part]")).toHaveCount(0);
  await expect(builder.locator('[data-builder-part="metal-outline"]')).toContainText(
    "Metal Line",
  );
  await expect(page.locator("#builder-status")).toContainText("Install an Air Maker");

  await page.getByRole("button", { name: "Travel" }).click();
  const travel = page.locator('[data-screen-panel="travel"]');
  await expect(travel).toContainText("Known Space");
  await expect(travel).toContainText("Homeworld");
  await expect(travel).toContainText("Ember");
  await expect(travel).toContainText("Brine");
  await expect(travel).toContainText("Vesper");
  await expect(travel).toContainText("Sable");
  await expect(travel).toContainText("Glint");
  await expect(travel).toContainText("Kelp");
  await expect(travel).toContainText("Frost");
  await expect(travel).toContainText("Aurelia");
  await expect(travel).toContainText("Resources: water.");
  await expect(travel).toContainText("Resources: oil, iron.");
  await expect(travel).toContainText("Resources: ice, water.");
  await expect(travel).toContainText("Resources: water, copper.");
});
