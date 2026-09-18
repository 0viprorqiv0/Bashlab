// Coordinates are normalized to the viewport, so wide screens retain coverage.
export function createHeroField(count, random = Math.random) {
  const position = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  const size = new Float32Array(count);
  const mix = new Float32Array(count);
  const opacity = new Float32Array(count);
  const soft = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const dust = i % 20 === 0;
    const layer = i % 20 < 11 ? 0 : i % 20 < 19 ? 1 : 2;
    // Overscan a disk: rotating a rectangle exposes empty viewport corners.
    const inArm = dust || random() < 0.65;
    const radius = inArm ? 0.38 + random() * 1.28 : Math.sqrt(random()) * 1.55;
    // Two loose spiral arms with a dark centre for the headline. Independent
    // scatter makes star clouds rather than evenly spaced orbital rings.
    const armWidth = 0.30 + 0.32 * (0.5 + 0.5 * Math.sin(radius * 8.5));
    const angle = inArm
      ? radius * 2.8 + Math.sin(radius * 5) * 0.16 + (random() < 0.62 ? 0 : Math.PI)
        + (random()+random()+random()-1.5)*armWidth
      : random() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    position.set([x, y, dust ? -12 : [-10, -6, -3][layer]], i * 3);
    phase[i] = random() * Math.PI * 2;
    speed[i] = 0.12 + random() * 0.24;
    size[i] = dust ? 55 + random()*85 : layer === 0 ? 1.1 + random()*1.2 : layer === 1 ? 2.5 + random()*2.6 : 6 + random()*5;
    opacity[i] = dust ? 0.035 : layer === 0 ? 0.34 : layer === 1 ? 0.62 : 0.34;
    soft[i] = dust || layer === 2 ? 1 : 0;
    mix[i] = Math.max(0, Math.min(1, (x + 1) * 0.4 + random() * 0.25));
  }
  return { position, phase, speed, size, mix, opacity, soft };
}
