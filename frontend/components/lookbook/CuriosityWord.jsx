'use client';

import { useEffect, useRef } from 'react';
import { WORD, DURATION, clamp, letterFrame, particleFrame, springStep } from './curiosityMotion.mjs';
import styles from './CuriosityWord.module.css';

export default function CuriosityWord() {
  const buttonRef = useRef(null);
  const textRef = useRef(null);
  const lettersRef = useRef(null);
  const canvasRef = useRef(null);
  const playRef = useRef(() => {});

  useEffect(() => {
    const button = buttonRef.current;
    const text = textRef.current;
    const layer = lettersRef.current;
    const canvas = canvasRef.current;
    const hero = button.closest('section');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
    let disposed = false;
    let ready = false;
    let playing = false;
    let frame = 0;
    let previous = 0;
    let started = 0;
    let highlightOnly = false;
    let context = null;
    let particles = [];
    let letters = [];
    let pointer = null;
    let width = 0;
    let height = 0;
    const padding = 12;

    function reset() {
      if (playing && !highlightOnly) hero.dispatchEvent(new CustomEvent('bashlab:curiosity', { detail: { active: false } }));
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      playing = false;
      pointer = null;
      button.dataset.phase = 'idle';
      for (const [index, letter] of letters.entries()) {
        letter.position.fill(0);
        letter.velocity.fill(0);
        letter.node.style.transform = '';
        letter.node.style.opacity = '';
        letter.light.style.opacity = '0';
        letter.face.textContent = WORD[index];
        letter.light.textContent = WORD[index];
      }
      context?.clearRect(0, 0, width + padding * 2, height + padding * 2);
    }

    function measure() {
      if (disposed) return;
      reset();
      ready = false;
      delete button.dataset.ready;
      layer.replaceChildren();
      letters = [];
      try {
        const bounds = text.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        if (!width || !height) return;
        const font = getComputedStyle(text);
        const range = document.createRange();
        for (let index = 0; index < WORD.length; index += 1) {
          range.setStart(text.firstChild, index);
          range.setEnd(text.firstChild, index + 1);
          const rect = range.getBoundingClientRect();
          const node = document.createElement('span');
          const face = document.createElement('span');
          const light = document.createElement('span');
          node.className = styles.letter;
          face.className = styles.face;
          light.className = styles.light;
          face.textContent = light.textContent = WORD[index];
          const left = rect.left - bounds.left;
          node.style.left = `${left}px`;
          node.style.width = `${rect.width}px`;
          node.append(face, light);
          layer.append(node);
          letters.push({ node, face, light, left, center: left + rect.width / 2, position: [0, 0, 0, 0], velocity: [0, 0, 0, 0] });
        }

        // Sample the actual font's alpha mask, including its kerning and tracking.
        // The visible HTML word remains available even if canvas is unsupported.
        const mask = document.createElement('canvas');
        mask.width = Math.ceil(width);
        mask.height = Math.ceil(height);
        const ink = mask.getContext('2d', { willReadFrequently: true });
        context = canvas.getContext('2d');
        if (!ink || !context) return;
        ink.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
        ink.textBaseline = 'alphabetic';
        ink.fillStyle = '#fff';
        ink.fontKerning = 'normal';
        ink.letterSpacing = font.letterSpacing;
        const metrics = ink.measureText(WORD);
        const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
        const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
        ink.fillText(WORD, 0, (height - ascent - descent) / 2 + ascent);
        const alpha = ink.getImageData(0, 0, mask.width, mask.height).data;
        particles = [];
        const gap = width < 200 ? 2 : 2.5;
        for (let y = 0; y < mask.height; y += gap) {
          for (let x = 0; x < mask.width; x += gap) {
            if (alpha[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3] < 100) continue;
            const angle = Math.random() * Math.PI * 2;
            const distance = 3 + Math.random() * 7;
            particles.push({ x, y, dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance, cyan: Math.random() < 0.25 });
          }
        }
        if (!particles.length) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.ceil((width + padding * 2) * ratio);
        canvas.height = Math.ceil((height + padding * 2) * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        ready = true;
        button.dataset.ready = 'true';
      } catch {
        // Font/canvas failures must never replace the semantic HTML fallback.
        context = null;
        delete button.dataset.ready;
      }
    }

    function requestFrame() {
      if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(tick);
    }

    function tick(now) {
      frame = 0;
      if (disposed || document.hidden) { reset(); return; }
      const dt = previous ? (now - previous) / 1000 : 1 / 60;
      previous = now;
      if (playing) {
        const elapsed = now - started;
        if (elapsed >= (highlightOnly ? 260 : DURATION)) {
          const resumePointer = pointer;
          reset();
          pointer = resumePointer;
          if (pointer && hover.matches && !motion.matches) requestFrame();
          return;
        }
        if (!highlightOnly) {
          const { scatter, opacity } = particleFrame(elapsed);
          context.clearRect(0, 0, width + padding * 2, height + padding * 2);
          context.globalAlpha = opacity;
          for (const particle of particles) {
            context.fillStyle = particle.cyan ? '#62f4ed' : '#00ff66';
            context.fillRect(padding + particle.x + particle.dx * scatter, padding + particle.y + particle.dy * scatter, 1.6, 1.6);
          }
          context.globalAlpha = 1;
          letters.forEach((letter, index) => {
            const state = letterFrame(elapsed, index);
            letter.node.style.opacity = String(state.opacity);
            letter.face.textContent = state.text;
            letter.light.textContent = state.text;
          });
        }
        requestFrame();
        return;
      }
      if (!ready || motion.matches || !hover.matches) { reset(); return; }
      const bounds = button.getBoundingClientRect();
      let moving = false;
      for (const letter of letters) {
        const dx = pointer ? pointer.x - bounds.left - letter.center : 0;
        const dy = pointer ? pointer.y - bounds.top - height / 2 : 0;
        const proximity = pointer ? Math.max(0, 1 - Math.hypot(dx, dy) / 85) ** 2 : 0;
        const targets = [-4 * proximity, -dy / 85 * 9 * proximity, dx / 85 * 12 * proximity, proximity * 0.85];
        for (let axis = 0; axis < targets.length; axis += 1) {
          const [position, velocity] = springStep(letter.position[axis], letter.velocity[axis], targets[axis], dt);
          const settled = Math.abs(position - targets[axis]) < 0.001 && Math.abs(velocity) < 0.01;
          letter.position[axis] = settled ? targets[axis] : position;
          letter.velocity[axis] = settled ? 0 : velocity;
          moving ||= !settled;
        }
        const [lift, tiltX, tiltY, light] = letter.position;
        letter.node.style.transform = `perspective(400px) translateY(${lift}px) translateZ(${-lift}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        letter.light.style.opacity = String(clamp(light));
        if (pointer) {
          letter.light.style.setProperty('--light-x', `${pointer.x - bounds.left - letter.left}px`);
          letter.light.style.setProperty('--light-y', `${pointer.y - bounds.top}px`);
        }
      }
      button.dataset.phase = pointer ? 'hover' : 'idle';
      if (moving) requestFrame();
      else previous = 0;
    }

    function onMove(event) {
      if (event.pointerType !== 'mouse' || !hover.matches || motion.matches) return;
      const rect = button.getBoundingClientRect();
      const nearby = event.clientX > rect.left - 85 && event.clientX < rect.right + 85 && event.clientY > rect.top - 85 && event.clientY < rect.bottom + 85;
      if (!nearby && !pointer) return;
      pointer = nearby ? { x: event.clientX, y: event.clientY } : null;
      if (!playing) requestFrame();
    }
    function onLeave() { pointer = null; if (!playing) requestFrame(); }
    function onVisibility() { if (document.hidden) reset(); }
    function onKey(event) { if (event.key === 'Escape') reset(); }
    function onPreference() { reset(); }
    function onScroll() { if (playing) reset(); else onLeave(); }

    playRef.current = () => {
      if (playing || document.hidden || disposed) return;
      const resumePointer = pointer;
      reset();
      pointer = resumePointer;
      playing = true;
      highlightOnly = motion.matches || !ready;
      button.dataset.phase = highlightOnly ? 'highlight' : 'playing';
      started = performance.now();
      if (!highlightOnly) hero.dispatchEvent(new CustomEvent('bashlab:curiosity', { detail: { active: true } }));
      requestFrame();
    };

    measure();
    document.fonts?.ready.then(() => { if (!disposed) measure(); });
    document.fonts?.addEventListener('loadingdone', measure);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(text);
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    hero.addEventListener('pointercancel', reset);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onPreference);
    hover.addEventListener('change', onPreference);
    return () => {
      disposed = true;
      reset();
      playRef.current = () => {};
      observer?.disconnect();
      document.fonts?.removeEventListener('loadingdone', measure);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      hero.removeEventListener('pointercancel', reset);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('blur', reset);
      window.removeEventListener('pagehide', reset);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onPreference);
      hover.removeEventListener('change', onPreference);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      className={styles.word}
      type="button"
      title="Animate curiosity"
      onClick={() => playRef.current()}
      onKeyDown={(event) => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); }}
    >
      <span ref={textRef} className={styles.text}>{WORD}</span>
      <span ref={lettersRef} className={styles.letters} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.particles} aria-hidden="true" />
    </button>
  );
}
