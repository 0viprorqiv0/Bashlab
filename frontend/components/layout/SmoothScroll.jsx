'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export default function SmoothScroll({ wheelMultiplier = 1 }) {
  useEffect(() => {
    // Tôn trọng cài đặt giảm chuyển động của người dùng
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Khởi tạo Lenis với thông số học từ SmoothScroll của https://antigravity.google
    // (Damping 0.6s ~ 0.8s, easeOutExpo, hỗ trợ touch mượt mà)
    const lenis = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
      smoothTouch: true,
      autoRaf: false,
    });

    // Gắn instance vào window để các component khác (như Lookbook, Navbar) có thể dùng chung
    window.lenis = lenis;

    // Nếu vào trang mới không có hash, đảm bảo luôn xuất phát từ đỉnh trang (0, 0)
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history && !window.location.hash) {
        window.history.scrollRestoration = 'manual';
      }
      if (!window.location.hash) {
        window.scrollTo(0, 0);
        lenis.scrollTo(0, { immediate: true });
      }
    }

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Xử lý cuộn mượt cho tất cả anchor links (#hash) tương tự antigravity.google
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      let targetId = '';
      if (href.startsWith('#')) {
        targetId = href;
      } else {
        try {
          const url = new URL(href, window.location.href);
          if (
            url.origin === window.location.origin &&
            url.pathname === window.location.pathname &&
            url.hash
          ) {
            targetId = url.hash;
          }
        } catch {}
      }

      if (targetId && targetId.length > 1) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          lenis.scrollTo(targetEl, {
            offset: -64, // Bù trừ chiều cao fixed Navbar 64px
            duration: 1.0,
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', handleAnchorClick);
      lenis.destroy();
      delete window.lenis;
    };
  }, []);

  useEffect(() => {
    if (window.lenis) window.lenis.options.wheelMultiplier = wheelMultiplier;
  }, [wheelMultiplier]);

  return null;
}
