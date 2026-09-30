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

  return (
    <AdminContext.Provider value={{ id: user.id, email: user.email, name: profile?.name }}>
      <div className={styles.shell}>
        <nav className={styles.subnav} aria-label="Admin sections">
          <span className={styles.subnavLabel}>Admin</span>
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href}
              className={pathname.startsWith(section.href) || (section.href === '/admin/content' && pathname.startsWith('/admin/lessons')) ? styles.subnavActive : ''}>
              <span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span>{section.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </AdminContext.Provider>
  );
}
