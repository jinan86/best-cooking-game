// Screenshot scenes for Sizzle & Serve (?shot=cover|rush|serve&seed=N). Each scene plays the
// real rules forward from a fresh world at a fixed step, steered by a scripted pilot that
// clicks stations exactly as a player would — pick, chop, cook, plate — so every frame is
// what a short game really looks like, and the same seed always gives the same frame.
import { BIN_ORDER, STATIONS } from './config.js';
import { clickAt, createWorld, SCREEN_PLAY, spawnOrder, startGame, step, walkTo } from './world.js';

const STEP = 1 / 60;
const TASK_TIMEOUT = 25;

function binClick(kind) {
  const index = BIN_ORDER.indexOf(kind);
  return { type: 'click', x: 200, y: 175 + index * 92 };
}

function stationClick(name) {
  const anchor = STATIONS[name].anchor;
  return { type: 'click', x: anchor.x, y: anchor.y };
}

function waitFor(label, check) {
  return { type: 'wait', label, check };
}

function waitSeconds(seconds) {
  return { type: 'waitSeconds', seconds };
}

function setState(fn) {
  return { type: 'set', fn };
}

const isCarrying = (world) => world.chef.carrying !== null;
const isEmptyHanded = (world) => world.chef.carrying === null;
const boardChopped = (world) => world.board.item !== null && world.board.item.state === 'chopped';
const burnerCooked = (world) => world.burners.some((slot) => slot.item && slot.item.state === 'cooked');
const plateCount = (count) => (world) => world.plateItems.length >= count;

/** Run the pilot's task list against the world, one fixed step at a time. */
function runPilot(world, tasks, maxSeconds) {
  let taskIndex = 0;
  let taskTime = 0;
  let waitLeft = 0;
  for (let t = 0; t < maxSeconds / STEP; t += 1) {
    if (taskIndex >= tasks.length) return;
    const task = tasks[taskIndex];
    taskTime += STEP;
    if (task.type === 'click') {
      clickAt(world, task.x, task.y);
      taskIndex += 1;
      taskTime = 0;
    } else if (task.type === 'walk') {
      walkTo(world, task.x, task.y);
      taskIndex += 1;
      taskTime = 0;
    } else if (task.type === 'set') {
      task.fn(world);
      taskIndex += 1;
      taskTime = 0;
    } else if (task.type === 'waitSeconds') {
      if (waitLeft === 0) waitLeft = task.seconds;
      waitLeft -= STEP;
      if (waitLeft <= 0) {
        waitLeft = 0;
        taskIndex += 1;
        taskTime = 0;
      }
    } else if (task.type === 'wait') {
      if (task.check(world)) {
        taskIndex += 1;
        taskTime = 0;
      }
    }
    if (taskTime > TASK_TIMEOUT) {
      taskIndex += 1;
      taskTime = 0;
    }
    step(world, STEP, { moveX: 0, moveY: 0, interactPressed: false });
    if (world.screen !== SCREEN_PLAY) return;
  }
}

function seedOrders(world, specs) {
  world.orders = [];
  world.nextOrderId = 1;
  for (const spec of specs) spawnOrder(world, spec.recipe, spec.remaining);
}

function seedStats(world, stats) {
  world.score = stats.score;
  world.coins = stats.coins;
  world.served = stats.served;
  world.combo = stats.combo;
  world.bestCombo = stats.combo;
  world.time = stats.time;
  world.spawnIn = 9;
}

/** Build a Classic Burger on the plate: bun, cooked patty, chopped lettuce. */
function burgerTasks() {
  return [
    binClick('bun'),
    waitFor('bun in hand', isCarrying),
    stationClick('plates'),
    waitFor('bun plated', plateCount(1)),
    binClick('patty'),
    waitFor('patty in hand', isCarrying),
    stationClick('stove'),
    waitFor('patty on stove', isEmptyHanded),
    waitFor('patty cooked', burnerCooked),
    stationClick('stove'),
    waitFor('cooked patty in hand', isCarrying),
    stationClick('plates'),
    waitFor('patty plated', plateCount(2)),
    binClick('lettuce'),
    waitFor('lettuce in hand', isCarrying),
    stationClick('board'),
    waitFor('lettuce on board', isEmptyHanded),
    waitFor('lettuce chopped', boardChopped),
    stationClick('board'),
    waitFor('chopped lettuce in hand', isCarrying),
    stationClick('plates'),
    waitFor('lettuce plated', plateCount(3)),
  ];
}

function stageCover(world) {
  startGame(world);
  seedOrders(world, [
    { recipe: 0, remaining: 55 },
    { recipe: 1, remaining: 42 },
    { recipe: 2, remaining: 30 },
  ]);
  runPilot(world, burgerTasks(), 90);
  seedStats(world, { score: 85, coins: 42, served: 2, combo: 2, time: 35 });
  seedOrders(world, [
    { recipe: 0, remaining: 40 },
    { recipe: 1, remaining: 27 },
    { recipe: 2, remaining: 15 },
  ]);
}

function stageRush(world) {
  startGame(world);
  seedOrders(world, [
    { recipe: 3, remaining: 55 },
    { recipe: 4, remaining: 45 },
    { recipe: 1, remaining: 35 },
  ]);
  runPilot(
    world,
    [
      binClick('bun'),
      waitFor('bun in hand', isCarrying),
      stationClick('plates'),
      waitFor('bun plated', plateCount(1)),
      binClick('patty'),
      waitFor('patty in hand', isCarrying),
      stationClick('stove'),
      waitFor('patty on stove', isEmptyHanded),
      binClick('patty'),
      waitFor('second patty in hand', isCarrying),
      stationClick('stove'),
      waitFor('second patty on stove', isEmptyHanded),
      waitFor('a patty cooked', burnerCooked),
      stationClick('stove'),
      waitFor('cooked patty in hand', isCarrying),
      stationClick('plates'),
      waitFor('patty plated', plateCount(2)),
      binClick('lettuce'),
      waitFor('lettuce in hand', isCarrying),
      stationClick('board'),
      waitFor('lettuce on board', isEmptyHanded),
      waitSeconds(0.8),
    ],
    90,
  );
  seedStats(world, { score: 320, coins: 165, served: 9, combo: 5, time: 118 });
  seedOrders(world, [
    { recipe: 3, remaining: 40 },
    { recipe: 4, remaining: 25 },
    { recipe: 1, remaining: 12 },
  ]);
}

function stageServe(world) {
  startGame(world);
  seedOrders(world, [
    { recipe: 0, remaining: 55 },
    { recipe: 2, remaining: 40 },
  ]);
  runPilot(
    world,
    [
      ...burgerTasks(),
      stationClick('plates'),
      waitFor('plate in hand', (w) => w.chef.carrying && w.chef.carrying.type === 'plate'),
      { type: 'walk', x: 1060, y: 452 },
      waitFor('chef at window', (w) => Math.hypot(w.chef.x - 1060, w.chef.y - 452) < 24),
    ],
    110,
  );
  // The pilot's window click would auto-serve on arrival; stop the chef just short instead.
  if (world.chef.carrying && world.chef.carrying.type === 'plate') {
    world.chef.x = 1060;
    world.chef.y = 452;
    world.chef.target = null;
    world.chef.targetQueue = [];
    world.chef.targetStation = null;
  }
  seedStats(world, { score: 180, coins: 96, served: 5, combo: 3, time: 74 });
  seedOrders(world, [
    { recipe: 0, remaining: 22 },
    { recipe: 2, remaining: 35 },
  ]);
}

/**
 * Set `world` to the named scene (cover, rush or serve; any other name is cover) and return
 * the screen to draw over it.
 */
export function stageShot(name, world, seed) {
  world.soundOn = false;
  const fresh = createWorld(seed === undefined ? 7 : seed);
  Object.assign(world, fresh);
  world.soundOn = false;
  if (name === 'rush') stageRush(world);
  else if (name === 'serve') stageServe(world);
  else stageCover(world);
  return SCREEN_PLAY;
}
