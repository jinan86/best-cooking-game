// Seeded random numbers (mulberry32) so a screenshot scene replays exactly the same way
// every time it is staged, while real play still gets a fresh seed from the clock.

export function makeRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function rangeFrom(random, min, max) {
  return min + random() * (max - min);
}
