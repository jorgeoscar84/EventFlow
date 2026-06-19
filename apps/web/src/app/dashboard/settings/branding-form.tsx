'use client';

import { useActionState } from 'react';
import { saveBrandingAction, type BrandingState } from './actions';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const initial: BrandingState = { ok: false, error: null };

export function BrandingForm({
  defaults,
}: {
  defaults: { displayName?: string; accentColor?: string; logoUrl?: string };
}) {
  const [state, formAction, pending] = useActionState(saveBrandingAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="displayName">Nombre visible</Label>
        <Input id="displayName" name="displayName" defaultValue={defaults.displayName} placeholder="Tu marca" />
      </div>
      <div>
        <Label htmlFor="accentColor">Color de acento (hex)</Label>
        <Input id="accentColor" name="accentColor" defaultValue={defaults.accentColor} placeholder="#6366f1" />
      </div>
      <div>
        <Label htmlFor="logoUrl">URL del logo (opcional)</Label>
        <Input id="logoUrl" name="logoUrl" defaultValue={defaults.logoUrl} placeholder="https://…/logo.svg" />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-300">Marca actualizada ✓</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar marca'}
      </Button>
    </form>
  );
}
