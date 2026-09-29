'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import SmoothScroll from './SmoothScroll';
import styles from './SiteChrome.module.css';

export default function SiteChrome({ children }) {
  const pathname = usePathname();
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(pathname);
  const isWorkspace = pathname?.includes('/labs/');
  const isCoursesPage = pathname?.startsWith('/courses') && !isWorkspace;
  const isUserArea = pathname === '/account' || pathname === '/my-learning';

  return (
    <>
      {!isWorkspace && <SmoothScroll />}
      <Navbar isTransparent={pathname === '/'} />
      <main
        className={
          isWorkspace
            ? styles.workspaceMain
            : isAuthPage
            ? styles.authMain
            : isCoursesPage || isUserArea
            ? styles.standardMain
            : styles.defaultMain
        }
      >
        {children}
      </main>
      {!isWorkspace && <Footer />}
    </>
  );
}
