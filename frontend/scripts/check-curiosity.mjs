// Run with: node scripts/check-curiosity.mjs (no server or browser required).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transform } from 'next/dist/build/swc/index.js';
import * as motion from '../components/landing/animations/curiosityMotion.mjs';

const { WORD, DURATION, letterFrame, particleFrame, springStep } = motion;
assert.ok(DURATION >= 1000 && DURATION <= 1400);
for (let index = 0; index < WORD.length; index += 1) {
  assert.deepEqual(letterFrame(0, index), { opacity: 1, text: WORD[index] });
  assert.equal(letterFrame(400, index).opacity, 0);
  assert.deepEqual(letterFrame(DURATION, index), { opacity: 1, text: WORD[index] });
}
for (let time = 0; time <= DURATION; time += 10) {
  const particles = particleFrame(time);
  assert.ok(particles.scatter >= 0 && particles.scatter <= 1);
  assert.ok(particles.opacity >= 0 && particles.opacity <= 1);
  const decoded = [...WORD].map((_, index) => letterFrame(time, index).text).join('');
  assert.ok([...decoded].filter((character, index) => character !== WORD[index]).length <= 3);
}
assert.equal(particleFrame(DURATION).scatter, 0);
assert.equal(particleFrame(DURATION).opacity, 0);
for (const frequency of [30, 60, 120]) {
  let position = -4;
  let velocity = 0;
  for (let frame = 0; frame < frequency * 2; frame += 1) {
    [position, velocity] = springStep(position, velocity, 0, 1 / frequency);
  }
  assert.ok(Math.abs(position) < 0.001 && Math.abs(velocity) < 0.01);
}

// Exercise the actual component effect with a deterministic clock and DOM stubs.
// This checks lifecycle/state transitions; it does not substitute for visual QA.
const source = readFileSync(new URL('../components/landing/animations/CuriosityWord.jsx', import.meta.url), 'utf8');
const { code } = await transform(source, {
  filename: 'CuriosityWord.jsx',
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
  module: { type: 'commonjs' },
});

function harness({ reduced = false, mobile = false, canvasUnavailable = false } = {}) {
  const frames = new Map();
  let clock = 0;
  let serial = 0;
  let effect;
  const refs = [];
  const events = () => ({
    listeners: new Map(),
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); },
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); },
    emit(type, event = {}) { this.listeners.get(type)?.forEach((fn) => fn(event)); },
    dispatchEvent(event) { this.emit(event.type, event); },
  });
  const hero = events();
  const mediaMotion = { ...events(), matches: reduced };
  const mediaHover = { ...events(), matches: !mobile };
  function node(type) {
    const context = {
      paints: [],
      clearRect() { this.paints = []; },
      fillRect(...args) { this.paints.push(args); },
      fillText() {}, setTransform() {},
      measureText: () => ({ fontBoundingBoxAscent: 48, fontBoundingBoxDescent: 12 }),
      getImageData: () => {
        const data = new Uint8ClampedArray(240 * 64 * 4);
        for (const [x, y] of [[10, 10], [30, 20], [40, 30]]) data[(y * 240 + x) * 4 + 3] = 255;
        return { data };
      },
    };
    return {
      type, dataset: {}, children: [], textContent: '',
      style: { setProperty(name, value) { this[name] = value; } },
      append(...children) { this.children.push(...children); },
      replaceChildren() { this.children = []; },
      getBoundingClientRect: () => ({ left: 400, top: 240, right: 640, bottom: 304, width: 240, height: 64 }),
      closest: () => hero,
      getContext: () => canvasUnavailable ? null : context,
      context,
    };
  }
  const document = {
    ...events(), hidden: false,
    createElement: node,
    createRange: () => {
      let start = 0;
      return { setStart(_, value) { start = value; }, setEnd() {}, getBoundingClientRect: () => ({ left: 400 + start * 240 / WORD.length, width: 240 / WORD.length }) };
    },
  };
  const window = {
    ...events(), devicePixelRatio: 1,
    matchMedia: (query) => query.includes('reduced-motion') ? mediaMotion : mediaHover,
  };
  function jsx(type, props) {
    const element = node(type);
    element.props = props;
    if (typeof props.children === 'string') { element.textContent = props.children; element.firstChild = {}; }
    if (props.ref) props.ref.current = element;
    return element;
  }
  const exports = {};
  vm.runInNewContext(code, {
    exports, document, window, CustomEvent,
    getComputedStyle: () => ({ fontWeight: '700', fontSize: '60px', fontFamily: 'sans-serif', letterSpacing: '-1.2px' }),
    performance: { now: () => clock },
    requestAnimationFrame: (fn) => { const id = ++serial; frames.set(id, fn); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
    require(name) {
      if (name === 'react') return {
        useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
        useEffect: (fn) => { effect = fn; },
        useRef: (value) => { const ref = { current: value }; refs.push(ref); return ref; },
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name.endsWith('.mjs')) return motion;
      if (name.endsWith('.css')) return { default: {} };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  exports.default();
  const cleanup = effect();
  const [button, text, layer, canvas] = refs.map((ref) => ref.current);
  function advance(ms) {
    const end = clock + ms;
    while (clock < end) {
      clock = Math.min(end, clock + 16);
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((fn) => fn(clock));
    }
  }
  function stable() {
    assert.equal(button.dataset.phase, 'idle');
    assert.equal(text.textContent, WORD);
    assert.equal(layer.children.map((letter) => letter.children[0].textContent).join(''), WORD);
    assert.ok(layer.children.every((letter) => !letter.style.transform && !letter.style.opacity));
    assert.equal(frames.size, 0);
  }
  return { button, layer, canvas, window, document, hero, frames, advance, stable, cleanup, click: () => button.props.onClick() };
}

const test = harness();
test.stable();
test.click();
test.advance(400);
assert.equal(test.button.dataset.phase, 'playing');
assert.equal(test.canvas.context.paints.length, 3, 'particles come only from nontransparent glyph pixels');
for (const [index, [x, y]] of test.canvas.context.paints.entries()) {
  const [originX, originY] = [[10, 10], [30, 20], [40, 30]][index];
  assert.ok(Math.hypot(x - 12 - originX, y - 12 - originY) <= 10.001);
}
test.click();
test.advance(900);
test.stable(); // Repeated click did not restart or queue the timeline.
for (const event of ['blur', 'resize', 'scroll', 'pagehide']) {
  test.click(); test.advance(400); test.window.emit(event); test.stable();
}
test.click(); test.advance(850);
test.document.hidden = true;
test.document.emit('visibilitychange'); test.stable();
test.document.hidden = false;
test.hero.emit('pointermove', { pointerType: 'mouse', clientX: 510, clientY: 265 });
test.advance(1800);
assert.equal(test.button.dataset.phase, 'hover');
assert.equal(test.frames.size, 0, 'stationary hover stops requesting frames');
assert.ok(test.layer.children.some((letter) => letter.children[1].style.opacity > 0));
test.click(); test.advance(400);
assert.ok(test.layer.children.every((letter) => !letter.style.transform), 'hover is suspended during playback');
test.advance(2700);
assert.equal(test.button.dataset.phase, 'hover', 'hover resumes after reassembly');
test.hero.emit('pointerleave'); test.advance(1800);
assert.equal(test.frames.size, 0);
test.cleanup(); test.stable();

for (const options of [{ reduced: true }, { canvasUnavailable: true }]) {
  const fallback = harness(options);
  fallback.click(); fallback.advance(100);
  assert.equal(fallback.button.dataset.phase, 'highlight');
  assert.ok(fallback.layer.children.every((letter) => !letter.style.opacity));
  fallback.advance(200); fallback.stable(); fallback.cleanup();
}
const mobile = harness({ mobile: true });
mobile.hero.emit('pointermove', { pointerType: 'mouse', clientX: 510, clientY: 265 });
assert.equal(mobile.frames.size, 0);
mobile.click(); mobile.advance(DURATION); mobile.stable(); mobile.cleanup();
console.log('Curiosity checks passed: timing, glyph particles, bounded scatter, decode, springs, playback lock, recovery, hover, mobile, fallback, and reduced motion.');
