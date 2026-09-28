'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ErrorContent } from '@/components/shared/ErrorPage';
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
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles').select('role, is_locked, name').eq('id', user.id).single();
      if (cancelled) return;
      const isAdmin = profile?.role === 'admin' && !profile.is_locked;
      setState(isAdmin ? { status: 'admin', user: { id: user.id, email: user.email, name: profile.name } } : { status: 'denied' });
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (state.status === 'loading') return null;
  if (state.status === 'denied') {
    return <ErrorContent code="403" message="You do not have permission to access this page." />;
  }

  return (
    <AdminContext.Provider value={state.user}>
      <div className={styles.shell}>
        <nav className={styles.subnav} aria-label="Admin sections">
          <span className={styles.subnavLabel}>Admin</span>
          {SECTIONS.map((section) => (
            <a key={section.href} href={section.href}
              className={pathname.startsWith(section.href) || (section.href === '/admin/content' && pathname.startsWith('/admin/lessons')) ? styles.subnavActive : ''}>
              <span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span>{section.label}
            </a>
          ))}
        </nav>
        {children}
      </div>
    </AdminContext.Provider>
  );
}
