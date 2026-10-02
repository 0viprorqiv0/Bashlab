'use client';

/* Interactive galaxy backdrop — hero only.
   Spiral star clouds on three depth layers, soft nebula dust,
   slow counterclockwise orbit and pointer/word interaction.
   Decorative canvas behind content; never blocks pointer or scroll.
   Three.js loads independently after mount. Static CSS fallback
   for reduced-motion or missing WebGL. */

import React, { useEffect, useRef, useState } from 'react';
import hostStyles from './CyberBackdrop.module.css';
import { createHeroField } from './heroField.mjs';

const DESKTOP_MIN = 901;
const FAR_Z = -1.6;

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function makeGlowTexture(THREE, inner, outer) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export default function CyberBackdrop() {
  const hostRef = useRef(null);
  const [mode, setMode] = useState('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let reduceMotion = false;
    try {
      reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduceMotion = false;
    }
    if (reduceMotion) {
      setMode('static');
      return undefined;
    }

    const hero = host.closest('section');
    if (!hero) {
      setMode('static');
      return undefined;
    }

    let cancelled = false;
    let renderer = null;
    let raf = 0;
    let running = false;
    let heroVisible = true;
    let heroRatio = 1;
    let io = null;
    let ro = null;
    const disposables = [];
    const meteors = [];
    let meteorFlights = [];
    let meteorRequested = false;

    const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    let pulseStarted = -Infinity;
    const isMobileWidth = () => window.innerWidth < DESKTOP_MIN;
    let parallaxOn = false;

    function setHostFade() {
      host.style.opacity = String(clamp01((heroRatio - 0.04) / 0.45));
    }

    function loopTick(scene, camera, group, glowA, glowB, uniforms, clock) {
      raf = 0;
      if (cancelled || reduceMotion || document.hidden || !heroVisible) {
        running = false;
        return;
      }
      running = true;
      raf = window.requestAnimationFrame(() =>
        loopTick(scene, camera, group, glowA, glowB, uniforms, clock)
      );

      // Clamp resumed frames so tab visibility changes cannot jump the orbit.
      const delta = Math.min(clock.getDelta(), 0.05);
      const t = uniforms.uTime.value + delta;
      uniforms.uTime.value = t;
      if (meteorRequested) {
        meteorRequested = false;
        const bounds = host.getBoundingClientRect();
        if (meteors.length && bounds.width > 0 && bounds.height > 0) {
          meteorFlights.forEach((flight) => flight.cancel());
          const count = 1;
          meteorFlights = meteors.slice(0, count).map((meteor) => {
            const startX = bounds.width - 40;
            const startY = -50;
            const drop = bounds.height - startY + 240;
            // Keep the endpoint inside the width so every head exits at the bottom.
            const bottomOffset = (bounds.height - startY) / drop;
            const dx = (40 - startX) / bottomOffset;
            // The tail extends right at rest; rotate it opposite downward travel.
            const angle = Math.atan2(drop, dx) * 180 / Math.PI - 180;
            meteor.style.left = `${startX}px`;
            meteor.style.top = `${startY}px`;
            const size = 65;
            meteor.style.fontSize = `${size}px`;
            meteor.style.setProperty('--tail-length', '416px');
            return meteor.animate([
              { transform: `translate(0, 0) rotate(${angle}deg) scaleX(0.3)`, opacity: 0 },
              { transform: `translate(${dx * 0.12}px, ${drop * 0.12}px) rotate(${angle}deg) scaleX(1)`, opacity: 1, offset: 0.12 },
              { transform: `translate(${dx * bottomOffset}px, ${drop * bottomOffset}px) rotate(${angle}deg) scaleX(1)`, opacity: 0.9, offset: bottomOffset },
              { transform: `translate(${dx}px, ${drop}px) rotate(${angle}deg) scaleX(0.45)`, opacity: 0 },
            ], { duration: 6200, delay: 0, easing: 'linear' });
          });
        }
      }
      // Frame-rate independent continuous damp for 120fps+ high-refresh displays
      const pointerDamp = 1 - Math.pow(1 - 0.08, Math.min(delta, 0.05) * 60);
      uniforms.uPointer.value.z += ((pointer.active ? 1 : 0) - uniforms.uPointer.value.z) * pointerDamp;
      uniforms.uPulse.value = Math.min(1, (performance.now() - pulseStarted) / 1300);

      /* gentle drift of the whole field */
      group.position.y = Math.sin(t * 0.06) * 0.12;
      /* drift the particle field slightly backward as the hero exits */
      group.position.z = (1 - clamp01((heroRatio - 0.04) / 0.45)) * FAR_Z;

      /* soft green light wandering slowly */
      glowA.position.x = Math.sin(t * 0.07) * 1.4 - 2.2;
      glowA.position.y = 2.1 + Math.cos(t * 0.05) * 0.7;
      glowB.position.x = 5.4 + Math.cos(t * 0.06) * 0.9;
      glowB.position.y = 2.6 + Math.sin(t * 0.045) * 0.6;

      /* eased pointer parallax — background only, tiny range */
      if (parallaxOn) {
        const parallaxDamp = 1 - Math.pow(1 - 0.045, Math.min(delta, 0.05) * 60);
        pointer.x += (pointer.tx - pointer.x) * parallaxDamp;
        pointer.y += (pointer.ty - pointer.y) * parallaxDamp;
        camera.position.x = pointer.x;
        camera.position.y = pointer.y;
        camera.lookAt(0, 0.4, -4);
      }

      renderer.render(scene, camera);
    }

    function startLoop(scene, camera, group, glowA, glowB, uniforms, clock) {
      if (running || cancelled || reduceMotion || document.hidden || !heroVisible) return;
      running = true;
      raf = window.requestAnimationFrame(() =>
        loopTick(scene, camera, group, glowA, glowB, uniforms, clock)
      );
    }

    function stopLoop() {
      meteorRequested = false;
      meteorFlights.forEach((flight) => flight.cancel());
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    }

    async function init() {
      let THREE;
      try {
        THREE = await import('three');
      } catch {
        if (!cancelled) setMode('static');
        return;
      }
      if (cancelled) return;

      const mobile = isMobileWidth();
      parallaxOn =
        !mobile &&
        window.matchMedia('(pointer: fine)').matches;

      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          powerPreference: 'high-performance',
          depth: false,
          stencil: false,
        });
      } catch {
        if (!cancelled) setMode('static');
        return;
      }
      if (!renderer || !renderer.getContext()) {
        if (!cancelled) setMode('static');
        return;
      }
      disposables.push(() => renderer.dispose());

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.transform = 'translateZ(0)';
      canvas.style.willChange = 'transform';
      host.appendChild(canvas);
      for (let i = 0; i < 1; i += 1) {
        const meteor = document.createElement('span');
        meteor.className = hostStyles.meteor;
        meteor.setAttribute('aria-hidden', 'true');
        host.appendChild(meteor);
        meteors.push(meteor);
      }
      disposables.push(() => meteorFlights.forEach((flight) => flight.cancel()));
      function requestMeteors() {
        if (reduceMotion || cancelled || document.hidden || !heroVisible || meteorRequested) return;
        if (meteorFlights.some((flight) => flight.playState === 'running' || flight.pending)) return;
        meteorRequested = true;
      }
      hero.addEventListener('bashlab:meteors', requestMeteors);
      disposables.push(() => hero.removeEventListener('bashlab:meteors', requestMeteors));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0.4, -4);

      const group = new THREE.Group();
      scene.add(group);

      const field = createHeroField(4800);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(field.position, 3));
      for (const name of ['phase', 'speed', 'size', 'mix', 'opacity', 'soft']) {
        geo.setAttribute(`a${name[0].toUpperCase()}${name.slice(1)}`, new THREE.BufferAttribute(field[name], 1));
      }
      disposables.push(() => geo.dispose());

      const uniforms = {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
        uAspect: { value: 1 },
        uQuiet: { value: new THREE.Vector4(0, -0.06, 0.30, 0.30) },
        uPointer: { value: new THREE.Vector3(0, 0, 0) },
        uOrigin: { value: new THREE.Vector2(0, 0) },
        uPulse: { value: 1 },
      };

      const mat = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float aPhase;
          attribute float aSpeed;
          attribute float aSize;
          attribute float aMix;
          attribute float aOpacity;
          attribute float aSoft;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uAspect;
          uniform vec4 uQuiet;
          uniform vec3 uPointer;
          uniform vec2 uOrigin;
          uniform float uPulse;
          varying float vTw;
          varying float vMix;
          varying float vSoft;
          void main() {
            vec3 p = position;
            // Positive angle in y-up coordinates moves counterclockwise.
            // Depth layers orbit at slightly different speeds (about 7–10 min/lap).
            float angle = uTime * (0.010 + aSpeed * 0.012);
            float c = cos(angle);
            float s = sin(angle);
            p.xy = mat2(c, s, -s, c) * p.xy;
            p.x += sin(uTime*0.055 + p.y*3.0 + aPhase)*0.020;
            p.y += cos(uTime*0.045 + p.x*2.0 + aPhase)*0.026;
            // Fit each depth layer to the same viewport; retain real depth/parallax.
            p.xy *= vec2(uAspect, 1.0) * (10.0-p.z) * 0.57735;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vec4 clip = projectionMatrix * mv;
            vec2 screen = clip.xy/clip.w;
            vec2 aspect = vec2(uAspect, 1.0);
            vec2 delta = (screen-uPointer.xy)*aspect;
            float distanceToPointer = length(delta);
            float nearby = exp(-distanceToPointer*distanceToPointer/0.045)*uPointer.z;
            vec2 fromWord = (screen-uOrigin)*aspect;
            float radius = length(fromWord);
            float wave = exp(-pow((radius-uPulse*1.7)/0.13,2.0))*sin(uPulse*3.141593);
            screen += (delta/max(distanceToPointer,0.001)*nearby*0.065
              + fromWord/max(radius,0.001)*wave*0.035)/aspect;
            clip.xy = screen*clip.w;
            // Continuous elliptical falloff: no rectangular hole behind the copy.
            float quiet = mix(0.12, 1.0, smoothstep(0.25, 1.5,
              length((screen-uQuiet.xy)/max(uQuiet.zw,vec2(0.01)))));
            float edge = 1.0-smoothstep(0.80,1.05,max(abs(screen.x),abs(screen.y)));
            // Double the whole field during the word sequence, easing at each end.
            float clickLight = smoothstep(0.0, 0.08, uPulse)
              * (1.0-smoothstep(0.78, 1.0, uPulse));
            vTw = (0.80 + 0.20*sin(uTime*aSpeed+aPhase)) * aOpacity * quiet * edge * (1.0+nearby*0.7+wave*1.5) * (1.0+clickLight);
            vMix = min(1.0, aMix+nearby*0.35+wave*0.4);
            vSoft = aSoft;
            gl_PointSize = aSize * uPixelRatio;
            gl_Position = clip;
          }
        `,
        fragmentShader: `
          varying float vTw;
          varying float vMix;
          varying float vSoft;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = mix(1.0-smoothstep(0.10,0.5,d), exp(-d*d*18.0)*(1.0-smoothstep(0.32,0.5,d)), vSoft);
            vec3 green = vec3(0.41, 0.87, 0.63);
            vec3 cyan = vec3(0.47, 0.80, 0.83);
            vec3 col = mix(green, cyan, vMix);
            // Pale stellar cores sit inside coloured halos.
            col = mix(col, vec3(0.72,0.95,1.0), (1.0-smoothstep(0.0,0.20,d))*(1.0-vSoft)*0.50);
            gl_FragColor = vec4(col, a * vTw);
          }
        `,
      });
      disposables.push(() => mat.dispose());

      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      group.add(points);

      /* ---- one soft diffused green light + faint cyan echo ---- */
      const glowTex = makeGlowTexture(THREE, 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0.22)');
      disposables.push(() => glowTex.dispose());

      const glowAMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0x68dfa0,
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glowA = new THREE.Mesh(new THREE.PlaneGeometry(15, 9.5), glowAMat);
      glowA.position.set(-2.2, 2.1, -12);
      scene.add(glowA);
      disposables.push(() => {
        glowA.geometry.dispose();
        glowAMat.dispose();
      });

      const glowBMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0x78cbd4,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glowB = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), glowBMat);
      glowB.position.set(5.4, 2.6, -11);
      scene.add(glowB);
      disposables.push(() => {
        glowB.geometry.dispose();
        glowBMat.dispose();
      });

      const clock = new THREE.Clock();

      function resize() {
        if (!renderer) return;
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.5);
        uniforms.uAspect.value = w / h;
        geo.setDrawRange(0, w < DESKTOP_MIN ? 800 : 4800);
        parallaxOn = w >= DESKTOP_MIN && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const content = hero.querySelector('h1')?.parentElement;
        if (content) {
          const bounds = host.getBoundingClientRect();
          const boxes = Array.from(content.children, (child) => child.getBoundingClientRect());
          const left = Math.min(...boxes.map((box) => box.left)) - bounds.left - 12;
          const right = Math.max(...boxes.map((box) => box.right)) - bounds.left + 12;
          const top = Math.min(...boxes.map((box) => box.top)) - bounds.top - 8;
          const bottom = Math.max(...boxes.map((box) => box.bottom)) - bounds.top + 8;
          uniforms.uQuiet.value.set((left+right)/w-1, 1-(top+bottom)/h, (right-left)/w, (bottom-top)/h);
        }
      }
      resize();
      document.fonts?.ready.then(() => { if (!cancelled) resize(); });

      if ('ResizeObserver' in window) {
        ro = new ResizeObserver(resize);
        ro.observe(host);
      } else {
        window.addEventListener('resize', resize);
      }

      function onPointer(e) {
        if (reduceMotion || !parallaxOn || e.pointerType === 'touch' || performance.now()-pulseStarted < 1300) return;
        const r = hero.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const nx2 = (e.clientX - r.left) / r.width - 0.5;
        const ny2 = (e.clientY - r.top) / r.height - 0.5;
        pointer.tx = nx2 * 0.4;
        pointer.ty = -ny2 * 0.28;
        pointer.active = true;
        uniforms.uPointer.value.set(nx2*2, -ny2*2, uniforms.uPointer.value.z);
      }
      hero.addEventListener('pointermove', onPointer, { passive: true });

      function onLeave() {
        pointer.active = false;
        pointer.tx = pointer.ty = 0;
      }
      function onCuriosity(event) {
        if (!event.detail?.active) {
          pulseStarted = -Infinity;
          uniforms.uPulse.value = 1;
          return;
        }
        if (performance.now()-pulseStarted < 1300) return;
        const word = hero.querySelector('h1 button')?.getBoundingClientRect();
        const bounds = hero.getBoundingClientRect();
        if (!word) return;
        uniforms.uOrigin.value.set((word.left+word.width/2-bounds.left)/bounds.width*2-1,
          1-(word.top+word.height/2-bounds.top)/bounds.height*2);
        pulseStarted = performance.now();
        onLeave();
      }
      hero.addEventListener('pointerleave', onLeave);
      hero.addEventListener('pointercancel', onLeave);
      hero.addEventListener('bashlab:curiosity', onCuriosity);
      window.addEventListener('blur', onLeave);

      const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      function onMotionPreference() {
        reduceMotion = motionPreference.matches;
        onLeave();
        pulseStarted = -Infinity;
        uniforms.uPulse.value = 1;
        uniforms.uPointer.value.z = 0;
        if (reduceMotion) {
          stopLoop();
          renderer.render(scene, camera);
        } else startLoop(scene, camera, group, glowA, glowB, uniforms, clock);
      }
      motionPreference.addEventListener('change', onMotionPreference);

      function onVis() {
        if (document.hidden) {
          onLeave();
          pulseStarted = -Infinity;
          stopLoop();
        } else {
          setHostFade();
          startLoop(scene, camera, group, glowA, glowB, uniforms, clock);
        }
      }
      document.addEventListener('visibilitychange', onVis);

      io = new IntersectionObserver(
        (entries) => {
          const en = entries[0];
          heroRatio = en.intersectionRatio;
          heroVisible = en.isIntersecting && heroRatio > 0.02;
          setHostFade();
          if (heroVisible && !document.hidden) {
            startLoop(scene, camera, group, glowA, glowB, uniforms, clock);
          } else {
            stopLoop();
          }
        },
        { threshold: [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1] }
      );
      io.observe(hero);

      disposables.push(() => {
        hero.removeEventListener('pointermove', onPointer);
        hero.removeEventListener('pointerleave', onLeave);
        hero.removeEventListener('pointercancel', onLeave);
        hero.removeEventListener('bashlab:curiosity', onCuriosity);
        window.removeEventListener('blur', onLeave);
        motionPreference.removeEventListener('change', onMotionPreference);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('resize', resize);
        stopLoop();
      });

      if (!cancelled) {
        setMode('live');
        setHostFade();
        startLoop(scene, camera, group, glowA, glowB, uniforms, clock);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      disposables.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore teardown errors */
        }
      });
      if (host) {
        while (host.firstChild) {
          host.removeChild(host.firstChild);
        }
        host.style.opacity = '';
      }
    };
  }, []);

  return (
    <div aria-hidden="true" className={hostStyles.host}>
      {mode === 'static' && <div className={hostStyles.fallback} />}
      <div ref={hostRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
    </div>
  );
}
