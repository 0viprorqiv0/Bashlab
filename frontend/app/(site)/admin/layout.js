import AdminGate from '@/components/admin/AdminGate';

export const metadata = { title: 'Admin — BashLab' };

export default function AdminLayout({ children }) {
  return <AdminGate>{children}</AdminGate>;
}
