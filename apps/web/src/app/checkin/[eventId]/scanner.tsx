'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Result = 'ok' | 'duplicate' | 'invalid' | 'not_confirmed';

interface ScanResponse {
  data?: { result: Result; attendee?: { fullName: string; status: string } };
  error?: { message: string };
}

const resultStyles: Record<Result, { bg: string; label: string; icon: string }> = {
  ok: { bg: 'bg-emerald-500', label: 'Acceso permitido', icon: '✓' },
  not_confirmed: { bg: 'bg-amber-500', label: 'Entró sin confirmar', icon: '!' },
  duplicate: { bg: 'bg-orange-600', label: 'Ya había ingresado', icon: '⟳' },
  invalid: { bg: 'bg-red-600', label: 'QR no válido', icon: '✕' },
};

export function Scanner({
  eventId,
  initialAttended,
  initialTotal,
}: {
  eventId: string;
  initialAttended: number;
  initialTotal: number;
}) {
  const [gate, setGate] = useState('Puerta principal');
  const [cameraOn, setCameraOn] = useState(false);
  const [attended, setAttended] = useState(initialAttended);
  const [manual, setManual] = useState('');
  const [last, setLast] = useState<{ result: Result; name?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const lastTokenRef = useRef<string>('');
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  const submit = useCallback(
    async (qrToken: string) => {
      if (!qrToken || busy) return;
      if (qrToken === lastTokenRef.current) return; // anti-rebote
      lastTokenRef.current = qrToken;
      setBusy(true);
      try {
        const res = await fetch('/api/v1/checkin/scan', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ eventId, qrToken, gate }),
        });
        const json: ScanResponse = await res.json();
        const result = json.data?.result ?? 'invalid';
        setLast({ result, name: json.data?.attendee?.fullName });
        if (result === 'ok' || result === 'not_confirmed') setAttended((n) => n + 1);
        if (navigator.vibrate) navigator.vibrate(result === 'invalid' ? [80, 40, 80] : 40);
      } catch {
        setLast({ result: 'invalid' });
      } finally {
        setBusy(false);
        setTimeout(() => {
          lastTokenRef.current = '';
          setLast(null);
        }, 2500);
      }
    },
    [busy, eventId, gate],
  );

  useEffect(() => {
    if (!cameraOn) return;
    let active = true;
    let instance: { stop: () => Promise<void>; clear: () => void } | null = null;

    (async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!active) return;
      const el = document.getElementById('qr-reader');
      if (!el) return;
      const html5 = new Html5Qrcode('qr-reader');
      instance = html5 as unknown as { stop: () => Promise<void>; clear: () => void };
      scannerRef.current = instance;
      try {
        await html5.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => void submit(decoded),
          () => {},
        );
      } catch {
        setCameraOn(false);
      }
    })();

    return () => {
      active = false;
      instance?.stop().then(() => instance?.clear()).catch(() => {});
    };
  }, [cameraOn, submit]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div>
          <p className="text-xs text-white/40">Asistencia</p>
          <p className="font-display text-3xl tabular-nums">
            {attended}
            <span className="text-base text-white/30"> / {initialTotal}</span>
          </p>
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-white/40">Puerta</label>
          <select
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-sm"
          >
            <option>Puerta principal</option>
            <option>Puerta A</option>
            <option>Puerta B</option>
            <option>VIP</option>
          </select>
        </div>
      </div>

      {/* Visor cámara */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div id="qr-reader" className="mx-auto aspect-square w-full max-w-sm" />
        {!cameraOn && (
          <div className="flex aspect-square w-full max-w-sm mx-auto items-center justify-center">
            <button
              onClick={() => setCameraOn(true)}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink-950"
            >
              Activar cámara
            </button>
          </div>
        )}

        {/* Overlay de resultado */}
        <AnimatePresence>
          {last && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 flex flex-col items-center justify-center text-center ${resultStyles[last.result].bg}`}
            >
              <span className="text-6xl text-white">{resultStyles[last.result].icon}</span>
              <p className="mt-3 text-lg font-semibold text-white">
                {resultStyles[last.result].label}
              </p>
              {last.name && <p className="mt-1 text-white/90">{last.name}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Entrada manual (respaldo sin cámara) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(manual.trim());
          setManual('');
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Código del pase (manual)"
          className="h-11 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-white/10 px-4 text-sm font-medium hover:bg-white/15 disabled:opacity-50"
        >
          Validar
        </button>
      </form>
    </div>
  );
}
