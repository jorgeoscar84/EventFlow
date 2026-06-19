'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

export function AssistantWidget({
  tenantSlug,
  eventSlug,
  displayName,
  welcome,
}: {
  tenantSlug: string;
  eventSlug: string;
  displayName: string;
  welcome: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', text: welcome }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const convRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const res = await fetch('/api/v1/public/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantSlug, eventSlug, message: text, conversationId: convRef.current }),
      });
      const json = (await res.json()) as { data?: { reply: string; conversationId: string } };
      if (json.data) {
        convRef.current = json.data.conversationId;
        setMessages((m) => [...m, { role: 'assistant', text: json.data!.reply }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: 'Lo siento, no pude responder ahora.' }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Error de conexión.' }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }), 50);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir asistente"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-2xl text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-105 sm:bottom-8 sm:right-8"
      >
        {open ? '×' : '💬'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-5 z-30 flex h-[28rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-white/12 bg-ink-900/95 backdrop-blur-xl sm:right-8"
          >
            <div className="border-b border-white/10 px-5 py-4">
              <p className="font-display text-lg">{displayName}</p>
              <p className="text-xs text-white/40">Respuestas basadas en la información del evento</p>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === 'user' ? 'bg-brand-500 text-white' : 'bg-white/8 text-white/85'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {busy && <p className="px-1 text-xs text-white/40">Escribiendo…</p>}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex gap-2 border-t border-white/10 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta…"
                className="h-10 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-brand-400/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-white px-4 text-sm font-medium text-ink-950 disabled:opacity-50"
              >
                →
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
