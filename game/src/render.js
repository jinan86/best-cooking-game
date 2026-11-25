// Sizzle & Serve — every pixel the player sees: the kitchen, the order board, the chef,
// the food (all drawn with canvas paths, no image files), and the title / game-over screens.
import {
  BIN_ORDER,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CHOP_SECONDS,
  COOK_SECONDS,
  DAY_LENGTH_SECONDS,
  INGREDIENTS,
  STATIONS,
} from './config.js';
import { dayRemaining, rushLevel, SCREEN_OVER, SCREEN_TITLE } from './world.js';

const FONT = '"Trebuchet MS", Verdana, sans-serif';

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, weight, align) {
  ctx.fillStyle = colour;
  ctx.font = `${weight || 'bold'} ${size}px ${FONT}`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

// One ingredient, drawn as a small vector picture. `state` changes its look: raw patty is
// pink, cooked is brown, burnt is black; chopped greens come as shreds and slices.
export function drawIngredient(ctx, kind, state, x, y, size) {
  const def = INGREDIENTS[kind];
  const s = size / 40;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'bun') {
    ctx.fillStyle = def.base;
    ctx.beginPath();
    ctx.arc(0, 2 * s, 20 * s, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.fillRect(-20 * s, 2 * s, 40 * s, 7 * s);
    ctx.fillStyle = def.light;
    for (const [dx, dy] of [[-10, -8], [0, -13], [10, -8], [-4, -5], [6, -5]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'patty') {
    const colour = state === 'cooked' ? def.cookedBase : state === 'burnt' ? def.burntBase : def.light;
    ctx.fillStyle = colour;
    roundRect(ctx, -20 * s, -7 * s, 40 * s, 14 * s, 7 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (const dx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.arc(dx * s, 0, 2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state === 'burnt') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(-14 * s, -4 * s);
      ctx.lineTo(14 * s, 4 * s);
      ctx.moveTo(14 * s, -4 * s);
      ctx.lineTo(-14 * s, 4 * s);
      ctx.stroke();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = def.base;
    if (state === 'chopped') {
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.translate(-14 * s + i * 14 * s, (i % 2 === 0 ? -4 : 4) * s);
        ctx.rotate((i - 1) * 0.35);
        roundRect(ctx, -8 * s, -3.5 * s, 16 * s, 7 * s, 3.5 * s);
        ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, 20 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-16 * s, 0);
      ctx.quadraticCurveTo(0, -8 * s, 16 * s, 0);
      ctx.moveTo(-16 * s, 4 * s);
      ctx.quadraticCurveTo(0, -3 * s, 16 * s, 4 * s);
      ctx.stroke();
    }
  } else if (kind === 'tomato') {
    ctx.fillStyle = def.base;
    if (state === 'chopped') {
      for (const dx of [-11, 11]) {
        ctx.beginPath();
        ctx.arc(dx * s, 0, 10 * s, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = def.light;
        ctx.beginPath();
        ctx.arc(dx * s, -2 * s, 5 * s, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = def.base;
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 15 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.ellipse(0, -13 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.light;
      ctx.beginPath();
      ctx.arc(-5 * s, -5 * s, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'cheese') {
    ctx.fillStyle = def.base;
    if (state === 'chopped') {
      ctx.beginPath();
      ctx.moveTo(-18 * s, 10 * s);
      ctx.lineTo(18 * s, 10 * s);
      ctx.lineTo(0, -12 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = def.dark;
      for (const [dx, dy] of [[-6, 4], [6, 4], [0, -3]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      roundRect(ctx, -19 * s, -9 * s, 38 * s, 18 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = def.dark;
      for (const dx of [-11, 0, 11]) {
        ctx.beginPath();
        ctx.arc(dx * s, 0, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawProgressRing(ctx, x, y, radius, fraction, colour) {
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
  ctx.stroke();
}

function drawPlate(ctx, x, y, items, scale) {
  const s = scale || 1;
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(x, y, 46 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c2b2';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e2dccc';
  ctx.beginPath();
  ctx.ellipse(x, y - 2 * s, 34 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  items.forEach((item, index) => {
    drawIngredient(ctx, item.kind, item.state, x, y - 8 * s - index * 7 * s, 26 * s);
  });
}

function drawOrderTicket(ctx, order, x, y, w, h) {
  const urgent = order.remaining < 10;
  const fraction = Math.max(0, order.remaining / order.total);
  ctx.save();
  if (urgent) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 120);
    ctx.shadowColor = `rgba(217,72,59,${0.35 + 0.4 * pulse})`;
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = urgent ? '#d9483b' : '#d8c49a';
  ctx.lineWidth = urgent ? 3 : 2;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();
  text(ctx, `#${order.id} ${order.recipe.name}`, x + 12, y + 16, 15, '#3a2c1c', 'bold');
  text(ctx, `coins ${order.reward}`, x + w - 12, y + 16, 14, '#8a6d1f', 'bold', 'right');
  order.recipe.needs.forEach((need, index) => {
    const iconX = x + 30 + index * 56;
    drawIngredient(ctx, need.kind, need.state, iconX, y + 46, 30);
  });
  const barY = y + h - 12;
  ctx.fillStyle = '#e8ddc4';
  roundRect(ctx, x + 12, barY, w - 68, 7, 3.5);
  ctx.fill();
  ctx.fillStyle = fraction > 0.5 ? '#5da53a' : fraction > 0.25 ? '#f2b705' : '#d9483b';
  roundRect(ctx, x + 12, barY, (w - 68) * fraction, 7, 3.5);
  ctx.fill();
  text(ctx, `${Math.ceil(order.remaining)}s`, x + w - 12, barY + 3.5, 12, urgent ? '#d9483b' : '#3a2c1c', 'bold', 'right');
}

function drawTopBar(ctx, world) {
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 104);
  ctx.fillStyle = '#5d4028';
  ctx.fillRect(0, 100, CANVAS_WIDTH, 4);
  text(ctx, 'ORDER BOARD', 16, 12, 11, '#e8c98a', 'bold');
  for (let index = 0; index < 3; index += 1) {
    const x = 16 + index * 324;
    const order = world.orders[index];
    if (order) drawOrderTicket(ctx, order, x, 22, 308, 74);
    else {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      roundRect(ctx, x, 22, 308, 74, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      roundRect(ctx, x, 22, 308, 74, 8);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'waiting for the next ticket…', x + 154, 59, 13, 'rgba(255,255,255,0.4)', 'normal', 'center');
    }
  }
  const hx = 1000;
  const remaining = dayRemaining(world);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const clock = `${minutes}:${String(seconds).padStart(2, '0')}`;
  text(ctx, 'DAY TIMER', hx, 16, 11, '#e8c98a', 'bold');
  text(ctx, clock, hx + 150, 34, 30, remaining <= 15 ? '#ff8a7a' : '#ffffff', 'bold', 'right');
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, hx, 52, 250, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#f2b705';
  roundRect(ctx, hx, 52, 250 * (remaining / DAY_LENGTH_SECONDS), 8, 4);
  ctx.fill();
  text(ctx, `SCORE ${world.score}`, hx, 76, 15, '#ffffff', 'bold');
  text(ctx, `coins ${world.coins}`, hx + 250, 76, 14, '#ffd94d', 'bold', 'right');
  text(ctx, `served ${world.served}   •   lost ${world.missed}`, hx, 96, 12, '#e8c98a', 'normal');
  if (world.combo >= 2) {
    ctx.fillStyle = '#ff6b35';
    roundRect(ctx, hx + 150, 86, 100, 16, 8);
    ctx.fill();
    text(ctx, `COMBO x${world.combo}`, hx + 200, 94, 11, '#ffffff', 'bold', 'center');
  }
}

function drawFloor(ctx) {
  ctx.fillStyle = '#f3e2c2';
  ctx.fillRect(0, 104, CANVAS_WIDTH, CANVAS_HEIGHT - 104);
  ctx.fillStyle = '#e8cfa5';
  const tile = 64;
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 20; col += 1) {
      if ((row + col) % 2 === 0) ctx.fillRect(col * tile, 104 + row * tile, tile, tile);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let row = 0; row < 10; row += 1) ctx.fillRect(0, 104 + row * tile, CANVAS_WIDTH, 2);
  for (let col = 0; col < 20; col += 1) ctx.fillRect(col * tile, 104, 2, CANVAS_HEIGHT - 104);
}

function drawBins(ctx, world) {
  ctx.fillStyle = '#8a5a2e';
  roundRect(ctx, 16, 140, 168, 500, 10);
  ctx.fill();
  ctx.fillStyle = '#a9743c';
  ctx.fillRect(16, 140, 168, 18);
  text(ctx, 'INGREDIENTS', 100, 130, 12, '#5d4028', 'bold', 'center');
  BIN_ORDER.forEach((kind, index) => {
    const y = 150 + index * 92;
    const def = INGREDIENTS[kind];
    ctx.fillStyle = '#f7ead0';
    roundRect(ctx, 26, y, 148, 84, 8);
    ctx.fill();
    ctx.strokeStyle = '#d8c49a';
    ctx.lineWidth = 2;
    roundRect(ctx, 26, y, 148, 84, 8);
    ctx.stroke();
    drawIngredient(ctx, kind, kind === 'patty' ? 'raw' : 'ready', 62, y + 34, 44);
    text(ctx, def.label, 100, y + 20, 15, '#3a2c1c', 'bold');
    text(ctx, def.prepLabel, 100, y + 42, 11, '#8a6d4b', 'normal');
    text(ctx, 'click to grab', 100, y + 64, 10, '#b09a72', 'normal');
  });
}

function drawCentreCounter(ctx, world) {
  ctx.fillStyle = '#8a5a2e';
  roundRect(ctx, 290, 300, 700, 130, 10);
  ctx.fill();
  ctx.fillStyle = '#c99a5b';
  roundRect(ctx, 290, 300, 700, 22, 10);
  ctx.fill();
  text(ctx, 'CHOP', 390, 290, 12, '#5d4028', 'bold', 'center');
  text(ctx, 'STOVE', 640, 290, 12, '#5d4028', 'bold', 'center');
  text(ctx, 'PLATE', 890, 290, 12, '#5d4028', 'bold', 'center');

  // Chopping board with its item and progress.
  ctx.fillStyle = '#d9a860';
  roundRect(ctx, 315, 330, 150, 70, 8);
  ctx.fill();
  ctx.strokeStyle = '#b98a48';
  ctx.lineWidth = 2;
  roundRect(ctx, 315, 330, 150, 70, 8);
  ctx.stroke();
  if (world.board.item) {
    drawIngredient(ctx, world.board.item.kind, world.board.item.state, 390, 362, 44);
    if (world.board.item.state === 'raw') {
      drawProgressRing(ctx, 390, 362, 30, world.board.progress / CHOP_SECONDS, '#5da53a');
    }
  } else {
    text(ctx, 'drop food here', 390, 365, 12, '#8a6d4b', 'normal', 'center');
  }

  // Stove: two burners, each with its patty, glow and steam.
  ctx.fillStyle = '#3c3f45';
  roundRect(ctx, 530, 325, 220, 80, 8);
  ctx.fill();
  ctx.fillStyle = '#565b63';
  roundRect(ctx, 530, 325, 220, 10, 5);
  ctx.fill();
  world.burners.forEach((burner, index) => {
    const bx = 585 + index * 110;
    const by = 365;
    const cooking = burner.item && burner.item.state === 'raw';
    const done = burner.item && burner.item.state === 'cooked';
    const burnt = burner.item && burner.item.state === 'burnt';
    ctx.fillStyle = cooking ? '#ff6b35' : done ? '#2f6b2f' : '#22242a';
    ctx.beginPath();
    ctx.arc(bx, by, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a7f88';
    ctx.lineWidth = 3;
    ctx.stroke();
    if (burner.item) {
      drawIngredient(ctx, 'patty', burner.item.state, bx, by, 44);
      if (cooking) {
        drawProgressRing(ctx, bx, by, 40, burner.progress / COOK_SECONDS, '#ff6b35');
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx - 8, by - 34);
        ctx.quadraticCurveTo(bx - 14, by - 46, bx - 6, by - 56);
        ctx.moveTo(bx + 8, by - 34);
        ctx.quadraticCurveTo(bx + 14, by - 46, bx + 6, by - 56);
        ctx.stroke();
      } else if (burnt) {
        text(ctx, 'BURNT!', bx, by - 48, 12, '#d9483b', 'bold', 'center');
      } else if (done) {
        text(ctx, 'READY', bx, by - 48, 12, '#7ddb52', 'bold', 'center');
      }
    }
  });

  // Plate station: the plate being built, plus a stack of clean plates.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.ellipse(845, 398 - i * 6, 34, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9c2b2';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (!world.plateCarried) {
    drawPlate(ctx, 915, 378, world.plateItems, 1);
    if (world.plateItems.length === 0) text(ctx, 'build the dish here', 915, 352, 11, '#8a6d4b', 'normal', 'center');
  } else {
    text(ctx, 'plate is with the chef', 890, 365, 12, '#f7ead0', 'normal', 'center');
  }
}

function drawWindow(ctx, world) {
  ctx.fillStyle = '#8a5a2e';
  roundRect(ctx, 1040, 200, 224, 230, 10);
  ctx.fill();
  ctx.fillStyle = '#ffe9b0';
  roundRect(ctx, 1056, 216, 192, 120, 6);
  ctx.fill();
  ctx.fillStyle = '#ff9d5c';
  ctx.fillRect(1056, 216, 192, 26);
  text(ctx, '—  SERVE HERE  —', 1152, 229, 13, '#fff', 'bold', 'center');
  ctx.fillStyle = '#fff3cf';
  ctx.fillRect(1056, 336, 192, 14);
  ctx.fillStyle = '#c9a35c';
  ctx.fillRect(1056, 350, 192, 8);
  // Service bell on the pass, with two clean plates waiting on the shelf.
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(1090, 330, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1090, 324, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2b705';
  ctx.beginPath();
  ctx.arc(1152, 322, 14, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a6d1f';
  ctx.fillRect(1136, 322, 32, 5);
  text(ctx, 'ding the bell: serve the plate', 1152, 182, 13, '#7a5a1e', 'bold', 'center');
}

function drawTrash(ctx) {
  ctx.fillStyle = '#6b7280';
  roundRect(ctx, 300, 596, 120, 60, 8);
  ctx.fill();
  ctx.fillStyle = '#4b5563';
  roundRect(ctx, 296, 588, 128, 14, 7);
  ctx.fill();
  text(ctx, 'TRASH', 360, 632, 13, '#e5e7eb', 'bold', 'center');
}

function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.walking ? Math.sin(Date.now() / 90) * 2 : 0;
  const x = chef.x;
  const y = chef.y + bob;
  ctx.save();
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + 26, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body and apron.
  ctx.fillStyle = '#3b82c4';
  roundRect(ctx, x - 18, y - 6, 36, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#f4f1ea';
  roundRect(ctx, x - 13, y + 2, 26, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#d9483b';
  ctx.fillRect(x - 13, y + 2, 26, 4);
  // Arms.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath();
  ctx.arc(x - 20 * chef.facing, y + 6, 7, 0, Math.PI * 2);
  ctx.arc(x + 20 * chef.facing, y + 6, 7, 0, Math.PI * 2);
  ctx.fill();
  // Head and hat.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath();
  ctx.arc(x, y - 20, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 9, y - 32, 9, 0, Math.PI * 2);
  ctx.arc(x + 9, y - 32, 9, 0, Math.PI * 2);
  ctx.arc(x, y - 36, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 15, y - 34, 30, 8);
  ctx.fillStyle = '#3a2c1c';
  ctx.beginPath();
  ctx.arc(x + 5 * chef.facing, y - 22, 2, 0, Math.PI * 2);
  ctx.arc(x - 5 * chef.facing, y - 22, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 14, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // What the chef carries, held high.
  if (chef.carrying) {
    if (chef.carrying.type === 'ingredient') {
      drawIngredient(ctx, chef.carrying.kind, chef.carrying.state, x, y - 58, 40);
    } else {
      drawPlate(ctx, x, y - 62, chef.carrying.items, 0.9);
    }
  }
  ctx.restore();
}

function drawToasts(ctx, world) {
  world.toasts.forEach((item, index) => {
    const alpha = Math.min(1, item.ttl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(58,44,28,0.92)';
    const width = ctx.measureText(item.text).width + 120;
    roundRect(ctx, CANVAS_WIDTH / 2 - 260, 560 + index * 34, 520, 28, 14);
    ctx.fill();
    text(ctx, item.text, CANVAS_WIDTH / 2, 574 + index * 34, 14, '#ffe9b0', 'bold', 'center');
    ctx.restore();
  });
}

function drawParticles(ctx, world) {
  for (const particle of world.particles) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, particle.ttl);
    text(ctx, particle.text, particle.x, particle.y, 22, particle.colour, 'bold', 'center');
    ctx.restore();
  }
}

function drawBottomBar(ctx, world) {
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(0, 668, CANVAS_WIDTH, 52);
  const rush = rushLevel(world);
  const rushLabel = rush < 0.33 ? 'Warm-up' : rush < 0.66 ? 'Lunch rush' : 'DINNER RUSH!';
  text(ctx, 'WASD / arrows: walk   •   E / Space: use station   •   Click: walk & use   •   M: mute   •   R: restart', 16, 694, 13, '#e8c98a', 'normal');
  text(ctx, `Pace: ${rushLabel}`, 1264, 694, 14, rush >= 0.66 ? '#ff8a7a' : '#ffd94d', 'bold', 'right');
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(40,24,10,0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, 290, 150, 700, 420, 16);
  ctx.fill();
  ctx.strokeStyle = '#d9483b';
  ctx.lineWidth = 4;
  roundRect(ctx, 290, 150, 700, 420, 16);
  ctx.stroke();
  text(ctx, 'SIZZLE & SERVE', 640, 210, 52, '#d9483b', 'bold', 'center');
  text(ctx, 'a tiny kitchen rush', 640, 252, 20, '#8a6d4b', 'normal', 'center');
  const lines = [
    'Tickets roll in on the order board — read the recipe, then cook it.',
    'Grab ingredients from the left counter.',
    'Chop greens on the board, fry patties on the stove — don\'t let them burn!',
    'Stack everything on the plate, carry it to the window and serve before the ticket runs out.',
    'Faster serves pay more. The rush only gets busier. Good luck, chef!',
  ];
  lines.forEach((line, index) => {
    text(ctx, line, 640, 300 + index * 30, 16, '#3a2c1c', 'normal', 'center');
  });
  const blink = 0.6 + 0.4 * Math.sin(Date.now() / 300);
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'Press ENTER or click to start cooking', 640, 500, 20, '#d9483b', 'bold', 'center');
  ctx.restore();
  text(ctx, 'Best score this session: ' + world.score, 640, 540, 14, '#8a6d4b', 'normal', 'center');
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(40,24,10,0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, 340, 170, 600, 380, 16);
  ctx.fill();
  ctx.strokeStyle = '#5da53a';
  ctx.lineWidth = 4;
  roundRect(ctx, 340, 170, 600, 380, 16);
  ctx.stroke();
  text(ctx, 'SERVICE OVER!', 640, 225, 40, '#5da53a', 'bold', 'center');
  text(ctx, `Score: ${world.score} pts   •   Coins earned: ${world.coins}`, 640, 285, 20, '#3a2c1c', 'bold', 'center');
  text(ctx, `Dishes served: ${world.served}   •   Orders lost: ${world.missed}`, 640, 325, 18, '#3a2c1c', 'normal', 'center');
  text(ctx, `Best combo: x${world.bestCombo}`, 640, 360, 18, '#3a2c1c', 'normal', 'center');
  const verdict = world.served >= 12 ? 'Head chef material!' : world.served >= 7 ? 'Solid service — the regulars are happy.' : world.served >= 3 ? 'A shaky first shift. The kitchen believes in you.' : 'The tickets won this time. One more shift?';
  text(ctx, verdict, 640, 410, 17, '#8a6d4b', 'normal', 'center');
  const blink = 0.6 + 0.4 * Math.sin(Date.now() / 300);
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'Press R to cook again', 640, 480, 20, '#d9483b', 'bold', 'center');
  ctx.restore();
}

export function render(ctx, world) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawFloor(ctx);
  drawTopBar(ctx, world);
  drawBins(ctx, world);
  drawCentreCounter(ctx, world);
  drawWindow(ctx, world);
  drawTrash(ctx);
  drawChef(ctx, world);
  drawParticles(ctx, world);
  drawToasts(ctx, world);
  drawBottomBar(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (world.screen === SCREEN_OVER) drawGameOver(ctx, world);
}
