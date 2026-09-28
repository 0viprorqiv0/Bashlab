'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import SmoothScroll from './SmoothScroll';

export default function SiteChrome({ children }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isUserArea = pathname === '/account' || pathname === '/my-learning';
  const isCoursesPage = pathname === '/courses';

  return (
    <>
      <SmoothScroll />
      <Navbar isTransparent={pathname === '/'} />
      <main className={isCoursesPage || isUserArea ? 'pt-16 relative flex min-h-[100svh] flex-col' : isAuthPage ? 'pt-16 relative flex min-h-[calc(100svh-5rem)] flex-col' : 'pt-16 relative'}>
        {children}
      </main>
      <Footer />
    </>
  );
}
