'use client';

import { useActionState, useState } from 'react';
import { createEventAction, type CreateEventState } from '@/app/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/app-shell';

const initial: CreateEventState = { error: null };

export default function NewEventPage() {
  const [state, formAction, pending] = useActionState(createEventAction, initial);
  const [type, setType] = useState('in_person');

  return (
    <>
      <PageHeader title="Crear evento" description="Define los datos básicos de tu evento." />
      <Card className="max-w-2xl">
        <form action={formAction} className="space-y-5">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required placeholder="Cumbre de Tecnología 2026" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="in_person">Presencial</option>
                <option value="digital">Digital</option>
                <option value="hybrid">Híbrido</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="capacity">Aforo (opcional)</Label>
              <Input id="capacity" name="capacity" type="number" min={1} placeholder="500" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startsAt">Inicio</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div>
              <Label htmlFor="endsAt">Fin</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" required />
            </div>
          </div>

          <div>
            <Label htmlFor="timezone">Zona horaria</Label>
            <Input id="timezone" name="timezone" defaultValue="America/Santo_Domingo" />
          </div>

          {type !== 'digital' && (
            <div>
              <Label htmlFor="locationName">Ubicación (presencial)</Label>
              <Input id="locationName" name="locationName" placeholder="Centro de Convenciones" />
            </div>
          )}
          {type !== 'in_person' && (
            <div>
              <Label htmlFor="onlineUrl">Enlace online (digital)</Label>
              <Input id="onlineUrl" name="onlineUrl" type="url" placeholder="https://zoom.us/j/…" />
            </div>
          )}

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? 'Creando…' : 'Crear evento'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
