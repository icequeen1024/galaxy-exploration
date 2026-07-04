# Galaxy Exploration

[Play Galaxy Exploration](https://icequeen1024.github.io/galaxy-exploration/)

A 2D JavaScript space exploration game prototype built with Vite, PixiJS, and a custom launch physics simulation. The current build focuses on launching from Homeworld, steering through gravity and atmosphere, visiting nearby planets, saving progress, and arranging ship parts on a graph-paper builder.

## Features

- Real-time PixiJS launch scene with telemetry, throttle, steering, and mission outcomes.
- Physics model for thrust, fuel burn, gravity, atmosphere, drag, orbit, escape, landing, and crashes.
- Discoverable planet map with mission targeting and Homeworld return flow.
- Local save data for money, resources, unlocked parts, built ships, mission history, and save points.
- Parts Bay and builder screens for buying metal lines, paint colors, parts, and placing ship parts that take up grid space.
- Buy new parts and paints with credits, move placed parts on the grid, press **R** to rotate, and press **U** then click to unplace a part.
- Starter save begins with money, water, no owned parts, and an empty graph-paper ship.
- Metal packs cost credits and create straight sealing lines that go on top of placed parts.
- The launch ship is drawn from the active builder layout, including thin brush paint marks.
- Air Maker life support that consumes water when a launch begins and stops working when water runs out.
- Unit tests for simulation and save-data behavior, plus Playwright coverage for core UI flows.

## Screenshots

| Launch | Builder | Travel |
| --- | --- | --- |
| ![Launch screen](public/assets/screenshots/launch.jpg) | ![Ship builder screen](public/assets/screenshots/builder.jpg) | ![Travel screen](public/assets/screenshots/travel.jpg) |

## Requirements

- Node.js 20.19.0 or newer
- npm

## Getting Started

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173/`.

## Controls

- Use the throttle slider to set engine power.
- Press **Launch** or the spacebar to lift off.
- Use the left and right arrow keys, or the on-screen steering buttons, to rotate the ship.
- Use **Reset** to start over with the blank starter save, clearing bought parts, paints, metal, and the builder.
- Switch between Launch, Parts, Builder, and Travel from the top navigation.
- In Parts Bay, buy metal packs, paint colors, and part templates with credits.
- In Parts Bay, use **Sell 1** on Metal Pack to resell extra metal lines for credits.
- In Builder, place a part first, then select Metal Line and click cells on the part to seal them.
- Select a bought or mixed paint color in Builder, set the Brush Size, then drag across placed blocks to smear thin paint marks.
- Paint cannot be erased; paint over it with another color or brush size to change it.
- Each occupied block needs 2 metal lines. A 2x4 tank uses 8 graph blocks, so it needs 16 metal lines to fully seal.
- Select a placed part and press **R** to rotate it.
- Press **U** once, then click a placed part to return it to the template side or click a metal line to remove it.

## Scripts

```sh
npm run dev       # Start the Vite dev server
npm run build     # Build the app for production
npm run preview   # Preview the production build
npm run lint      # Run ESLint
npm run test      # Run Vitest unit tests
npm run test:e2e  # Run Playwright end-to-end tests
```

## Deployment

GitHub Pages is deployed by `.github/workflows/deploy-pages.yml`. In the repository Pages settings, use **GitHub Actions** as the build and deployment source so Pages publishes the Vite `dist` build instead of the raw source files.

## Project Layout

```text
src/main.js                       App shell, Pixi rendering, UI state, missions, parts bay, and builder
src/simulation/launchPhysics.js   Launch physics and gravity helpers
src/data/saveData.js              Save-data schema, normalization, and localStorage persistence
src/styles.css                    Game UI and screen styling
tests/                            Vitest unit tests
e2e/                              Playwright browser tests
public/assets/                    Static game assets
```

## Development Notes

Save data is stored in `localStorage` under `galaxy-exploration.save.v2`. Clear that key in the browser if you need to reset progression while testing.
