import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getRegistrationByQr } from '@eventflow/db';
import { formatEventDate, formatEventTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const statusCopy: Record<string, { label: string; tone: string }> = {
  registered: { label: 'Registrado', tone: 'text-amber-300' },
  confirmed: { label: 'Asistencia confirmada', tone: 'text-emerald-300' },
  waitlist: { label: 'En lista de espera', tone: 'text-blue-300' },
  attended: { label: 'Asististe', tone: 'text-emerald-300' },
};

export default async function PassPage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = await params;
  const reg = await getRegistrationByQr(qrToken);
  if (!reg) notFound();

  const qrDataUrl = await QRCode.toDataURL(reg.qrToken, {
    margin: 1,
    width: 320,
    color: { dark: '#07070a', light: '#ffffff' },
  });
  const status = statusCopy[reg.status] ?? statusCopy.registered!;
  const needsConfirm = reg.status === 'registered';

  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="aurora" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="eyebrow">Tu pase</p>
          <h1 className="font-display mt-2 text-3xl">{reg.event.title}</h1>
        </div>

        {/* Ticket */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <div className="flex flex-col items-center gap-5 p-8">
            <div className="rounded-2xl bg-white p-4 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Código QR de acceso" width={220} height={220} />
            </div>
            <p className={`text-sm font-medium ${status.tone}`}>● {status.label}</p>
          </div>

          {/* Perforación */}
          <div className="relative h-0 border-t border-dashed border-white/15">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-ink-950" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-ink-950" />
          </div>

          <div className="space-y-3 p-8 text-sm">
            <Row label="Asistente" value={reg.fullName} />
            <Row label="Fecha" value={`${formatEventDate(reg.event.startsAt, reg.event.timezone)}`} />
            <Row label="Hora" value={`${formatEventTime(reg.event.startsAt, reg.event.timezone)} h`} />
            <Row
              label="Lugar"
              value={reg.event.type === 'digital' ? 'Online' : (reg.event.locationName ?? '—')}
            />
          </div>
        </div>

        {needsConfirm && (
          <Link
            href={`/confirmar/${reg.confirmationToken}`}
            className="mt-6 flex w-full items-center justify-center rounded-full bg-white py-3.5 text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.01]"
          >
            Confirmar mi asistencia →
          </Link>
        )}
        <p className="mt-6 text-center text-xs text-white/30">
          Presenta este código QR en el acceso. Guárdalo o haz captura de pantalla.
        </p>
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
