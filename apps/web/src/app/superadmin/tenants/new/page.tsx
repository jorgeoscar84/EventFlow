'use client';

import { useActionState } from 'react';
import { createTenantAction, type CreateTenantState } from '@/app/superadmin/actions';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/app-shell';

const initial: CreateTenantState = { error: null, success: null };

export default function NewTenantPage() {
  const [state, formAction, pending] = useActionState(createTenantAction, initial);

  return (
    <>
      <PageHeader title="Nueva empresa" description="Aprovisiona una empresa y su administrador." />
      <Card className="max-w-xl">
        {state.success ? (
          <div className="space-y-3">
            <p className="text-emerald-300">Empresa creada correctamente.</p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <p className="text-white/60">Credenciales de primer acceso del administrador:</p>
              <p className="mt-2">
                <span className="text-white/50">Email:</span> {state.success.email}
              </p>
              <p>
                <span className="text-white/50">Contraseña temporal:</span>{' '}
                <code className="rounded bg-white/10 px-1.5 py-0.5">
                  {state.success.tempPassword}
                </code>
              </p>
              <p className="mt-2 text-xs text-white/40">
                Comparte estas credenciales de forma segura. Pídele que la cambie al entrar.
              </p>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-5">
            <div>
              <Label htmlFor="name">Nombre de la empresa</Label>
              <Input id="name" name="name" required placeholder="Acme Corp" />
            </div>
            <div>
              <Label htmlFor="slug">Slug (subdominio)</Label>
              <Input id="slug" name="slug" required placeholder="acme" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="adminName">Nombre del admin</Label>
                <Input id="adminName" name="adminName" required placeholder="Jorge Pérez" />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email del admin</Label>
                <Input id="adminEmail" name="adminEmail" type="email" required />
              </div>
            </div>
            {state.error && <p className="text-sm text-red-400">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? 'Creando…' : 'Crear empresa'}
            </Button>
          </form>
        )}
      </Card>
    </>
  );
}
