'use client';

import { useActionState } from 'react';
import { signInAction, type SignInState } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const initial: SignInState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, initial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Eventflow</h1>
          <p className="mt-1 text-sm text-white/50">Accede a tu panel</p>
        </div>
        <Card>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {state.error && <p className="text-sm text-red-400">{state.error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? 'Entrando…' : 'Iniciar sesión'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
