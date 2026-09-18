import assert from 'node:assert/strict';
import { createHeroField } from '../components/lookbook/heroField.mjs';

// Seeded input makes coverage checks repeatable, rather than randomly flaky.
function randomSource() {
  let seed = 41;
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
}

for (const count of [800, 4800]) {
  const field = createHeroField(count, randomSource());
  const cells = Array(9).fill(0);
  const layers = new Map();
  for (const [name, values] of Object.entries(field)) {
    assert.equal(values.length, name === 'position' ? count * 3 : count);
    assert.ok(values.every(Number.isFinite));
  }
  for (let i = 0; i < count; i += 1) {
    const [x, y, z] = field.position.slice(i * 3, i * 3 + 3);
    const column = Math.max(0, Math.min(2, Math.floor((x + 1) * 1.5)));
    const row = Math.max(0, Math.min(2, Math.floor((y + 1) * 1.5)));
    cells[row * 3 + column] += 1;
    if (!layers.has(z)) layers.set(z, []);
    layers.get(z).push(field.size[i]);
    assert.ok(field.mix[i] >= 0 && field.mix[i] <= 1);
    assert.ok(field.opacity[i] > 0 && field.opacity[i] < 1);
    if (z === -3) assert.equal(field.soft[i], 1, 'foreground points have a soft profile');
  }
  assert.ok(cells.every((value) => value >= count * 0.02), `empty region detected: ${cells}`);
  assert.equal(layers.size, 4);
  assert.equal(layers.get(-12).length, count / 20, 'nebula dust stays within its budget');
  assert.ok(Math.max(...layers.get(-10)) < Math.min(...layers.get(-6)));
  assert.ok(Math.max(...layers.get(-6)) < Math.min(...layers.get(-3)));
  assert.ok(layers.get(-3).length <= count * 0.1, 'large foreground particles stay sparse');
  // Sample a complete orbit: every visible quadrant must retain particles.
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    const quadrants = [0, 0, 0, 0];
    for (let i = 0; i < count; i += 1) {
      const x = field.position[i*3];
      const y = field.position[i*3+1];
      const rx = x*Math.cos(angle)-y*Math.sin(angle);
      const ry = x*Math.sin(angle)+y*Math.cos(angle);
      if (Math.abs(rx) <= 1 && Math.abs(ry) <= 1) quadrants[(rx > 0 ? 1 : 0)+(ry > 0 ? 2 : 0)]++;
    }
    assert.ok(quadrants.every(n => n > count*0.035), 'orbit exposes an empty quadrant');
  }
}
console.log('Backdrop checks passed: galaxy coverage throughout rotation, mobile/desktop budgets, three stellar depth layers, nebula dust, and valid GPU attributes.');
