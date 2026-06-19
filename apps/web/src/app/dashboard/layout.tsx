import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Super admin sin tenant va a su panel.
  if (user.isSuperAdmin && !user.tenantId) redirect('/superadmin/tenants');

  return (
    <AppShell
      user={user}
      nav={[
        { href: '/dashboard/events', label: 'Eventos' },
        { href: '/dashboard/events/new', label: 'Crear evento' },
      ]}
    >
      {children}
    </AppShell>
  );
}
