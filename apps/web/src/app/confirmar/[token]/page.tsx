import Link from 'next/link';
import { notFound } from 'next/navigation';
import { confirmRegistration } from '@eventflow/db';
import { Reveal } from '@/components/visual/reveal';
import { formatEventDate, formatEventTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await confirmRegistration(token);
  if (!reg) notFound();

  const isOnline = reg.event.type === 'digital';

  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="aurora" />
      <div className="relative z-10 w-full max-w-lg text-center">
        <Reveal>
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-2xl text-emerald-300">
            ✓
          </div>
          <p className="eyebrow">Asistencia confirmada</p>
          <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">
            ¡Te esperamos, {reg.fullName.split(' ')[0]}!
          </h1>
          <p className="mt-4 text-white/60">
            Tu lugar en <span className="text-white/90">{reg.event.title}</span> está asegurado.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-9 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-left text-sm backdrop-blur-xl">
            <div className="space-y-3">
              <Row label="Fecha" value={formatEventDate(reg.event.startsAt, reg.event.timezone)} />
              <Row label="Hora" value={`${formatEventTime(reg.event.startsAt, reg.event.timezone)} h`} />
              <Row
                label={isOnline ? 'Acceso' : 'Lugar'}
                value={
                  isOnline
                    ? (reg.event.onlineUrl ?? 'Recibirás el enlace por correo')
                    : (reg.event.locationName ?? 'Por confirmar')
                }
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <Link
            href={`/pase/${reg.qrToken}`}
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium backdrop-blur transition-colors hover:bg-white/10"
          >
            Ver mi pase con QR →
          </Link>
        </Reveal>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/40">{label}</span>
      <span className="text-right text-white/90">{value}</span>
    </div>
  );
}
