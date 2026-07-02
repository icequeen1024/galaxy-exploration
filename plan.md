# Galaxy Exploration Plan

## Game Vision

Build a space exploration game where players earn or manage a budget, buy spaceship parts, assemble a custom ship, launch it with realistic physics, and travel to new planets with distinct environmental challenges.

## Confirmed Direction

- [x] The game will be 2D.
- [x] The game will use realistic-style graphics instead of cartoon graphics.
- [x] The code will be written in JavaScript.
- [x] The first prototype will start with a pre-built ship so development can focus on launch physics.
- [x] Rendering library: PixiJS via the `pixi.js` npm package.
- [x] Physics library: Rapier 2D via the `@dimforge/rapier2d` npm package for rigid bodies, collisions, and contact physics.
- [x] Flight physics approach: custom fixed-step JavaScript simulation for gravity, thrust, fuel mass, drag, and orbital mechanics.

## Chosen Technical Stack

- [x] Rendering: PixiJS (`pixi.js`), using GPU-accelerated 2D rendering for realistic sprites, particles, atmosphere effects, and camera movement.
- [x] Physics: Rapier 2D (`@dimforge/rapier2d`), using its JavaScript bindings for collision shapes, rigid bodies, contact events, and crash/landing interactions.
- [x] Physics fallback: use `@dimforge/rapier2d-compat` only if the chosen bundler has trouble loading Rapier's WebAssembly module.
- [x] Rocket and orbital simulation: custom JavaScript physics layer, because launch trajectories, inverse-square gravity, fuel mass changes, drag curves, and orbital prediction need game-specific control.
- [x] Package manager: npm, using `package-lock.json` for reproducible installs.
- [x] Bundler and dev server: Vite with a vanilla JavaScript app.
- [x] Linting: ESLint with flat config for browser-based JavaScript modules.
- [x] Unit and simulation tests: Vitest for deterministic physics, math, ship, planet, and gameplay-state tests.
- [x] Browser tests: Playwright for launch-screen smoke tests, input checks, and canvas rendering checks.

## Project Tooling

- [x] Runtime target: Node.js LTS, with the minimum version guided by Vite and PixiJS requirements.
- [x] Package manager: npm.
- [x] Dependency lockfile format: `package-lock.json`.
- [x] Bundler: Vite.
- [x] Dev server: Vite.
- [x] App template: vanilla JavaScript.
- [x] Linter: ESLint using flat config.
- [x] Unit test runner: Vitest.
- [x] Browser test runner: Playwright.
- [x] Planned npm scripts:
  - [x] `npm run dev`: start the local Vite dev server.
  - [x] `npm run build`: create a production build.
  - [x] `npm run preview`: preview the production build locally.
  - [x] `npm run lint`: run ESLint.
  - [x] `npm test`: run Vitest once.
  - [x] `npm run test:watch`: run Vitest in watch mode.
  - [x] `npm run test:e2e`: run Playwright browser tests.
- [x] Install dependencies locally for verification.
- [x] Run lint, unit tests, production build, and browser tests.
- [ ] Generate `package-lock.json` with npm.
- [ ] Run the exact npm script checks after npm is available on PATH.

## Core Gameplay Loop

- [x] Core loop designed: prepare, build, launch, explore, resolve, upgrade, and repeat.
- [x] Prototype loop designed: inspect pre-built ship, launch, fly, receive outcome, and retry.

### Full Game Loop

1. Preparation: the player reviews their money, unlocked parts, discovered planets, and available missions.
2. Buying: the player buys parts that match the mission, such as stronger engines for high gravity or heat shields for dense atmospheres.
3. Building: the player assembles a ship and checks mass, thrust-to-weight ratio, fuel, delta-v, drag, heat tolerance, and landing stability.
4. Launch: the player launches from a planet surface or orbital platform using throttle and steering controls.
5. Flight: the ship responds to gravity, thrust, mass changes, drag, collisions, and orbital mechanics.
6. Exploration: the player reaches orbit, travels to another body, survives hazards, lands, scans, collects samples, or completes mission goals.
7. Resolution: the game evaluates the result, including crash, failed mission, partial success, full success, rescue, or return.
8. Progression: the player earns rewards, unlocks parts, discovers new worlds, repairs losses, and plans the next mission.

### Prototype 1 Loop

1. Preflight: the player starts on the launch pad with a pre-built starter ship.
2. Inspect: the player can see ship mass, thrust, fuel, thrust-to-weight ratio, and mission target.
3. Launch: the player controls throttle and steering while the physics simulation runs.
4. Survive: the player manages fuel, drag, gravity, speed, and ship angle.
5. Free flight: after leaving Homeworld, the player can steer anywhere instead of being sent to a fixed destination.
6. Exploration: nearby planets become easier to see after launch and show live distance labels.
7. Landing: the player can gently touch down on a planet instead of every contact being a crash.
8. Retry: the player can instantly reset and try a better launch profile after a crash.

### Long-Term Implementation Checklist

- [x] Start with limited funds.
- [x] Buy spaceship parts from a parts shop.
- [ ] Build a ship from purchased parts.
- [ ] Launch the ship from a planet surface or orbital platform.
- [ ] Pilot or simulate the ship using realistic physics.
- [x] Free-roam near visible planets, moons, or space stations.
- [ ] Survive planetary gravity, atmospheres, fuel limits, and hazards.
- [ ] Earn rewards from exploration to unlock better parts and more visible worlds.

## Milestone 1: Project Foundation

- [x] Choose broad technical direction: 2D JavaScript with realistic graphics.
- [x] Choose the exact game engine or rendering library: PixiJS.
- [x] Choose the exact physics approach for launch and flight: Rapier 2D plus custom rocket/orbital simulation.
- [x] Choose package manager, bundler, linting, and test setup: npm, Vite, ESLint, Vitest, and Playwright.
- [x] Set up the project structure.
- [x] Add a basic launch prototype screen.
- [x] Add placeholder screens for shop, ship builder, and space travel after launch physics works.
- [x] Add a save data format for money, unlocked parts, discovered planets, and built ships.

## Prototype 1: Pre-Built Ship Launch Physics

- [x] Scope the first prototype around launch physics instead of the full shop and builder loop.
- [x] Create a pre-built starter ship.
- [x] Create a home planet launch environment.
- [x] Implement gravity, thrust, mass, fuel, and drag for the launch.
- [x] Upgrade launch physics to vector gravity from spherical celestial bodies.
- [x] Add throttle and steering controls.
- [x] Add a flight HUD with altitude, speed, fuel, throttle, and vertical speed.
- [x] Add realistic 2D visual treatment for the ship, planet surface, atmosphere, engine plume, and sky-to-space transition.
- [x] Add launch outcomes:
  - [x] Crash.
  - [x] Safe landing.
  - [x] Fuel-out drift.
  - [x] Stable orbit.
  - [x] Open space free flight.
- [x] Add a crash results screen with mission outcome and retry.
- [x] Show a top-screen Landing Successful notification after safe touchdown.
- [x] Make visible planets brighter after launch.
- [x] Add distance labels to visible planets.
- [x] Add more visible free-roam planets to the launch prototype.
- [x] Add a top minimap that shows Homeworld, the ship, and every visible planet.
- [x] Spread free-roam planets evenly around Homeworld.
- [x] Move planets into varied far-away positions instead of a simple circle.
- [x] Add resource lists to planets: oil, iron, copper, ice, and water.
- [x] Give Homeworld one starter resource: water.
- [x] Define oil as the ship fuel resource.
- [x] Add visible fire shapes to crash explosions.
- [x] Replace drawn crash explosions with a realistic explosion image asset.
- [x] Tune prototype planet distances so surfaces are easier to reach and land on.
- [x] Render planets at the same world scale as the ship instead of as background markers.
- [x] Hide minimap planet markers unless the matching planet is visible in the main view.
- [x] Add Homeworld as a return mission target after the ship leaves it.
- [x] Keep the main HUD altitude relative to Homeworld and show nearest-surface altitude separately in telemetry.
- [x] Add more realistic layered planet visuals with terrain, atmosphere, shadow, and resource features.
- [x] Render Homeworld as a blue ocean planet with continents, polar ice, and cloud bands.
- [x] Replace simple planet ovals with smoother procedural continents, crater patches, cloud bands, rings, and asteroid debris.
- [x] Add a Homeworld save point that persists game data and resource inventory.
- [x] Add more Homeworld shop parts with prices and saved purchases.
- [x] Add a ship builder graph with owned parts and drag-to-equip slots.
- [x] Remove fixed-destination travel and automatic planet approach behavior.
- [x] Remove altitude-based visual zoom so the camera stays centered on the ship at a fixed wide scale.
- [x] Allow unlimited steering rotation without hidden angle caps.
- [ ] Use prototype results to tune the later part-buying and ship-building systems.

## Milestone 2: Ship Parts System

- [ ] Define part categories:
  - [ ] Command modules.
  - [ ] Fuel tanks.
  - [ ] Engines.
  - [ ] Batteries or power systems.
  - [ ] Landing legs.
  - [ ] Heat shields.
  - [ ] Cargo or science modules.
  - [ ] Stabilizers, fins, or reaction wheels.
- [ ] Give each part meaningful stats:
  - [x] Cost.
  - [ ] Mass.
  - [ ] Durability.
  - [ ] Fuel capacity.
  - [ ] Thrust.
  - [ ] Power usage or generation.
  - [ ] Atmospheric performance.
  - [ ] Heat resistance.
- [x] Build a parts catalog.
- [x] Add part purchasing.
- [x] Add inventory tracking.
- [x] Add affordability checks and purchase feedback.

## Milestone 3: Ship Builder

- [x] Create a ship assembly interface.
- [x] Allow parts to snap together.
- [ ] Validate required ship components:
  - [ ] At least one command module.
  - [ ] At least one engine.
  - [ ] Enough fuel or power for launch.
- [ ] Calculate total ship stats:
  - [ ] Total mass.
  - [ ] Total cost.
  - [ ] Total thrust.
  - [ ] Thrust-to-weight ratio.
  - [ ] Fuel amount.
  - [ ] Estimated delta-v.
  - [ ] Heat tolerance.
  - [ ] Landing stability.
- [ ] Save and load ship designs.
- [ ] Add warnings for risky designs.

## Milestone 4: Realistic Physics Engine

- [x] Decide whether to use an existing physics library or engine-native physics: use Rapier 2D for contacts/collisions and custom JavaScript for rocket/orbital forces.
- [ ] Implement gravity as a force based on planetary mass and distance.
- [ ] Implement thrust based on engine direction, throttle, and fuel flow.
- [ ] Implement mass changes as fuel is consumed.
- [ ] Implement drag in atmospheres.
- [ ] Implement lift or aerodynamic stability if needed.
- [ ] Implement collisions and crash damage.
- [ ] Add orbital mechanics:
  - [ ] Apoapsis and periapsis tracking.
  - [ ] Stable orbit detection.
  - [ ] Escape velocity.
  - [ ] Planetary sphere of influence.
- [ ] Add time step handling so physics remains stable.
- [ ] Add debug overlays for velocity, altitude, acceleration, and forces.

## Milestone 5: Launch And Flight

- [ ] Add a launch pad or starting location.
- [ ] Add throttle controls.
- [ ] Add steering controls.
- [ ] Add staging if ships can have detachable sections.
- [ ] Add fuel consumption.
- [ ] Add engine overheating or damage risk.
- [ ] Add a flight HUD:
  - [ ] Altitude.
  - [ ] Speed.
  - [ ] Fuel.
  - [ ] Throttle.
  - [ ] Vertical speed.
  - [ ] Orbital path preview.
- [ ] Add success and failure states for launch attempts.

## Milestone 6: Planets And Destinations

- [ ] Create a planet data model.
- [ ] Define planet properties:
  - [ ] Name.
  - [ ] Radius.
  - [ ] Mass.
  - [ ] Surface gravity.
  - [ ] Atmosphere density.
  - [ ] Atmosphere height.
  - [ ] Temperature range.
  - [ ] Terrain type.
  - [ ] Hazards.
  - [ ] Reward value.
- [ ] Add an initial home planet.
- [ ] Add several visible planets with different challenges.
- [ ] Add planet discovery or unlock logic.
- [ ] Add visual differences between planets.
- [ ] Add landing zones or points of interest.

## Example Planet Ideas

- [ ] Homeworld: moderate gravity, breathable atmosphere, safe launch conditions, one starter resource: water.
- [ ] Ember: high temperature, thin atmosphere, heat shield recommended.
- [ ] Brine: dense atmosphere, ocean surface, strong drag during entry.
- [ ] Anvil: high gravity, expensive to launch from, valuable minerals.
- [ ] Hollowmoon: low gravity, no atmosphere, easy landing but hard navigation.
- [ ] Shardbelt: asteroid field region with collision hazards.
- [ ] Vesper: ringed planet with asteroid debris and strong gravity.

## Milestone 7: Hazards And Environment

- [ ] Add atmospheric re-entry heating.
- [ ] Add wind or turbulence for dense atmospheres.
- [ ] Add asteroid fields.
- [ ] Add radiation zones or solar storms.
- [ ] Add rough terrain and landing damage.
- [ ] Add gravity wells that affect route planning.
- [ ] Add repair, rescue, or insurance mechanics if useful.

## Milestone 8: Economy And Progression

- [ ] Add rewards for successful missions.
- [ ] Add mission objectives:
  - [ ] Reach altitude.
  - [ ] Achieve orbit.
  - [ ] Fly by a moon.
  - [ ] Land on a planet.
  - [ ] Return safely.
  - [ ] Collect samples or data.
- [ ] Add unlockable parts.
- [ ] Balance part costs against mission rewards.
- [ ] Add penalties for crashes or lost parts.
- [ ] Add a simple tech tree if the game needs longer progression.

## Milestone 9: User Experience

- [ ] Make the shop easy to compare parts in.
- [ ] Make ship stats understandable during building.
- [ ] Add clear warnings without blocking creative designs.
- [ ] Add tutorials for launch, orbit, landing, and travel.
- [ ] Add visual and audio feedback for engines, impacts, atmosphere, and alerts.
- [ ] Add pause, restart, and return-to-builder flows.

## Milestone 10: Testing And Balancing

- [ ] Test that each part stat affects gameplay.
- [ ] Test that cheap ships can complete early missions.
- [ ] Test that expensive parts feel meaningfully better.
- [ ] Test launch physics at different frame rates.
- [ ] Test orbital paths for stability.
- [ ] Test planet atmospheres and gravity values.
- [ ] Test crash, landing, and mission completion states.
- [ ] Create repeatable simulation scenarios for balancing.

## Open Design Questions

- [x] Should the game be 2D, 2.5D, or 3D? Answer: 2D.
- [ ] Should flight be fully manual, mostly simulated, or a mix?
- [ ] Should ship building use a grid, node snapping, or freeform placement?
- [ ] Should missions be realistic, playful, or somewhere between?
- [ ] Should the player directly control astronauts or only the spacecraft?
- [ ] Should planets be physically scaled, game-scaled, or stylized for faster play?

## Current Status

- [x] Initial game concept captured.
- [x] Project planning file created.
- [x] Technical direction chosen: 2D realistic-style JavaScript game.
- [x] Rendering and physics libraries chosen: PixiJS and Rapier 2D.
- [x] Project tooling chosen: npm, Vite, ESLint, Vitest, and Playwright.
- [x] First playable prototype scope chosen: pre-built ship launch physics.
- [x] Core gameplay loop designed.
- [x] First playable prototype started.
- [x] Project structure, launch screen, placeholder screens, and save data format added.
- [x] Playable launch page added and browser-verified.
- [x] Open-space free flight added; there is no fixed destination planet.
- [x] Visible planets now show live distance labels after launch.
- [x] Fuel-scaled crash explosion added.
- [x] Dependencies installed and script targets verified with temporary runner.
- [ ] Exact npm verification completed after npm is available on PATH.
