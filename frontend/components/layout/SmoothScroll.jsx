'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export default function SmoothScroll({ wheelMultiplier = 1, duration = 0.8 }) {
  const pathname = usePathname();
  const lenisRef = useRef(null);
  const wheelScale = useRef(wheelMultiplier);

  useEffect(() => {
    // Tôn trọng cài đặt giảm chuyển động của người dùng
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      virtualScroll: (data) => {
        if (data.event.type === 'wheel') {
          data.deltaX *= wheelScale.current;
          data.deltaY *= wheelScale.current;
        }
      },
      touchMultiplier: 1.2,
      smoothTouch: false,
      autoResize: true,
      autoRaf: false,
    });

    lenisRef.current = lenis;
    window.lenis = lenis;

    // Đảm bảo xuất phát từ đỉnh trang khi tải trang không có hash
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

    // Xử lý cuộn mượt cho tất cả anchor links (#hash)
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
      lenisRef.current = null;
      delete window.lenis;
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'auto';
    };
  }, []);

  // Cập nhật wheelMultiplier khi prop thay đổi
  useEffect(() => {
    wheelScale.current = wheelMultiplier;
    const lenis = lenisRef.current || window.lenis;
    if (lenis) {
      if (lenis.options) {
        lenis.options.wheelMultiplier = wheelMultiplier;
        lenis.options.duration = duration;
      }
      if (lenis.virtualScroll?.options) lenis.virtualScroll.options.wheelMultiplier = 1;
    }
  }, [wheelMultiplier, duration]);

  // Đồng bộ kích thước và vị trí cuộn khi chuyển trang (Next.js SPA routing)
  useEffect(() => {
    const lenis = lenisRef.current || window.lenis;
    if (!lenis) return;

    // Reset cuộn lên đầu trang nếu không có hash
    if (!window.location.hash) {
      window.scrollTo(0, 0);
      lenis.scrollTo(0, { immediate: true });
    }

    // Sau khi Next.js render nội dung trang mới, yêu cầu Lenis tính toán lại chiều cao
    const timer = setTimeout(() => {
      const activeLenis = lenisRef.current || window.lenis;
      if (activeLenis) {
        activeLenis.resize();
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
