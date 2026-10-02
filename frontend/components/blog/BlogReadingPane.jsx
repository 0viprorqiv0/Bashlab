'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import styles from './Blog.module.css';

export default function BlogReadingPane({ children }) {
  const paneRef = useRef(null);

  useEffect(() => {
    const pane = paneRef.current;
    const desktop = window.matchMedia('(min-width: 801px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reader = reducedMotion.matches ? null : new Lenis({
      wrapper: pane,
      content: pane.firstElementChild,
      // Window input is routed below; this instance only animates the pane.
      virtualScroll: () => false,
      duration: 0.6,
      easing: (value) => Math.min(1, 1.001 - 2 ** (-10 * value)),
      autoRaf: true,
    });
    const anchorTop = () => Math.max(0, pane.getBoundingClientRect().top + window.scrollY - 94);
    const pageTo = (position, options = {}) => {
      if (window.lenis) window.lenis.scrollTo(position, options);
      else window.scrollTo({ top: position, behavior: 'instant' });
    };
    const readerTo = (position, options = {}) => {
      if (reader) reader.scrollTo(position, { immediate: reducedMotion.matches, ...options });
      else pane.scrollTo({ top: position, behavior: 'instant' });
    };
    const readerPosition = () => reader?.targetScroll ?? pane.scrollTop;
    // Keep input targets cumulative, and continuously ease toward them
    // instead of restarting a timed animation for every wheel tick.
    const inputMotion = { programmatic: false, lerp: 0.14 };

    function scrollBy(delta) {
      const anchor = anchorTop();
      const pagePosition = window.lenis?.targetScroll ?? window.scrollY;
      const limit = pane.scrollHeight - pane.clientHeight;
      if (limit <= 0) return false;

      // Reconcile native scrollbar / keyboard jumps outside the reading phase.
      if (pagePosition > anchor + 2 && readerPosition() < limit) readerTo(limit, { immediate: true });
      if (pagePosition < anchor - 2 && readerPosition() > 0) readerTo(0, { immediate: true });
      const total = Math.max(0, pagePosition + readerPosition() + delta);
      const innerPosition = Math.max(0, Math.min(limit, total - anchor));
      readerTo(innerPosition, inputMotion);
      pageTo(total - innerPosition, inputMotion);
      return true;
    }

    function handleWheel(event) {
      if (!desktop.matches || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (event.target.closest?.('[data-lenis-prevent], dialog, [role="dialog"]')) return;
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pane.clientHeight : 1;
      if (scrollBy(event.deltaY * multiplier * 2)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    function handleKey(event) {
      if (!desktop.matches || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.('input, textarea, select, button, a, [contenteditable="true"], dialog, [role="dialog"]')) return;
      const keys = { ArrowDown: 40, ArrowUp: -40, PageDown: pane.clientHeight * 0.9, PageUp: -pane.clientHeight * 0.9, ' ': pane.clientHeight * (event.shiftKey ? -0.9 : 0.9) };
      if (keys[event.key] && scrollBy(keys[event.key])) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    function goToSection(target) {
      pageTo(anchorTop(), inputMotion);
      const position = target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 24;
      readerTo(position);
    }

    function handleAnchor(event) {
      if (!desktop.matches || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const href = event.target.closest?.('a')?.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const target = document.getElementById(href.slice(1));
      if (!target || !pane.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      goToSection(target);
      window.history.replaceState(window.history.state, '', href);
    }

    function handleResize() {
      reader?.resize();
      if (!desktop.matches) readerTo(0, { immediate: true });
    }

    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    window.addEventListener('keydown', handleKey, true);
    document.addEventListener('click', handleAnchor, true);
    window.addEventListener('resize', handleResize);
    const hashTarget = document.getElementById(window.location.hash.slice(1));
    if (desktop.matches && hashTarget && pane.contains(hashTarget)) goToSection(hashTarget);

    return () => {
      window.removeEventListener('wheel', handleWheel, true);
      window.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('click', handleAnchor, true);
      window.removeEventListener('resize', handleResize);
      reader?.destroy();
    };
  }, []);

  return (
    <article ref={paneRef} className={styles.readingArticle} tabIndex={0} aria-label="Article content">
      <div className={styles.readingArticleContent}>{children}</div>
    </article>
  );
}
