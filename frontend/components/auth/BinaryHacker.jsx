'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Auth.module.css';

const SOURCE = '/auth/binary-hacker-bashlab.png';
const SIZE = 480;
const GAP_X = 6;
const GAP_Y = 8;
const TRANSITION_MS = 720;

export default function BinaryHacker({ compact = false }) {
  const sceneRef = useRef(null);
  const canvasRef = useRef(null);
  const imageViewRef = useRef(false);
  const transitionRef = useRef(() => {});
  const [showImage, setShowImage] = useState(false);

  function toggleImage(event) {
    const bounds = sceneRef.current.getBoundingClientRect();
    const x = event.detail ? (event.clientX - bounds.left) / bounds.width * SIZE : SIZE / 2;
    const y = event.detail ? (event.clientY - bounds.top) / bounds.height * SIZE : SIZE / 2;
    imageViewRef.current = !imageViewRef.current;
    setShowImage(imageViewRef.current);
    transitionRef.current(x, y);
  }

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const source = new Image();
    const pointer = { x: 0, y: 0, active: false };
    const reveal = { x: SIZE / 2, y: SIZE / 2, progress: 0, from: 0, to: 0, started: 0, active: false };
    const accent = getComputedStyle(scene).color;
    let particles = [];
    let atlas = null;
    let frame = 0;
    let previous = 0;
    let visible = false;
    let disposed = false;

    // Cache the glyphs once so each frame only copies small bitmap tiles.
    function createAtlas(ratio) {
      atlas = document.createElement('canvas');
      atlas.width = Math.ceil(12 * 12 * ratio);
      atlas.height = Math.ceil(12 * 2 * ratio);
      const ink = atlas.getContext('2d');
      if (!ink) throw new Error('Canvas unavailable');
      ink.scale(ratio, ratio);
      ink.font = '8px monospace';
      ink.textAlign = 'center';
      ink.textBaseline = 'middle';
      ink.fillStyle = accent;
      for (let level = 0; level < 12; level += 1) {
        const brightness = Math.pow(level / 11, 1.3);
        ink.globalAlpha = 0.22 + brightness * 0.78;
        ink.fillText('0', level * 12 + 6, 6);
        ink.fillText('1', level * 12 + 6, 18);
      }
    }

    function requestFrame() {
      if (!frame && !disposed && visible && !document.hidden && atlas && particles.length) {
        frame = requestAnimationFrame(draw);
      }
    }

    function draw(now) {
      frame = 0;
      const dt = previous ? Math.min((now - previous) / 16.667, 2) : 1;
      previous = now;
      context.clearRect(0, 0, SIZE, SIZE);
      let moving = false;
      let interacting = false;
      const radius = 76;
      const glitch = Math.floor(now / 90);
      const tileRatio = atlas.width / 144;
      const elapsed = Math.min(1, (now - reveal.started) / (motion.matches ? 140 : TRANSITION_MS));
      if (reveal.active) {
        reveal.progress = reveal.from + (reveal.to - reveal.from) * (1 - Math.pow(1 - elapsed, 3));
        if (elapsed === 1) { reveal.progress = reveal.to; reveal.active = false; }
      }
      const reach = Math.hypot(Math.max(reveal.x, SIZE - reveal.x), Math.max(reveal.y, SIZE - reveal.y)) + 16;
      const waveRadius = reveal.progress * reach;
      const waveEnergy = reveal.active && !motion.matches ? Math.sin(Math.PI * elapsed) : 0;

      if (reveal.progress > 0) {
        context.save();
        if (motion.matches) context.globalAlpha = reveal.progress;
        else if (reveal.progress < 1) {
          context.beginPath();
          context.arc(reveal.x, reveal.y, waveRadius, 0, Math.PI * 2);
          context.clip();
        }
        context.drawImage(source, 18, 12, SIZE - 36, SIZE - 36);
        if (waveEnergy > 0 && elapsed < 0.38) {
          // A brief data tear stays inside the reveal and fades before the image settles.
          const tear = 1 - elapsed / 0.38;
          context.globalAlpha = tear * 0.35;
          context.globalCompositeOperation = 'screen';
          for (let band = 0; band < 3; band += 1) {
            const y = 12 + ((reveal.y - 12 + band * 47 + glitch * 7) % 438 + 438) % 438;
            const height = band === 1 ? 5 : 2;
            const offset = Math.sin(band * 7 + glitch * 1.7) * tear * 16;
            context.drawImage(source, 0, (y - 12) / 444 * source.naturalHeight,
              source.naturalWidth, height / 444 * source.naturalHeight,
              18 + offset, y, 444, height);
          }
        }
        context.restore();
      }

      for (const particle of particles) {
        const dx = particle.homeX - pointer.x;
        const dy = particle.homeY - pointer.y;
        const distance = Math.hypot(dx, dy);
        const influence = pointer.active ? Math.max(0, 1 - distance / radius) : 0;
        interacting ||= influence > 0.15;
        const waveX = particle.homeX - reveal.x;
        const waveY = particle.homeY - reveal.y;
        const waveDistance = Math.hypot(waveX, waveY);
        const wave = Math.max(0, 1 - Math.abs(waveDistance - waveRadius) / 65) * waveEnergy;
        const burst = wave * (reveal.to === 1 ? 46 + particle.seed % 13 : -28 - particle.seed % 9);
        const shift = motion.matches ? 0 : influence * influence * 30;
        const targetX = particle.homeX + dx / Math.max(distance, 1) * shift + waveX / Math.max(waveDistance, 1) * burst;
        const targetY = particle.homeY + dy / Math.max(distance, 1) * shift + waveY / Math.max(waveDistance, 1) * burst;
        const easing = 1 - Math.pow(0.8, dt);
        particle.x += (targetX - particle.x) * easing;
        particle.y += (targetY - particle.y) * easing;
        const unsettled = Math.abs(targetX - particle.x) + Math.abs(targetY - particle.y) > 0.03;
        moving ||= unsettled;
        if (!unsettled) { particle.x = targetX; particle.y = targetY; }

        const opacity = motion.matches ? 1 - reveal.progress : reveal.progress === 0 ? 1 :
          reveal.progress === 1 ? 0 : Math.max(0, Math.min(1, (waveDistance - waveRadius + 14) / 28));
        if (!opacity) continue;
        context.globalAlpha = opacity;
        const flicker = !motion.matches && influence + wave > 0.15 && (particle.seed + glitch) % 7 === 0;
        const digit = flicker ? 1 - particle.digit : particle.digit;
        const level = Math.min(11, particle.level + Math.round((influence + wave) * 6));
        context.drawImage(atlas, level * 12 * tileRatio, digit * 12 * tileRatio,
          12 * tileRatio, 12 * tileRatio, particle.x - 6, particle.y - 6, 12, 12);
      }
      context.globalAlpha = 1;
      if (waveEnergy > 0) {
        context.beginPath();
        context.arc(reveal.x, reveal.y, waveRadius, 0, Math.PI * 2);
        context.strokeStyle = accent;
        context.lineWidth = 1.8;
        context.globalAlpha = waveEnergy * 0.85;
        context.stroke();
        context.globalAlpha = 1;
      }
      if (reveal.active && !motion.matches && elapsed < 0.35) {
        context.beginPath();
        context.arc(reveal.x, reveal.y, 8 + elapsed * 180, 0, Math.PI * 2);
        context.strokeStyle = accent;
        context.lineWidth = 2;
        context.globalAlpha = (1 - elapsed / 0.35) * 0.9;
        context.stroke();
        context.globalAlpha = 1;
      }

      if (reveal.active || moving || (interacting && !motion.matches)) requestFrame();
      else { previous = 0; scene.dataset.transition = 'idle'; }
    }

    function resize() {
      const width = scene.getBoundingClientRect().width;
      if (!width || !particles.length) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.height = Math.round(width * ratio);
      context.setTransform(canvas.width / SIZE, 0, 0, canvas.height / SIZE, 0, 0);
      try {
        createAtlas(Math.max(1, width * ratio / SIZE));
        requestFrame();
      } catch {
        atlas = null;
        delete scene.dataset.ready;
      }
    }

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      pointer.active = false;
      reveal.active = false;
      reveal.progress = reveal.to = imageViewRef.current ? 1 : 0;
      scene.dataset.transition = 'idle';
      for (const particle of particles) {
        particle.x = particle.homeX;
        particle.y = particle.homeY;
      }
      requestFrame();
    }

    function onMove(event) {
      if (event.pointerType === 'touch' || imageViewRef.current || reveal.active) return;
      const bounds = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - bounds.left) / bounds.width * SIZE;
      pointer.y = (event.clientY - bounds.top) / bounds.height * SIZE;
      pointer.active = true;
      requestFrame();
    }

    function onLeave() {
      pointer.active = false;
      requestFrame();
    }

    transitionRef.current = (x, y) => {
      pointer.active = false;
      if (!reveal.active) { reveal.x = x; reveal.y = y; }
      reveal.from = reveal.progress;
      reveal.to = imageViewRef.current ? 1 : 0;
      reveal.started = performance.now();
      reveal.active = true;
      scene.dataset.transition = 'running';
      requestFrame();
    };

    source.onload = () => {
      if (disposed) return;
      try {
        const mask = document.createElement('canvas');
        mask.width = mask.height = SIZE;
        const ink = mask.getContext('2d', { willReadFrequently: true });
        if (!ink) return;
        ink.drawImage(source, 18, 12, SIZE - 36, SIZE - 36);
        const pixels = ink.getImageData(0, 0, SIZE, SIZE).data;
        for (let y = GAP_Y / 2; y < SIZE; y += GAP_Y) {
          for (let x = GAP_X / 2; x < SIZE; x += GAP_X) {
            const index = (y * SIZE + x) * 4;
            if (pixels[index + 3] < 100) continue;
            const brightness = Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) / 255;
            const seed = (x * 17 + y * 31) % 997;
            particles.push({ homeX: x, homeY: y, x, y, seed, digit: seed % 2,
              level: Math.round(Math.pow(brightness, 0.8) * 11) });
          }
        }
        resize();
        if (atlas && particles.length) scene.dataset.ready = 'true';
      } catch {
        // Keep the supplied image visible if sampling or canvas fails.
        delete scene.dataset.ready;
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(scene);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      reset();
    });
    visibilityObserver.observe(scene);
    scene.addEventListener('pointermove', onMove, { passive: true });
    scene.addEventListener('pointerleave', onLeave);
    scene.addEventListener('pointercancel', onLeave);
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('blur', reset);
    motion.addEventListener('change', reset);
    source.src = SOURCE;

    return () => {
      disposed = true;
      transitionRef.current = () => {};
      cancelAnimationFrame(frame);
      source.onload = null;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerleave', onLeave);
      scene.removeEventListener('pointercancel', onLeave);
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('blur', reset);
      motion.removeEventListener('change', reset);
    };
  }, []);

  return <button ref={sceneRef} className={`${styles.binaryScene}${compact ? ` ${styles.binaryCompact}` : ''}`} type="button" data-binary-hacker=""
    data-view={showImage ? 'image' : 'binary'} aria-pressed={showImage}
    aria-label={showImage ? 'Show binary hacker image' : 'Show hacker image'}
    title={showImage ? 'Click to show binary' : 'Click to show hacker image'} onClick={toggleImage}>
    <img className={styles.binaryFallback} src={SOURCE} alt="" width="1254" height="1254" />
    <canvas ref={canvasRef} className={styles.binaryCanvas} aria-hidden="true" />
  </button>;
}
