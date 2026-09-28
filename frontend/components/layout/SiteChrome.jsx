'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import SmoothScroll from './SmoothScroll';
import styles from './SiteChrome.module.css';

export default function SiteChrome({ children }) {
  const pathname = usePathname();
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(pathname);
  const isUserArea = pathname === '/account' || pathname === '/my-learning';
  const isCoursesPage = pathname === '/courses';

  return (
    <>
      <SmoothScroll />
      <Navbar isTransparent={pathname === '/'} />
      <main className={isAuthPage ? styles.authMain : isCoursesPage || isUserArea ? 'pt-16 relative flex min-h-[100svh] flex-col' : 'pt-16 relative'}>
        {children}
      </main>
      <Footer />
    </>
  );
}
