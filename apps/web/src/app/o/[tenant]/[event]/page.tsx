import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicEvent, getEffectiveAgentConfig } from '@eventflow/db';
import { Reveal, Stagger, StaggerItem } from '@/components/visual/reveal';
import { Countdown } from '@/components/visual/countdown';
import { AssistantWidget } from '@/components/assistant-widget';
import { formatEventDate, formatEventTime, eventTypeLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ tenant: string; event: string }>;
}) {
  const { tenant, event: eventSlug } = await params;
  const data = await getPublicEvent(tenant, eventSlug);
  if (!data) notFound();

  const { event, registeredCount } = data;
  const branding = (event.tenant.branding ?? {}) as {
    accentColor?: string;
    logoUrl?: string;
    displayName?: string;
  };
  const accent = branding.accentColor;
  const brandStyle = accent
    ? ({
        ['--color-brand-300' as string]: accent,
        ['--color-brand-400' as string]: accent,
        ['--color-brand-500' as string]: accent,
        ['--color-brand-600' as string]: accent,
      } as React.CSSProperties)
    : undefined;
  const registerHref = `/o/${tenant}/${eventSlug}/registro`;
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - registeredCount) : null;
  const fillPct = event.capacity ? Math.min(100, Math.round((registeredCount / event.capacity) * 100)) : 0;
  const agentCfg = await getEffectiveAgentConfig(event.tenantId, event.id);

  const benefits = [
    { t: 'Acceso garantizado', d: 'Confirma tu asistencia y asegura tu cupo con un solo toque.' },
    { t: 'Pase digital con QR', d: 'Tu entrada viaja contigo. Escaneo en segundos al llegar.' },
    { t: 'Recordatorios a tiempo', d: 'Te avisamos cuándo y dónde, para que no te pierdas nada.' },
  ];

  return (
    <div className="grain relative min-h-screen overflow-hidden" style={brandStyle}>
      <div className="aurora" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display flex items-center gap-2 text-lg tracking-tight">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={event.tenant.name} className="h-7 w-auto" />
          ) : (
            (branding.displayName ?? event.tenant.name)
          )}
        </span>
        <Link
          href={registerHref}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10"
        >
          Reservar lugar
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-24 sm:pt-16">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <Reveal>
              <div className="mb-6 flex items-center gap-3">
                <span className="eyebrow">{eventTypeLabel[event.type] ?? event.type}</span>
                <span className="h-px w-8 bg-white/20" />
                <span className="eyebrow !tracking-[0.2em]">
                  {formatEventDate(event.startsAt, event.timezone)}
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl md:text-7xl">
                {event.title}
              </h1>
            </Reveal>

            {event.description && (
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
                  {event.description}
                </p>
              </Reveal>
            )}

            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href={registerHref}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.02]"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-brand-300/40 to-accent-400/40 transition-transform duration-500 group-hover:translate-x-0" />
                  <span className="relative">Quiero asistir</span>
                  <span className="relative transition-transform group-hover:translate-x-1">→</span>
                </Link>
                <p className="text-sm text-white/50">
                  {registeredCount > 0 ? (
                    <>
                      <span className="text-white/80">{registeredCount}</span> personas ya
                      registradas
                    </>
                  ) : (
                    'Sé de los primeros en registrarte'
                  )}
                </p>
              </div>
            </Reveal>
          </div>

          {/* Tarjeta lateral: countdown + meta */}
          <Reveal delay={0.2}>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl">
              <p className="eyebrow mb-5">Comienza en</p>
              <Countdown target={event.startsAt} />

              <div className="mt-7 space-y-4 border-t border-white/10 pt-6 text-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-white/40">◷</span>
                  <div>
                    <p className="text-white/90">{formatEventDate(event.startsAt, event.timezone)}</p>
                    <p className="text-white/50">
                      {formatEventTime(event.startsAt, event.timezone)} h ·{' '}
                      {event.timezone.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-white/40">◎</span>
                  <p className="text-white/90">
                    {event.type === 'digital'
                      ? 'Evento online — recibirás el enlace al confirmar'
                      : (event.locationName ?? 'Ubicación por confirmar')}
                  </p>
                </div>
                {spotsLeft !== null && (
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-white/50">Cupos</span>
                      <span className="text-white/70">
                        {spotsLeft > 0 ? `${spotsLeft} disponibles` : 'Lista de espera'}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-400"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Beneficios */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <p className="eyebrow mb-3">Por qué registrarte</p>
          <h2 className="font-display max-w-2xl text-3xl leading-tight sm:text-4xl">
            Una experiencia pensada al <span className="italic text-brand-300">detalle</span>.
          </h2>
        </Reveal>
        <Stagger className="mt-10 grid gap-5 sm:grid-cols-3">
          {benefits.map((b) => (
            <StaggerItem
              key={b.t}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <h3 className="text-base font-medium">{b.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{b.d}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* CTA final */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-600/20 via-white/[0.03] to-accent-500/15 p-10 text-center sm:p-16">
            <h2 className="font-display mx-auto max-w-2xl text-4xl leading-tight sm:text-5xl">
              Reserva tu lugar antes de que se agote
            </h2>
            <p className="mx-auto mt-4 max-w-md text-white/60">
              El registro toma menos de un minuto. Recibirás tu pase digital al instante.
            </p>
            <Link
              href={registerHref}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.02]"
            >
              Registrarme ahora →
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/30">
        {event.tenant.name} · con tecnología de Eventflow
      </footer>

      {/* CTA sticky móvil */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink-950/80 p-4 backdrop-blur-xl sm:hidden">
        <Link
          href={registerHref}
          className="flex w-full items-center justify-center rounded-full bg-white py-3.5 text-sm font-semibold text-ink-950"
        >
          Quiero asistir →
        </Link>
      </div>

      {agentCfg.enabled && (
        <AssistantWidget
          tenantSlug={tenant}
          eventSlug={eventSlug}
          displayName={agentCfg.displayName}
          welcome={agentCfg.welcomeMessage}
        />
      )}
    </div>
  );
}
