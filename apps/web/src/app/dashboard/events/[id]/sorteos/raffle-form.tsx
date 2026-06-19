'use client';

import { useActionState } from 'react';
import { createRaffleAction, type CreateRaffleState } from './actions';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const initial: CreateRaffleState = { error: null };

export function RaffleForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(createRaffleAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <Label htmlFor="name">Nombre del sorteo</Label>
        <Input id="name" name="name" required placeholder="Gran sorteo final" />
      </div>
      <div>
        <Label htmlFor="totalWinners">Número de ganadores</Label>
        <Input id="totalWinners" name="totalWinners" type="number" min={1} max={50} defaultValue={1} />
      </div>
      <div>
        <Label htmlFor="prizes">Premios (uno por línea, opcional)</Label>
        <textarea
          id="prizes"
          name="prizes"
          rows={3}
          placeholder={'iPhone 16\nAirPods\nGift card'}
          className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-white/70">
        <input type="checkbox" name="requirePresent" defaultChecked className="h-4 w-4" />
        El ganador debe estar presente (check-in)
      </label>
      <label className="flex items-center gap-3 text-sm text-white/70">
        <input type="checkbox" name="includeConfirmed" className="h-4 w-4" />
        Incluir confirmados (no solo asistentes)
      </label>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creando…' : 'Crear y abrir show'}
      </Button>
    </form>
  );
}
