'use client';

import { createContext, useContext, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { ErrorContent } from '@/components/shared/ErrorPage';
import { PageLoading } from '@/components/shared/Loading';
import styles from './Admin.module.css';

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

const SECTIONS = [
  { href: '/admin/content', label: 'Content', icon: 'account_tree' },
  { href: '/admin/users', label: 'Users', icon: 'group' },
  { href: '/admin/activity', label: 'Activity', icon: 'monitoring' },
];

// UX guard only — every admin read/write is enforced again by RLS and the
// admin_* RPCs in Postgres, so hiding this page is not the security boundary.
export default function AdminGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user, profile, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, pathname, router]);

  if (loading || !user) return <PageLoading label="Checking access…" />;
  if (!isAdmin) {
    return <ErrorContent code="403" message="You do not have permission to access this page." />;
  }

  const isStudioPage = pathname.startsWith('/admin/studio') || pathname.startsWith('/admin/content');

  return (
    <AdminContext.Provider value={{ id: user.id, email: user.email, name: profile?.name }}>
      <div className={styles.adminRoot}>
        {/* GLOBAL VSCODE TITLE BAR FOR ALL ADMIN PAGES */}
        <header className={styles.adminTitleBar} aria-label="VSCode Title Bar">
          <div className={styles.titleBarLeft}>
            <Link href="/" className={styles.adminLogoLink} title="BashLab Home">
              <svg width="20" height="20" viewBox="0 0 104 104" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="100" height="100" rx="22" fill="#18202b" stroke="#465363" strokeWidth="4" />
                <path d="M30 35L51 52L30 69M58 69H79" stroke="#68dfa0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <nav className={styles.adminMenuBar} aria-label="Admin sections">
              {SECTIONS.map((section) => {
                const isActive =
                  pathname.startsWith(section.href) ||
                  (section.href === '/admin/content' && (pathname.startsWith('/admin/lessons') || pathname.startsWith('/admin/studio')));
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={`${styles.adminMenuItem} ${isActive ? styles.adminMenuItemActive : ''}`}
                  >
                    {section.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center: Command Center slot (only populated on Content tab via portal) */}
          <div id="admin-header-center" className={styles.titleBarCenter} />

          {/* Right: Actions */}
          <div id="admin-header-right" className={styles.titleBarRight}>
            {!isStudioPage && (
              <div className={styles.adminUserBadge}>
                <span className={styles.adminUserDot} />
                <span>{profile?.name || user.email}</span>
              </div>
            )}
          </div>
        </header>

        {/* Content Area below Title Bar */}
        <main className={styles.adminMainContent}>
          <div className={isStudioPage ? styles.shellStudio : styles.shellStandard}>
            {children}
          </div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}
