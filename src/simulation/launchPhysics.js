export const HOMEWORLD = {
  name: "Homeworld",
  radius: 9000,
  surfaceGravity: 9.81,
  atmosphereDensity: 1.225,
  atmosphereScaleHeight: 2400,
  atmosphereHeight: 12000,
};

export const STARTER_SHIP = {
  name: "Pioneer Test Vehicle",
  dryMass: 9000,
  fuelMass: 16000,
  thrust: 1100000,
  fuelBurnRate: 260,
  dragCoefficient: 0.42,
  referenceArea: 9.6,
  maxTurnRate: 0.55,
};

export const LANDING_LIMITS = Object.freeze({
  maxInwardSpeed: 18,
  maxSidewaysSpeed: 24,
  maxAngleRadians: Math.PI / 4,
});

export const TERMINAL_OUTCOMES = new Set(["Crash", "Landed"]);

export function createLaunchState() {
  return {
    phase: "homeworld",
    launched: false,
    outcome: "Preflight",
    elapsed: 0,
    altitude: 0,
    surfaceAltitude: 0,
    maxAltitude: 0,
    downrange: 0,
    angle: 0,
    fuelMass: STARTER_SHIP.fuelMass,
    crashFuelMass: 0,
    gravitySource: HOMEWORLD.name,
    landedBody: null,
    velocity: { x: 0, y: 0 },
  };
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function gravityAtAltitude(altitude, planet = HOMEWORLD) {
  const distanceFromCenter = planet.radius + Math.max(0, altitude);
  const gravityRatio = planet.radius / distanceFromCenter;
  return planet.surfaceGravity * gravityRatio * gravityRatio;
}

export function atmosphericDensityAtAltitude(altitude, planet = HOMEWORLD) {
  const atmosphereDensity = planet.atmosphereDensity ?? 0;
  const atmosphereHeight = planet.atmosphereHeight ?? 0;
  const atmosphereScaleHeight = planet.atmosphereScaleHeight ?? 1;

  if (
    atmosphereDensity <= 0 ||
    atmosphereHeight <= 0 ||
    altitude < 0 ||
    altitude > atmosphereHeight
  ) {
    return 0;
  }

  return atmosphereDensity * Math.exp(-altitude / atmosphereScaleHeight);
}

export function orbitalSpeedAtAltitude(altitude, planet = HOMEWORLD) {
  const radius = planet.radius + Math.max(0, altitude);
  const gravitationalParameter = planet.surfaceGravity * planet.radius * planet.radius;
  return Math.sqrt(gravitationalParameter / radius);
}

export function escapeSpeedAtAltitude(altitude, planet = HOMEWORLD) {
  return Math.SQRT2 * orbitalSpeedAtAltitude(altitude, planet);
}

export function shipMass(state, ship = STARTER_SHIP) {
  return ship.dryMass + Math.max(0, state.fuelMass);
}

export function gravitationalParameter(body = HOMEWORLD) {
  return body.surfaceGravity * body.radius * body.radius;
}

export function createGravityBody(body) {
  const radius = body.radius ?? body.physicalRadius;

  return {
    id: body.id ?? body.name,
    name: body.name,
    radius,
    surfaceGravity: body.surfaceGravity,
    atmosphereDensity: body.atmosphereDensity ?? 0,
    atmosphereScaleHeight: body.atmosphereScaleHeight ?? 1,
    atmosphereHeight: body.atmosphereHeight ?? 0,
    position: {
      x: body.position?.x ?? body.worldX ?? 0,
      y: body.position?.y ?? body.worldY ?? -radius,
    },
  };
}

export function homeworldGravityBody(planet = HOMEWORLD) {
  return createGravityBody({
    ...planet,
    id: "homeworld",
    position: { x: 0, y: -planet.radius },
  });
}

export function normalizeGravityBodies(bodies, planet = HOMEWORLD) {
  if (!Array.isArray(bodies) || bodies.length === 0) {
    return [homeworldGravityBody(planet)];
  }

  return bodies.map((body) => createGravityBody(body));
}

export function surfaceAltitudeAtPosition(position, body = homeworldGravityBody()) {
  const dx = position.x - body.position.x;
  const dy = position.y - body.position.y;

  return Math.hypot(dx, dy) - body.radius;
}

export function closestGravityBody(position, bodies) {
  const normalizedBodies = normalizeGravityBodies(bodies);

  return normalizedBodies.reduce((closest, body) => {
    const altitude = surfaceAltitudeAtPosition(position, body);

    if (!closest || altitude < closest.altitude) {
      return { body, altitude };
    }

    return closest;
  }, null)?.body;
}

export function gravityVectorAtPosition(position, bodies) {
  const normalizedBodies = normalizeGravityBodies(bodies);

  return normalizedBodies.reduce(
    (acceleration, body) => {
      const dx = body.position.x - position.x;
      const dy = body.position.y - position.y;
      const distance = Math.hypot(dx, dy);
      const safeDistance = Math.max(distance, body.radius * 0.35);
      const gravity = gravitationalParameter(body) / (safeDistance * safeDistance);

      if (distance > 0) {
        acceleration.x += (dx / distance) * gravity;
        acceleration.y += (dy / distance) * gravity;
      }

      return acceleration;
    },
    { x: 0, y: 0 },
  );
}

export function stepLaunch(
  state,
  input,
  dt,
  ship = STARTER_SHIP,
  planet = HOMEWORLD,
  gravityBodies,
) {
  const next = {
    ...state,
    velocity: { ...state.velocity },
  };
  const bodies = normalizeGravityBodies(gravityBodies, planet);

  const throttle = clamp(input.throttle ?? 0, 0, 1);
  const turnRate = input.turnRate ?? 0;

  if (input.launch) {
    next.launched = true;
  }

  if (!next.launched || TERMINAL_OUTCOMES.has(next.outcome)) {
    return next;
  }

  next.elapsed += dt;
  next.angle += turnRate * ship.maxTurnRate * dt;

  const mass = shipMass(next, ship);
  const burn = Math.min(next.fuelMass, ship.fuelBurnRate * throttle * dt);
  const activeThrottle = burn > 0 ? throttle : 0;
  next.fuelMass -= burn;

  const thrustAcceleration = (ship.thrust * activeThrottle) / mass;
  const thrustX = Math.sin(next.angle) * thrustAcceleration;
  const thrustY = Math.cos(next.angle) * thrustAcceleration;

  const position = { x: next.downrange, y: next.altitude };
  const nearestBody = closestGravityBody(position, bodies);
  const surfaceAltitude = surfaceAltitudeAtPosition(position, nearestBody);
  const gravity = gravityVectorAtPosition(position, bodies);
  const density = atmosphericDensityAtAltitude(surfaceAltitude, nearestBody);
  const speed = Math.hypot(next.velocity.x, next.velocity.y);
  const dragMagnitude =
    speed > 0
      ? (0.5 * density * speed * speed * ship.dragCoefficient * ship.referenceArea) /
        mass
      : 0;
  const dragX = speed > 0 ? -(next.velocity.x / speed) * dragMagnitude : 0;
  const dragY = speed > 0 ? -(next.velocity.y / speed) * dragMagnitude : 0;

  next.velocity.x += (thrustX + dragX + gravity.x) * dt;
  next.velocity.y += (thrustY + dragY + gravity.y) * dt;
  next.downrange += next.velocity.x * dt;
  next.altitude += next.velocity.y * dt;

  const updatedPosition = { x: next.downrange, y: next.altitude };
  const updatedNearestBody = closestGravityBody(updatedPosition, bodies);
  const updatedSurfaceAltitude = surfaceAltitudeAtPosition(
    updatedPosition,
    updatedNearestBody,
  );
  next.surfaceAltitude = updatedSurfaceAltitude;
  next.gravitySource = updatedNearestBody.name;
  next.maxAltitude = Math.max(next.maxAltitude, updatedSurfaceAltitude);

  const updatedSpeed = Math.hypot(next.velocity.x, next.velocity.y);
  const orbitalSpeed = orbitalSpeedAtAltitude(updatedSurfaceAltitude, updatedNearestBody);
  const escapeSpeed = escapeSpeedAtAltitude(updatedSurfaceAltitude, updatedNearestBody);
  const impactVectorX = updatedPosition.x - updatedNearestBody.position.x;
  const impactVectorY = updatedPosition.y - updatedNearestBody.position.y;
  const impactDistance = Math.hypot(impactVectorX, impactVectorY);
  const surfaceNormalX = impactDistance > 0 ? impactVectorX / impactDistance : 0;
  const surfaceNormalY = impactDistance > 0 ? impactVectorY / impactDistance : 1;
  const radialVelocity =
    impactDistance > 0
      ? next.velocity.x * surfaceNormalX + next.velocity.y * surfaceNormalY
      : next.velocity.y;
  const tangentialSpeed = Math.sqrt(
    Math.max(0, updatedSpeed * updatedSpeed - radialVelocity * radialVelocity),
  );
  const thrustDirectionX = Math.sin(next.angle);
  const thrustDirectionY = Math.cos(next.angle);
  const landingAngle = Math.acos(
    clamp(
      thrustDirectionX * surfaceNormalX + thrustDirectionY * surfaceNormalY,
      -1,
      1,
    ),
  );

  if (updatedSurfaceAltitude <= 0 && next.elapsed > 1.5) {
    const surfaceRatio = updatedNearestBody.radius / Math.max(impactDistance, 1);
    const inwardSpeed = Math.max(0, -radialVelocity);
    const isSafeLanding =
      inwardSpeed <= LANDING_LIMITS.maxInwardSpeed &&
      tangentialSpeed <= LANDING_LIMITS.maxSidewaysSpeed &&
      landingAngle <= LANDING_LIMITS.maxAngleRadians;

    next.downrange = updatedNearestBody.position.x + impactVectorX * surfaceRatio;
    next.altitude = updatedNearestBody.position.y + impactVectorY * surfaceRatio;
    next.surfaceAltitude = 0;
    next.velocity.x = 0;
    next.velocity.y = 0;
    next.gravitySource = updatedNearestBody.name;

    if (isSafeLanding) {
      next.phase = "landed";
      next.crashFuelMass = 0;
      next.landedBody = updatedNearestBody.name;
      next.outcome = "Landed";
    } else {
      next.phase = "crashed";
      next.crashFuelMass = next.fuelMass;
      next.landedBody = null;
      next.outcome = "Crash";
    }

    return next;
  } else if (
    updatedSpeed >= escapeSpeed &&
    updatedSurfaceAltitude > updatedNearestBody.atmosphereHeight
  ) {
    next.phase = "space";
    next.outcome = "Space";
  } else if (
    updatedSpeed >= orbitalSpeed * 0.9 &&
    updatedSurfaceAltitude > updatedNearestBody.atmosphereHeight
  ) {
    next.outcome = "Orbit";
  } else if (next.fuelMass <= 0 && next.maxAltitude > 1200) {
    next.outcome = "Drift";
  } else if (updatedSurfaceAltitude > 1200) {
    next.outcome = "Flight";
  } else {
    next.outcome = "Launch";
  }

  return next;
}
