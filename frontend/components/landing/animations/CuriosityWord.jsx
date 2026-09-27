'use client';

import { useEffect, useRef, useState } from 'react';
import { WORD, DURATION, clamp, letterFrame, particleFrame, springStep } from './curiosityMotion.mjs';
import styles from './CuriosityWord.module.css';

const GLITCH_SYMBOLS = ['3', '0', '7', '1', '!', '@', '#', '$', '%', '*', '?', '/', '_', 'x', '<', '>'];

export default function CuriosityWord({ word = WORD, transformTo = null, isGlitch = false } = {}) {
  const [displayWord, setDisplayWord] = useState(word);
  const [glitchActive, setGlitchActive] = useState(isGlitch);
  const buttonRef = useRef(null);
  const textRef = useRef(null);
  const lettersRef = useRef(null);
  const canvasRef = useRef(null);
  const playRef = useRef(() => {});

  useEffect(() => {
    setDisplayWord(word);
  }, [word]);

  useEffect(() => {
    setGlitchActive(isGlitch);
  }, [isGlitch]);

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
    let activeWord = displayWord;
    let transformedThisPlay = false;
    let glitchTimer = null;
    let glitchTimeouts = [];
    let lastScrambleTime = 0;
    let sourcePositions = [];
    let targetPositions = [];
    let targetWidth = 0;

    function clearGlitch() {
      if (glitchTimer) {
        clearTimeout(glitchTimer);
        glitchTimer = null;
      }
      for (const t of glitchTimeouts) {
        clearTimeout(t);
      }
      glitchTimeouts = [];
      if (letters && letters.length > 0) {
        for (const [idx, letter] of letters.entries()) {
          if (letter && activeWord[idx]) {
            letter.face.textContent = activeWord[idx];
            letter.light.textContent = activeWord[idx];
            delete letter.node.dataset.glitched;
            delete letter.node.dataset.scrambling;
            delete letter.node.dataset.resolved;
          }
        }
      }
    }

    function revertGlitch(targetIndices) {
      for (const idx of targetIndices) {
        const item = letters[idx];
        if (item && activeWord[idx]) {
          item.face.textContent = activeWord[idx];
          item.light.textContent = activeWord[idx];
          delete item.node.dataset.glitched;
        }
      }
    }

    function scheduleGlitch() {
      if (!glitchActive || playing || disposed || !ready || letters.length === 0) return;
      if (glitchTimer) clearTimeout(glitchTimer);

      const delay = 1200 + Math.random() * 1500;
      glitchTimer = setTimeout(() => {
        runGlitch();
      }, delay);
    }

    function runGlitch() {
      if (!glitchActive || playing || disposed || letters.length === 0) return;

      const count = Math.random() < 0.4 ? 2 : 1;
      const targetIndices = [];
      while (targetIndices.length < count && targetIndices.length < letters.length) {
        const randIdx = Math.floor(Math.random() * letters.length);
        if (!targetIndices.includes(randIdx)) {
          targetIndices.push(randIdx);
        }
      }

      for (const idx of targetIndices) {
        const item = letters[idx];
        if (!item) continue;
        const sym = GLITCH_SYMBOLS[Math.floor(Math.random() * GLITCH_SYMBOLS.length)];
        item.face.textContent = sym;
        item.light.textContent = sym;
        item.node.dataset.glitched = 'true';
      }

      const t1 = setTimeout(() => {
        if (!glitchActive || playing || disposed) {
          revertGlitch(targetIndices);
          return;
        }
        for (const idx of targetIndices) {
          const item = letters[idx];
          if (!item) continue;
          const sym2 = GLITCH_SYMBOLS[Math.floor(Math.random() * GLITCH_SYMBOLS.length)];
          item.face.textContent = sym2;
          item.light.textContent = sym2;
        }
      }, 70);
      glitchTimeouts.push(t1);

      const t2 = setTimeout(() => {
        revertGlitch(targetIndices);
        scheduleGlitch();
      }, 160);
      glitchTimeouts.push(t2);
    }

    function reset() {
      clearGlitch();
      if (playing && !highlightOnly) hero.dispatchEvent(new CustomEvent('bashlab:curiosity', { detail: { active: false } }));
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      playing = false;
      pointer = null;
      button.dataset.phase = 'idle';
      button.style.width = '';
      button.style.minWidth = '';
      for (const [index, letter] of letters.entries()) {
        letter.position.fill(0);
        letter.velocity.fill(0);
        letter.node.style.transform = '';
        letter.node.style.opacity = '';
        letter.light.style.opacity = '0';
        delete letter.node.dataset.scrambling;
        delete letter.node.dataset.resolved;
        letter.face.textContent = activeWord[index] ?? '';
        letter.light.textContent = activeWord[index] ?? '';
      }
      context?.clearRect(0, 0, width + padding * 2, height + padding * 2);
      if (glitchActive && !playing) scheduleGlitch();
    }

    function measure(customWord) {
      if (disposed) return;
      reset();
      ready = false;
      delete button.dataset.ready;
      if (glitchActive) {
        button.dataset.glitch = 'true';
      } else {
        delete button.dataset.glitch;
      }
      layer.replaceChildren();
      letters = [];
      const wordToMeasure = (typeof customWord === 'string' && customWord.length > 0)
        ? customWord
        : activeWord;

      try {
        text.textContent = wordToMeasure;
        const bounds = text.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        if (!width || !height) return;

        // If transformTo exists and activeWord is different, pre-measure transformTo positions
        targetWidth = width;
        targetPositions = [];
        if (transformTo && wordToMeasure !== transformTo) {
          text.textContent = transformTo;
          const targetBounds = text.getBoundingClientRect();
          targetWidth = targetBounds.width;
          const targetRange = document.createRange();
          for (let index = 0; index < transformTo.length; index += 1) {
            targetRange.setStart(text.firstChild, index);
            targetRange.setEnd(text.firstChild, index + 1);
            const rect = targetRange.getBoundingClientRect();
            targetPositions.push({
              left: rect.left - targetBounds.left,
              width: rect.width,
            });
          }
          text.textContent = wordToMeasure;
        }

        const stableWidth = Math.max(width, targetWidth);
        button.style.minWidth = `${stableWidth}px`;

        const font = getComputedStyle(text);
        const range = document.createRange();
        sourcePositions = [];
        for (let index = 0; index < wordToMeasure.length; index += 1) {
          range.setStart(text.firstChild, index);
          range.setEnd(text.firstChild, index + 1);
          const rect = range.getBoundingClientRect();
          const node = document.createElement('span');
          const face = document.createElement('span');
          const light = document.createElement('span');
          node.className = styles.letter;
          face.className = styles.face;
          light.className = styles.light;
          face.textContent = light.textContent = wordToMeasure[index];
          const left = rect.left - bounds.left;
          node.style.left = `${left}px`;
          node.style.width = `${rect.width}px`;
          node.append(face, light);
          layer.append(node);
          sourcePositions.push({ left, width: rect.width });
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
        const metrics = ink.measureText(wordToMeasure);
        const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
        const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
        ink.fillText(wordToMeasure, 0, (height - ascent - descent) / 2 + ascent);
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
        if (glitchActive && !playing) scheduleGlitch();
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
        const isSecretTransform = Boolean(transformTo && activeWord !== transformTo);

        if (isSecretTransform) {
          const SCRAMBLE_DURATION = 580;
          if (elapsed >= SCRAMBLE_DURATION || highlightOnly) {
            const resumePointer = pointer;
            activeWord = transformTo;
            // Trim letter 5 from DOM and array cleanly
            if (letters.length > transformTo.length) {
              for (let i = transformTo.length; i < letters.length; i += 1) {
                letters[i]?.node?.remove();
              }
              letters = letters.slice(0, transformTo.length);
            }
            // Ensure letters 0..4 are exactly at their targetPositions
            for (let i = 0; i < letters.length; i += 1) {
              const letter = letters[i];
              if (targetPositions && targetPositions[i]) {
                letter.left = targetPositions[i].left;
                letter.node.style.left = `${targetPositions[i].left}px`;
                letter.node.style.width = `${targetPositions[i].width}px`;
                letter.center = targetPositions[i].left + targetPositions[i].width / 2;
              }
              letter.face.textContent = transformTo[i];
              letter.light.textContent = transformTo[i];
              letter.node.style.opacity = '1';
              delete letter.node.dataset.scrambling;
              delete letter.node.dataset.resolved;
            }
            button.style.width = '';
            button.style.minWidth = '';
            setDisplayWord(transformTo);
            setGlitchActive(false);
            playing = false;
            button.dataset.phase = 'idle';
            pointer = resumePointer;
            if (pointer && hover.matches && !motion.matches) requestFrame();
            return;
          }

          context?.clearRect(0, 0, width + padding * 2, height + padding * 2);
          const target = transformTo;
          const shouldFlicker = (now - lastScrambleTime) >= 32;
          if (shouldFlicker) {
            lastScrambleTime = now;
          }

          // Smooth interpolation factor over first 200ms
          const morphT = Math.min(1, elapsed / 200);
          const smoothMorph = morphT * morphT * (3 - 2 * morphT);

          if (targetWidth && width && targetWidth !== width) {
            const curButtonWidth = width + (targetWidth - width) * smoothMorph;
            button.style.width = `${curButtonWidth}px`;
          }

          for (let index = 0; index < letters.length; index += 1) {
            const letter = letters[index];
            if (!letter) continue;

            if (index < target.length) {
              // Interpolate left and width smoothly so letters micro-shift during scramble with zero jump
              if (sourcePositions[index] && targetPositions[index]) {
                const curLeft = sourcePositions[index].left + (targetPositions[index].left - sourcePositions[index].left) * smoothMorph;
                const curWidth = sourcePositions[index].width + (targetPositions[index].width - sourcePositions[index].width) * smoothMorph;
                letter.node.style.left = `${curLeft}px`;
                letter.node.style.width = `${curWidth}px`;
              }

              const lockTime = 200 + index * 55;
              if (elapsed >= lockTime) {
                letter.face.textContent = target[index];
                letter.light.textContent = target[index];
                letter.node.style.opacity = '1';
                letter.node.dataset.resolved = 'true';
                delete letter.node.dataset.scrambling;
              } else {
                if (shouldFlicker) {
                  const sym = GLITCH_SYMBOLS[Math.floor(Math.random() * GLITCH_SYMBOLS.length)];
                  letter.face.textContent = sym;
                  letter.light.textContent = sym;
                }
                letter.node.style.opacity = '1';
                letter.node.dataset.scrambling = 'true';
                delete letter.node.dataset.resolved;
              }
            } else {
              // The 6th character (index 5)
              if (elapsed < 200) {
                if (shouldFlicker) {
                  const sym = GLITCH_SYMBOLS[Math.floor(Math.random() * GLITCH_SYMBOLS.length)];
                  letter.face.textContent = sym;
                  letter.light.textContent = sym;
                }
                letter.node.style.opacity = String(1 - smoothMorph);
                letter.node.dataset.scrambling = 'true';
              } else {
                letter.node.style.opacity = '0';
                letter.face.textContent = '';
                letter.light.textContent = '';
                delete letter.node.dataset.scrambling;
              }
            }
          }

          requestFrame();
          return;
        }

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
            const state = letterFrame(elapsed, index, activeWord);
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
      transformedThisPlay = false;
      highlightOnly = motion.matches || !ready;
      button.dataset.phase = highlightOnly ? 'highlight' : 'playing';
      started = performance.now();
      if (!highlightOnly) hero.dispatchEvent(new CustomEvent('bashlab:curiosity', { detail: { active: true } }));
      requestFrame();
    };

    const handleMeasure = () => {
      if (!disposed) measure();
    };

    measure();
    document.fonts?.ready.then(handleMeasure);
    document.fonts?.addEventListener('loadingdone', handleMeasure);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleMeasure) : null;
    observer?.observe(text);
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    hero.addEventListener('pointercancel', reset);
    window.addEventListener('resize', handleMeasure);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onPreference);
    hover.addEventListener('change', onPreference);
    return () => {
      disposed = true;
      clearGlitch();
      reset();
      playRef.current = () => {};
      observer?.disconnect();
      document.fonts?.removeEventListener('loadingdone', handleMeasure);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      hero.removeEventListener('pointercancel', reset);
      window.removeEventListener('resize', handleMeasure);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('blur', reset);
      window.removeEventListener('pagehide', reset);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onPreference);
      hover.removeEventListener('change', onPreference);
    };
  }, [displayWord, transformTo, glitchActive]);

  return (
    <button
      ref={buttonRef}
      className={styles.word}
      data-glitch={glitchActive ? 'true' : undefined}
      data-word={displayWord}
      type="button"
      onClick={() => playRef.current()}
      onKeyDown={(event) => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); }}
    >
      <span ref={textRef} className={styles.text}>{displayWord}</span>
      <span ref={lettersRef} className={styles.letters} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.particles} aria-hidden="true" />
    </button>
  );
}
