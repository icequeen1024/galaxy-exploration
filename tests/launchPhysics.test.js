import { describe, expect, it } from "vitest";
import {
  HOMEWORLD,
  STARTER_SHIP,
  TERMINAL_OUTCOMES,
  atmosphericDensityAtAltitude,
  createLaunchState,
  gravityVectorAtPosition,
  gravityAtAltitude,
  homeworldGravityBody,
  shipMass,
  stepLaunch,
} from "../src/simulation/launchPhysics.js";

describe("launch physics", () => {
  it("weakens gravity with altitude", () => {
    expect(gravityAtAltitude(120000)).toBeLessThan(HOMEWORLD.surfaceGravity);
  });

  it("computes spherical gravity toward the planet center", () => {
    const gravity = gravityVectorAtPosition(
      { x: HOMEWORLD.radius, y: -HOMEWORLD.radius },
      [homeworldGravityBody()],
    );

    expect(gravity.x).toBeLessThan(0);
    expect(Math.abs(gravity.y)).toBeLessThan(0.000001);
  });

  it("combines gravity from multiple real bodies", () => {
    const gravity = gravityVectorAtPosition(
      { x: 0, y: 0 },
      [
        homeworldGravityBody(),
        {
          id: "test-world",
          name: "Test World",
          radius: 3000,
          surfaceGravity: 4,
          worldX: 12000,
          worldY: 0,
        },
      ],
    );

    expect(gravity.x).toBeGreaterThan(0);
    expect(gravity.y).toBeLessThan(0);
  });

  it("removes atmosphere above the atmosphere height", () => {
    expect(atmosphericDensityAtAltitude(HOMEWORLD.atmosphereHeight + 1)).toBe(0);
  });

  it("burns fuel and reduces ship mass under throttle", () => {
    const initial = createLaunchState();
    const next = stepLaunch(initial, { launch: true, throttle: 1 }, 1);

    expect(next.fuelMass).toBeLessThan(initial.fuelMass);
    expect(shipMass(next)).toBeLessThan(STARTER_SHIP.dryMass + STARTER_SHIP.fuelMass);
  });

  it("accelerates upward when thrust exceeds gravity", () => {
    const next = stepLaunch(createLaunchState(), { launch: true, throttle: 1 }, 1);

    expect(next.velocity.y).toBeGreaterThan(0);
    expect(next.altitude).toBeGreaterThan(0);
  });

  it("keeps drifting when fuel is exhausted after a hop", () => {
    const lowFuelShip = {
      ...STARTER_SHIP,
      fuelMass: 1,
      fuelBurnRate: 2,
    };
    const state = {
      ...createLaunchState(),
      launched: true,
      altitude: 2000,
      maxAltitude: 2000,
      fuelMass: 1,
      velocity: { x: 0, y: 80 },
    };
    const next = stepLaunch(state, { throttle: 1 }, 1, lowFuelShip);

    expect(next.outcome).toBe("Drift");
    expect(TERMINAL_OUTCOMES.has(next.outcome)).toBe(false);
  });

  it("continues escape into open space instead of ending the game", () => {
    const state = {
      ...createLaunchState(),
      launched: true,
      altitude: HOMEWORLD.atmosphereHeight + 10,
      maxAltitude: HOMEWORLD.atmosphereHeight + 10,
      velocity: { x: 0, y: 1000 },
    };
    const next = stepLaunch(state, { throttle: 0 }, 1);

    expect(next.phase).toBe("space");
    expect(next.outcome).toBe("Space");
    expect(TERMINAL_OUTCOMES.has(next.outcome)).toBe(false);
  });

  it("allows continuous rotation without angle limits", () => {
    const state = {
      ...createLaunchState(),
      launched: true,
      altitude: HOMEWORLD.atmosphereHeight + 200000,
      maxAltitude: HOMEWORLD.atmosphereHeight + 200000,
      velocity: { x: 2000, y: 0 },
    };
    let next = state;

    for (let step = 0; step < 300; step += 1) {
      next = stepLaunch(next, { throttle: 0, turnRate: 1 }, 0.1);
    }

    expect(next.angle).toBeGreaterThan(Math.PI * 2);
  });

  it("stores remaining fuel when the ship crashes", () => {
    const state = {
      ...createLaunchState(),
      launched: true,
      elapsed: 3,
      altitude: 2,
      fuelMass: 4200,
      velocity: { x: 0, y: -30 },
    };
    const next = stepLaunch(state, { throttle: 0 }, 1);

    expect(next.outcome).toBe("Crash");
    expect(next.crashFuelMass).toBeGreaterThan(0);
  });

  it("hits a planet even when a fast frame crosses through its hitbox", () => {
    const tinyWorld = {
      id: "tiny-world",
      name: "Tiny World",
      radius: 1000,
      collisionRadius: 1200,
      surfaceGravity: 0,
      worldX: 0,
      worldY: 0,
    };
    const state = {
      ...createLaunchState(),
      launched: true,
      elapsed: 3,
      downrange: -1500,
      altitude: 0,
      surfaceAltitude: 500,
      maxAltitude: 500,
      fuelMass: 1200,
      gravitySource: tinyWorld.name,
      velocity: { x: 4000, y: 0 },
    };
    const next = stepLaunch(
      state,
      { throttle: 0 },
      1,
      STARTER_SHIP,
      HOMEWORLD,
      [tinyWorld],
    );

    expect(next.outcome).toBe("Crash");
    expect(next.gravitySource).toBe("Tiny World");
    expect(next.downrange).toBeCloseTo(-1200, 5);
    expect(next.surfaceAltitude).toBe(0);
  });

  it("uses the visual contact radius before the physical surface", () => {
    const contactWorld = {
      id: "contact-world",
      name: "Contact World",
      radius: 1000,
      collisionRadius: 1250,
      surfaceGravity: 0,
      worldX: 0,
      worldY: 0,
    };
    const state = {
      ...createLaunchState(),
      launched: true,
      elapsed: 3,
      downrange: -1300,
      altitude: 0,
      surfaceAltitude: 300,
      maxAltitude: 300,
      fuelMass: 1200,
      gravitySource: contactWorld.name,
      velocity: { x: 100, y: 0 },
    };
    const next = stepLaunch(
      state,
      { throttle: 0 },
      1,
      STARTER_SHIP,
      HOMEWORLD,
      [contactWorld],
    );

    expect(next.outcome).toBe("Crash");
    expect(next.downrange).toBeCloseTo(-1250, 5);
  });

  it("lands when the ship touches down slowly and upright", () => {
    const landingWorld = {
      id: "soft-world",
      name: "Soft World",
      radius: 1000,
      surfaceGravity: 0.2,
      worldX: 0,
      worldY: 0,
    };
    const state = {
      ...createLaunchState(),
      launched: true,
      elapsed: 3,
      altitude: 1001,
      surfaceAltitude: 1,
      maxAltitude: 10,
      fuelMass: 1200,
      gravitySource: landingWorld.name,
      velocity: { x: 0, y: -4 },
    };
    const next = stepLaunch(
      state,
      { throttle: 0 },
      0.5,
      STARTER_SHIP,
      HOMEWORLD,
      [landingWorld],
    );

    expect(next.outcome).toBe("Landed");
    expect(next.landedBody).toBe("Soft World");
    expect(next.surfaceAltitude).toBe(0);
    expect(next.velocity).toEqual({ x: 0, y: 0 });
    expect(TERMINAL_OUTCOMES.has(next.outcome)).toBe(true);
  });
});
