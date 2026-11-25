// Sizzle & Serve — configuration: canvas size, kitchen layout, ingredients and recipes.
// Every number that shapes the kitchen lives here so the other files stay logic-only.

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const DAY_LENGTH_SECONDS = 180;
export const ORDER_FIRST_DELAY = 2;
export const ORDER_SPAWN_MIN = 7;
export const ORDER_SPAWN_MAX = 13;
export const ORDER_TIME_MIN = 42;
export const ORDER_TIME_MAX = 60;
export const MAX_ORDERS = 3;
export const PLATE_CAPACITY = 4;
export const CHOP_SECONDS = 1.4;
export const COOK_SECONDS = 4.0;
export const BURN_SECONDS = 4.5;
export const CHEF_SPEED = 280;
export const INTERACT_RADIUS = 78;

// Kitchen stations, in canvas pixels. The chef walks to a station's anchor to use it.
export const STATIONS = {
  bins: { x: 100, y: 390, w: 160, h: 460, anchor: { x: 205, y: 390 } },
  board: { x: 300, y: 300, w: 180, h: 120, anchor: { x: 390, y: 445 } },
  stove: { x: 520, y: 300, w: 240, h: 120, anchor: { x: 640, y: 445 } },
  plates: { x: 800, y: 300, w: 180, h: 120, anchor: { x: 890, y: 445 } },
  window: { x: 1040, y: 210, w: 220, h: 210, anchor: { x: 1060, y: 452 } },
  trash: { x: 300, y: 620, w: 120, h: 70, anchor: { x: 360, y: 600 } },
};

// Ingredient bins down the left counter, top to bottom.
export const BIN_ORDER = ['bun', 'patty', 'lettuce', 'tomato', 'cheese'];

// One entry per ingredient kind: what the player sees, what prep it needs, its colours.
export const INGREDIENTS = {
  bun: {
    label: 'Bun',
    prep: 'none',
    prepLabel: 'ready',
    base: '#e8a34c',
    dark: '#b97a2e',
    light: '#f7cf8a',
  },
  patty: {
    label: 'Patty',
    prep: 'cook',
    prepLabel: 'cook on stove',
    base: '#8a5a3b',
    dark: '#5d3a24',
    light: '#c98d5f',
    cookedBase: '#6b3f22',
    burntBase: '#2b2b2b',
  },
  lettuce: {
    label: 'Lettuce',
    prep: 'chop',
    prepLabel: 'chop on board',
    base: '#5da53a',
    dark: '#3d7a24',
    light: '#9ed67a',
  },
  tomato: {
    label: 'Tomato',
    prep: 'chop',
    prepLabel: 'chop on board',
    base: '#d9483b',
    dark: '#a92e24',
    light: '#f28a7a',
  },
  cheese: {
    label: 'Cheese',
    prep: 'chop',
    prepLabel: 'chop on board',
    base: '#f2b705',
    dark: '#c78f04',
    light: '#ffd94d',
  },
};

// A recipe is a dish name plus the prepared ingredients it needs, in any order.
export const RECIPES = [
  {
    name: 'Classic Burger',
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
    ],
    reward: 25,
  },
  {
    name: 'Cheesy Melt',
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'chopped' },
    ],
    reward: 28,
  },
  {
    name: 'Garden Salad',
    needs: [
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'cheese', state: 'chopped' },
    ],
    reward: 22,
  },
  {
    name: 'Double Stack',
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'chopped' },
    ],
    reward: 38,
  },
  {
    name: 'Sunny Bun',
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
    ],
    reward: 20,
  },
];

export const CHEF_START = { x: 640, y: 540 };
export const TITLE_TEXT = 'SIZZLE & SERVE';
export const TITLE_SUB = 'a tiny kitchen rush — cook, chop, plate, serve before the tickets run out';
