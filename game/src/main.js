// Sizzle & Serve — bootstrap: canvas, game loop, screens, and the ?shot= scene staging
// used for screenshots. The loop runs on requestAnimationFrame with a fixed 1/60 step.
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './config.js';
import { attachInput, consumeInteract, createInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { clickAt, createWorld, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, startGame, step } from './world.js';
import { isMuted, toggleMute } from './audio.js';

const STEP = 1 / 60;

function readQuery() {
  return new URLSearchParams(window.location.search);
}

function main() {
  const canvas = document.getElementById('game');
  const context = canvas.getContext('2d');
  const query = readQuery();
  const seed = Number.parseInt(query.get('seed') || '7', 10) || 7;
  const world = createWorld(seed);
  const input = createInput();
  let screen = SCREEN_TITLE;

  const shot = query.get('shot');
  if (shot) {
    screen = stageShot(shot, world, seed);
    world.screen = screen;
    render(context, world);
    window.__world = world;
    window.__ready = true;
    return;
  }

  attachInput(input, canvas, {
    onClick(x, y) {
      if (world.screen === SCREEN_TITLE) {
        startGame(world);
        return;
      }
      if (world.screen === SCREEN_OVER) return;
      clickAt(world, x, y);
    },
    onConfirm() {
      if (world.screen === SCREEN_TITLE) startGame(world);
    },
    onRestart() {
      if (world.screen === SCREEN_OVER) startGame(world);
    },
    onMute() {
      toggleMute();
    },
  });

  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      // A movement key cancels a click-to-walk target so the player stays in control.
      if (input.moveX !== 0 || input.moveY !== 0) {
        world.chef.target = null;
        world.chef.targetQueue = [];
        world.chef.targetStation = null;
      }
      step(world, STEP, {
        moveX: input.moveX,
        moveY: input.moveY,
        interactPressed: consumeInteract(input),
      });
    }
    render(context, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__world = world;
  window.__muted = () => isMuted();
}

main();
