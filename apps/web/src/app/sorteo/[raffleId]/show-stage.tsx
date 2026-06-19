'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface RoundState {
  roundNumber: number;
  prize: string | null;
  status: string;
  winnerName?: string;
}
interface DrawResult {
  exhausted?: boolean;
  winner?: { id: string; name: string; present: boolean };
  accepted?: boolean;
  prize?: string | null;
  roundNumber?: number;
}

/** Audio simple (tambores + boom) con Web Audio API. */
function useDrums(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const rollRef = useRef<number | null>(null);

  const ctx = () => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  };

  const startRoll = useCallback(() => {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    let rate = 90;
    const hit = () => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = 180 + Math.random() * 40;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.09);
      rate = Math.max(45, rate - 1.5);
      rollRef.current = window.setTimeout(hit, rate);
    };
    hit();
  }, [muted]);

  const stopRoll = useCallback(() => {
    if (rollRef.current) window.clearTimeout(rollRef.current);
    rollRef.current = null;
  }, []);

  const boom = useCallback(() => {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.5);
    g.gain.setValueAtTime(0.5, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.7);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.7);
  }, [muted]);

  return { startRoll, stopRoll, boom };
}

export function ShowStage({
  raffleId,
  eventTitle,
  names,
  rounds: initialRounds,
}: {
  raffleId: string;
  eventTitle: string;
  names: string[];
  rounds: RoundState[];
}) {
  const pool = names.length ? names : ['Participante'];
  const [rounds, setRounds] = useState(initialRounds);
  const [current, setCurrent] = useState(
    () => initialRounds.find((r) => r.status !== 'won')?.roundNumber ?? initialRounds.length + 1,
  );
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'revealed'>('idle');
  const [display, setDisplay] = useState(pool[0]!);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [muted, setMuted] = useState(false);
  const spinRef = useRef<number | null>(null);
  const { startRoll, stopRoll, boom } = useDrums(muted);

  const round = rounds.find((r) => r.roundNumber === current);
  const finished = !round;

  const fireConfetti = useCallback(async () => {
    const confetti = (await import('canvas-confetti')).default;
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 }, colors: ['#818cf8', '#d946ef', '#ffffff'] });
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 } }), 150);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 } }), 250);
  }, []);

  const draw = useCallback(
    async (redraw: boolean) => {
      if (!round || phase === 'spinning') return;
      setResult(null);
      setPhase('spinning');
      startRoll();
      spinRef.current = window.setInterval(() => {
        setDisplay(pool[Math.floor(Math.random() * pool.length)]!);
      }, 60);

      const res = await fetch(`/api/v1/raffles/${raffleId}/draw`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roundNumber: current, redraw }),
      });
      const json = (await res.json()) as { data?: DrawResult };
      const out = json.data;

      // Deja girar al menos 2.6s para tensión.
      await new Promise((r) => setTimeout(r, 2600));
      if (spinRef.current) window.clearInterval(spinRef.current);
      stopRoll();

      setResult(out ?? null);
      if (out?.winner) setDisplay(out.winner.name);
      setPhase('revealed');
      boom();
      if (out?.accepted) {
        void fireConfetti();
        setRounds((rs) => rs.map((r) => (r.roundNumber === current ? { ...r, status: 'won', winnerName: out.winner?.name } : r)));
      }
    },
    [round, phase, startRoll, pool, raffleId, current, stopRoll, boom, fireConfetti],
  );

  const next = () => {
    setResult(null);
    setPhase('idle');
    setCurrent((c) => c + 1);
  };

  useEffect(() => () => {
    if (spinRef.current) window.clearInterval(spinRef.current);
    stopRoll();
  }, [stopRoll]);

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="aurora" />

      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute right-5 top-5 z-20 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/60 backdrop-blur"
      >
        {muted ? '🔇 Silencio' : '🔊 Sonido'}
      </button>

      <div className="relative z-10 w-full max-w-3xl">
        <p className="eyebrow mb-2">{eventTitle}</p>

        {finished ? (
          <>
            <h1 className="font-display text-5xl sm:text-6xl">¡Sorteo finalizado! 🎉</h1>
            <div className="mt-10 space-y-3">
              {rounds.map((r) => (
                <div key={r.roundNumber} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <span className="text-sm text-white/50">{r.prize}</span>
                  <p className="font-display text-2xl">{r.winnerName ?? '—'}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl text-brand-300 sm:text-3xl">{round?.prize}</h2>
            <p className="mt-1 text-sm text-white/40">
              Premio {current} de {rounds.length}
            </p>

            {/* Bombo */}
            <div className="relative mx-auto mt-8 flex h-44 w-full max-w-2xl items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent backdrop-blur-xl">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={display + phase}
                  initial={{ y: phase === 'spinning' ? -40 : 0, opacity: phase === 'spinning' ? 0.4 : 0 }}
                  animate={{ y: 0, opacity: 1, scale: phase === 'revealed' ? 1.05 : 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ duration: phase === 'spinning' ? 0.06 : 0.5, ease: 'easeOut' }}
                  className="font-display px-6 text-4xl sm:text-6xl"
                >
                  {display}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Resultado / controles */}
            <div className="mt-8 flex min-h-[64px] flex-col items-center gap-4">
              {phase === 'idle' && (
                <button
                  onClick={() => draw(false)}
                  className="rounded-full bg-white px-10 py-4 text-base font-semibold text-ink-950 transition-transform hover:scale-105"
                >
                  Sortear
                </button>
              )}
              {phase === 'spinning' && <p className="animate-pulse text-white/60">Sorteando…</p>}
              {phase === 'revealed' && result?.winner && (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
                    {result.accepted ? (
                      <>
                        <p className="text-emerald-300">● Ganador presente — ¡felicidades!</p>
                        <button onClick={next} className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-ink-950">
                          {current >= rounds.length ? 'Finalizar' : 'Siguiente premio →'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-amber-300">● No está presente. Re-sortear para elegir a otro.</p>
                        <button onClick={() => draw(true)} className="rounded-full bg-amber-400 px-8 py-3 text-sm font-semibold text-ink-950">
                          Re-sortear
                        </button>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
              {phase === 'revealed' && result?.exhausted && (
                <p className="text-white/50">No quedan participantes elegibles.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
