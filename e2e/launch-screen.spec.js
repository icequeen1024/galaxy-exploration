import { expect, test } from "@playwright/test";

async function openReadyGame(page) {
  await page.goto("/");
  await expect(page.locator("html[data-app-ready='true']")).toBeAttached({
    timeout: 15000,
  });
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
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v1"));
  });

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
  const airMaker = parts.locator('[data-part-id="air-maker-basic"]');
  const tank = parts.locator('[data-part-id="tank-kerolox-m"]');

  await expect(parts).toContainText("Parts Bay");
  await expect(page.locator("#shop-money")).toContainText("25,000 credits");
  await expect(airMaker).toContainText("Air Maker");
  await expect(airMaker).toContainText("Owned");
  await expect(airMaker).toContainText("Required for launch");
  await expect(tank).toContainText("Kerolox Tank M");
  await expect(tank).toContainText("4,200 credits");
  await tank.getByRole("button", { name: "Buy" }).click();

  await expect(page.locator("#shop-money")).toContainText("20,800 credits");
  await expect(tank.getByRole("button", { name: "Owned" })).toBeVisible();

  const savedData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v1"));
  });

  expect(savedData.unlockedParts).toContain("tank-kerolox-m");
  expect(savedData.money).toBe(20800);
});

test("places, moves, and rotates part templates on the gridded ship graph", async ({ page }) => {
  test.setTimeout(60000);
  await openReadyGame(page);

  await page.getByRole("button", { name: "Parts" }).click();
  await page
    .locator('[data-screen-panel="shop"]')
    .locator('[data-part-id="tank-kerolox-m"]')
    .getByRole("button", { name: "Buy" })
    .click();

  await page.getByRole("button", { name: "Builder" }).click();
  const builder = page.locator('[data-screen-panel="builder"]');
  const fuelPart = builder.locator('[data-builder-part="tank-kerolox-m"]');
  const openGridCell = builder.locator('[data-builder-cell="0,9"]');
  const movedGridCell = builder.locator('[data-builder-cell="8,9"]');

  await expect(builder.locator(".builder-graph")).toBeVisible();
  await expect(builder.locator(".builder-grid-frame")).toBeVisible();
  await expect(builder.locator("[data-placed-part]")).toHaveCount(10);
  await expect(builder.locator('[data-placed-part="air-maker-basic"]')).toContainText(
    "Air Maker",
  );
  await expect(fuelPart).toContainText("Kerolox Tank M");
  await fuelPart.dragTo(openGridCell);

  await expect(builder.locator('[data-placed-part="tank-kerolox-m"]')).toContainText(
    "Kerolox Tank M",
  );
  await expect(page.locator("#builder-status")).toContainText("Placed Kerolox Tank M");
  await expect(builder.locator("[data-placed-part]")).toHaveCount(11);

  await page.keyboard.press("R");
  await expect(page.locator("#builder-status")).toContainText("Rotated Kerolox Tank M");
  await movedGridCell.click();
  await expect(page.locator("#builder-status")).toContainText("Moved Kerolox Tank M");

  const savedData = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v1"));
  });
  const activeShip = savedData.builtShips.find((ship) => ship.id === savedData.activeShipId);

  expect(activeShip.layout).toContainEqual(
    expect.objectContaining({
      partId: "tank-kerolox-m",
      rotation: 90,
      x: 8,
      y: 9,
    }),
  );
});

test("scrolls through all part templates in the builder", async ({ page }) => {
  await openReadyGame(page);

  await page.evaluate(() => {
    const saveKey = "galaxy-exploration.save.v1";
    const saveData = JSON.parse(localStorage.getItem(saveKey));
    saveData.unlockedParts = [
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
    localStorage.setItem(saveKey, JSON.stringify(saveData));
  });
  await page.reload();
  await expect(page.locator("html[data-app-ready='true']")).toBeAttached({
    timeout: 15000,
  });

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
  await openReadyGame(page);

  await page.locator("#throttle").evaluate((input) => {
    input.value = "0";
  });
  await page.getByTestId("hud").getByRole("button", { name: "Launch" }).click();

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
  await openReadyGame(page);

  await page.evaluate(() => {
    const saveKey = "galaxy-exploration.save.v1";
    const saveData = JSON.parse(localStorage.getItem(saveKey));
    saveData.resources.water = 1;
    localStorage.setItem(saveKey, JSON.stringify(saveData));
  });
  await page.reload();
  await expect(page.locator("html[data-app-ready='true']")).toBeAttached({
    timeout: 15000,
  });

  await expect(page.locator("#mission-status")).toContainText("Air Maker ready");
  await page.getByTestId("hud").getByRole("button", { name: "Launch" }).click();
  await page.waitForFunction(() => {
    return JSON.parse(localStorage.getItem("galaxy-exploration.save.v1")).resources.water === 0;
  });

  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByTestId("hud").getByRole("button", { name: "Launch" }).click();

  await expect(page.locator("#mission-status")).toContainText("Air Maker needs water");
  await expect(page.locator("#outcome")).toContainText("Preflight");
});

test("adds Homeworld as a return target after leaving it", async ({ page }) => {
  test.setTimeout(60000);
  await openReadyGame(page);

  const targetOptions = page.locator("#mission-target option[value='homeworld']");
  await expect(targetOptions).toHaveCount(0);

  await page.locator("#throttle").evaluate((input) => {
    input.value = "100";
  });
  await page.getByTestId("hud").getByRole("button", { name: "Launch" }).click();

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
  await expect(builder.locator("[data-placed-part]")).toHaveCount(10);
  await expect(builder.locator('[data-placed-part="air-maker-basic"]')).toContainText(
    "Air Maker",
  );
  await expect(builder.locator('[data-builder-part="tank-kerolox-s"]')).toContainText(
    "Kerolox Tank S",
  );

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
