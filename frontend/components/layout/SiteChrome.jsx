'use client';

import { usePathname } from 'next/navigation';
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
            : isAppPage
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
