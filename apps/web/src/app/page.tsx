import { cn } from '@eventflow/ui';

const features = [
  { title: 'Eventos presenciales y digitales', desc: 'Webinars y eventos en vivo, una sola plataforma.' },
  { title: 'Registro + confirmación anti no-show', desc: 'Reconfirmación con sensación de escasez para que asistan.' },
  { title: 'Check-in por QR multi-asesor', desc: 'Escaneo desde el móvil en varias puertas, en tiempo real.' },
  { title: 'Mensajería automatizada (Amazon SES)', desc: 'Recordatorios programados + estructura WhatsApp.' },
  { title: 'Sorteos en vivo tipo show', desc: 'Bombo animado, tambores y confeti entre asistentes reales.' },
  { title: 'Asistente IA por evento', desc: 'Responde a tus asistentes con información verificada (RAG).' },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <span className="inline-block rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
        Fase 0 · Fundaciones
      </span>
      <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
        Eventflow
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-white/70">
        Plataforma SaaS multi-tenant para crear, promocionar, gestionar y medir eventos
        presenciales y digitales. Registro inteligente, check-in por QR, mensajería automatizada,
        pagos, sorteos en vivo y asistente IA.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <article
            key={f.title}
            className={cn(
              'rounded-2xl border border-white/10 bg-white/[0.03] p-5',
              'transition hover:border-white/20 hover:bg-white/[0.06]',
            )}
          >
            <h2 className="text-base font-medium">{f.title}</h2>
            <p className="mt-2 text-sm text-white/60">{f.desc}</p>
          </article>
        ))}
      </div>

      <p className="mt-16 text-sm text-white/40">
        Scaffolding inicial. Próximo: Auth + multi-tenant (Fase 1). Ver{' '}
        <code className="rounded bg-white/10 px-1.5 py-0.5">PRD/11-ROADMAP.md</code>.
      </p>
    </main>
  );
}
