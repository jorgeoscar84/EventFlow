import Link from 'next/link';
import { Reveal, Stagger, StaggerItem } from '@/components/visual/reveal';

const capabilities = [
  { t: 'Registro inteligente', d: 'Captura leads con confirmación automática y pase digital.' },
  { t: 'Check-in por QR', d: 'Escaneo en puerta desde el móvil, en tiempo real.' },
  { t: 'Anti no-show', d: 'Reconfirmación que reduce las ausencias drásticamente.' },
  { t: 'Mensajería', d: 'Recordatorios automáticos por correo y más canales.' },
  { t: 'Sorteos en vivo', d: 'Cierra con un show: bombo, tensión y confeti.' },
  { t: 'Asistente IA', d: 'Responde a tus asistentes con información verificada.' },
];

export default function HomePage() {
  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <div className="aurora" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl tracking-tight">Eventflow</span>
        <Link
          href="/login"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10"
        >
          Entrar
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
        <Reveal>
          <span className="eyebrow">Plataforma de eventos</span>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="font-display mt-5 max-w-4xl text-5xl leading-[1.02] sm:text-7xl">
            Eventos que la gente <span className="italic text-brand-300">recuerda</span>, sin la
            fricción de siempre.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Presenciales y digitales. Desde la landing de alto impacto hasta el check-in y el sorteo
            final — todo en un mismo lugar.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.02]"
            >
              Acceder al panel →
            </Link>
            <Link
              href="/o/demo/future-summit-2026"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium transition-colors hover:bg-white/5"
            >
              Ver evento de ejemplo
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <Stagger className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <StaggerItem key={c.t} className="bg-ink-950 p-7 transition-colors hover:bg-ink-900">
              <h3 className="text-base font-medium">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{c.d}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/30">
        Eventflow · construido para organizadores exigentes
      </footer>
    </div>
  );
}
