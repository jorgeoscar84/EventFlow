import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { signOutAction } from '@/app/actions/auth';

export default async function CheckinLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isSuperAdmin && !user.permissions.includes('checkin:scan')) redirect('/dashboard');

  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <div className="aurora" />
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Link href="/checkin" className="font-display text-lg tracking-tight">
          Check-in
        </Link>
        <form action={signOutAction}>
          <button className="text-sm text-white/50 hover:text-white">Salir</button>
        </form>
      </header>
      <main className="relative z-10 mx-auto max-w-md px-5 py-6">{children}</main>
    </div>
  );
}
