import { describe, expect, it } from "vitest";
import {
  RESOURCE_TYPES,
  SAVE_DATA_VERSION,
  STARTER_SHIP_HULL_CELLS,
  STARTER_SHIP_LAYOUT,
  createDefaultSaveData,
  normalizeSaveData,
} from "../src/data/saveData.js";

describe("save data", () => {
  it("starts with money, resources, no owned parts, and an empty gridded ship", () => {
    const saveData = createDefaultSaveData();

    expect(saveData.version).toBe(SAVE_DATA_VERSION);
    expect(saveData.money).toBeGreaterThan(0);
    expect(saveData.resources.metal).toBe(0);
    expect(saveData.resources.water).toBeGreaterThan(0);
    expect(Object.keys(saveData.resources)).toEqual(RESOURCE_TYPES);
    expect(saveData.unlockedParts).toEqual([]);
    expect(saveData.unlockedPaints).toEqual([]);
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
    expect(saveData.builtShips[0].hullCells).toEqual(STARTER_SHIP_HULL_CELLS);
    expect(saveData.builtShips[0].layout).toEqual(STARTER_SHIP_LAYOUT);
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
    expect(normalized.resources.metal).toBe(0);
    expect(normalized.resources.water).toBe(7);
    expect(normalized.unlockedParts).toEqual([]);
    expect(normalized.unlockedPaints).toEqual([]);
    expect(normalized.discoveredPlanets).toContain("homeworld");
    expect(normalized.activeMissionPlanetId).toBe("ember");
    expect(normalized.builtShips).toHaveLength(1);
    expect(normalized.builtShips[0].hullCells).toEqual(STARTER_SHIP_HULL_CELLS);
    expect(normalized.builtShips[0].layout).toEqual(STARTER_SHIP_LAYOUT);
    expect(normalized.lastSavePoint).toMatchObject({
      planetId: "homeworld",
      planetName: "Homeworld",
      savedAt: null,
    });
  });

  it("keeps bought paint colors and painted ship parts", () => {
    const normalized = normalizeSaveData({
      ...createDefaultSaveData(),
      unlockedPaints: ["paint-brown"],
      builtShips: [
        {
          ...createDefaultSaveData().builtShips[0],
          layout: [
            {
              id: "painted-tank",
              partId: "tank-kerolox-s",
              x: 1,
              y: 2,
              rotation: 90,
              paintId: "paint-brown",
              paintCells: {
                "0,0": {
                  paintId: "paint-peach",
                  name: "Peach Paint",
                  color: "#f5b98b",
                },
              },
            },
          ],
        },
      ],
    });

    expect(normalized.unlockedPaints).toContain("paint-brown");
    expect(normalized.builtShips[0].layout).toContainEqual(
      expect.objectContaining({
        id: "painted-tank",
        paintId: "paint-brown",
        paintCells: {
          "0,0": {
            paintId: "paint-peach",
            name: "Peach Paint",
            color: "#f5b98b",
          },
        },
      }),
    );
  });
});
