import { describe, expect, it } from "vitest";
import {
  RESOURCE_TYPES,
  SAVE_DATA_VERSION,
  STARTER_SHIP_LAYOUT,
  STARTER_PART_IDS,
  createDefaultSaveData,
  normalizeSaveData,
} from "../src/data/saveData.js";

describe("save data", () => {
  it("defines resources, available parts, discovered planets, and a gridded ship", () => {
    const saveData = createDefaultSaveData();

    expect(saveData.version).toBe(SAVE_DATA_VERSION);
    expect(saveData.money).toBeGreaterThan(0);
    expect(saveData.resources.water).toBeGreaterThan(0);
    expect(Object.keys(saveData.resources)).toEqual(RESOURCE_TYPES);
    expect(saveData.unlockedParts).toEqual(expect.arrayContaining(STARTER_PART_IDS));
    expect(saveData.unlockedParts).not.toContain("tank-kerolox-m");
    expect(saveData.discoveredPlanets).toContain("homeworld");
    expect(saveData.activeMissionPlanetId).toBe("ember");
    expect(saveData.builtShips[0]).toMatchObject({
      id: "ship-pioneer-test-vehicle",
      name: "Pioneer Test Vehicle",
      grid: {
        columns: 12,
        rows: 16,
      },
    });
    expect(saveData.builtShips[0].layout).toEqual(STARTER_SHIP_LAYOUT);
    expect(saveData.builtShips[0].layout).toHaveLength(STARTER_PART_IDS.length);
    expect(saveData.builtShips[0].layout.map((part) => part.partId)).toEqual(
      expect.arrayContaining(STARTER_PART_IDS),
    );
    expect(saveData.builtShips[0].layout).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partId: "air-maker-basic",
        }),
      ]),
    );
  });

  it("normalizes malformed saves back into a playable starter state", () => {
    const normalized = normalizeSaveData({
      money: -5,
      unlockedParts: [],
      discoveredPlanets: [42],
      builtShips: [],
      resources: {
        oil: -2,
        water: 7.8,
      },
      lastSavePoint: {
        planetId: "",
        planetName: "Homeworld",
        savedAt: 42,
      },
    });

    expect(normalized.money).toBe(createDefaultSaveData().money);
    expect(normalized.resources.oil).toBe(0);
    expect(normalized.resources.water).toBe(7);
    expect(normalized.unlockedParts).toEqual(expect.arrayContaining(STARTER_PART_IDS));
    expect(normalized.discoveredPlanets).toContain("homeworld");
    expect(normalized.activeMissionPlanetId).toBe("ember");
    expect(normalized.builtShips).toHaveLength(1);
    expect(normalized.builtShips[0].layout).toEqual(STARTER_SHIP_LAYOUT);
    expect(normalized.lastSavePoint).toMatchObject({
      planetId: "homeworld",
      planetName: "Homeworld",
      savedAt: null,
    });
  });
});
