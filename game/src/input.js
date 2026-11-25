// Keyboard and mouse input for Sizzle & Serve: WASD/arrows to walk, E or Space to use the
// nearest station, click a station to walk there and use it, click the floor to walk there.
// The game exposes one plain input object per frame; the world consumes it in step().

export function createInput() {
  return {
    moveX: 0,
    moveY: 0,
    interactPressed: false,
    keys: new Set(),
  };
}

const MOVE_KEYS = {
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
};

export function attachInput(input, canvas, callbacks) {
  function recompute() {
    let x = 0;
    let y = 0;
    for (const code of input.keys) {
      const move = MOVE_KEYS[code];
      if (move) {
        x += move[0];
        y += move[1];
      }
    }
    const length = Math.hypot(x, y) || 1;
    input.moveX = x / length;
    input.moveY = y / length;
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyE' || event.code === 'Space') {
      if (!event.repeat) input.interactPressed = true;
      event.preventDefault();
    }
    if (event.code === 'KeyM' && !event.repeat && callbacks.onMute) callbacks.onMute();
    if (event.code === 'Enter' && !event.repeat && callbacks.onConfirm) callbacks.onConfirm();
    if (event.code === 'KeyR' && !event.repeat && callbacks.onRestart) callbacks.onRestart();
    if (MOVE_KEYS[event.code]) {
      input.keys.add(event.code);
      recompute();
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    if (MOVE_KEYS[event.code]) {
      input.keys.delete(event.code);
      recompute();
    }
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    if (callbacks.onClick) callbacks.onClick(x, y);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
    recompute();
  });
}

export function consumeInteract(input) {
  const pressed = input.interactPressed;
  input.interactPressed = false;
  return pressed;
}
