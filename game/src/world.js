// Sizzle & Serve — the game world: orders, chopping, cooking, plating, serving, scoring.
// Pure state plus one step function; rendering lives in render.js, input in input.js.
import {
  BIN_ORDER,
  BURN_SECONDS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CHEF_SPEED,
  CHEF_START,
  CHOP_SECONDS,
  COOK_SECONDS,
  DAY_LENGTH_SECONDS,
  INGREDIENTS,
  INTERACT_RADIUS,
  MAX_ORDERS,
  ORDER_FIRST_DELAY,
  ORDER_SPAWN_MAX,
  ORDER_SPAWN_MIN,
  ORDER_TIME_MAX,
  ORDER_TIME_MIN,
  PLATE_CAPACITY,
  RECIPES,
  STATIONS,
} from './config.js';
import { makeRandom, pickFrom, rangeFrom } from './random.js';
import * as sfx from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const COUNTERS = [
  { x: 0, y: 130, w: 190, h: 510 }, // left ingredient counter
  { x: 280, y: 290, w: 720, h: 140 }, // board + stove + plates counter
  { x: 1030, y: 200, w: 250, h: 230 }, // serving window counter
];

const ZONES = {
  bins: { x: 150, y: 130, w: 130, h: 520 },
  board: { x: 290, y: 290, w: 200, h: 220 },
  stove: { x: 510, y: 290, w: 260, h: 220 },
  plates: { x: 790, y: 290, w: 200, h: 220 },
  window: { x: 1000, y: 380, w: 280, h: 130 },
  trash: { x: 270, y: 580, w: 180, h: 120 },
};

export function createWorld(seed) {
  const world = {
    seed,
    random: makeRandom(seed),
    screen: SCREEN_TITLE,
    soundOn: true,
    time: 0,
    spawnIn: ORDER_FIRST_DELAY,
    nextOrderId: 1,
    orders: [],
    chef: { x: CHEF_START.x, y: CHEF_START.y, carrying: null, target: null, targetQueue: [], targetStation: null, facing: 1, walking: false },
    board: { item: null, progress: 0 },
    burners: [
      { item: null, progress: 0 },
      { item: null, progress: 0 },
    ],
    plateItems: [],
    plateCarried: false,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    toasts: [],
    particles: [],
    lastTickSecond: -1,
  };
  return world;
}

export function resetWorld(world, seed) {
  const soundOn = world.soundOn;
  const fresh = createWorld(seed === undefined ? world.seed : seed);
  Object.assign(world, fresh);
  world.soundOn = soundOn;
}

export function startGame(world) {
  resetWorld(world, world.seed);
  world.screen = SCREEN_PLAY;
  spawnOrder(world);
}

export function rushLevel(world) {
  return Math.min(1, world.time / DAY_LENGTH_SECONDS);
}

export function dayRemaining(world) {
  return Math.max(0, DAY_LENGTH_SECONDS - world.time);
}

function play(world, fn) {
  if (world.soundOn) fn();
}

export function toast(world, text) {
  world.toasts.push({ text, ttl: 2.6 });
  if (world.toasts.length > 3) world.toasts.shift();
}

export function burst(world, x, y, text, colour) {
  world.particles.push({ x, y, text, colour: colour || '#ffd94d', ttl: 1.2 });
}

export function spawnOrder(world, recipeIndex, remainingSeconds) {
  if (world.orders.length >= MAX_ORDERS) return null;
  const recipe = recipeIndex === undefined ? pickFrom(world.random, RECIPES) : RECIPES[recipeIndex];
  const total = remainingSeconds === undefined ? rangeFrom(world.random, ORDER_TIME_MIN, ORDER_TIME_MAX) : remainingSeconds;
  const order = {
    id: world.nextOrderId,
    recipe,
    remaining: total,
    total,
    reward: recipe.reward,
  };
  world.nextOrderId += 1;
  world.orders.push(order);
  play(world, sfx.playOrder);
  return order;
}

function sameNeeds(a, b) {
  if (a.length !== b.length) return false;
  const counts = new Map();
  for (const item of a) {
    const key = `${item.kind}:${item.state}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const item of b) {
    const key = `${item.kind}:${item.state}`;
    const left = counts.get(key) || 0;
    if (left === 0) return false;
    counts.set(key, left - 1);
  }
  return true;
}

export function plateMatchesOrder(plateItems, order) {
  return sameNeeds(plateItems, order.recipe.needs);
}

function servePlate(world) {
  const plateItems = world.chef.carrying && world.chef.carrying.type === 'plate' ? world.chef.carrying.items : [];
  if (plateItems.length === 0) {
    toast(world, 'The plate is empty — build a dish first!');
    play(world, sfx.playError);
    return;
  }
  const match = world.orders.find((order) => plateMatchesOrder(plateItems, order));
  if (!match) {
    toast(world, 'No ticket wants this plate — check the order board!');
    play(world, sfx.playError);
    return;
  }
  const timeBonus = Math.round((10 * match.remaining) / match.total);
  const points = match.reward + timeBonus + world.combo * 2;
  world.score += points;
  world.coins += match.reward + timeBonus;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.orders = world.orders.filter((order) => order.id !== match.id);
  world.chef.carrying = null;
  world.plateItems = [];
  world.plateCarried = false;
  burst(world, STATIONS.window.anchor.x, STATIONS.window.anchor.y - 30, `+${points}`, '#7ddb52');
  toast(world, `${match.recipe.name} served! +${points} pts${world.combo > 1 ? ` — combo x${world.combo}` : ''}`);
  play(world, sfx.playServe);
}

function nearestStation(world) {
  const { x, y } = world.chef;
  for (const [name, zone] of Object.entries(ZONES)) {
    if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) return name;
  }
  return null;
}

function binAtChef(world) {
  const y = world.chef.y;
  let best = BIN_ORDER[0];
  let bestDistance = Infinity;
  BIN_ORDER.forEach((kind, index) => {
    const binY = 175 + index * 92;
    const distance = Math.abs(y - binY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = kind;
    }
  });
  return best;
}

function interactAt(world, station) {
  const chef = world.chef;
  if (station === 'bins') {
    if (chef.carrying) {
      toast(world, 'Hands full — plate or bin it first!');
      return;
    }
    const kind = binAtChef(world);
    chef.carrying = { type: 'ingredient', kind, state: INGREDIENTS[kind].prep === 'none' ? 'ready' : 'raw' };
    play(world, sfx.playPick);
    return;
  }
  if (station === 'board') {
    const board = world.board;
    if (board.item && chef.carrying === null) {
      chef.carrying = board.item;
      world.board = { item: null, progress: 0 };
      play(world, sfx.playPick);
      return;
    }
    if (board.item === null && chef.carrying && chef.carrying.type === 'ingredient') {
      const def = INGREDIENTS[chef.carrying.kind];
      if (def.prep !== 'chop' || chef.carrying.state !== 'raw') {
        toast(world, `${def.label} needs no chopping.`);
        play(world, sfx.playError);
        return;
      }
      world.board = { item: chef.carrying, progress: 0 };
      chef.carrying = null;
      play(world, sfx.playChop);
      return;
    }
    return;
  }
  if (station === 'stove') {
    const burner = world.burners.find((slot) => slot.item === null) || null;
    if (chef.carrying && chef.carrying.type === 'ingredient' && chef.carrying.kind === 'patty' && chef.carrying.state === 'raw') {
      if (!burner) {
        toast(world, 'Both burners are busy!');
        play(world, sfx.playError);
        return;
      }
      burner.item = chef.carrying;
      burner.progress = 0;
      chef.carrying = null;
      play(world, sfx.playSizzle);
      return;
    }
    if (chef.carrying === null) {
      const done = world.burners.find((slot) => slot.item && slot.item.state !== 'raw');
      if (done) {
        chef.carrying = done.item;
        done.item = null;
        done.progress = 0;
        play(world, sfx.playPick);
        return;
      }
      const raw = world.burners.find((slot) => slot.item);
      if (raw) {
        chef.carrying = raw.item;
        raw.item = null;
        raw.progress = 0;
        play(world, sfx.playPick);
      }
      return;
    }
    return;
  }
  if (station === 'plates') {
    if (chef.carrying && chef.carrying.type === 'ingredient') {
      if (world.plateCarried) {
        toast(world, 'Put the plate down first!');
        return;
      }
      if (world.plateItems.length >= PLATE_CAPACITY) {
        toast(world, 'The plate is full!');
        play(world, sfx.playError);
        return;
      }
      world.plateItems.push({ kind: chef.carrying.kind, state: chef.carrying.state });
      chef.carrying = null;
      play(world, sfx.playPlate);
      return;
    }
    if (chef.carrying === null && !world.plateCarried && world.plateItems.length > 0) {
      chef.carrying = { type: 'plate', items: world.plateItems };
      world.plateItems = [];
      world.plateCarried = true;
      play(world, sfx.playPick);
      return;
    }
    if (chef.carrying && chef.carrying.type === 'plate' && !world.plateCarried) {
      world.plateItems = chef.carrying.items;
      world.plateCarried = false;
      chef.carrying = null;
      play(world, sfx.playPlate);
    }
    return;
  }
  if (station === 'window') {
    if (chef.carrying && chef.carrying.type === 'plate') {
      servePlate(world);
      return;
    }
    if (chef.carrying && chef.carrying.type === 'ingredient') {
      toast(world, 'Serve a finished plate, not raw food!');
      play(world, sfx.playError);
    }
    return;
  }
  if (station === 'trash') {
    if (chef.carrying && chef.carrying.type === 'ingredient') {
      chef.carrying = null;
      play(world, sfx.playPick);
      toast(world, 'Binned it.');
      return;
    }
    if (chef.carrying && chef.carrying.type === 'plate') {
      chef.carrying.items = [];
      toast(world, 'Plate cleared.');
      play(world, sfx.playPick);
    }
  }
}

export function interact(world) {
  const station = nearestStation(world);
  if (!station) {
    toast(world, 'Walk up to a station to use it.');
    return;
  }
  interactAt(world, station);
}

function pointInCounter(x, y) {
  return COUNTERS.some((rect) => x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h);
}

function moveChef(world, dx, dy, dt) {
  const chef = world.chef;
  if (dx !== 0) chef.facing = dx > 0 ? 1 : -1;
  const speed = CHEF_SPEED * dt;
  const nextX = chef.x + dx * speed;
  const nextY = chef.y + dy * speed;
  const radius = 18;
  const blockedX = pointInCounter(nextX + Math.sign(dx) * radius, chef.y);
  const blockedY = pointInCounter(chef.x, nextY + Math.sign(dy) * radius);
  if (!blockedX) chef.x = nextX;
  if (!blockedY) chef.y = nextY;
  chef.x = Math.max(205, Math.min(CANVAS_WIDTH - 16, chef.x));
  chef.y = Math.max(112, Math.min(CANVAS_HEIGHT - 16, chef.y));
  chef.walking = dx !== 0 || dy !== 0;
}

export function walkTo(world, x, y) {
  const chef = world.chef;
  const queue = [];
  if (y < 500) {
    queue.push({ x: chef.x, y: 540 });
    queue.push({ x, y: 540 });
  }
  queue.push({ x, y });
  chef.targetQueue = queue.filter((point) => Math.hypot(point.x - chef.x, point.y - chef.y) > 12);
  chef.target = chef.targetQueue.shift() || { x, y };
  chef.targetStation = null;
}

export function clickAt(world, x, y) {
  const chef = world.chef;
  let station = null;
  let anchor = { x, y };
  for (const [name, zone] of Object.entries(ZONES)) {
    if (x >= zone.x - 20 && x <= zone.x + zone.w + 20 && y >= zone.y - 20 && y <= zone.y + zone.h + 20) {
      station = name;
      break;
    }
  }
  // Clicking a drawn station walks to its anchor; clicking the floor walks to the point.
  if (station === 'bins') anchor = { x: 205, y: Math.max(160, Math.min(600, y)) };
  else if (station) anchor = { ...STATIONS[station].anchor };
  else if (pointInCounter(x, y)) return;
  // Walk the open corridor (y = 540) so the chef never has to cut through a counter:
  // first straight down/up to the corridor at the current x, then across, then to the anchor.
  const queue = [];
  if (anchor.y < 500) {
    queue.push({ x: chef.x, y: 540 });
    queue.push({ x: anchor.x, y: 540 });
  }
  queue.push(anchor);
  chef.targetQueue = queue.filter((point) => Math.hypot(point.x - chef.x, point.y - chef.y) > 12);
  chef.target = chef.targetQueue.shift() || anchor;
  chef.targetStation = station;
}

function stepCooking(world, dt) {
  const board = world.board;
  if (board.item && board.item.state === 'raw') {
    board.progress += dt;
    if (board.progress >= CHOP_SECONDS) {
      board.item.state = 'chopped';
      board.progress = CHOP_SECONDS;
      play(world, sfx.playChopDone);
      burst(world, STATIONS.board.anchor.x, STATIONS.board.anchor.y - 40, 'chopped!', '#9ed67a');
    }
  }
  for (const burner of world.burners) {
    if (!burner.item) continue;
    burner.progress += dt;
    if (burner.item.state === 'raw' && burner.progress >= COOK_SECONDS) {
      burner.item.state = 'cooked';
      play(world, sfx.playCookDone);
      burst(world, STATIONS.stove.anchor.x, STATIONS.stove.anchor.y - 40, 'cooked!', '#f2b705');
    } else if (burner.item.state === 'cooked' && burner.progress >= COOK_SECONDS + BURN_SECONDS) {
      burner.item.state = 'burnt';
      toast(world, 'A patty burnt! Bin it and start again.');
      play(world, sfx.playError);
    }
  }
}

export function step(world, dt, input) {
  if (world.screen !== SCREEN_PLAY) {
    for (const particle of world.particles) particle.ttl -= dt;
    world.particles = world.particles.filter((particle) => particle.ttl > 0);
    return;
  }
  world.time += dt;
  if (world.time >= DAY_LENGTH_SECONDS) {
    world.screen = SCREEN_OVER;
    return;
  }

  // Orders: spawn on a timer that quickens as the rush builds; expire on time.
  world.spawnIn -= dt;
  if (world.spawnIn <= 0) {
    if (world.orders.length < MAX_ORDERS) spawnOrder(world);
    const rush = rushLevel(world);
    world.spawnIn = ORDER_SPAWN_MAX + (ORDER_SPAWN_MIN - ORDER_SPAWN_MAX) * rush;
  }
  for (const order of world.orders) order.remaining -= dt;
  const expired = world.orders.filter((order) => order.remaining <= 0);
  if (expired.length > 0) {
    world.orders = world.orders.filter((order) => order.remaining > 0);
    world.missed += expired.length;
    world.combo = 0;
    toast(world, expired.length === 1 ? 'An order walked out — too slow!' : `${expired.length} orders walked out!`);
    play(world, sfx.playError);
  }
  const wholeSecond = Math.floor(dayRemaining(world));
  if (wholeSecond <= 10 && wholeSecond !== world.lastTickSecond) {
    world.lastTickSecond = wholeSecond;
    play(world, sfx.playTick);
  }

  stepCooking(world, dt);

  // Movement: a click target walks the chef there, then auto-uses the station.
  const chef = world.chef;
  if (chef.target) {
    const dx = chef.target.x - chef.x;
    const dy = chef.target.y - chef.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 10) {
      if (chef.targetQueue.length > 0) {
        chef.target = chef.targetQueue.shift();
      } else {
        chef.target = null;
        if (chef.targetStation) {
          interactAt(world, chef.targetStation);
          chef.targetStation = null;
        }
      }
    } else {
      moveChef(world, dx / distance, dy / distance, dt);
    }
  } else if (input) {
    moveChef(world, input.moveX || 0, input.moveY || 0, dt);
    if (input.interactPressed) interact(world);
  }

  for (const particle of world.particles) {
    particle.ttl -= dt;
    particle.y -= 34 * dt;
  }
  world.particles = world.particles.filter((particle) => particle.ttl > 0);
  for (const item of world.toasts) item.ttl -= dt;
  world.toasts = world.toasts.filter((item) => item.ttl > 0);
}

export function distanceToStation(world, name) {
  const anchor = STATIONS[name].anchor;
  return Math.hypot(world.chef.x - anchor.x, world.chef.y - anchor.y);
}

export function chefNearStation(world, name) {
  return distanceToStation(world, name) < INTERACT_RADIUS;
}
