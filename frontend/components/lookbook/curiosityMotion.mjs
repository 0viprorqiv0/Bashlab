export const WORD = 'curiosity';
export const DURATION = 1300;
export const SYMBOLS = ['_', '/', '>', '$'];

export const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };

// One timeline: dissolve → close scatter → return → staggered decode.
export function letterFrame(elapsed, index, word = WORD) {
  const returnAt = 760 + index * 25;
  const resolveAt = returnAt + 220;
  const opacity = elapsed < 250
    ? 1 - smooth(elapsed / 250)
    : smooth((elapsed - returnAt) / 100);
  const decoding = elapsed >= returnAt && elapsed < resolveAt;
  const targetChar = word ? word[index] : WORD[index];
  // Only three letters expose symbols; spaces never expose symbols
  const text = decoding && index % 3 === 1 && targetChar !== ' '
    ? SYMBOLS[(Math.floor((elapsed - returnAt) / 65) + index) % SYMBOLS.length]
    : targetChar;
  return { opacity, text };
}

export function particleFrame(elapsed) {
  return {
    scatter: smooth(elapsed / 390) * (1 - smooth((elapsed - 470) / 520)),
    opacity: smooth(elapsed / 130) * (1 - smooth((elapsed - 790) / 310)),
  };
}

export function springStep(position, velocity, target, dt) {
  const step = Math.min(dt, 1 / 30);
  const nextVelocity = velocity + ((target - position) * 210 - velocity * 25) * step;
  return [position + nextVelocity * step, nextVelocity];
}
