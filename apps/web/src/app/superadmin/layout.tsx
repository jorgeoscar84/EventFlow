import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isSuperAdmin) redirect('/dashboard');

  return (
    <AppShell
      user={user}
      nav={[
        { href: '/superadmin/tenants', label: 'Empresas' },
        { href: '/superadmin/tenants/new', label: 'Nueva empresa' },
      ]}
    >
      {children}
    </AppShell>
  );
}
