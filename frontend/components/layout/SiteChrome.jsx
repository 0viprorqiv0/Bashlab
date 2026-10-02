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
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(pathname);
  const isAppPage = ['/account', '/my-learning', '/courses', '/learn', '/admin']
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isWorkspace = pathname?.includes('/labs/');
  const isLanding = pathname === '/';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        }).catch(() => {});
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        }).catch(() => {});
      }
    }
  }, []);

  return (
    <AuthProvider>
      {!isWorkspace && <SmoothScroll wheelMultiplier={pathname === '/' ? 2 : 1} />}
      {!isWorkspace && <Navbar />}
      <div className={styles.chromeContainer}>
        <main
          className={
            isWorkspace
              ? styles.workspaceMain
              : isAuthPage
              ? styles.authMain
              : isAppPage
              ? styles.standardMain
              : isLanding
              ? styles.landingMain
              : styles.defaultMain
          }
        >
          {children}
        </main>
        {!isWorkspace && !isLanding && <Footer isLanding />}
      </div>
    </AuthProvider>
  );
}
