import Link from 'next/link';
import { listTenants } from '@eventflow/db';
import { PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, Badge } from '@/components/ui/card';

export default async function TenantsPage() {
  const { items } = await listTenants();

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Administra las empresas/aliados que usan la plataforma."
        action={
          <Link href="/superadmin/tenants/new">
            <Button>Nueva empresa</Button>
          </Link>
        }
      />

      {items.length === 0 ? (
        <Card className="text-center text-white/50">
          Aún no hay empresas.{' '}
          <Link href="/superadmin/tenants/new" className="text-brand-500 hover:underline">
            Crea la primera
          </Link>
          .
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-white/50">
              <tr>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Slug</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Eventos</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3 text-white/60">{t.slug}</td>
                  <td className="px-5 py-3 text-white/60">{t.plan?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-white/60">{t._count.events}</td>
                  <td className="px-5 py-3">
                    <Badge kind={t.status}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
