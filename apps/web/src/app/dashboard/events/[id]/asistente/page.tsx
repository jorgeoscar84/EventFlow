import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getEffectiveAgentConfig, listKnowledge } from '@eventflow/db';
import { PageHeader } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { ToggleForm, ReindexForm, FaqForm } from './forms';

export const dynamic = 'force-dynamic';

const typeLabel: Record<string, string> = {
  auto_event: 'Datos del evento',
  faq: 'FAQ',
  document: 'Documento',
  url: 'URL',
  text: 'Texto',
};

export default async function AsistentePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.tenantId) notFound();
  const { id } = await params;
  const [cfg, knowledge] = await Promise.all([
    getEffectiveAgentConfig(user.tenantId, id),
    listKnowledge(user.tenantId, id),
  ]);

  return (
    <>
      <Link href={`/dashboard/events/${id}`} className="text-sm text-white/40 hover:text-white/70">
        ← Detalle del evento
      </Link>
      <PageHeader title="Asistente IA" description="Atiende a tus asistentes con respuestas verificadas (RAG)." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <ToggleForm eventId={id} enabled={cfg.enabled} />
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium">Conocimiento</p>
            <p className="text-sm text-white/50">{knowledge.length} fuente(s) indexada(s)</p>
          </div>
          <ReindexForm eventId={id} />
        </Card>

        <Card>
          <h2 className="font-display mb-4 text-lg">Añadir FAQ</h2>
          <FaqForm eventId={id} />
        </Card>

        <Card>
          <h2 className="font-display mb-4 text-lg">Fuentes de conocimiento</h2>
          {knowledge.length === 0 ? (
            <p className="text-sm text-white/50">Activa el asistente para indexar los datos del evento.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {knowledge.map((k) => (
                <li key={k.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                  <span>{k.title}</span>
                  <span className="text-xs text-white/40">
                    {typeLabel[k.type] ?? k.type} · {k._count.chunks} frag.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="mt-4 text-xs text-white/30">
        El asistente sólo responde con la información indexada y los datos del evento; si no sabe, lo
        admite. Con una clave de LLM configurada, las respuestas se vuelven conversacionales.
      </p>
    </>
  );
}
