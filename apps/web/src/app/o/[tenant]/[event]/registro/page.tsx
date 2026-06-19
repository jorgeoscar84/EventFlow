import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicEvent } from '@eventflow/db';
import { RegisterForm } from './register-form';
import { formatEventDate, formatEventTime, eventTypeLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ tenant: string; event: string }>;
}) {
  const { tenant, event: eventSlug } = await params;
  const data = await getPublicEvent(tenant, eventSlug);
  if (!data) notFound();
  const { event } = data;

  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <div className="aurora" />
      <div className="relative z-10 mx-auto grid max-w-5xl gap-12 px-6 py-12 lg:grid-cols-2 lg:py-20">
        {/* Resumen del evento */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Link
            href={`/o/${tenant}/${eventSlug}`}
            className="text-sm text-white/40 transition-colors hover:text-white/70"
          >
            ← Volver al evento
          </Link>
          <p className="eyebrow mt-8">{eventTypeLabel[event.type] ?? event.type}</p>
          <h1 className="font-display mt-3 text-4xl leading-[1.05] sm:text-5xl">{event.title}</h1>
          <div className="mt-6 space-y-2 text-sm text-white/60">
            <p>
              {formatEventDate(event.startsAt, event.timezone)} ·{' '}
              {formatEventTime(event.startsAt, event.timezone)} h
            </p>
            <p>
              {event.type === 'digital'
                ? 'Evento online'
                : (event.locationName ?? 'Ubicación por confirmar')}
            </p>
          </div>
          <p className="mt-8 max-w-sm text-sm leading-relaxed text-white/40">
            Completa tus datos para asegurar tu lugar. Recibirás un pase digital con código QR al
            instante.
          </p>
        </div>

        {/* Formulario */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl sm:p-9">
          <h2 className="font-display mb-6 text-2xl">Reserva tu lugar</h2>
          <RegisterForm
            tenant={tenant}
            eventSlug={eventSlug}
            customFields={event.customFields.map((f) => ({
              key: f.key,
              label: f.label,
              type: f.type,
              required: f.required,
              options: f.options,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
