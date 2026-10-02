'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/auth/AuthProvider';
import Navbar from './Navbar';
import Footer from './Footer';
import SmoothScroll from './SmoothScroll';
import styles from './SiteChrome.module.css';

export default function SiteChrome({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname?.startsWith('/admin/');
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(pathname);
  const isAppPage = ['/account', '/my-learning', '/courses', '/learn']
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isWorkspace = pathname?.includes('/labs/');
  const isLanding = pathname === '/';
  const isViewportPage = !isWorkspace && (isAuthPage || ['/blog', '/account', '/my-learning', '/courses'].includes(pathname) || pathname?.startsWith('/courses/'));

  useEffect(() => {
    if (isAdmin) {
      document.documentElement.classList.add('admin-locked');
      document.body.classList.add('admin-locked');
      return () => {
        document.documentElement.classList.remove('admin-locked');
        document.body.classList.remove('admin-locked');
      };
    }
  }, [isAdmin]);

  return (
    <AuthProvider>
      {!isWorkspace && !isAdmin && !isViewportPage && <SmoothScroll wheelMultiplier={pathname === '/' || pathname?.startsWith('/blog') ? 2 : 1} duration={pathname?.startsWith('/blog') ? 0.6 : 0.8} />}
      {!isAdmin && <Navbar />}
      <div className={isAdmin ? styles.adminChromeContainer : `${styles.chromeContainer} ${isViewportPage ? styles.viewportContainer : ''}`}>
        <main
          className={
            isWorkspace
              ? styles.workspaceMain
              : isAdmin
              ? styles.adminMain
              : isViewportPage
              ? styles.viewportMain
              : isAppPage
              ? styles.standardMain
              : isLanding
              ? styles.landingMain
              : styles.defaultMain
          }
        >
          {children}
        </main>
        {!isWorkspace && !isLanding && !isAdmin && <Footer />}
      </div>
    </AuthProvider>
  );
}
