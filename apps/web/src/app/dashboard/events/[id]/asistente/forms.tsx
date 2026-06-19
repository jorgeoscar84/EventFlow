'use client';

import { useActionState } from 'react';
import { toggleAssistantAction, reindexAction, addFaqAction, type AsstState } from './actions';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const initial: AsstState = { message: null, error: null };

export function ToggleForm({ eventId, enabled }: { eventId: string; enabled: boolean }) {
  const [state, action, pending] = useActionState(toggleAssistantAction, initial);
  return (
    <form action={action} className="flex items-center justify-between gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="enabled" value={enabled ? '' : 'on'} />
      <div>
        <p className="font-medium">Asistente {enabled ? 'activo' : 'inactivo'}</p>
        <p className="text-sm text-white/50">
          {enabled ? 'Responde dudas en la página pública del evento.' : 'Actívalo para atender a tus asistentes 24/7.'}
        </p>
        {state.message && <p className="mt-1 text-xs text-emerald-300">{state.message}</p>}
        {state.error && <p className="mt-1 text-xs text-red-400">{state.error}</p>}
      </div>
      <Button type="submit" variant={enabled ? 'secondary' : 'primary'} disabled={pending}>
        {pending ? '…' : enabled ? 'Desactivar' : 'Activar'}
      </Button>
    </form>
  );
}

export function ReindexForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(reindexAction, initial);
  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? 'Indexando…' : 'Re-indexar datos del evento'}
      </Button>
      {state.message && <span className="text-xs text-emerald-300">{state.message}</span>}
    </form>
  );
}

export function FaqForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(addFaqAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <Label htmlFor="question">Pregunta</Label>
        <Input id="question" name="question" placeholder="¿Hay estacionamiento?" />
      </div>
      <div>
        <Label htmlFor="answer">Respuesta</Label>
        <textarea
          id="answer"
          name="answer"
          rows={2}
          placeholder="Sí, el lugar cuenta con parqueo gratuito."
          className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      {state.message && <p className="text-xs text-emerald-300">{state.message}</p>}
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Guardando…' : 'Añadir a la base de conocimiento'}
      </Button>
    </form>
  );
}
