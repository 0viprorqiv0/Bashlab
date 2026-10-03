'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/authClient';
import BrandLogo from '@/components/shared/BrandLogo';
import { ErrorContent } from '@/components/shared/ErrorPage';
import { PageLoading } from '@/components/shared/Loading';
import styles from './Admin.module.css';

function AdminUserMenu({ user, profile }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const rawName = profile?.name || user?.email?.split('@')[0] || 'Admin';
  const cleanName = rawName.split('.')[0] || 'Admin';
  const displayName = profile?.name || cleanName;

  function getInitials(name, email) {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      const p = email.split('@')[0].replace(/[._-]/g, ' ').trim().split(/\s+/);
      if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
      return email.slice(0, 2).toUpperCase();
    }
    return 'AD';
  }

  const initials = getInitials(profile?.name, user?.email);

  async function handleLogout() {
    setOpen(false);
    await authClient.logout();
    router.push('/login');
  }

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        type="button"
        className="inline-flex items-center gap-2.5 py-1 px-3 pl-1 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 rounded-full transition-all cursor-pointer focus-visible select-none"
        onClick={() => setOpen(!open)}
        title={user?.email}
        aria-label="User profile menu"
        aria-expanded={open}
      >
        <span className="w-[28px] h-[28px] rounded-full flex items-center justify-center font-headline text-[11px] font-bold text-primary bg-[#052e16] border border-primary/40 flex-shrink-0">
          {initials}
        </span>
        <span className="font-body text-[12.5px] font-medium text-white max-w-[130px] truncate" title={displayName}>
          {cleanName}
        </span>
        <span className="text-[9.5px] font-code font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary">
          ADMIN
        </span>
        <span className="material-symbols-outlined text-[15px] text-[#777] select-none flex-shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#141414] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150" role="menu">
          <div className="flex items-center gap-3 p-3 border-b border-white/[0.08] mb-1 min-w-0">
            <span className="w-[32px] h-[32px] rounded-full flex items-center justify-center font-headline text-[12px] font-bold text-primary bg-[#052e16] border border-primary/40 flex-shrink-0">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-headline text-[13px] font-semibold text-white truncate" title={user?.email}>
                {displayName}
              </p>
              <p className="font-code text-[11px] text-primary mt-0.5">
                Admin
              </p>
            </div>
          </div>

          <Link
            href="/courses"
            onClick={() => setOpen(false)}
            className="group flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[12.5px] text-[#9BA3B5] hover:text-white transition-colors"
            role="menuitem"
          >
            <span className="material-symbols-outlined text-base text-accent-amber group-hover:brightness-125 transition-all">arrow_back</span>
            Exit to BashLab
          </Link>

          <Link
            href="/my-learning"
            onClick={() => setOpen(false)}
            className="group flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[12.5px] text-[#9BA3B5] hover:text-white transition-colors"
            role="menuitem"
          >
            <span className="material-symbols-outlined text-base text-primary group-hover:brightness-125 transition-all">school</span>
            My Learning
          </Link>

          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="group flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[12.5px] text-[#9BA3B5] hover:text-white transition-colors"
            role="menuitem"
          >
            <span className="material-symbols-outlined text-base text-[#9BA3B5] group-hover:text-white transition-colors">manage_accounts</span>
            Account &amp; Security
          </Link>

          <div className="border-t border-white/[0.08] my-1" />

          <button
            type="button"
            className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[12.5px] text-red-400/80 hover:text-red-400 transition-colors text-left"
            onClick={handleLogout}
            role="menuitem"
          >
            <span className="material-symbols-outlined text-base text-red-400/80 group-hover:text-red-400 transition-colors">logout</span>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

const SECTIONS = [
  { href: '/admin/content', label: 'Content', icon: 'account_tree' },
  { href: '/admin/users', label: 'Users', icon: 'group' },
  { href: '/admin/activity', label: 'Operations', icon: 'monitoring' },
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

  useEffect(() => {
    document.documentElement.classList.add('admin-locked');
    document.body.classList.add('admin-locked');
    return () => {
      document.documentElement.classList.remove('admin-locked');
      document.body.classList.remove('admin-locked');
    };
  }, []);

  if (loading || !user) return <PageLoading label="Checking access…" />;
  if (!isAdmin) {
    return <ErrorContent code="403" message="You do not have permission to access this page." />;
  }

  const isStudioPage = pathname.startsWith('/admin/studio') || pathname.startsWith('/admin/content');
  const displayName = profile?.name || user.email;

  return (
    <AdminContext.Provider value={{ id: user.id, email: user.email, name: profile?.name }}>
      <div className={styles.adminRoot} data-admin-token="shell">
        {/* GLOBAL VSCODE TITLE BAR FOR ALL ADMIN PAGES */}
        <header className={styles.adminTitleBar} aria-label="VSCode Title Bar">
          <div className={styles.titleBarLeft}>
            <Link href="/" className={styles.adminLogoLink} title="BashLab Home" aria-label="BashLab home">
              <BrandLogo />
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
            {!isStudioPage && <AdminUserMenu user={user} profile={profile} />}
          </div>
        </header>

        {/* Content Area below Title Bar */}
        <main className={styles.adminMainContent} data-admin-token="surface">
          <div data-admin-token="panel" className={isStudioPage ? styles.shellStudio : styles.shellStandard}>
            {children}
          </div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}
